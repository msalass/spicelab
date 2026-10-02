#!/usr/bin/env node
/* Copia knowledge/spicelab.md dentro de netlify/functions/chat.js (FALLBACK_KNOWLEDGE).
 * Uso: node scripts/sync-knowledge.js          → reescribe chat.js
 *      node scripts/sync-knowledge.js --check  → falla (exit 1) si no están sincronizados
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MD = path.join(ROOT, "knowledge", "spicelab.md");
const JS = path.join(ROOT, "netlify", "functions", "chat.js");
const RE = /(\/\/ BEGIN FALLBACK_KNOWLEDGE[^\n]*\n)const FALLBACK_KNOWLEDGE = [^\n]*;\n(\/\/ END FALLBACK_KNOWLEDGE)/;

const md = fs.readFileSync(MD, "utf8");
const js = fs.readFileSync(JS, "utf8");
if (!RE.test(js)) {
  console.error("No encontré los marcadores BEGIN/END FALLBACK_KNOWLEDGE en chat.js");
  process.exit(2);
}
const next = js.replace(RE, function (_, a, b) {
  return a + "const FALLBACK_KNOWLEDGE = " + JSON.stringify(md) + ";\n" + b;
});

if (process.argv.includes("--check")) {
  if (next !== js) {
    console.error("FALLBACK_KNOWLEDGE desactualizado. Ejecuta: npm run sync");
    process.exit(1);
  }
  console.log("knowledge sincronizado");
} else {
  fs.writeFileSync(JS, next);
  console.log(next === js ? "Sin cambios." : "chat.js actualizado desde knowledge/spicelab.md");
}
