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
const MAX_IMPORTED_IMAGES_PER_MESSAGE = 10;

const BASE_CHANNEL_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
];

const MESSAGE_POST_PERMISSIONS = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
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

function toComponentEmoji(emoji) {
  if (!emoji) return undefined;
  const custom = emoji.match(/^<(a?):([a-zA-Z0-9_]+):(\d+)>$/);
  if (custom) {
    return {
      animated: custom[1] === "a",
      name: custom[2],
      id: custom[3],
    };
  }

  return { name: emoji };
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

function parseCsv(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(raw) {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function deriveIngestEndpoint() {
  const explicit = normalizeBaseUrl(process.env.PINDECK_INGEST_URL || process.env.DISCORD_INGEST_URL);
  if (explicit) {
    if (explicit.endsWith("/ingestExternal")) return explicit;
    return `${explicit}/ingestExternal`;
  }

  const candidates = [
    process.env.CONVEX_SITE_URL,
    process.env.VITE_CONVEX_SITE_URL,
    process.env.CONVEX_URL,
    process.env.VITE_CONVEX_URL,
  ];

  for (const candidate of candidates) {
    const base = normalizeBaseUrl(candidate);
    if (!base) continue;

    try {
      const url = new URL(base);
      if (url.hostname.endsWith(".convex.cloud")) {
        url.hostname = url.hostname.replace(".convex.cloud", ".convex.site");
      }
      return `${url.toString().replace(/\/$/, "")}/ingestExternal`;
    } catch {
      // ignore invalid candidate
    }
  }

  return null;
}

function parseEmojiTriggers(raw) {
  const values = parseCsv(raw || "📥");
  return values.map((value) => ({
    raw: value,
    keys: emojiMatchKeys(value),
  }));
}

function isReactionIngestTrigger(reaction, triggers) {
  if (!triggers.length) return false;
  const keys = reactionKeys(reaction);
  return triggers.some((trigger) => [...trigger.keys].some((key) => keys.has(key)));
}

function extractImageLinksFromMessage(message) {
  const urls = new Set();

  for (const attachment of message.attachments?.values?.() || []) {
    const contentType = attachment.contentType || "";
    const looksLikeImage =
      contentType.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(attachment.url || "");
    if (looksLikeImage && attachment.url) {
      urls.add(attachment.url);
    }
  }

  for (const embed of message.embeds || []) {
    if (embed.image?.url) urls.add(embed.image.url);
    if (embed.thumbnail?.url) urls.add(embed.thumbnail.url);
    if (embed.url && /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(embed.url)) {
      urls.add(embed.url);
    }
  }

  const content = message.content || "";
  const urlMatches = content.match(/https?:\/\/\S+/g) || [];
  for (const match of urlMatches) {
    if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(match)) {
      urls.add(match);
    }
  }

  return [...urls];
}

function extractAllUrls(text) {
  if (!text) return [];
  return text.match(/https?:\/\/\S+/g) || [];
}

function cleanCapturedUrl(raw) {
  return String(raw || "").replace(/[),.;!?]+$/g, "").trim();
}

function looksLikeImageUrl(url) {
  return (
    /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url || "") ||
    /[?&]format=(jpg|jpeg|png|webp|gif|bmp)(?:&|$)/i.test(url || "")
  );
}

