import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const storePath = path.join(dataDir, "store.json");

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });

  try {
    await access(storePath);
  } catch {
    await writeFile(
      storePath,
      JSON.stringify({ users: [], reviews: [] }, null, 2),
      "utf8",
    );
  }
}

async function readStore() {
  await ensureStore();
  const raw = await readFile(storePath, "utf8");
  return JSON.parse(raw);
}

async function writeStore(store) {
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export { ensureStore, readStore, writeStore };
