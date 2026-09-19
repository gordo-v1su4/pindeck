import { auth } from "./auth";
import { httpRouter } from "convex/server";
import { smartAnalyzeImage } from "./vision";
import { ORCHESTRATION_HTTP_SEAM } from "./orchestrationSeam";
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
  path: ORCHESTRATION_HTTP_SEAM.imageRefresh,
  method: "POST",
  handler: imageRefreshHttp,
});

http.route({
  path: ORCHESTRATION_HTTP_SEAM.mediaFinalize,
  method: "POST",
  handler: mediaFinalizeHttp,
});

http.route({
  path: ORCHESTRATION_HTTP_SEAM.externalIngest,
  method: "POST",
  handler: externalIngestHttp,
});

http.route({
  path: ORCHESTRATION_HTTP_SEAM.mediaRepair,
  method: "POST",
  handler: mediaRepairHttp,
});

http.route({
  path: ORCHESTRATION_HTTP_SEAM.generateVariations,
  method: "POST",
  handler: variationGenerationHttp,
});

http.route({
  path: ORCHESTRATION_HTTP_SEAM.generateVariationsPrepare,
  method: "POST",
  handler: variationGenerationPrepareHttp,
});

http.route({
  path: ORCHESTRATION_HTTP_SEAM.generateVariationsPersist,
  method: "POST",
  handler: variationGenerationPersistHttp,
});

http.route({
  path: ORCHESTRATION_HTTP_SEAM.generateVariationsComplete,
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
