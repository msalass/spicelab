"use strict";
// Nombre del bot: «Víctor» (con tilde, en ES y EN), en honor a Victor Goldschmidt. Offline.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

delete process.env.GROQ_API_KEY;
delete process.env.OPENAI_API_KEY;
const I = require("../netlify/functions/chat.js")._internal;
const ROOT = path.join(__dirname, "..");
const W = fs.readFileSync(path.join(ROOT, "spice-widget.js"), "utf8");
const SITES = ["spicelab", "agro", "huerto"];
const LANGS = ["es", "en"];
const NAME = "Víctor";
const OLD = new RegExp("Vict" + "ok"); // nombre descartado; no se escribe literal en el paquete

// Evalúa el objeto de textos del widget (var I = {...}) y aplica la misma mezcla por sitio que t().
function widgetCopy(lang, site) {
  const start = W.indexOf("var I = {");
  const end = W.indexOf("\n  };", start);
  assert.ok(start > 0 && end > start, "no encuentro var I = {...} en el widget");
  const BOT_NAME = /var BOT_NAME = "([^"]+)";/.exec(W)[1];
  const ctx = { BOT_NAME };
  vm.runInNewContext(W.slice(start, end + 4).replace("var I =", "this.I ="), ctx);
  const base = ctx.I[lang];
  return Object.assign({}, base, base[site] || {});
}

test("nombre: BOT_NAME es exactamente «Víctor» en widget y chat.js", () => {
  assert.equal(I.BOT_NAME, NAME);
  assert.match(W, /var BOT_NAME = "Víctor";/);
});

test("nombre: el título del panel (header h2) y la etiqueta de mensajes usan «Víctor»", () => {
  assert.ok(W.includes('<h2 id="spice-title">\' + BOT_NAME + \'</h2>'));
  assert.ok(W.includes('who.textContent = role === "user" ? t().you : BOT_NAME;'));
  assert.ok(W.includes('<div class="who">\' + BOT_NAME + \'</div>'));
  for (const site of SITES) for (const lang of LANGS) assert.equal(widgetCopy(lang, site).title, NAME, site + "/" + lang);
});

test("nombre: el saludo de cada sitio e idioma presenta a «Víctor»", () => {
  for (const site of SITES)
    for (const lang of LANGS) {
      const w = widgetCopy(lang, site).welcome;
      assert.ok(w.includes(NAME), site + "/" + lang + ": " + w);
      assert.ok(w.startsWith(lang === "es" ? "Hola, soy Víctor, el asistente de SPICe." : "Hi, I’m Víctor, SPICe’s assistant."), site + "/" + lang);
      assert.ok(w.includes("https://wa.me/56971540665"), "sigue el WhatsApp");
    }
});

test("nombre: el system prompt (3 sitios × ES/EN) se presenta como «Víctor» y explica el nombre en una línea", () => {
  for (const site of SITES)
    for (const lang of LANGS) {
      const p = I.buildSystemPrompt(lang, site);
      assert.ok(p.startsWith("You are Víctor, SPICe's on-site assistant"), site + "/" + lang);
      assert.ok(p.includes("«Soy Víctor, el asistente de SPICe»"));
      assert.ok(p.includes("named after Victor Goldschmidt, the father of geochemistry"));
      assert.ok(p.includes("No science explanation about him or his work."));
      assert.ok(p.includes("You are Víctor, SPICe's assistant."));
      assert.ok(!/You are SPICe[.,]/.test(p), "queda «You are SPICe»");
    }
});

test("nombre: knowledge menciona a Víctor; no queda el nombre descartado ni «soy SPICe» en el paquete", () => {
  for (const f of ["knowledge/spicelab.md", "knowledge/huerto.md", "README.md", "BRIEF-VICTOR.md", "BRIEF-VICTOR-HUERTO.md", "public/demo.html"]) {
    const s = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(s.includes("Víctor"), f);
  }
  for (const f of ["spice-widget.js", "netlify/functions/chat.js", "knowledge/spicelab.md", "knowledge/huerto.md", "README.md", "BRIEF-VICTOR.md", "BRIEF-VICTOR-HUERTO.md", "public/demo.html", "scripts/live-test.js"]) {
    const s = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(!OLD.test(s), f + " contiene el nombre descartado");
    assert.ok(!/soy SPICe\b|I’m SPICe\b|I'm SPICe\b/.test(s), f + " aún dice soy SPICe");
  }
});

test("nombre: el set en vivo pregunta el nombre en los 3 sitios", () => {
  const { Q } = require("../scripts/live-test.js");
  assert.deepEqual(Q.spicelab[11], ["es", "name", "¿Cómo te llamas?"]);
  assert.deepEqual(Q.agro[12], ["es", "name", "¿Cómo te llamas?"]);
  assert.deepEqual(Q.huerto[16], ["en", "name", "What's your name?"]);
});
