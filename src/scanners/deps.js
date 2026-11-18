const BUILT_IN_IGNORES = [
  /^@types\//i,
  /^(eslint|prettier)(-|$)/i,
  /^(typescript|vite|webpack|rollup|parcel|babel|jest|vitest|mocha|ts-node|nodemon)(-|$)/i
];

const IMPORT_PATTERNS = [
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\b(?:jest|vi)\.mock\s*\(\s*["']([^"']+)["']/g
];

function packageName(specifier) {
  if (!specifier || specifier.startsWith(".") || specifier.startsWith("/") ||
      specifier.startsWith("#") || specifier.startsWith("node:")) return null;
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

export function scanDependencies(pkg, files, ignore = []) {
  const declared = [...new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {})
  ])];
  const used = new Set();
  const text = files.map(file => file.content).join("\n");

  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const name = packageName(match[1]);
      if (name) used.add(name);
    }
  }

  // Also catch CommonJS destructuring and less common import syntax.
  for (const match of text.matchAll(/\b(?:from\s*)?["']([@a-zA-Z0-9][^"']*)["']/g)) {
    const name = packageName(match[1]);
    if (name) used.add(name);
  }

  const unused = declared.filter(name => {
    const ignored = BUILT_IN_IGNORES.some(rule => rule.test(name)) ||
      ignore.some(pattern => matchesIgnore(name, pattern));
    return !ignored && !used.has(name);
  });

  const warnings = [];
  if (declared.length && !files.length) warnings.push("No source files found; dependency results may be incomplete.");
  return { unused, warnings };
}

function matchesIgnore(value, pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i").test(value);
}
