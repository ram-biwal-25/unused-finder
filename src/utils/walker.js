import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_IGNORES = [
  "node_modules", ".git", "dist", "build", "coverage", ".next", ".nuxt",
  ".output", ".turbo", ".vercel", ".cache"
];

export async function walkFiles(root, options = {}) {
  const ignore = [...DEFAULT_IGNORES, ...(options.ignore || [])];
  const results = [];

  async function visit(directory, relative = "") {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      if (ignore.some(pattern => matchesIgnore(rel, pattern) || matchesIgnore(entry.name, pattern))) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute, rel);
      else if (entry.isFile()) results.push(rel.replace(/\\/g, "/"));
    }
  }

  await visit(root);
  return results;
}

function matchesIgnore(value, pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i").test(value);
}
