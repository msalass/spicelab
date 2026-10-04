"use strict";
// Voz humana (Marcos, 3 oct 2026): reglas de tono en el prompt; WhatsApp solo cuando es el siguiente paso.
const test = require("node:test");
const assert = require("node:assert/strict");

delete process.env.GROQ_API_KEY;
delete process.env.OPENAI_API_KEY;
const I = require("../netlify/functions/chat.js")._internal;
const SITES = ["spicelab", "agro", "huerto"];
const LANGS = ["es", "en"];
const each = (fn) => { for (const s of SITES) for (const l of LANGS) fn(I.buildSystemPrompt(l, s), s, l); };

test("voz: el prompt trae las reglas de voz humana (3 sitios × ES/EN)", () => {
  each((p, s, l) => {
    const id = s + "/" + l;
    assert.match(p, /HUMAN VOICE/, id);
    assert.match(p, /warm, real person at SPICe's front desk/, id);
    assert.match(p, /Chilean-neutral, cercano, tutea \(tú\)/, id);
    assert.match(p, /Answer the actual question first, in 1-3 short natural sentences/, id);
    assert.match(p, /Mirror the visitor's tone/, id);
    assert.match(p, /no corporate filler/, id);
    assert.match(p, /Vary your openings/, id);
    assert.match(p, /No markdown headers, no bold, no bullet lists unless you are giving real steps/, id);
    assert.match(p, /one short follow-up question/, id);
    assert.match(p, /If the visitor tells you their name, use it/, id);
    assert.match(p, /ALWAYS use tú/, id);
    assert.match(p, /Never usted/, id);
    assert.match(p, /No voseo/, id);
    assert.match(p, /never explain the science, not even one sentence/, id);
    assert.match(p, /do NOT introduce yourself in every reply/, id);
  });
});

test("voz: WhatsApp no se fuerza en cada respuesta; solo cuando es el siguiente paso real", () => {
  each((p, s, l) => {
    const id = s + "/" + l;
    assert.ok(!/EVERY reply ends with/i.test(p), id + ": aún obliga WhatsApp al final");
    assert.ok(!/TODA respuesta termina/i.test(p), id);
    assert.ok(!/primary CTA is always WhatsApp/i.test(p), id);
    assert.match(p, /mention it naturally, once, ONLY when it is the real next step/, id);
    assert.match(p, /Do NOT paste it at the end of every reply/, id);
    assert.ok(p.includes("https://wa.me/56971540665"), id + ": el enlace sigue disponible");
  });
});

test("voz: ciencia y precios son guía con ejemplos, no texto fijo; la frase de laboratorio sigue textual", () => {
  each((p, s, l) => {
    const id = s + "/" + l;
    assert.ok(!/reply exactly|with exactly this/i.test(p), id + ": queda una respuesta fija");
    assert.match(p, /in your own words: say it is a question for Marcos, our geochemist \(PhD from the University of Queensland\), and offer WhatsApp/, id);
    assert.match(p, /Vary the wording/, id);
    assert.ok(p.includes(I.LAB_ES) && p.includes(I.LAB_EN), id + ": falta la frase de laboratorio");
    assert.match(p, /quote (?:this sentence )?VERBATIM/, id);
  });
  assert.ok(I.TECH_EXAMPLES.es.length >= 3 && I.TECH_EXAMPLES.en.length >= 3);
  for (const t of I.TECH_EXAMPLES.es.concat(I.TECH_EXAMPLES.en)) {
    assert.match(t, /Marcos/);
    assert.match(t, /University of Queensland/);
    assert.ok(t.includes("https://wa.me/56971540665"));
    assert.ok(!/^¡Muy buena pregunta!|^Great question!/.test(t), "ejemplo con apertura robótica");
  }
});

test("voz: el guard no reescribe respuestas normales ni les pega WhatsApp", () => {
  const r = "Claro, Ana. Trabajamos con aguas, suelos y carbonatos. ¿Qué tipo de muestra tienes?";
  for (const s of SITES) assert.equal(I.guardReply(r, "es", s).reply, r);
});

test("voz: las respuestas de seguridad (guard) suenan humanas y mantienen las reglas", () => {
  const all = [I.SAFE_PRICE_REPLY, I.SAFE_AGRO_REPLY, I.SAFE_CODE_REPLY, I.SAFE_MISSION_REPLY, I.SAFE_HUERTO_REPLY];
  for (const r of all)
    for (const l of LANGS) {
      const t = r[l];
      assert.ok(!/no los publico en este chat|I don't share it in this chat|Estimado|Quedo atento/i.test(t), t);
      assert.ok(!/^¡Hola!|^¡Muy buena pregunta!|^Great question!/.test(t), t);
      assert.ok(t.length < 420, "demasiado largo: " + t);
    }
  // reglas intactas
  for (const l of LANGS) {
    assert.ok(!/\$\s?\d/.test(I.SAFE_PRICE_REPLY[l]) && !/\$\s?\d/.test(I.SAFE_AGRO_REPLY[l]));
    assert.match(I.SAFE_CODE_REPLY[l], l === "es" ? /solo para clientes de SPICe[\s\S]*7 días gratis con tarjeta/ : /only for SPICe clients[\s\S]*7-day free trial with a card/);
    assert.equal(I.guardViolation(I.SAFE_CODE_REPLY[l], "huerto"), null);
    assert.ok(I.SAFE_MISSION_REPLY[l].startsWith(l === "es" ? I.MISSION_ES || "Huerto apoya" : I.MISSION_EN || "Huerto supports"));
    assert.equal(I.guardViolation(I.SAFE_HUERTO_REPLY[l], "huerto"), null);
  }
});

test("voz: el voseo se corrige a tú chileno-neutro (cosmético)", () => {
  assert.equal(I.tidyReply("¿Qué hortalizas tenés en mente? Contame y escribinos."), "¿Qué hortalizas tienes en mente? Cuéntame y escríbenos.");
  assert.equal(I.tidyReply("Tenés que encalar."), "Tienes que encalar.");
  assert.match(I.buildSystemPrompt("es", "agro"), /tuteando SIEMPRE/);
});

test("voz: «Fuente: URL» se vuelve una frase natural", () => {
  assert.equal(I.tidyReply("El HR35 cuesta $1.690.000 + IVA. Fuente: https://agro.spicelab.cl/huerto-rentable-35."), "El HR35 cuesta $1.690.000 + IVA. Más detalle en https://agro.spicelab.cl/huerto-rentable-35.");
  assert.equal(I.guardViolation(I.tidyReply("El HR35 cuesta $1.690.000 + IVA. Fuente: https://agro.spicelab.cl/huerto-rentable-35."), "agro"), null);
});
