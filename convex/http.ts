import { auth } from "./auth";
import router from "./router";
import { smartAnalyzeImage } from "./vision";

const http = router;

http.route({
  path: "/smartAnalyzeImage",
  method: "POST",
  handler: smartAnalyzeImage,
});

auth.addHttpRoutes(http);

export default http;
