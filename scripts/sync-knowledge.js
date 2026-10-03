#!/usr/bin/env node
/* Copia knowledge/*.md dentro de netlify/functions/chat.js (respaldos inline).
 *   FALLBACK_KNOWLEDGE ← knowledge/spicelab.md  (spicelab.cl y agro.spicelab.cl)
 *   FALLBACK_HUERTO    ← knowledge/huerto.md    (huerto.spicelab.cl)
 *   FALLBACK_AGRO_PRICES ← knowledge/agro-prices.md (solo agro.spicelab.cl; también define la lista blanca del guard)
 * Uso: node scripts/sync-knowledge.js          → reescribe chat.js
 *      node scripts/sync-knowledge.js --check  → exit 1 si algún respaldo no coincide
 */
"use strict";
const fs = require("fs");
const path = require("path");

const rootArg = process.argv.find((a) => a.startsWith("--root="));
const ROOT = rootArg ? path.resolve(rootArg.slice(7)) : path.join(__dirname, "..");
const JS = path.join(ROOT, "netlify", "functions", "chat.js");
const MAP = [
  ["FALLBACK_KNOWLEDGE", "spicelab.md"],
  ["FALLBACK_HUERTO", "huerto.md"],
  ["FALLBACK_AGRO_PRICES", "agro-prices.md"],
];

const js = fs.readFileSync(JS, "utf8");
let next = js;
for (const [name, file] of MAP) {
  const md = fs.readFileSync(path.join(ROOT, "knowledge", file), "utf8");
  const re = new RegExp(
    "(// BEGIN " + name + "[^\\n]*\\n)const " + name + " = [^\\n]*;\\n(// END " + name + ")"
  );
  if (!re.test(next)) {
    console.error("No encontré los marcadores BEGIN/END " + name + " en chat.js");
    process.exit(2);
  }
  next = next.replace(re, function (_, a, b) {
    return a + "const " + name + " = " + JSON.stringify(md) + ";\n" + b;
  });
}

if (process.argv.includes("--check")) {
  if (next !== js) {
    console.error("Respaldos inline desactualizados. Ejecuta: npm run sync");
    process.exit(1);
  }
  console.log("knowledge sincronizado (" + MAP.map((m) => m[1]).join(", ") + ")");
} else {
  fs.writeFileSync(JS, next);
  console.log(next === js ? "Sin cambios." : "chat.js actualizado desde knowledge/");
}
