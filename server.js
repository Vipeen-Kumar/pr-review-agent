import { createServer } from "node:http";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

import { handleRoutes } from "./routes/index.js";

const port = Number(process.env.PORT || 3000);

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  const handled = await handleRoutes(request, response, url);

  if (!handled) {
    response.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Method not allowed");
  }
});

server.listen(port, () => {
  console.log(`PR Review Agent UI running at http://localhost:${port}`);
});
