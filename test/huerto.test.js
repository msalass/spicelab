"use strict";
/* Huerto (huerto.spicelab.cl) — offline tests. Run: npm test */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Offline: never use real keys from the box environment.
delete process.env.GROQ_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.GROQ_MODEL;
delete process.env.OPENAI_MODEL;
delete process.env.OPENAI_BASE_URL;

const ROOT = path.join(__dirname, "..");
const chat = require("../netlify/functions/chat.js");
const I = chat._internal;
const md = fs.readFileSync(path.join(ROOT, "knowledge", "huerto.md"), "utf8");

const LAB_ES =
  "No tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.";
const CARD_RE = /sin\s+tarjeta|no\s+credit\s+card|without\s+(a\s+)?(credit\s+)?card/i;
const HUERTO_PRICES = ["$4.990", "$39.990", "US$5.99", "US$59"];

// ---------- knowledge ----------

test("huerto.md y FALLBACK_HUERTO inline son idénticos", () => {
  assert.equal(I.FALLBACK_HUERTO, md);
  assert.equal(I.loadKnowledge("huerto"), md);
});

test("huerto.md: precios verificados, prueba con tarjeta, frase de laboratorio", () => {
  for (const p of HUERTO_PRICES) assert.ok(md.includes(p), "falta " + p);
  assert.match(md, /7 días gratis con tarjeta/);
  assert.match(md, /cobro empieza el día 8/);
  assert.match(md, /Cancela cuando quieras/);
  assert.ok(md.includes(LAB_ES));
  assert.ok(md.includes("https://wa.me/56971540665"));
  assert.ok(md.includes("https://huerto.spicelab.cl/login"));
});

test("huerto.md: sin «sin tarjeta», sin 51%, sin «más de la mitad», sin cargo de validación", () => {
  assert.ok(!CARD_RE.test(md));
  assert.ok(!/51\s?%/.test(md));
  assert.ok(!/m[aá]s de la mitad/i.test(md));
  assert.ok(!/950/.test(md));
});

test("huerto.md pasa el guard de huerto y es bloqueado por el de spicelab/agro", () => {
  // the rule text itself names codes/cupones; the code check is for model output only
  assert.equal(I.guardViolation(md, "huerto", { skip: ["code"] }), null);
  assert.equal(I.guardViolation(md, "spicelab"), "price");
  assert.equal(I.guardViolation(md, "agro"), "price");
});

test("prompts: huerto lleva precios y reglas; spicelab/agro no llevan precios de Huerto", () => {
  for (const lang of ["es", "en"]) {
    const h = I.buildSystemPrompt(lang, "huerto");
    assert.ok(h.includes("SITE: https://huerto.spicelab.cl"));
    assert.ok(h.includes(LAB_ES));
    assert.ok(h.includes("$4.990 CLP"));
    assert.ok(h.includes("US$5.99"));
    assert.equal(I.guardViolation(h, "huerto", { skip: ["code"] }), null);
    assert.ok(!CARD_RE.test(h));
    assert.ok(!/51\s?%/.test(h));
    for (const site of ["spicelab", "agro"]) {
      const sp = I.buildSystemPrompt(lang, site);
      assert.equal(I.guardViolation(sp, site), null);
      for (const p of HUERTO_PRICES) assert.ok(!sp.includes(p), site + " contiene " + p);
      assert.ok(!sp.includes("# Huerto (https://huerto.spicelab.cl)"));
    }
  }
});

// ---------- guard ----------

