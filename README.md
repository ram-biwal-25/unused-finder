# unused-finder

A fast, zero-config CLI that checks npm dependencies and common frontend assets for likely unused files.

## Quick start

```bash
npx unused-finder
```

Run it from the root of a project containing `package.json`. No configuration file is needed.

## Features

- Checks `dependencies` and `devDependencies` against common `import`, `require`, and dynamic import references.
- Scans `public/` and `src/assets/` for images, SVGs, and font files.
- Skips common generated folders and noisy dependency categories such as `@types/*`, ESLint, Prettier, and common build/test tools.
- Supports JSON output, ignore patterns, and interactive cleanup.

## CLI

```bash
npx unused-finder
npx unused-finder --json
npx unused-finder --ignore "legacy-*,public/vendor/**"
npx unused-finder --fix
```

### Flags

| Flag | Description |
| --- | --- |
| `--json` | Print a JSON report (useful in CI). Exit code is `1` when possible unused items are found. |
| `--ignore <patterns>` | Ignore comma-separated file paths or package names. Supports `*` and `?` wildcards. |
| `--fix` | Ask before uninstalling each candidate package or deleting each candidate asset. |
| `--help` | Show usage. |

`--fix` detects npm, pnpm, or Yarn from the lockfile. It requires an interactive terminal. Review the report before confirming changes.

## What gets scanned?

Source references are collected from `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.vue`, `.svelte`, `.html`, `.css`, and `.scss` files across the project (excluding common generated folders). Assets are discovered in `public/` and `src/assets/`.

## Important limitations

This is a heuristic finder, not a proof of dead code. It can miss dependencies loaded through computed/dynamic names, framework conventions, plugin configuration, scripts, or files outside the scanned source extensions. Asset checks use textual path and filename matching, so assets referenced only through generated manifests or runtime strings may be reported. Always inspect results and commit or back up your work before using `--fix`.

## Development

```bash
npm test
npm link
unused-finder --help
```
