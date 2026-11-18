#!/usr/bin/env node
import { scanProject } from "../src/index.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawnSync } from "node:child_process";
import path from "node:path";

function parseArgs(args) {
  const options = { cwd: process.cwd(), json: false, fix: false, ignore: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") options.json = true;
    else if (arg === "--fix") options.fix = true;
    else if (arg === "--ignore") {
      const value = args[++i];
      if (!value) throw new Error("--ignore requires a comma-separated pattern list");
      options.ignore.push(...value.split(",").map(x => x.trim()).filter(Boolean));
    } else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--version" || arg === "-v") options.version = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`unused-finder — find unused npm dependencies and orphaned assets

Usage:
  npx unused-finder [options]

Options:
  --json                 Print machine-readable JSON
  --ignore <patterns>    Ignore comma-separated glob-like patterns
  --fix                  Interactively uninstall packages / delete assets
  -h, --help             Show help
  -v, --version          Show version

Examples:
  npx unused-finder
  npx unused-finder --ignore "legacy-*,public/vendor/**"
  npx unused-finder --json
  npx unused-finder --fix`);
}

async function ask(rl, question) {
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  return answer === "y" || answer === "yes";
}

async function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; return; }
  if (options.help) return printHelp();
  if (options.version) {
    const { readFile } = await import("node:fs/promises");
    const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    console.log(pkg.version);
    return;
  }

  const result = await scanProject(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    if (result.unusedDependencies.length || result.unusedAssets.length) process.exitCode = 1;
    return;
  }

  console.log("\nunused-finder");
  console.log("────────────────────────────────────────");
  console.log(`Scanned ${result.filesScanned} source files and ${result.assetsScanned} assets.\n`);
  console.log(`Unused dependencies (${result.unusedDependencies.length}):`);
  if (result.unusedDependencies.length) result.unusedDependencies.forEach(name => console.log(`  • ${name}`));
  else console.log("  None found.");
  console.log(`\nPotentially unused assets (${result.unusedAssets.length}):`);
  if (result.unusedAssets.length) result.unusedAssets.forEach(file => console.log(`  • ${file}`));
  else console.log("  None found.");
  if (result.warnings.length) {
    console.log("\nWarnings:");
    result.warnings.forEach(w => console.log(`  ! ${w}`));
  }

  if (options.fix && (result.unusedDependencies.length || result.unusedAssets.length)) {
    if (!process.stdin.isTTY) {
      console.error("\n--fix requires an interactive terminal.");
      process.exitCode = 2;
      return;
    }
    const rl = createInterface({ input, output });
    try {
      const remove = [];
      for (const name of result.unusedDependencies) {
        if (await ask(rl, `Uninstall ${name}?`)) remove.push(name);
      }
      if (remove.length) {
        const manager = detectPackageManager(options.cwd);
        const command = manager === "yarn" ? "yarn" : manager === "pnpm" ? "pnpm" : "npm";
        const args = command === "npm" ? ["uninstall", ...remove] : ["remove", ...remove];
        const outcome = spawnSync(command, args, { cwd: options.cwd, stdio: "inherit", shell: process.platform === "win32" });
        if (outcome.status !== 0) console.error(`Package uninstall command failed (${outcome.status}).`);
      }
      for (const file of result.unusedAssets) {
        if (await ask(rl, `Delete ${file}?`)) {
          const fs = await import("node:fs/promises");
          await fs.unlink(path.resolve(options.cwd, file));
          console.log(`Deleted ${file}`);
        }
      }
    } finally { rl.close(); }
  } else if (options.fix) {
    console.log("\nNothing to fix.");
  }
  if (result.unusedDependencies.length || result.unusedAssets.length) process.exitCode = 1;
}

function detectPackageManager(cwd) {
  if (["pnpm-lock.yaml"].some(f => exists(path.join(cwd, f)))) return "pnpm";
  if (exists(path.join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}
function exists(file) { try { return Boolean(requireStat(file)); } catch { return false; } }
function requireStat(file) {
  // Synchronous existence check keeps the CLI entry point dependency-free.
  return process.getBuiltinModule("node:fs").statSync(file);
}

main().catch(error => { console.error(`unused-finder: ${error.message}`); process.exitCode = 2; });
