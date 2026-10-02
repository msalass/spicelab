"use strict";
/* Offline tests: no network, no API key. Run: npm test */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const chat = require("../netlify/functions/chat.js");
const I = chat._internal;

const LAB_ES =
  "No tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.";
const LAB_EN =
  "We don't have our own lab; we work with collaborating laboratories, and isotope analyses are done at the University of Queensland.";
const CARD_RE = /sin\s+tarjeta|no\s+credit\s+card|without\s+(a\s+)?credit\s+card/i;
const OLD_FRAMING = [
  /en desarrollo/i,
  /Chile y (en )?el extranjero/i,
  /in-house/i,
  /mass-spec/i,
  /IN DEVELOPMENT/,
  /partner labs/i,
];

function listFiles(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === ".netlify" || e.name === ".env") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else if (/\.(js|md|html|toml|json|example)$/.test(e.name)) out.push(p);
  }
  return out;
}

const md = fs.readFileSync(path.join(ROOT, "knowledge", "spicelab.md"), "utf8");

// ---------- (a) knowledge + system prompt ----------

test("knowledge md y FALLBACK inline son idénticos (npm run sync)", () => {
  assert.equal(I.FALLBACK_KNOWLEDGE, md);
});

for (const lang of ["es", "en"]) {
  test("system prompt (" + lang + ") contiene la frase exacta de laboratorio ES y EN", () => {
    const sp = I.buildSystemPrompt(lang);
    assert.ok(sp.includes(LAB_ES), "falta frase ES");
    assert.ok(sp.includes(LAB_EN), "falta frase EN");
    assert.ok(sp.includes("https://wa.me/56971540665"));
  });

  test("system prompt (" + lang + ") sin precios, sin «sin tarjeta», sin framing antiguo", () => {
    const sp = I.buildSystemPrompt(lang);
    assert.equal(I.guardViolation(sp), null, "el prompt dispara el guard de precios/tarjeta");
    assert.ok(!CARD_RE.test(sp));
    for (const re of OLD_FRAMING) assert.ok(!re.test(sp), "framing antiguo: " + re);
  });
}

test("knowledge contiene la frase exacta y no tiene precios ni «sin tarjeta»", () => {
  for (const k of [md, I.FALLBACK_KNOWLEDGE]) {
    assert.ok(k.includes(LAB_ES));
    assert.equal(I.guardViolation(k), null);
    assert.ok(!CARD_RE.test(k));
    assert.ok(!/desde\s*\$/i.test(k));
    for (const re of OLD_FRAMING) assert.ok(!re.test(k), "framing antiguo: " + re);
  }
});

test("knowledge usa enlaces absolutos para las páginas del sitio", () => {
  const rel = md.match(/(^|[\s(])\/(acerca-de|servicios|equipo|muestras|proyectos|contacto|en)\b/gm);
  assert.equal(rel, null, "rutas relativas encontradas: " + rel);
});

// ---------- (b) WhatsApp ----------

test("todo wa.me del paquete apunta exactamente a wa.me/56971540665", () => {
  const files = listFiles(ROOT);
  assert.ok(files.length > 5);
  const bad = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    // skip this test file's own pattern literals
    if (f === __filename) continue;
    const re = /wa\.me\/([0-9A-Za-z+]*)/g;
    let m;
    while ((m = re.exec(txt))) {
      if (m[1] !== "56971540665") bad.push(path.relative(ROOT, f) + ": wa.me/" + m[1]);
    }
    if (/56X{3,}/i.test(txt)) bad.push(path.relative(ROOT, f) + ": placeholder 56XXXX");
    if (CARD_RE.test(txt) && !/test\//.test(f) && !/chat\.js$/.test(f) && !/README|BRIEF/.test(f)) {
      bad.push(path.relative(ROOT, f) + ": frase de tarjeta");
    }
  }
  assert.deepEqual(bad, []);
});

test("widget: WhatsApp en bienvenida, errores y footer (ES y EN)", () => {
  const w = fs.readFileSync(path.join(ROOT, "spice-widget.js"), "utf8");
  assert.ok(w.includes('var WA = "https://wa.me/56971540665"'));
  const welcomes = w.match(/welcome:\s*\n?\s*"[^"]*"/g);
  assert.equal(welcomes.length, 2);
  for (const s of welcomes) assert.ok(s.includes("https://wa.me/56971540665"), s);
  const errs = w.match(/err(Key|Net|Rate|Generic):\s*\n?\s*"[^"]*"/g);
  assert.equal(errs.length, 8);
  for (const s of errs) assert.ok(s.includes("https://wa.me/56971540665"), s);
  assert.ok(/footWa/.test(w));
  assert.ok(!CARD_RE.test(w));
  assert.equal(I.guardViolation(w.replace(/\$\d/g, "")), null);
});

// ---------- (c) output guard ----------

