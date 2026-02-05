import { auth } from "./auth";
import router from "./router";
import { smartAnalyzeImage } from "./vision";
import { ingestExternalHttp } from "./images";

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

auth.addHttpRoutes(http);

export default http;
