import test from "node:test";
import assert from "node:assert/strict";
import { scanDependencies } from "../src/scanners/deps.js";

test("detects imported packages and reports unreferenced dependencies", () => {
  const pkg = { dependencies: { react: "^18", lodash: "^4" }, devDependencies: { vitest: "^2" } };
  const files = [{ path: "src/main.js", content: 'import React from "react";' }];
  const result = scanDependencies(pkg, files);
  assert.deepEqual(result.unused, ["lodash"]);
});
