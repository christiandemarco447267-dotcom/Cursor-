import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Inline grid-template-columns beat the stylesheet's mobile media query, so stat grids
// (.bench-stats) must pick their column count with a class (bench-stats-2 / bench-stats-4).
test("bench-stats grids never set inline gridTemplateColumns (keeps mobile collapse working)", () => {
  const dir = join(process.cwd(), "src", "components");
  const offenders: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(join(dir, file), "utf8");
    for (const line of src.split("\n")) {
      if (line.includes("bench-stats") && line.includes("gridTemplateColumns")) offenders.push(`${file}: ${line.trim()}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("stylesheet collapses 4-column stat grids to 2 columns on narrow screens", () => {
  const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
  assert.match(css, /\.bench-stats-4\s*\{\s*grid-template-columns:\s*repeat\(4/);
  assert.match(css, /@media \(max-width: 900px\)\s*\{\s*\.bench-stats,\s*\.bench-stats-4\s*\{\s*grid-template-columns:\s*repeat\(2/);
});
