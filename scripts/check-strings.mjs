/**
 * Fails when a screen or component shows words that are not in src/i18n, so every
 * language stays complete. Names that are the same in every language (the app, Croma,
 * TransMilenio, example route codes) are allowed.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIRS = ["src/app", "src/components"];
const SPOKEN_PROPS = new Set(["accessibilityLabel", "accessibilityHint", "label", "title", "placeholder", "body", "action", "detail", "description"]);
const SAME_EVERYWHERE = new Set(["Paradero", "Croma", "TransMilenio", "usecroma.com", "C.C. Lourdes"]);
const LETTERS = /\p{L}{2,}/u;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx$/.test(name) && !name.endsWith("+api.ts") ? [path] : [];
  });
}

function wordy(text) {
  const trimmed = text.replace(/^[\s+·]+|[\s+·]+$/g, "");
  return trimmed.length > 0 && LETTERS.test(trimmed) && !SAME_EVERYWHERE.has(trimmed);
}

const problems = [];

for (const path of DIRS.flatMap((d) => files(join(ROOT, d)))) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const report = (node, text) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    problems.push(`  ${relative(ROOT, path)}:${line + 1}  ${JSON.stringify(text.trim().slice(0, 60))}`);
  };

  const visit = (node) => {
    if (ts.isJsxText(node) && wordy(node.text)) report(node, node.text);

    const named = ts.isJsxAttribute(node) ? node.name.getText(source) : ts.isPropertyAssignment(node) ? node.name.getText(source) : null;
    if (named && SPOKEN_PROPS.has(named)) {
      const value = node.initializer;
      const literal = value && ts.isJsxExpression(value) ? value.expression : value;
      if (literal && (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) && wordy(literal.text)) report(literal, literal.text);
      if (literal && ts.isTemplateExpression(literal)) {
        const parts = [literal.head.text, ...literal.templateSpans.map((s) => s.literal.text)].join(" ");
        if (wordy(parts)) report(literal, parts);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (problems.length > 0) {
  console.error(`Text on screen that is not translated. Move it to src/i18n (es.ts first, then every language):\n\n${problems.join("\n")}\n\n${problems.length} problems`);
  process.exit(1);
}
console.log("Strings: every word on screen comes from src/i18n, in 7 languages.");
