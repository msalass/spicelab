"use strict";
// agro.spicelab.cl: precios publicados (knowledge/agro-prices.md). Offline, sin llamadas.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

delete process.env.GROQ_API_KEY;
delete process.env.OPENAI_API_KEY;
const I = require("../netlify/functions/chat.js")._internal;
const ROOT = path.join(__dirname, "..");
const MD = fs.readFileSync(path.join(ROOT, "knowledge", "agro-prices.md"), "utf8");

// Precios del sitio en vivo (revisado 2 oct 2026) y su página de origen.
const LISTED = [
  { what: "Academia", text: "$119.000 CLP", amount: "$119.000", src: "https://agro.spicelab.cl/academia" },
  { what: "HR35", text: "$1.690.000 + IVA", amount: "$1.690.000", src: "https://agro.spicelab.cl/huerto-rentable-35" },
  { what: "HR55", text: "$2.290.000 + IVA", amount: "$2.290.000", src: "https://agro.spicelab.cl/huerto-rentable-55" },
  { what: "SPICe Partner", text: "$2.790.000/año + IVA", amount: "$2.790.000", src: "https://agro.spicelab.cl/spice-partner" },
  { what: "Invernadero 85 m² (Partner)", text: "+ $1.790.000 + IVA", amount: "$1.790.000", src: "https://agro.spicelab.cl/spice-partner" },
  { what: "Crédito de upgrade HR35", text: "$200.000", amount: "$200.000", src: "https://agro.spicelab.cl/huerto-rentable-35" },
];

test("agro: el bloque de precios trae cada precio publicado con su fuente, y la lista blanca es exactamente esa", () => {
  for (const p of LISTED) {
    assert.ok(MD.includes(p.text), p.what + " no está como " + p.text);
    assert.ok(MD.includes(p.src), p.what + " sin fuente " + p.src);
  }
  assert.ok(MD.includes("$107.100") && MD.includes("https://agro.spicelab.cl/lista10"));
  assert.deepEqual(I.agroAllowedAmounts().sort(), ["107100", "119000", "1690000", "1790000", "200000", "2290000", "2790000"].sort());
  assert.equal(I.agroListaAmount(), "107100");
});

