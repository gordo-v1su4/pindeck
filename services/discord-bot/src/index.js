import fs from "node:fs";
import path from "node:path";
import {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

const PANEL_MARKER_PREFIX = "[PINDECK_IMAGE_PANEL]";
const MAX_MENU_ITEMS = 25;

const REQUIRED_CHANNEL_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
];

const PERMISSION_NAME_MAP = new Map([
  [PermissionFlagsBits.ViewChannel, "View Channels"],
  [PermissionFlagsBits.SendMessages, "Send Messages"],
  [PermissionFlagsBits.EmbedLinks, "Embed Links"],
  [PermissionFlagsBits.ReadMessageHistory, "Read Message History"],
  [PermissionFlagsBits.AddReactions, "Add Reactions"],
  [PermissionFlagsBits.UseApplicationCommands, "Use Application Commands"],
]);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;

    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadLocalEnv() {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, ".env.local"),
    path.resolve(cwd, ".env"),
    path.resolve(cwd, "../../.env.local"),
    path.resolve(cwd, "../../.env"),
    path.resolve(cwd, "../.env.local"),
    path.resolve(cwd, "../.env"),
  ];

  for (const candidate of candidates) {
    loadEnvFile(candidate);
  }
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "image";
}

function normalizeEmoji(emoji) {
  if (!emoji || typeof emoji !== "string") return null;
  return emoji.trim();
}

function emojiMatchKeys(emoji) {
  if (!emoji) return new Set();
  const keys = new Set([emoji]);
  const custom = emoji.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
  if (custom) {
    keys.add(`id:${custom[2]}`);
    keys.add(`name:${custom[1]}`);
  }
  return keys;
}

function reactionKeys(reaction) {
  const keys = new Set();
  if (reaction.emoji?.id) {
    keys.add(`id:${reaction.emoji.id}`);
  }
  if (reaction.emoji?.name) {
    keys.add(reaction.emoji.name);
    keys.add(`name:${reaction.emoji.name}`);
  }
  const rendered = reaction.emoji?.toString?.();
  if (rendered) keys.add(rendered);
  return keys;
}

function parseImagesFromEnv(raw) {
  if (!raw) {
    return [
      {
        id: "sample-1",
        label: "Sample Image 1",
        url: "https://placehold.co/1200x675/png?text=Sample+Image+1",
        emoji: "1️⃣",
      },
      {
        id: "sample-2",
        label: "Sample Image 2",
        url: "https://placehold.co/1200x675/png?text=Sample+Image+2",
        emoji: "2️⃣",
      },
      {
        id: "sample-3",
        label: "Sample Image 3",
        url: "https://placehold.co/1200x675/png?text=Sample+Image+3",
        emoji: "3️⃣",
      },
    ];
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`DISCORD_IMAGES_JSON must be valid JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("DISCORD_IMAGES_JSON must be a non-empty JSON array");
  }

  return parsed.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Image at index ${idx} must be an object`);
    }

    const label = String(item.label || item.name || `Image ${idx + 1}`).trim();
    const id = slugify(item.id || label || `image-${idx + 1}`);
    const url = String(item.url || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(`Image ${id} has invalid url. Expected http(s) URL`);
    }

    const emoji = normalizeEmoji(item.emoji);

    return {
      id,
      label: label.slice(0, 100),
      url,
      emoji,
    };
  });
}

