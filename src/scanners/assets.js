import fs from "node:fs/promises";
import path from "node:path";

const ASSET_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".woff", ".woff2", ".ttf", ".otf", ".ico"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", ".nuxt"]);

export async function scanAssets(cwd, allFiles, sourceFiles, assetDirs, ignore = []) {
  const candidates = allFiles.filter(file =>
    ASSET_EXTENSIONS.has(path.extname(file).toLowerCase()) &&
    assetDirs.some(dir => file === dir || file.startsWith(`${dir}/`)) &&
    !ignore.some(pattern => matchesIgnore(file, pattern))
  );

  const references = sourceFiles.map(file => file.content).join("\n");
  const unused = [];
  for (const file of candidates) {
    const normalized = file.replace(/\\/g, "/");
    const basename = path.basename(file);
    const stem = basename.slice(0, basename.length - path.extname(basename).length);
    // Match full relative paths, public-root paths, and basename references.
    const referenced = references.includes(normalized) ||
      references.includes(`/${normalized.replace(/^public\//, "")}`) ||
      references.includes(basename) ||
      references.includes(stem);
    if (!referenced) unused.push(normalized);
  }

  return { unused, assetsScanned: candidates.length, warnings: [] };
}

function matchesIgnore(value, pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i").test(value);
}