test("agro: prompt (ES/EN) contiene cada precio; el guard de agro los deja pasar", () => {
  for (const lang of ["es", "en"]) {
    const p = I.buildSystemPrompt(lang, "agro");
    for (const x of LISTED) assert.ok(p.includes(x.text), lang + ": falta " + x.text);
    assert.match(p, /You MAY quote the published SPICe Agro prices/);
    assert.ok(!/PR #7/.test(p), "las notas del editor (comentarios) no van al modelo");
  }
  for (const x of LISTED) {
    for (const r of ["El " + x.what + " cuesta " + x.text + ". Fuente: " + x.src, x.what + ": " + x.amount.replace("$", "") + " CLP", "The " + x.what + " is " + x.text + "."]) {
      assert.equal(I.guardViolation(r, "agro"), null, r);
      const g = I.guardReply(r, "es", "agro");
      assert.equal(g.guarded, null, r);
      assert.ok(g.reply.includes(x.amount.replace("$", "")), r);
    }
  }
  assert.equal(I.guardViolation("Con el enlace de la Lista 10% (https://agro.spicelab.cl/lista10) el curso queda en $107.100.", "agro"), null);
});

test("agro: el análisis de suelo (y el plano de tu parcela) no tienen precio: prompt deriva a WhatsApp y el guard bloquea cualquier monto", () => {
  const p = I.buildSystemPrompt("es", "agro");
  assert.match(p, /Soil analysis \(«Análisis de suelo»\) and «El plano de tu parcela» have NO published price/);
  assert.match(p, /depends on their land[^\n]*offer WhatsApp \(https:\/\/wa\.me\/56971540665\)/);
  for (const r of ["El análisis de suelo cuesta $150.000.", "El análisis de suelo vale $119.000", "Soil analysis costs $200.000.", "El plano de tu parcela: $45.000", "Son $90.000 por el análisis de suelo"]) {
    assert.equal(I.guardViolation(r, "agro"), "price", r);
    assert.equal(I.guardReply(r, "es", "agro").reply, I.SAFE_AGRO_REPLY.es);
  }
  assert.match(I.SAFE_AGRO_REPLY.es, /análisis de suelo depende de tu terreno/);
  assert.match(I.SAFE_AGRO_REPLY.en, /Soil analysis depends on your land/);
  for (const l of ["es", "en"]) assert.ok(I.SAFE_AGRO_REPLY[l].includes("https://wa.me/56971540665"));
  assert.ok(!/\$\s?\d/.test(I.SAFE_AGRO_REPLY.es + I.SAFE_AGRO_REPLY.en));
  // un programa con precio que INCLUYE análisis de suelo sí pasa
  assert.equal(I.guardViolation("HR55 cuesta $2.290.000 + IVA e incluye análisis de suelo interpretado por SPICe Lab.", "agro"), null);
});

test("agro: nada bajo lista ni inventado (descuentos, desgloses, valores de bonos)", () => {
  for (const d of I.agroAllowedAmounts()) {
    const n = Number(d) - 1000;
    const dotted = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    assert.equal(I.guardViolation("Te lo dejo en $" + dotted + ".", "agro"), "price", dotted);
  }
  for (const r of ["La Academia cuesta $107.100.", "HR35 con descuento: $1.590.000 + IVA", "Valor total $1.900.000", "Invernadero 35 m² instalado $890.000", "re-test (valor $150.000)", "cuesta $1.119.000", "US$ 1.690"]) {
    assert.equal(I.guardViolation(r, "agro"), "price", r);
  }
});

test("spicelab sigue sin precios: ni en el prompt ni a la salida", () => {
  for (const lang of ["es", "en"]) {
    const p = I.buildSystemPrompt(lang, "spicelab");
    assert.ok(!/\$\s?\d/.test(p), "spicelab prompt con monto");
    assert.ok(!p.includes("lista de precios publicada»") || !p.includes("$119.000"));
  }
  for (const x of LISTED) assert.equal(I.guardViolation("Cuesta " + x.text, "spicelab"), "price", x.text);
});

test("sync: cambiar el bloque de precios actualiza FALLBACK_AGRO_PRICES (y --check lo detecta antes)", () => {
  const inline = I.FALLBACK_AGRO_PRICES;
  assert.equal(inline, MD, "el respaldo inline debe ser idéntico a knowledge/agro-prices.md");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agro-sync-"));
  try {
    for (const d of ["knowledge", "netlify/functions", "scripts"]) fs.mkdirSync(path.join(tmp, d), { recursive: true });
    for (const f of ["knowledge/spicelab.md", "knowledge/huerto.md", "knowledge/agro-prices.md", "netlify/functions/chat.js", "scripts/sync-knowledge.js"])
      fs.copyFileSync(path.join(ROOT, f), path.join(tmp, f));
    const mdPath = path.join(tmp, "knowledge", "agro-prices.md");
    fs.writeFileSync(mdPath, fs.readFileSync(mdPath, "utf8").replace("$119.000 CLP. «Precio del curso»", "$129.000 CLP. «Precio del curso»"));
    const sync = path.join(tmp, "scripts", "sync-knowledge.js");
    const chk = spawnSync(process.execPath, [sync, "--check", "--root=" + tmp], { encoding: "utf8" });
    assert.equal(chk.status, 1, "--check debe fallar antes de sincronizar");
    execFileSync(process.execPath, [sync, "--root=" + tmp], { encoding: "utf8" });
    const js = fs.readFileSync(path.join(tmp, "netlify", "functions", "chat.js"), "utf8");
    const m = /const FALLBACK_AGRO_PRICES = (".*");\n/.exec(js);
    const fb = JSON.parse(m[1]);
    assert.ok(fb.includes("$129.000 CLP"));
    assert.ok(I.agroAllowedAmounts(fb).includes("129000"));
    assert.equal(spawnSync(process.execPath, [sync, "--check", "--root=" + tmp]).status, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("set en vivo: preguntas de precio de agro (no se ejecutan aquí)", () => {
  const { Q } = require("../scripts/live-test.js");
  const qs = Q.agro.map((q) => q[2]);
  assert.ok(qs.includes("¿Cuánto cuesta la Academia?"));
  assert.ok(qs.includes("¿Cuánto cuesta el HR35?"));
  assert.ok(qs.includes("¿Cuánto cuesta un análisis de suelo?"));
});

test("huerto #15: la misión sale solo en el idioma del visitante", () => {
  const both = 'Huerto supports "regenerative-agriculture education in developing countries" through Be Well Center, a school in Bangladesh that trains people in regenerative agriculture and holistic health. Huerto apoya la «educación en agricultura regenerativa en países en desarrollo» a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral.  \n\nhttps://wa.me/56971540665';
  const en = I.guardReply(both, "en", "huerto").reply;
  assert.ok(en.includes("regenerative-agriculture education in developing countries"));
  assert.ok(!en.includes("educación en agricultura regenerativa"));
  assert.ok(en.includes("https://wa.me/56971540665"));
  const es = I.guardReply(both, "es", "huerto").reply;
  assert.ok(es.startsWith("Huerto apoya la «educación en agricultura regenerativa en países en desarrollo»"));
  assert.ok(!es.includes("Huerto supports"));
  const onlyEs = I.fixMissionLanguage("Huerto apoya la «educación en agricultura regenerativa en países en desarrollo» a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral.", "en");
  assert.ok(onlyEs.startsWith('Huerto supports "regenerative-agriculture education in developing countries"'));
  const p = I.buildSystemPrompt("en", "huerto");
  assert.match(p, /never give both language versions/);
});
