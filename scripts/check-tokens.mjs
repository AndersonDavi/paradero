#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/app", "src/components"];
const SKIP = [/glyphs\.tsx$/, /transit-map(\.web)?\.tsx$/, /\+api\.ts$/];

const LAYOUT =
  /\b(width|height|minWidth|minHeight|maxWidth|maxHeight|gap|rowGap|columnGap|padding\w*|margin\w*|top|left|right|bottom|inset|borderRadius|border\w+Radius|borderWidth|fontSize|lineHeight|letterSpacing)\s*:\s*-?\d+(\.\d+)?\b/g;
const SIZE_PROP = /\b(size|width|height)=\{-?\d+(\.\d+)?\}/g;
const COLOR = /["'`](#[0-9a-f]{3,8}|rgba?\([^)]*\))["'`]/gi;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const problems = [];
for (const file of ROOTS.flatMap(files)) {
  if (SKIP.some((re) => re.test(file))) continue;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const re of [LAYOUT, SIZE_PROP, COLOR]) {
        for (const m of line.matchAll(re)) {
          if (/:\s*0\b/.test(m[0]) && !/\d\./.test(m[0])) continue;
          problems.push(`${relative(process.cwd(), file)}:${i + 1}  ${m[0]}`);
        }
      }
    });
}

if (problems.length) {
  console.error(`Raw values found. Use tokens from src/theme (space, radius, size, layout, type, palette):\n`);
  console.error(problems.map((p) => `  ${p}`).join("\n"));
  console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("Tokens: every layout value comes from the design system.");
