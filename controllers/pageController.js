import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Page Controller
 * 
 * Handles HTTP static file serving.
 * Receives pathname, reads file, sends response.
 * NO business logic - just serving static assets.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

async function serveStaticFile(pathname, response) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(publicDir, requestPath);

  try {
    const file = await readFile(filePath);
    const extension = path.extname(filePath);

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "text/plain; charset=utf-8",
    });
    response.end(file);
  } catch {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Not found");
  }
}

export {
  serveStaticFile,
};
