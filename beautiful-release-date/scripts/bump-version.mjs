import fs from "fs";
import path from "path";
import url from "url";

// Resolve repo root based on this script's location
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const versionFile = path.join(root, "version.json");

const data = JSON.parse(fs.readFileSync(versionFile, "utf8"));

const [maj, min, patch] = String(data.version || "0.0.0").split(".").map(Number);
const next = [maj, min, (patch || 0) + 1].join(".");

const message = process.argv.slice(2).join(" ") || "Minor improvements and bug fixes.";

data.version = next;
data.changelog = Array.isArray(data.changelog) ? [message, ...data.changelog] : [message];

fs.writeFileSync(versionFile, JSON.stringify(data, null, 2) + "\n");

console.log("Bumped version to", next);
