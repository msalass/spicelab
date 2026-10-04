"use strict";
// Decisión de Marcos (2 oct 2026): el bot no explica ciencia isotópica ni geoquímica;
// deriva a Marcos por WhatsApp. Todo offline.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

delete process.env.GROQ_API_KEY;
delete process.env.OPENAI_API_KEY;
const I = require("../netlify/functions/chat.js")._internal;
const ROOT = path.join(__dirname, "..");
const SITES = ["spicelab", "agro", "huerto"];
const LANGS = ["es", "en"];

// Contenido explicativo que ya no debe estar (definiciones, mecanismos, cómo funciona un método).
const EXPLANATION = [
  /evaporaci[oó]n\s*\(enriquecimiento\)/i,
  /evaporation ENRICHES/i,
  /does NOT date water/i,
  /no sirve para datar/i,
  /fracciona(?!miento, mecanismos)/i,
  /fractionat(?!ion,)/i,
  /desequilibrio de uranio/i,
  /plasma acoplado/i,
  /varios colectores/i,
  /mismo elemento, distinto número de neutrones/i,
  /reflejan la precipitación de recarga/i,
  /trazador de procedencia/i,
  /per mil \(‰\) deviations/i,
  /imogolita/i,
  /explica el concepto/i,
  /explain the concept/i,
  /Educational/,
];

function knowledge() {
  return ["spicelab.md", "huerto.md"].map((f) => fs.readFileSync(path.join(ROOT, "knowledge", f), "utf8"));
}

test("ciencia: knowledge/*.md no contiene explicaciones isotópicas/geoquímicas", () => {
  for (const md of knowledge()) for (const re of EXPLANATION) assert.ok(!re.test(md), "knowledge contiene " + re);
});

test("ciencia: el system prompt (3 sitios × ES/EN) no contiene explicaciones y sí la derivación a Marcos", () => {
  for (const site of SITES)
    for (const lang of LANGS) {
      const p = I.buildSystemPrompt(lang, site);
      for (const re of EXPLANATION) assert.ok(!re.test(p), site + "/" + lang + " contiene " + re);
      assert.ok(p.includes(I.TECH_ES), site + "/" + lang + " sin TECH_ES");
      assert.ok(p.includes(I.TECH_EN), site + "/" + lang + " sin TECH_EN");
      assert.match(p, /never explain isotope science or geochemistry/);
    }
});

test("ciencia: textos de derivación mencionan a Marcos, PhD UQ y WhatsApp, y pasan el guard", () => {
  for (const t of [I.TECH_ES, I.TECH_EN]) {
    assert.match(t, /Marcos/);
    assert.match(t, /University of Queensland/);
    assert.ok(t.includes("https://wa.me/56971540665"));
    for (const site of SITES) assert.equal(I.guardViolation(t, site), null);
  }
});

// Cobertura de las 3 preguntas pendientes: cada término técnico que traen está nombrado en la regla de derivación.
const COVERED = [
  { id: "spicelab #4", q: "Soy hidrogeóloga. ¿Qué me dice el δ18O de un agua subterránea sobre su recarga, y qué aporta además el 87Sr/86Sr?", terms: ["δ18O", "87Sr/86Sr"] },
  { id: "spicelab #9", q: "Do you run U-Th dating in-house, and how much does it cost per sample?", terms: ["U-Th", "dating"], lang: "en" },
  { id: "huerto #10", q: "Pregunta curiosa: ¿qué es el δ18O y para qué sirve?", terms: ["δ18O"], site: "huerto" },
];

test("ciencia: spicelab #4, spicelab #9 y huerto #10 quedan cubiertas por la regla de derivación", () => {
  for (const c of COVERED) {
    const p = I.buildSystemPrompt(c.lang || "es", c.site || "spicelab");
    const rule = p.split("\n").find((l) => l.includes("SCIENCE QUESTIONS /"));
    assert.ok(rule, c.id + ": falta la regla");
    for (const t of c.terms) {
      assert.ok(c.q.includes(t), c.id + ": la pregunta no trae " + t);
      assert.ok(rule.includes(t), c.id + ": la regla no nombra " + t);
    }
  }
  // spicelab #9 además necesita la frase de laboratorio EN y la línea de precio EN.
  const p9 = I.buildSystemPrompt("en", "spicelab");
  assert.ok(p9.includes(I.LAB_EN));
  assert.match(p9, /Bring up pricing ONLY when the visitor asks about price/);
  assert.match(p9, /also asks about the lab or analyses, add the lab sentence verbatim; if it asks about price, handle the price as the price rules say/);
});

test("ciencia: el set en vivo incluye las 3 preguntas como 'science' (y #9 con lab+precio)", () => {
  const src = fs.readFileSync(path.join(ROOT, "scripts", "live-test.js"), "utf8");
  assert.ok(src.includes('["es", "science", "Soy hidrogeóloga.'));
  assert.ok(src.includes('["en", "science_lab_price", "Do you run U-Th dating in-house'));
  assert.ok(src.includes('["es", "science", "Pregunta curiosa: ¿qué es el δ18O'));
});

test("ciencia: se mantiene el manejo agrícola de Agro (trumaos, alófano, pH, encalado)", () => {
  const sp = knowledge()[0];
  assert.match(sp, /trumaos = Andisoles/);
  assert.match(sp, /alófano/);
  assert.match(sp, /aluminio intercambiable/);
  assert.match(sp, /encalado/);
});

test("widget: sin chip de ciencia isotópica", () => {
  const w = fs.readFileSync(path.join(ROOT, "spice-widget.js"), "utf8");
  assert.ok(!/trazador isotópico|isotopic tracer|preguntas de geoquímica|geoscience questions/.test(w));
});