const HUERTO_PASS = [
  "Huerto cuesta $4.990 al mes o $39.990 al año.",
  "Cuesta $4.990 al mes, con 7 días gratis.",
  "Son 4.990 CLP mensuales.",
  "El anual es $39990.",
  "CLP 39.990 al año",
  "$4.990 CLP / mes · $39.990 CLP / año",
  "4.990 pesos chilenos al mes",
  "Fuera de Latinoamérica: US$5.99 al mes o US$59 al año.",
  "US$5,99 al mes",
  "USD 5.99 / month, USD 59 / year",
  "$5.99 USD per month",
  "59 USD al año",
  "Empieza 7 días gratis con tarjeta; el cobro empieza el día 8.",
  "Cama de 70 cm, invernadero de 4.2 × 13.2 m.",
  "δ18O de -5‰ y 87Sr/86Sr = 0.7092",
  I.SAFE_HUERTO_REPLY.es,
  I.SAFE_HUERTO_REPLY.en,
];
const HUERTO_BLOCK = [
  "El análisis de suelo cuesta $45.000",
  "El HR35 cuesta $3.500.000",
  "HR35 cuesta $4.990.000",
  "Huerto Premium: $9.990 al mes",
  "Hay un cargo de validación de $950 CLP",
  "US$590 al año",
  "US$6.99 al mes",
  "$59 al año",
  "€4.990",
  "Desde 2 UF",
  "Puedes empezar sin tarjeta.",
  "Con un código arma el huerto sin tarjeta.",
  "No se requiere tarjeta para la prueba.",
  "Start free, no credit card required.",
  "Try it without a card.",
  "El 51% va a Be Well Center.",
];

for (const r of HUERTO_PASS) {
  test("guard huerto deja pasar: " + r.slice(0, 60), () => {
    assert.equal(I.guardViolation(r, "huerto"), null);
  });
}
for (const r of HUERTO_BLOCK) {
  test("guard huerto bloquea: " + r, () => {
    const v = I.guardViolation(r, "huerto");
    assert.notEqual(v, null);
    const out = I.guardReply(r, "es", "huerto");
    // price/share → resumen de membresía; tarjeta → mensaje de código/clientes SPICe
    assert.equal(out.reply, v === "card" ? I.SAFE_CODE_REPLY.es : I.SAFE_HUERTO_REPLY.es);
  });
}

const HUERTO_PRICE_REPLIES = [
  "Huerto cuesta $4.990 al mes o $39.990 al año.",
  "US$5.99 al mes o US$59 al año.",
  "Son 4.990 CLP mensuales.",
  "USD 5.99 / month",
];
for (const site of ["spicelab", "agro"]) {
  for (const r of HUERTO_PRICE_REPLIES.concat(["El análisis de suelo cuesta $45.000"])) {
    test("guard " + site + " bloquea también: " + r, () => {
      assert.equal(I.guardViolation(r, site), "price");
      assert.equal(I.guardReply(r, "es", site).reply, I.SAFE_PRICE_REPLY.es);
    });
  }
}

// ---------- site resolution ----------

test("resolveSite por Origin", () => {
  assert.equal(I.resolveSite("https://spicelab.cl"), "spicelab");
  assert.equal(I.resolveSite("https://www.spicelab.cl"), "spicelab");
  assert.equal(I.resolveSite("https://agro.spicelab.cl"), "agro");
  assert.equal(I.resolveSite("https://huerto.spicelab.cl"), "huerto");
  assert.equal(I.resolveSite("https://www.huerto.spicelab.cl/"), "huerto");
});

test("resolveSite ignora site falso desde spicelab/agro/otros", () => {
  assert.equal(I.resolveSite("https://spicelab.cl", "huerto"), "spicelab");
  assert.equal(I.resolveSite("https://agro.spicelab.cl", "huerto"), "agro");
  assert.equal(I.resolveSite("https://deploy-preview-1--x.netlify.app", "huerto"), "spicelab");
  assert.equal(I.resolveSite("", "huerto"), "spicelab");
  assert.equal(I.resolveSite("https://huerto.spicelab.cl", "spicelab"), "huerto");
});

test("resolveSite: SITE_ID para previews/sin Origin; pista solo en localhost", () => {
  process.env.SITE_ID = "huerto";
  try {
    assert.equal(I.resolveSite("https://deploy-preview-1--huerto.netlify.app"), "huerto");
    assert.equal(I.resolveSite(""), "huerto");
    assert.equal(I.resolveSite("https://agro.spicelab.cl"), "agro"); // Origin conocido gana
  } finally {
    delete process.env.SITE_ID;
  }
  process.env.SITE_ID = "bogus";
  try {
    assert.equal(I.resolveSite(""), "spicelab");
  } finally {
    delete process.env.SITE_ID;
  }
  assert.equal(I.resolveSite("http://localhost:8888", "huerto"), "huerto");
  assert.equal(I.resolveSite("http://localhost:8888", "nope"), "spicelab");
});

