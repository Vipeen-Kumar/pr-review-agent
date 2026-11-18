// CRITICAL: Import env loader FIRST to initialize dotenv before any other module imports
import "./env-loader.js";

// Now import other modules
import { createServer } from "node:http";
import { connectDatabase } from "./config/database.js";
import { handleRoutes } from "./routes/index.js";
import { methodNotAllowed } from "./utils/response.js";
import config from "./config/env.js";
import { info } from "./utils/logger.js";

// CORS headers configuration
function getCorsHeaders(request) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const origin = request.headers.origin || frontendUrl;
  
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  
  // Add CORS headers to all responses
  const corsHeaders = getCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  // Handle OPTIONS (preflight) requests
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const handled = await handleRoutes(request, response, url);

  if (!handled) {
    methodNotAllowed(response);
  }
});

// Initialize database and start server
(async () => {
  try {
    await connectDatabase();
    server.listen(config.port, () => {
      info(`PR Review Agent UI running at http://localhost:${config.port}`);
    });
  } catch (err) {
    info(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
})();
