import fs from "node:fs/promises";
import path from "node:path";
import { walkFiles } from "./utils/walker.js";
import { scanDependencies } from "./scanners/deps.js";
import { scanAssets } from "./scanners/assets.js";

const DEFAULT_SOURCE_DIRS = ["src", "app", "pages", "components"];
const DEFAULT_ASSET_DIRS = ["public", "src/assets"];
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".vue", ".svelte", ".html", ".css", ".scss"]);

export async function scanProject(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const packagePath = path.join(cwd, "package.json");
  let pkg;
  try { pkg = JSON.parse(await fs.readFile(packagePath, "utf8")); }
  catch (error) {
    if (error.code === "ENOENT") throw new Error(`No package.json found in ${cwd}`);
    throw new Error(`Could not parse package.json: ${error.message}`);
  }

  const ignore = options.ignore || [];
  const allFiles = await walkFiles(cwd, { ignore });
  const sourceFiles = allFiles.filter(file =>
    SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase()) &&
    !isExcludedSource(file)
  );
  const sourceContents = await readFiles(cwd, sourceFiles);
  const dependencyResult = scanDependencies(pkg, sourceContents);
  const assetResult = await scanAssets(cwd, allFiles, sourceContents, DEFAULT_ASSET_DIRS, ignore);

  return {
    root: cwd,
    filesScanned: sourceFiles.length,
    assetsScanned: assetResult.assetsScanned,
    unusedDependencies: dependencyResult.unused,
    unusedAssets: assetResult.unused,
    warnings: [...dependencyResult.warnings, ...assetResult.warnings]
  };
}

function isExcludedSource(file) {
  return /(^|\/)(node_modules|\.git|dist|build|coverage|\.next|\.nuxt|\.output)(\/|$)/.test(file);
}

async function readFiles(cwd, files) {
  const contents = [];
  for (const file of files) {
    try { contents.push({ path: file, content: await fs.readFile(path.join(cwd, file), "utf8") }); }
    catch { /* Ignore unreadable or transient files. */ }
  }
  return contents;
}
