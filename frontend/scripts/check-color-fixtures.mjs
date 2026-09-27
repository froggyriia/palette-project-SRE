#!/usr/bin/env node
/**
 * Cross-check for src/utils/color.js against ../shared/color_fixtures.json
 * — the same fixture backend/tests/test_color_fixture_consistency.py
 * checks against app/color_theory.py. If both pass, the frontend's live
 * wheel preview and the backend's actual palette generation agree; a
 * mismatch here means utils/color.js drifted from the Python original.
 *
 * Plain Node, no test framework — run with `npm run check:colors`
 * (or `node scripts/check-color-fixtures.mjs` directly).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { hexToHsl, schemeColors } from "../src/utils/color.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../shared/color_fixtures.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

let failures = 0;

function approxEqual(actual, expected, tol = 1e-6) {
  return Math.abs(actual - expected) <= tol;
}

for (const c of fixture.hex_to_hsl) {
  const { h, s, l } = hexToHsl(c.hex);
  if (!approxEqual(h, c.h) || !approxEqual(s, c.s) || !approxEqual(l, c.l)) {
    failures++;
    console.error(
      `FAIL hex_to_hsl(${c.hex}): expected {h:${c.h}, s:${c.s}, l:${c.l}}, got {h:${h}, s:${s}, l:${l}}`,
    );
  }
}
console.log(`hex_to_hsl: checked ${fixture.hex_to_hsl.length} cases`);

for (const c of fixture.schemes) {
  const result = schemeColors(c.base, c.scheme, c.angle);
  const matches =
    result.length === c.expected.length &&
    result.every((hex, i) => hex.toLowerCase() === c.expected[i].toLowerCase());
  if (!matches) {
    failures++;
    console.error(
      `FAIL schemeColors(${c.base}, ${c.scheme}, ${c.angle}): expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(result)}`,
    );
  }
}
console.log(`schemes: checked ${fixture.schemes.length} cases`);

if (failures > 0) {
  console.error(`\n${failures} mismatch(es) between utils/color.js and shared/color_fixtures.json`);
  process.exit(1);
}
console.log("\nALL COLOR FIXTURE CHECKS PASSED — frontend matches backend's color_theory.py");
