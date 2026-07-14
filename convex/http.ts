import { auth } from "./auth";
import { httpRouter } from "convex/server";
import { smartAnalyzeImage } from "./vision";
import {
  externalIngestHttp,
  imageRefreshHttp,
  mediaFinalizeHttp,
  mediaRepairHttp,
  variationGenerationCompleteHttp,
  variationGenerationHttp,
  variationGenerationPersistHttp,
  variationGenerationPrepareHttp,
} from "./orchestration";
import {
  backfillNextcloudHttp,
  discordModerateHttp,
  discordQueueHttp,
  ingestExternalHttp,
  quarantineBrokenNextcloudHttp,
} from "./images";

const http = httpRouter();

http.route({
  path: "/orchestration/image-refresh",
  method: "POST",
  handler: imageRefreshHttp,
});

http.route({
  path: "/orchestration/media-finalize",
  method: "POST",
  handler: mediaFinalizeHttp,
});

http.route({
  path: "/orchestration/external-ingest",
  method: "POST",
  handler: externalIngestHttp,
});

http.route({
  path: "/orchestration/media-repair",
  method: "POST",
  handler: mediaRepairHttp,
});

http.route({
  path: "/orchestration/generate-variations",
  method: "POST",
  handler: variationGenerationHttp,
});

http.route({
  path: "/orchestration/generate-variations/prepare",
  method: "POST",
  handler: variationGenerationPrepareHttp,
});

http.route({
  path: "/orchestration/generate-variations/persist",
  method: "POST",
  handler: variationGenerationPersistHttp,
});

http.route({
  path: "/orchestration/generate-variations/complete",
  method: "POST",
  handler: variationGenerationCompleteHttp,
});

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
  path: "/admin/backfillNextcloud",
  method: "POST",
  handler: backfillNextcloudHttp,
});

http.route({
  path: "/admin/quarantineBrokenNextcloud",
  method: "POST",
  handler: quarantineBrokenNextcloudHttp,
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
