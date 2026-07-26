// CRITICAL: Import env loader FIRST to initialize dotenv before any other module imports
import "./env-loader.js";

// Now import other modules
import { createServer } from "node:http";
import { handleRoutes } from "./routes/index.js";
import { methodNotAllowed } from "./utils/response.js";
import config from "./config/env.js";
import { info } from "./utils/logger.js";

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  const handled = await handleRoutes(request, response, url);

  if (!handled) {
    methodNotAllowed(response);
  }
});

server.listen(config.port, () => {
  info(`PR Review Agent UI running at http://localhost:${config.port}`);
});
