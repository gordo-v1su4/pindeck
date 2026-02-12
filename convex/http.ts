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

http.route({
  path: "/discordModerate",
  method: "POST",
  handler: discordModerateHttp,
});

auth.addHttpRoutes(http);

export default http;