function buildCommands(images) {
  const choiceImages = images.slice(0, MAX_MENU_ITEMS);

  const imagesCommand = new SlashCommandBuilder()
    .setName("images")
    .setDescription("Post configured image presets")
    .addSubcommand((sub) =>
      sub
        .setName("menu")
        .setDescription("Post an interactive select menu in this channel")
    )
    .addSubcommand((sub) =>
      sub
        .setName("send")
        .setDescription("Send one image preset directly")
        .addStringOption((opt) => {
          let option = opt
            .setName("preset")
            .setDescription("Preset image to send")
            .setRequired(true);
          for (const image of choiceImages) {
            option = option.addChoices({ name: image.label, value: image.id });
          }
          return option;
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Post an emoji reaction panel in this channel")
    );

  return [imagesCommand];
}

function checkChannelPermissions(channel) {
  if (!channel?.isTextBased?.()) {
    return { ok: false, missing: ["Text channel required"] };
  }

  if (!channel.guild) {
    return { ok: true, missing: [] };
  }

  const me = channel.guild.members.me;
  if (!me) {
    return { ok: false, missing: ["Cannot resolve bot member in this guild"] };
  }

  const perms = channel.permissionsFor(me);
  if (!perms) {
    return { ok: false, missing: ["Cannot inspect channel permissions"] };
  }

  const missingBits = REQUIRED_CHANNEL_PERMISSIONS.filter((bit) => !perms.has(bit));
  return {
    ok: missingBits.length === 0,
    missing: missingBits.map((bit) => PERMISSION_NAME_MAP.get(bit) || String(bit)),
  };
}

function buildImageEmbed(image, actorTag) {
  return new EmbedBuilder()
    .setTitle(image.label)
    .setImage(image.url)
    .setFooter({ text: actorTag ? `Requested by ${actorTag}` : "Pindeck bot" });
}

function buildMenuRow(images) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("pindeck_image_picker")
    .setPlaceholder("Choose an image to post")
    .addOptions(
      images.slice(0, MAX_MENU_ITEMS).map((image) => {
        const option = {
          label: image.label.slice(0, 100),
          description: image.id.slice(0, 100),
          value: image.id,
        };

        if (image.emoji) {
          option.emoji = image.emoji;
        }

        return option;
      })
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildReactionPanelDescription(images) {
  const lines = images
    .filter((img) => Boolean(img.emoji))
    .slice(0, MAX_MENU_ITEMS)
    .map((img) => `${img.emoji}  ${img.label}`);

  if (lines.length === 0) {
    return "No emoji mappings configured. Add `emoji` for each image in `DISCORD_IMAGES_JSON`.";
  }

  return lines.join("\n");
}

async function registerCommands({ token, clientId, guildId, commands }) {
  const rest = new REST({ version: "10" }).setToken(token);
  const body = commands.map((command) => command.toJSON());

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log(`Registered ${body.length} command(s) in guild ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body });
    console.log("Registered global commands (can take up to ~1 hour to appear)");
  }
}

function printStartupChecklist({ guildId, images }) {
  console.log("Discord bot configuration summary");
  console.log(`- Guild scope: ${guildId || "Global"}`);
  console.log(`- Presets loaded: ${images.length}`);
  if (images.length > MAX_MENU_ITEMS) {
    console.log(`- Note: only first ${MAX_MENU_ITEMS} presets are available in slash choices/menu`);
  }
  console.log("- Recommended command: /images menu");
  console.log("- Optional fallback: /images panel + emoji reactions");
}

loadLocalEnv();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const dryRun = process.env.DISCORD_DRY_RUN === "1";

let images;
try {
  images = parseImagesFromEnv(process.env.DISCORD_IMAGES_JSON);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (!token) {
  console.error("Missing DISCORD_TOKEN");
  process.exit(1);
}

if (!clientId) {
  console.error("Missing DISCORD_CLIENT_ID");
  process.exit(1);
}

const imagesById = new Map(images.map((img) => [img.id, { ...img, emojiKeys: emojiMatchKeys(img.emoji) }]));

const commands = buildCommands(images);

if (dryRun) {
  printStartupChecklist({ guildId, images });
  registerCommands({ token, clientId, guildId, commands })
    .then(() => {
      console.log("Dry run complete.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Dry run failed:", error.message);
      process.exit(1);
    });
} else {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  client.once(Events.ClientReady, async (readyClient) => {
    try {
      await registerCommands({ token, clientId, guildId, commands });
      printStartupChecklist({ guildId, images });
      console.log(`Logged in as ${readyClient.user.tag}`);
    } catch (error) {
      console.error("Failed to register slash commands:", error);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName !== "images") return;

        const subcommand = interaction.options.getSubcommand();
        const permissionCheck = checkChannelPermissions(interaction.channel);
        if (!permissionCheck.ok) {
          await interaction.reply({
            content: `I can't post in this channel yet. Missing: ${permissionCheck.missing.join(", ")}`,
            ephemeral: true,
          });
          return;
        }

        if (subcommand === "send") {
          const preset = interaction.options.getString("preset", true);
          const image = imagesById.get(preset);
          if (!image) {
            await interaction.reply({ content: "Preset not found.", ephemeral: true });
            return;
          }

          await interaction.channel.send({ embeds: [buildImageEmbed(image, interaction.user.tag)] });
          await interaction.reply({ content: `Posted **${image.label}**.`, ephemeral: true });
          return;
        }

        if (subcommand === "menu") {
          await interaction.channel.send({
            content: "Choose an image from the menu below:",
            components: [buildMenuRow(images)],
          });
          await interaction.reply({ content: "Image menu posted.", ephemeral: true });
          return;
        }

        if (subcommand === "panel") {
          const description = buildReactionPanelDescription(images);
          const panel = await interaction.channel.send({
            content: `${PANEL_MARKER_PREFIX}`,
            embeds: [
              new EmbedBuilder()
                .setTitle("Image Reaction Panel")
                .setDescription(description)
                .setFooter({ text: "React to post an image" }),
            ],
          });

          for (const image of images) {
            if (!image.emoji) continue;
            try {
              await panel.react(image.emoji);
            } catch (error) {
              console.warn(`Unable to add reaction ${image.emoji}:`, error.message);
            }
          }

          await interaction.reply({ content: "Reaction panel posted.", ephemeral: true });
        }

        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "pindeck_image_picker") {
        const preset = interaction.values[0];
        const image = imagesById.get(preset);
        if (!image) {
          await interaction.reply({ content: "Preset not found.", ephemeral: true });
          return;
        }

        const permissionCheck = checkChannelPermissions(interaction.channel);
        if (!permissionCheck.ok) {
          await interaction.reply({
            content: `I can't post in this channel yet. Missing: ${permissionCheck.missing.join(", ")}`,
            ephemeral: true,
          });
          return;
        }

        await interaction.channel.send({ embeds: [buildImageEmbed(image, interaction.user.tag)] });
        await interaction.reply({ content: `Posted **${image.label}**.`, ephemeral: true });
      }
    } catch (error) {
      console.error("Interaction error:", error);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "Something went wrong processing that action.", ephemeral: true });
      }
    }
  });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;

    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message?.partial) await reaction.message.fetch();

      const message = reaction.message;
      if (!message?.author || message.author.id !== client.user.id) return;
      if (!message.content?.startsWith(PANEL_MARKER_PREFIX)) return;

      const keys = reactionKeys(reaction);
      const image = images.find((img) => [...img.emojiKeys].some((key) => keys.has(key)));
      if (!image) return;

      const permissionCheck = checkChannelPermissions(message.channel);
      if (!permissionCheck.ok) {
        console.warn(`Cannot post from reaction in channel ${message.channelId}:`, permissionCheck.missing.join(", "));
        return;
      }

      await message.channel.send({ embeds: [buildImageEmbed(image, user.tag)] });
    } catch (error) {
      console.error("Reaction handler error:", error.message);
    }
  });

  client.login(token).catch((error) => {
    console.error("Discord login failed:", error.message);
    process.exit(1);
  });
}