// ---------- CORS ----------

test("CORS permite huerto.spicelab.cl y www.", () => {
  for (const o of ["https://huerto.spicelab.cl", "https://www.huerto.spicelab.cl"]) {
    assert.ok(I.isAllowedOrigin(o), o);
    assert.equal(I.corsHeaders(o)["Access-Control-Allow-Origin"], o);
  }
  assert.equal(I.isAllowedOrigin("https://huerto.spicelab.cl.evil.example"), false);
});

// ---------- handler (fetch mocked) ----------

function mockModel(t, content) {
  const seen = [];
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    seen.push(JSON.parse(opts.body));
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content } }] }) };
  });
  return seen;
}

async function ask(origin, site, lang) {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_BASE_URL = "https://llm.invalid/v1";
  I._resetRate();
  try {
    return await chat.handler({
      httpMethod: "POST",
      headers: { origin, "x-forwarded-for": "10.0.0.9" },
      body: JSON.stringify({ lang: lang || "es", site, messages: [{ role: "user", content: "¿Cuánto cuesta?" }] }),
    });
  } finally {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
  }
}

test("handler huerto: precio permitido pasa y usa knowledge de Huerto", async (t) => {
  const reply = "Huerto cuesta $4.990 al mes o $39.990 al año, con 7 días gratis con tarjeta.";
  const seen = mockModel(t, reply);
  const res = await ask("https://huerto.spicelab.cl", "huerto");
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.site, "huerto");
  assert.equal(body.reply, reply);
  assert.ok(seen[0].messages[0].content.includes("# Huerto (https://huerto.spicelab.cl)"));
});

test("handler huerto: precio inventado se redirige", async (t) => {
  mockModel(t, "El plan Pro cuesta $9.990 al mes.");
  const res = await ask("https://huerto.spicelab.cl", "huerto", "en");
  assert.equal(JSON.parse(res.body).reply, I.SAFE_HUERTO_REPLY.en);
});

test("handler: agro diciendo site=huerto NO desbloquea precios", async (t) => {
  const seen = mockModel(t, "Huerto cuesta $4.990 al mes.");
  const res = await ask("https://agro.spicelab.cl", "huerto");
  const body = JSON.parse(res.body);
  assert.equal(body.site, "agro");
  assert.equal(body.reply, I.SAFE_PRICE_REPLY.es);
  assert.ok(!seen[0].messages[0].content.includes("$4.990"));
});

test("handler: spicelab diciendo site=huerto NO desbloquea precios", async (t) => {
  mockModel(t, "US$5.99 al mes.");
  const res = await ask("https://spicelab.cl", "huerto");
  const body = JSON.parse(res.body);
  assert.equal(body.site, "spicelab");
  assert.equal(body.reply, I.SAFE_PRICE_REPLY.es);
});

test("widget: detecta huerto por data-site/hostname y envía site", () => {
  const w = fs.readFileSync(path.join(ROOT, "spice-widget.js"), "utf8");
  assert.match(w, /huerto: "https:\/\/huerto\.spicelab\.cl"/);
  assert.match(w, /siteFrom\(location\.hostname\)/);
  assert.match(w, /site: SITE_ID/);
  assert.ok(w.includes("https://huerto.spicelab.cl/login"));
});

// ---------- regla del código de SPICe (Marcos, 2 oct 2026) ----------