function extractSrefFromText(text) {
  if (!text) return undefined;
  const patterns = [
    /\bsref(?:\s*(?:number|num|#|:|-))?\s*(\d{2,})\b/i,
    /#sref[-\s]?(\d{2,})\b/i,
    /\bsref[-_]?(\d{2,})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

function extractPostMetadataFromMessage(message) {
  const content = (message.content || "").trim();
  const firstEmbed = message.embeds?.[0];
  const embedTitle = firstEmbed?.title?.trim();
  const embedDescription = firstEmbed?.description?.trim();
  const embedUrl = firstEmbed?.url?.trim();
  const embedAuthor = firstEmbed?.author?.name?.trim();

  const combinedText = [content, embedTitle, embedDescription, embedAuthor]
    .filter(Boolean)
    .join("\n");

  const urls = extractAllUrls(content);
  const nonImageUrls = urls.filter((url) => !looksLikeImageUrl(url));

  const sourcePostUrl =
    embedUrl ||
    nonImageUrls.find((url) => !url.includes("discord.com/channels/")) ||
    buildMessagePermalink(message);

  const title =
    embedTitle ||
    content.split("\n").map((line) => line.trim()).find(Boolean) ||
    `Discord import ${new Date(message.createdTimestamp).toISOString()}`;

  let description = content;
  if (!description && embedDescription) {
    description = embedDescription;
  } else if (description && embedDescription && !description.includes(embedDescription)) {
    description = `${description}\n\n${embedDescription}`;
  }

  const sref = extractSrefFromText(combinedText);

  return {
    title: title.slice(0, 120),
    description: description ? description.slice(0, 1000) : undefined,
    sourcePostUrl,
    sref,
  };
}

function toFxTwitterUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === "x.com" || host === "www.x.com" || host === "twitter.com" || host === "www.twitter.com") {
      parsed.hostname = "fxtwitter.com";
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return null;
  }
}

async function fetchExternalImageUrls(sourcePostUrl) {
  const normalized = toFxTwitterUrl(sourcePostUrl);
  if (!normalized) return [];

  try {
    const response = await fetch(normalized, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PindeckDiscordBot/1.0)",
      },
    });
    if (!response.ok) return [];

    const html = await response.text();
    const candidates = new Set();

    const urlMatches = html.match(/https?:\/\/[^"'\\\s<>)]+/g) || [];
    for (const match of urlMatches) {
      const cleaned = cleanCapturedUrl(match).replace(/&amp;/g, "&");
      if (looksLikeImageUrl(cleaned) && !cleaned.includes("profile_images")) {
        candidates.add(cleaned);
      }
    }

    // Catch escaped URLs often found in script tags.
    const escapedMatches = html.match(/https?:\\\/\\\/[^"'\\\s<>)]+/g) || [];
    for (const match of escapedMatches) {
      const unescaped = cleanCapturedUrl(match.replace(/\\\//g, "/")).replace(/&amp;/g, "&");
      if (looksLikeImageUrl(unescaped) && !unescaped.includes("profile_images")) {
        candidates.add(unescaped);
      }
    }

    return [...candidates];
  } catch (error) {
    console.warn("Failed external media parse:", error.message);
    return [];
  }
}

async function collectImageLinksForImport(message, sourcePostUrl, fetchExternal) {
  const direct = extractImageLinksFromMessage(message);
  if (!fetchExternal || !sourcePostUrl) {
    return [...new Set(direct)];
  }

  const fromSource = await fetchExternalImageUrls(sourcePostUrl);
  return [...new Set([...direct, ...fromSource])];
}

function buildMessagePermalink(message) {
  if (!message.guildId) return undefined;
  return `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
}

function parseDiscordMessageLink(link) {
  if (!link) return null;
  const match = link.match(
    /^https?:\/\/(?:canary\.|ptb\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/
  );
  if (!match) return null;
  return {
    guildId: match[1],
    channelId: match[2],
    messageId: match[3],
  };
}

async function resolveMessageForImport(interaction, messageLink) {
  if (messageLink) {
    const parsed = parseDiscordMessageLink(messageLink);
    if (!parsed) {
      throw new Error("Invalid message_link. Use a full Discord message URL.");
    }

    const channel = await interaction.client.channels.fetch(parsed.channelId);
    if (!channel?.isTextBased?.()) {
      throw new Error("Target message channel is not text-based.");
    }

    const targetMessage = await channel.messages.fetch(parsed.messageId);
    if (!targetMessage) {
      throw new Error("Could not fetch target message.");
    }

    return targetMessage;
  }

  const recent = await interaction.channel.messages.fetch({ limit: 50 });
  const fallback = recent.find((msg) => extractImageLinksFromMessage(msg).length > 0);
  if (!fallback) {
    throw new Error("No recent image message found in this channel.");
  }
  return fallback;
}

function decodeBase64Url(value) {
  if (!value) return null;
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function deriveClientIdFromToken(botToken) {
  if (!botToken || typeof botToken !== "string") return null;
  const first = botToken.split(".")[0];
  if (!first) return null;
  const decoded = decodeBase64Url(first)?.trim();
  return decoded && /^\d+$/.test(decoded) ? decoded : null;
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
    )
    .addSubcommand((sub) =>
      sub
        .setName("import")
        .setDescription("Import image(s) from an existing Discord post into Pindeck")
        .addStringOption((opt) =>
          opt
            .setName("message_link")
            .setDescription("Optional Discord message URL. If omitted, imports latest image post in this channel.")
            .setRequired(false)
        )
    );

  return [imagesCommand];
}

function checkChannelPermissions(channel, additional = []) {
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

  const needed = [...new Set([...BASE_CHANNEL_PERMISSIONS, ...additional])];
  const missingBits = needed.filter((bit) => !perms.has(bit));
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
          option.emoji = toComponentEmoji(image.emoji);
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

async function ingestIntoPindeck({
  ingestEndpoint,
  ingestApiKey,
  fallbackUserId,
  defaultTags,
  defaultCategory,
  actorUser,
  sourceMessage,
  imageUrl,
  externalId,
  title,
  description,
  sourceUrl,
  sref,
}) {
  if (!ingestEndpoint || !ingestApiKey) {
    throw new Error("Pindeck ingest is not configured. Set PINDECK_INGEST_URL and INGEST_API_KEY.");
  }

  const body = {
    userId: fallbackUserId || undefined,
    discordUserId: actorUser.id,
    discordUsername: actorUser.tag,
    title:
      title ||
      (sourceMessage.content || "").trim().slice(0, 120) ||
      `Discord import ${new Date(sourceMessage.createdTimestamp).toISOString()}`,
    description: description || (sourceMessage.content || "").trim().slice(0, 1000) || undefined,
    imageUrl,
    tags: defaultTags,
    category: defaultCategory,
    source: "Discord",
    sref,
    externalId,
    sourceType: "discord",
    sourceUrl: sourceUrl || buildMessagePermalink(sourceMessage),
  };

  const response = await fetch(ingestEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ingestApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ingest failed (${response.status}): ${text}`);
  }

  return response.json().catch(() => ({}));
}

function printStartupChecklist({
  guildId,
  images,
  ingestEndpoint,
  ingestTriggers,
  fallbackUserId,
  usingSamplePresets,
  ingestFetchExternal,
}) {
  console.log("Discord bot configuration summary");
  console.log(`- Guild scope: ${guildId || "Global"}`);
  console.log(`- Presets loaded: ${images.length}`);
  if (usingSamplePresets) {
    console.log("- Preset source: DISCORD_IMAGES_JSON missing, using placeholder samples");
  }
  if (images.length > MAX_MENU_ITEMS) {
    console.log(`- Note: only first ${MAX_MENU_ITEMS} presets are available in slash choices/menu`);
  }
  console.log("- Recommended command: /images menu");
  console.log("- Optional fallback: /images panel + emoji reactions");
  console.log(`- Ingest endpoint: ${ingestEndpoint || "disabled"}`);
  console.log(
    `- Ingest reaction triggers: ${ingestTriggers.length ? ingestTriggers.map((i) => i.raw).join(", ") : "none"}`
  );
  console.log(`- Ingest fallback userId: ${fallbackUserId || "none (requires discordUserId profile link)"}`);
  console.log(`- Ingest external post parsing: ${ingestFetchExternal ? "enabled" : "disabled"}`);
}

loadLocalEnv();

const token = process.env.DISCORD_TOKEN;
const clientId =
  process.env.DISCORD_CLIENT_ID ||
  process.env.DISCORD_APPLICATION_ID ||
  process.env.DISCORD_APP_ID ||
  deriveClientIdFromToken(process.env.DISCORD_TOKEN);
const guildId = process.env.DISCORD_GUILD_ID;
const dryRun = process.env.DISCORD_DRY_RUN === "1";
const ingestApiKey = process.env.INGEST_API_KEY;
const ingestEndpoint = deriveIngestEndpoint();
const ingestTriggers = parseEmojiTriggers(process.env.DISCORD_INGEST_EMOJIS);
const fallbackIngestUserId =
  process.env.PINDECK_USER_ID || process.env.DISCORD_DEFAULT_PINDECK_USER_ID || null;
const ingestDefaultTags = parseCsv(process.env.DISCORD_INGEST_DEFAULT_TAGS || "discord,imported");
const ingestDefaultCategory = process.env.DISCORD_INGEST_DEFAULT_CATEGORY || "General";
const ingestConfirmations = process.env.DISCORD_INGEST_CONFIRMATIONS !== "0";
const ingestFetchExternal = process.env.DISCORD_INGEST_FETCH_EXTERNAL !== "0";
const usingSamplePresets = !process.env.DISCORD_IMAGES_JSON;

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
  console.error("Missing DISCORD_CLIENT_ID (or DISCORD_APPLICATION_ID)");
  process.exit(1);
}

const imagesById = new Map(images.map((img) => [img.id, { ...img, emojiKeys: emojiMatchKeys(img.emoji) }]));

const commands = buildCommands(images);

if (dryRun) {
  printStartupChecklist({
    guildId,
    images,
    ingestEndpoint,
    ingestTriggers,
    fallbackUserId: fallbackIngestUserId,
    usingSamplePresets,
    ingestFetchExternal,
  });
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
      printStartupChecklist({
        guildId,
        images,
        ingestEndpoint,
        ingestTriggers,
        fallbackUserId: fallbackIngestUserId,
        usingSamplePresets,
        ingestFetchExternal,
      });
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
        let extraPermissions = [];
        if (subcommand === "send" || subcommand === "menu") {
          extraPermissions = [...MESSAGE_POST_PERMISSIONS];
        } else if (subcommand === "panel") {
          extraPermissions = [...MESSAGE_POST_PERMISSIONS, PermissionFlagsBits.AddReactions];
        }
        const permissionCheck = checkChannelPermissions(interaction.channel, extraPermissions);
        if (!permissionCheck.ok) {
          await interaction.reply({
            content: `I can't run this here yet. Missing: ${permissionCheck.missing.join(", ")}`,
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
          return;
        }

        if (subcommand === "import") {
          if (!ingestEndpoint || !ingestApiKey) {
            await interaction.reply({
              content:
                "Ingest is not configured. Set PINDECK_INGEST_URL (or CONVEX_SITE_URL) and INGEST_API_KEY in .env.local.",
              ephemeral: true,
            });
            return;
          }

          try {
            const messageLink = interaction.options.getString("message_link");
            const targetMessage = await resolveMessageForImport(interaction, messageLink);
            const postMeta = extractPostMetadataFromMessage(targetMessage);
            const imageLinks = (
              await collectImageLinksForImport(
                targetMessage,
                postMeta.sourcePostUrl,
                ingestFetchExternal
              )
            ).slice(0, MAX_IMPORTED_IMAGES_PER_MESSAGE);
            const tagsForImport = [...new Set([
              ...ingestDefaultTags,
              postMeta.sref ? `sref:${postMeta.sref}` : "",
            ].filter(Boolean))];

            if (!imageLinks.length) {
              await interaction.reply({
                content: "No image URLs found in that message.",
                ephemeral: true,
              });
              return;
            }

            let imported = 0;
            let failures = 0;
            for (let i = 0; i < imageLinks.length; i += 1) {
              const imageUrl = imageLinks[i];
              const externalId = `discord:slash:${targetMessage.guildId || "dm"}:${targetMessage.channelId}:${targetMessage.id}:${i}:${interaction.user.id}`;
              try {
                await ingestIntoPindeck({
                  ingestEndpoint,
                  ingestApiKey,
                  fallbackUserId: fallbackIngestUserId,
                  defaultTags: tagsForImport,
                  defaultCategory: ingestDefaultCategory,
                  actorUser: interaction.user,
                  sourceMessage: targetMessage,
                  imageUrl,
                  externalId,
                  title: postMeta.title,
                  description: postMeta.description,
                  sourceUrl: postMeta.sourcePostUrl,
                  sref: postMeta.sref,
                });
                imported += 1;
              } catch (error) {
                failures += 1;
                console.error("Slash import failed:", error.message);
              }
            }

            const permalink = buildMessagePermalink(targetMessage) || "selected message";
            await interaction.reply({
              content: `Imported ${imported}/${imageLinks.length} image(s) from ${permalink}.${postMeta.sref ? ` Parsed sref: ${postMeta.sref}.` : ""}${failures ? ` ${failures} failed.` : ""}`,
              ephemeral: true,
            });
          } catch (error) {
            await interaction.reply({
              content: `Import failed: ${error.message}`,
              ephemeral: true,
            });
          }
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

        const permissionCheck = checkChannelPermissions(interaction.channel, MESSAGE_POST_PERMISSIONS);
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
      if (!message) return;

      // Existing image panel behavior
      if (message.author?.id === client.user.id && message.content?.startsWith(PANEL_MARKER_PREFIX)) {
        const keys = reactionKeys(reaction);
        const image = images.find((img) => [...img.emojiKeys].some((key) => keys.has(key)));
        if (image) {
          const permissionCheck = checkChannelPermissions(message.channel, MESSAGE_POST_PERMISSIONS);
          if (!permissionCheck.ok) {
            console.warn(
              `Cannot post from panel reaction in channel ${message.channelId}:`,
              permissionCheck.missing.join(", ")
            );
            return;
          }
          await message.channel.send({ embeds: [buildImageEmbed(image, user.tag)] });
        }
      }

      // New ingest behavior: custom reaction on any image message imports into Pindeck
      if (!isReactionIngestTrigger(reaction, ingestTriggers)) return;
      if (!ingestEndpoint || !ingestApiKey) {
        console.warn("Ingest trigger ignored: missing PINDECK_INGEST_URL/INGEST_API_KEY");
        return;
      }

      const postMeta = extractPostMetadataFromMessage(message);
      const imageLinks = (
        await collectImageLinksForImport(message, postMeta.sourcePostUrl, ingestFetchExternal)
      ).slice(0, MAX_IMPORTED_IMAGES_PER_MESSAGE);
      if (!imageLinks.length) return;
      const tagsForImport = [...new Set([
        ...ingestDefaultTags,
        postMeta.sref ? `sref:${postMeta.sref}` : "",
      ].filter(Boolean))];

      let imported = 0;
      for (let i = 0; i < imageLinks.length; i += 1) {
        const imageUrl = imageLinks[i];
        const externalId = `discord:reaction:${message.guildId || "dm"}:${message.channelId}:${message.id}:${i}:${user.id}`;
        try {
          await ingestIntoPindeck({
            ingestEndpoint,
            ingestApiKey,
            fallbackUserId: fallbackIngestUserId,
            defaultTags: tagsForImport,
            defaultCategory: ingestDefaultCategory,
            actorUser: user,
            sourceMessage: message,
            imageUrl,
            externalId,
            title: postMeta.title,
            description: postMeta.description,
            sourceUrl: postMeta.sourcePostUrl,
            sref: postMeta.sref,
          });
          imported += 1;
        } catch (error) {
          console.error("Reaction ingest failed:", error.message);
        }
      }

      if (imported > 0 && ingestConfirmations) {
        const permissionCheck = checkChannelPermissions(message.channel, [PermissionFlagsBits.SendMessages]);
        if (permissionCheck.ok) {
          await message.channel.send(
            `Imported ${imported} image(s) from message ${message.id} into Pindeck for <@${user.id}>.${postMeta.sref ? ` sref: ${postMeta.sref}.` : ""}`
          );
        }
      }
    } catch (error) {
      console.error("Reaction handler error:", error.message);
    }
  });

  client.login(token).catch((error) => {
    console.error("Discord login failed:", error.message);
    process.exit(1);
  });
}