const BLOCK = [
  "El análisis de suelo cuesta $45.000",
  "Desde 2 UF",
  "USD 300",
  "sin tarjeta",
  "Prueba gratis, sin tarjeta de crédito.",
  "No credit card required.",
  "El HR35 vale 3.500.000 pesos",
  "Cuesta 20 mil pesos aprox.",
  "Consulting is priced at 120 per hour.",
  "Seminario: CLP 35.000",
  "Son 50 €",
  "US$ 900 por muestra",
  "El precio de referencia es 80",
];
const PASS = [
  "δ18O de -5‰",
  "δ¹⁸O de -5‰ VSMOW",
  "87Sr/86Sr = 0.7092",
  "HR35 de 35 m²",
  "U-Th 10.000 años",
  "Las concentraciones están entre 2 y 40 ppm.",
  "En 2019 publicamos sobre arrecifes holocenos.",
  "Coordenadas en zona 19 UTM.",
  "Horario: domingo a viernes, 9:00–18:00.",
  "Respondemos dentro de 12 horas hábiles.",
  "Para precios, escríbenos por WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).",
  "Los módulos van de 35–85 m².",
  "El costo analítico depende del laboratorio; escríbenos por WhatsApp.",
];

for (const r of BLOCK) {
  test("guard bloquea: " + r, () => {
    assert.notEqual(I.guardViolation(r), null);
    const out = I.guardReply(r, "es");
    assert.ok(out.reply.includes("https://wa.me/56971540665"));
    assert.equal(I.guardViolation(out.reply), null);
  });
}
for (const r of PASS) {
  test("guard deja pasar: " + r, () => {
    assert.equal(I.guardViolation(r), null);
    assert.equal(I.guardReply(r, "es").reply, r);
  });
}

test("safe replies (ES/EN) no se auto-bloquean", () => {
  for (const k of ["es", "en"]) {
    assert.equal(I.guardViolation(I.SAFE_PRICE_REPLY[k]), null);
    assert.ok(I.SAFE_PRICE_REPLY[k].includes("https://wa.me/56971540665"));
  }
});

// ---------- (d) CORS ----------

test("CORS permite spicelab.cl, agro.spicelab.cl y www.", () => {
  for (const o of [
    "https://spicelab.cl",
    "https://agro.spicelab.cl",
    "https://www.spicelab.cl",
    "https://www.agro.spicelab.cl",
    "http://localhost:8888",
  ]) {
    assert.ok(I.isAllowedOrigin(o), o);
    assert.equal(I.corsHeaders(o)["Access-Control-Allow-Origin"], o);
  }
});

test("CORS rechaza https://evil.example y look-alikes", () => {
  for (const o of ["https://evil.example", "https://spicelab.cl.evil.example", "https://evilspicelab.cl", "http://spicelab.cl"]) {
    assert.equal(I.isAllowedOrigin(o), false, o);
    assert.notEqual(I.corsHeaders(o)["Access-Control-Allow-Origin"], o);
  }
});

test("CORS: mismo origen (deploy preview) permitido vía Host", () => {
  const o = "https://deploy-preview-3--spice-agro.netlify.app";
  assert.equal(I.isAllowedOrigin(o), false);
  assert.equal(I.isAllowedOrigin(o, "deploy-preview-3--spice-agro.netlify.app"), true);
});

test("handler: evil origin → 403 sin llamar al modelo", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async () => {
    calls.push(1);
    throw new Error("network disabled in tests");
  });
  process.env.OPENAI_API_KEY = "test-key";
  const res = await chat.handler({
    httpMethod: "POST",
    headers: { origin: "https://evil.example", host: "spicelab.cl" },
    body: JSON.stringify({ messages: [{ role: "user", content: "hola" }] }),
  });
  delete process.env.OPENAI_API_KEY;
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 0);
});

// ---------- (e) missing key + handler with mocked fetch ----------

test("sin OPENAI_API_KEY → 503 JSON missing_api_key con WhatsApp", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async () => {
    calls.push(1);
    throw new Error("network disabled in tests");
  });
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  I._resetRate();
  const res = await chat.handler({
    httpMethod: "POST",
    headers: { origin: "https://agro.spicelab.cl", "x-forwarded-for": "10.0.0.1" },
    body: JSON.stringify({ messages: [{ role: "user", content: "hola" }] }),
  });
  if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "https://agro.spicelab.cl");
  const body = JSON.parse(res.body);
  assert.equal(body.error, "missing_api_key");
  assert.match(body.message, /OPENAI_API_KEY/);
  assert.match(body.message, /https:\/\/wa\.me\/56971540665/);
  assert.equal(calls.length, 0);
});

function mockModel(t, content) {
  const seen = [];
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    seen.push({ url, body: JSON.parse(opts.body) });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
    };
  });
  return seen;
}

async function ask(lang, origin) {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_BASE_URL = "https://llm.invalid/v1";
  I._resetRate();
  const res = await chat.handler({
    httpMethod: "POST",
    headers: { origin: origin || "https://spicelab.cl", "x-forwarded-for": "10.0.0.2" },
    body: JSON.stringify({ lang, messages: [{ role: "user", content: "¿Cuánto cuesta el análisis de suelo?" }] }),
  });
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  return res;
}

test("handler (fetch mock): respuesta con precio se redirige a WhatsApp", async (t) => {
  const seen = mockModel(t, "El análisis de suelo cuesta $45.000, sin tarjeta.");
  const res = await ask("es");
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.reply, I.SAFE_PRICE_REPLY.es);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, "https://llm.invalid/v1/chat/completions");
  assert.ok(seen[0].body.messages[0].content.includes(LAB_ES));
});

test("handler (fetch mock, EN): respuesta limpia pasa intacta", async (t) => {
  const clean = "87Sr/86Sr = 0.7092 is typical of modern seawater. Message us: https://wa.me/56971540665";
  mockModel(t, clean);
  const res = await ask("en", "https://www.agro.spicelab.cl");
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).reply, clean);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "https://www.agro.spicelab.cl");
});