test("regla del código en huerto.md y en el prompt de Huerto (ES y EN)", () => {
  assert.match(md, /solo para clientes de SPICe y usuarios beta; ninguna oferta ni promoción lo entrega/);
  assert.match(md, /only for SPICe clients and beta users; no offer or promotion gives it out/);
  assert.match(md, /El código de SPICe es para clientes de SPICe; escríbenos por WhatsApp: https:\/\/wa\.me\/56971540665/);
  assert.ok(!/se pega al armar el huerto/.test(md), "ya no se menciona cómo usar el código");
  for (const lang of ["es", "en"]) {
    const h = I.buildSystemPrompt(lang, "huerto");
    assert.match(h, /The code is ONLY for SPICe clients and beta users; no offer or promotion gives it out/);
    assert.ok(h.includes(I.CODE_ES));
    assert.ok(h.includes(I.CODE_EN));
    assert.ok(!/promo code is optional/i.test(h));
  }
});

const CODE_BLOCK = [
  "Usa el código HUERTO2026 al armar tu huerto.",
  "Tenemos un código de descuento para ti.",
  "Pídenos un cupón y entras gratis.",
  "Con eso tienes acceso gratis.",
  "Huerto es gratis para siempre con el plan beta.",
  "Te damos un código para que no pagues.",
  "Escríbenos y te enviamos el código.".replace("el código", "un código"),
  "Te regalamos 3 meses gratis.",
  "Ofrecemos 30 días gratis si nos escribes.",
  "Podemos darte una prueba extendida.",
  "We can give you free access.",
  "Use a promo code at checkout.",
  "Just use the code SPICEBETA.",
  "Ask us for a coupon.",
  "You get one month free.",
];
for (const r of CODE_BLOCK) {
  test("guard huerto bloquea oferta de código: " + r, () => {
    assert.equal(I.guardViolation(r, "huerto"), "code");
    const out = I.guardReply(r, /[a-z] (can|use|code|ask|get)/i.test(r) ? "en" : "es", "huerto");
    assert.ok(out.reply === I.SAFE_CODE_REPLY.es || out.reply === I.SAFE_CODE_REPLY.en);
  });
}

const CODE_PASS = [
  "Empieza 7 días gratis con tarjeta; el cobro empieza el día 8.",
  "La prueba son 7 días gratis con tarjeta.",
  "Start 7 days free with a card.",
  "The trial is a 7-day free trial with a card.",
  "El código de SPICe es para clientes de SPICe; escríbenos por WhatsApp wa.me/56971540665",
  "The SPICe code is for SPICe clients; message us on WhatsApp: https://wa.me/56971540665",
  I.SAFE_CODE_REPLY.es,
  I.SAFE_CODE_REPLY.en,
  "Registra los kilos de cada cama en Registro.",
];
for (const r of CODE_PASS) {
  test("guard huerto deja pasar: " + r.slice(0, 70), () => {
    assert.equal(I.guardViolation(r, "huerto"), null);
  });
}

test("handler huerto (fetch mock): oferta de código → mensaje de clientes SPICe", async (t) => {
  mockModel(t, "¡Claro! Usa el código SPICEBETA y entras con acceso gratis.");
  const res = await ask("https://huerto.spicelab.cl", "huerto");
  assert.equal(JSON.parse(res.body).reply, I.SAFE_CODE_REPLY.es);
});

// ---------- live-test findings (2 Oct 2026) ----------

test("guard huerto acepta 'US $5.99' y 'US $59' (formato visto en vivo)", () => {
  assert.equal(I.guardViolation("- **US $5.99 per month**\n- **US $59 per year**", "huerto"), null);
  assert.equal(I.guardViolation("US $6.99 per month", "huerto"), "price");
});

test("repairLinks: subdominio inventado y otro número de WhatsApp se corrigen", () => {
  const out = I.guardReply("Entra en <https://huertos.spicelab.cl/login> o " + "w" + "a.me/56" + "X".repeat(9), "es", "huerto");
  assert.ok(!out.reply.includes("huertos.spicelab.cl"));
  assert.ok(out.reply.includes("https://huerto.spicelab.cl/"));
  assert.ok(!/56X/.test(out.reply));
  assert.equal(out.guarded, "link");
  const ok = I.guardReply("Ver https://agro.spicelab.cl/ y https://spicelab.cl/contacto/ y https://wa.me/56971540665", "es", "agro");
  assert.equal(ok.guarded, null);
});
