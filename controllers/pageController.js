import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONTENT_TYPE } from "../config/constants.js";
import { info, error as logError } from "../utils/logger.js";

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
  ".css": CONTENT_TYPE.CSS,
  ".html": CONTENT_TYPE.HTML,
  ".js": CONTENT_TYPE.JAVASCRIPT,
  ".json": CONTENT_TYPE.JSON,
};

async function serveStaticFile(pathname, response) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(publicDir, requestPath);

  try {
    const file = await readFile(filePath);
    const extension = path.extname(filePath);

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || CONTENT_TYPE.TEXT,
    });
    response.end(file);
    
    if (requestPath !== "/index.html") {
      info("Static file served", { path: requestPath });
    }
  } catch (err) {
    logError("Static file not found", { path: pathname });
    response.writeHead(404, {
      "Content-Type": CONTENT_TYPE.TEXT,
    });
    response.end("Not found");
  }
}

export {
  serveStaticFile,
};
