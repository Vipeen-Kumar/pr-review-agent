// ESM Loader: Loads .env before any modules are imported
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env immediately
dotenv.config({ path: path.join(__dirname, ".env") });

