import { auth } from "./auth";
import router from "./router";
import { smartAnalyzeImage } from "./vision";
import { discordModerateHttp, discordQueueHttp, ingestExternalHttp } from "./images";

const http = router;

http.route({
  path: "/smartAnalyzeImage",
  method: "POST",
  handler: smartAnalyzeImage,
});

http.route({
  path: "/ingestExternal",
  method: "POST",
  handler: ingestExternalHttp,
});

http.route({
  path: "/discordQueue",
  method: "POST",
  handler: discordQueueHttp,
});

// Legacy alias used by older discord-bot env configs.
http.route({
  path: "/discord/queue",
  method: "POST",
  handler: discordQueueHttp,
});

http.route({
  path: "/discordModerate",
  method: "POST",
  handler: discordModerateHttp,
});

// Legacy alias used by older discord-bot env configs.
http.route({
  path: "/discord/moderation",
  method: "POST",
  handler: discordModerateHttp,
});

// Legacy malformed alias from older bot URL concatenation logic.
http.route({
  path: "/discord/moderation/discordModerate",
  method: "POST",
  handler: discordModerateHttp,
});

// Legacy malformed alias from older bot URL concatenation logic.
http.route({
  path: "/discord/queue/discordQueue",
  method: "POST",
  handler: discordQueueHttp,
});

auth.addHttpRoutes(http);

export default http;
