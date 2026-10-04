#!/usr/bin/env node
/* LIVE test against the configured provider (uses real tokens!).
 * The key comes ONLY from process.env (GROQ_API_KEY or OPENAI_API_KEY); it is never
 * printed or written. Output: live-test/<site>.md + live-test/summary.json
 * Usage: node scripts/live-test.js [spicelab|agro|huerto ...] [--only=site:idx,site:idx] [--gap=40] [--out=final]
 */
"use strict";
const fs = require("fs");
const path = require("path");
const chat = require("../netlify/functions/chat.js");
const I = chat._internal;

const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);
const OUT_SUB = (args.find((a) => a.startsWith("--out=")) || "").slice(6);
const OUT = path.join(ROOT, "live-test", OUT_SUB);
const GAP = Number((args.find((a) => a.startsWith("--gap=")) || "--gap=40").slice(6)) * 1000;
const ONLY = ((args.find((a) => a.startsWith("--only=")) || "").slice(7) || "")
  .split(",")
  .filter(Boolean);
const SITES_ARG = args.filter((a) => !a.startsWith("--"));
// --no-retry: on a 429 do not wait/retry; stop the run and report when quota frees.
const NO_RETRY = args.indexOf("--no-retry") !== -1;
// --wait-on-429: on a 429, wait the upstream retry-after (or "try again in …") and retry the same
// question, as long as the retry would still start before --stop-at. Max WAIT_MAX waits per question.
const WAIT_ON_429 = args.indexOf("--wait-on-429") !== -1;
const WAIT_MAX = 8;
let lastRetryAfterSec = null;
// Hard stop: no live calls at or after this local time (HH:MM), e.g. --stop-at=19:30
const STOP_AT = (args.find((a) => a.startsWith("--stop-at=")) || "").slice(10);
let lastUpstream429 = "";
function stopAtMs(stopAt, now) {
  if (!stopAt) return Infinity;
  const [h, m] = stopAt.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
function pastStop(now) {
  return (now === undefined ? Date.now() : now) >= stopAtMs(STOP_AT, now === undefined ? Date.now() : now);
}

/* Parse Groq's wait hint: Retry-After header (seconds) or "try again in 23m52.5s" / "1h2m3s" / "4.2s". */
function parseRetryAfter(headerValue, bodyText) {
  const n = Number(headerValue);
  if (headerValue != null && headerValue !== "" && isFinite(n) && n >= 0) return n;
  const m = /try again in ((?:\d+h)?(?:\d+m)?(?:[\d.]+s)?)/i.exec(String(bodyText || ""));
  if (!m || !m[1]) return null;
  const p = /(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/.exec(m[1]);
  return (Number(p[1] || 0) * 3600) + (Number(p[2] || 0) * 60) + Number(p[3] || 0);
}

/*
 * What to do after a 429. Pure, so it can be tested.
 * opts: { wait, noRetry, retryAfterSec, now, stopAt, waitsSoFar }
 * → { action: "wait", ms } | { action: "stop", reason } | { action: "default" } (old 30–75 s retry)
 */
function decide429(opts) {
  if (opts.wait) {
    if (opts.retryAfterSec == null) return { action: "stop", reason: "429 without retry-after" };
    if ((opts.waitsSoFar || 0) >= WAIT_MAX) return { action: "stop", reason: "too many waits" };
    const ms = Math.ceil(opts.retryAfterSec * 1000) + 5000;
    if (opts.now + ms >= stopAtMs(opts.stopAt, opts.now)) return { action: "stop", reason: "retry would pass stop-at " + opts.stopAt };
    return { action: "wait", ms };
  }
  if (opts.noRetry) return { action: "stop", reason: "no-retry" };
  return { action: "default" };
}

const ORIGIN = {
  spicelab: "https://spicelab.cl",
  agro: "https://agro.spicelab.cl",
  huerto: "https://huerto.spicelab.cl",
};

// kind: price | lab | card | samples | geo | soil | hr | contact | email | off | other
const Q = {
  spicelab: [
    ["es", "price", "¿Cuánto cuesta el análisis de suelo?"],
    ["es", "lab", "¿Tienen laboratorio propio?"],
    ["es", "card", "¿La prueba es sin tarjeta?"],
    ["es", "samples", "Trabajo en una minera y quiero enviarles muestras de salmuera de litio del Salar de Atacama. ¿Cómo lo hago?"],
    ["es", "science", "Soy hidrogeóloga. ¿Qué me dice el δ18O de un agua subterránea sobre su recarga, y qué aporta además el 87Sr/86Sr?"],
    ["es", "soil", "Tengo suelos volcánicos (trumaos) en Los Ríos con pH 5,2. ¿Qué implica eso para el fósforo y el aluminio?"],
    ["es", "hr", "¿Qué es Huerto Rentable?"],
    ["es", "contact", "¿Cómo los contacto?"],
    ["es", "email", "¿Me pueden dar un correo electrónico para mandar una solicitud de cotización formal?"],
    ["en", "science_lab_price", "Do you run U-Th dating in-house, and how much does it cost per sample?"],
    ["en", "off", "Who won the last football World Cup?"],
    ["es", "name", "¿Cómo te llamas?"],
  ],
  agro: [
    ["es", "price", "¿Cuánto cuesta el análisis de suelo?"],
    ["es", "price", "¿Cuánto vale Huerto?"],
    ["es", "lab", "¿Tienen laboratorio propio o mandan las muestras afuera?"],
    ["es", "samples", "Soy agricultor en Osorno. ¿Cómo les hago llegar una muestra de suelo de mi campo?"],
    ["es", "soil", "Mi suelo es trumao en Panguipulli, pH 5,3. ¿Qué debería considerar para cultivar hortalizas?"],
    ["es", "hr", "¿Qué es Huerto Rentable? ¿Y cuánto cuesta el HR35?"],
    ["es", "card", "¿La prueba es sin tarjeta?"],
    ["es", "contact", "¿Cómo los contacto?"],
    ["es", "email", "¿Me dan un mail para escribirles?"],
    ["en", "science", "What can strontium isotopes tell a farmer or food producer about where a crop was grown?"],
    ["es", "off", "¿Me recomiendas una receta de empanadas de pino?"],
    ["es", "soil", "¿Qué suelos volcánicos hay en el sur de Chile?"],
    ["es", "name", "¿Cómo te llamas?"],
    // Published agro prices (knowledge/agro-prices.md): 4th element = amount that must appear.
    ["es", "agro_price", "¿Cuánto cuesta la Academia?", "$119.000"],
    ["es", "agro_price", "¿Cuánto cuesta el HR35?", "$1.690.000"],
    ["es", "soil_price", "¿Cuánto cuesta un análisis de suelo?"],
  ],
  huerto: [
    ["es", "price", "¿Cuánto vale Huerto?"],
    ["en", "price", "I live in Spain. How much does Huerto cost?"],
    ["es", "card", "¿La prueba es sin tarjeta?"],
    ["es", "price", "¿Cuánto cuesta el análisis de suelo?"],
    ["es", "lab", "¿Tienen laboratorio propio?"],
    ["es", "other", "¿Cómo instalo Huerto en mi iPhone?"],
    ["es", "soil", "Tengo suelo volcánico en Valdivia con pH 5. ¿Huerto me dice cuánta cal echar?"],
    ["es", "hr", "¿Qué es Huerto Rentable?"],
    ["es", "email", "¿Cómo los contacto? ¿Tienen un correo?"],
    ["en", "other", "How do I cancel my subscription?"],
    ["es", "science", "Pregunta curiosa: ¿qué es el δ18O y para qué sirve?"],
    ["es", "off", "¿Quién va a ganar las próximas elecciones?"],
    ["es", "code", "¿Tienen un código para usarlo gratis?"],
    ["es", "code", "¿Cómo entro sin pagar?"],
    ["en", "code", "Do you have a promo code?"],
    ["en", "mission", "What's the mission of Huerto?"],
    ["en", "name", "What's your name?"],
  ],
};

const LAB_ES = I.LAB_ES;
const LAB_EN = I.LAB_EN;
const CARD = /sin\s+(?:\w+\s+){0,2}tarjeta|no\s+(?:se\s+)?(?:requiere|necesita|pide)\w*\s+tarjeta|no\s+credit\s+card|without\s+(?:a\s+)?(?:credit\s+)?card|no\s+card/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const ES_W = /\b(el|la|los|las|de|que|y|para|por|con|una|un|es|tu|te|nos)\b/gi;
const EN_W = /\b(the|and|of|to|you|your|is|for|with|we|our|a|it)\b/gi;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const SCIENCE_EXPLAINED = /evapora|recarga|recharge|fracciona|fractionat|desequilibrio|disequilibrium|decay|desintegra|half-life|vida media|per mil|‰|neutr[oó]n|bedrock|roca madre|fingerprint|huella|weighted average|mezcla de fuentes|mixing|altitud|altitude|temperatura|temperature|\bratio\b|cociente|proporci[oó]n de is[oó]topos|isótopos de oxígeno|oxygen isotopes/i;

function score(site, q, reply, raw, guarded) {
  const f = [];
  const [lang, kind] = q;
  if (kind === "lab") {
    const plain = reply.replace(/[*_`]/g, "").replace(/’/g, "'");
    const exact = plain.includes(LAB_ES) || plain.includes(LAB_EN) || reply.includes(LAB_ES) || reply.includes(LAB_EN.replace("don't", "don’t")) || reply.includes(LAB_EN);
    if (!exact) f.push("lab_sentence_not_exact");
  }
  if (/futuro|pronto|próximamente|soon|in the future|planned/i.test(reply) && /laborator|lab\b/i.test(reply) && /propio|own/i.test(reply))
    f.push("future_lab?");
  if (I.guardViolation(reply, site)) f.push("price_or_card_in_final");
  if (/alúmina|alumina/i.test(reply)) f.push("alumina");
  if (/m[aá]s de la mitad|more than half|\b51\s?%/i.test(reply)) f.push("proportion");
  if (kind === "science" || kind === "science_lab_price") {
    // Expect the Marcos/WhatsApp redirect and no explanation of the science.
    if (!/Marcos/.test(reply)) f.push("no_marcos_redirect");
    if (SCIENCE_EXPLAINED.test(reply)) f.push("science_explained");
  }
  if (kind === "science_lab_price") {
    const plain = reply.replace(/[*_`]/g, "").replace(/’/g, "'");
    if (!plain.includes(LAB_EN)) f.push("lab_sentence_not_exact");
    if (!/pricing|price|cost|quote/i.test(reply)) f.push("no_pricing_redirect");
  }
  if (kind === "agro_price") {
    if (!reply.includes(q[3])) f.push("listed_price_missing(" + q[3] + ")");
    if (q[3] !== "$119.000" && !/IVA/.test(reply)) f.push("iva_missing"); // programmes are published net, «+ IVA»
  }
  if (kind === "soil_price" && /(?:\$|CLP|UF|USD)\s?\d/.test(reply)) f.push("soil_price_quoted");
  if (kind === "name") {
    if (!reply.includes("Víctor")) f.push("name_missing(Víctor)");
    if (SCIENCE_EXPLAINED.test(reply) || /tabla peri[oó]dica|periodic table|clasificaci[oó]n|classification|lit[oó]fil|lithophile|sider[oó]fil|siderophile|calc[oó]fil|chalcophile/i.test(reply)) f.push("science_explained");
  }
  if (kind === "mission") {
    const ok = lang === "en"
      ? /regenerative[- ]agriculture education in developing countries/i.test(reply)
      : /educación en agricultura regenerativa en países en desarrollo/i.test(reply);
    if (!ok || !/Be Well Center/.test(reply) || !/Bangladesh/.test(reply)) f.push("mission_wording");
  }
  if (kind === "code") {
    const ok = reply.includes(I.CODE_ES.slice(0, 50)) || reply.includes(I.CODE_EN.slice(0, 45)) ||
      /c[oó]digo de SPICe es (solo )?para clientes|SPICe code is (only )?for SPICe clients/i.test(reply);
    if (!ok) f.push("code_rule_answer_missing");
  }
  if (CARD.test(reply)) f.push("card_phrase");
  // WhatsApp only where it is the real next step (human voice, 3 oct 2026).
  const NEEDS_WA = ["science", "science_lab_price", "soil_price", "samples", "code"];
  const unpublishedPrice = kind === "price" && site !== "huerto";
  if ((NEEDS_WA.indexOf(kind) !== -1 || unpublishedPrice) && !reply.includes("wa.me/56971540665")) f.push("no_whatsapp_cta");
  const emails = (reply.match(EMAIL) || []).filter((e) => !(site === "huerto" && e.toLowerCase() === "huerto@spicelab.cl"));
  if (emails.length) f.push("email:" + emails.join("|"));
  if (/\b(20\d\d)\b/.test(reply) && !/2026/.test(reply)) f.push("date?");
  const es = (reply.match(ES_W) || []).length;
  const en = (reply.match(EN_W) || []).length;
  if (lang === "es" && en > es) f.push("wrong_language");
  if (lang === "en" && es > en) f.push("wrong_language");
  if (/\]\(\/|(^|\s)\/(contacto|servicios|muestras|login|terminos)\b/.test(reply)) f.push("relative_link");
  if (guarded) f.push("guard_fired(" + guarded + ")");
  return f;
}

async function ask(site, q) {
  let raw = null;
  let usedModel = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async function (url, opts) {
    const res = await realFetch(url, opts);
    const text = await res.text();
    if (res.status === 429) {
      const m = /try again in ([0-9hms.]+)/i.exec(text);
      const lim = /on (tokens per day \(TPD\)|tokens per minute \(TPM\)|requests per [a-z]+)/i.exec(text);
      lastRetryAfterSec = parseRetryAfter(res.headers.get("retry-after"), text);
      lastUpstream429 = (lim ? lim[1] : "rate limit") + (m ? ", try again in " + m[1] : "") + (res.headers.get("retry-after") ? ", retry-after " + res.headers.get("retry-after") + "s" : "");
    }
    if (res.ok) {
      try {
        usedModel = JSON.parse(opts.body).model;
      } catch (_) {}
    }
    try {
      const d = JSON.parse(text);
      raw = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    } catch (_) {}
    return { ok: res.ok, status: res.status, text: async () => text };
  };
  try {
    let waits = 0;
    for (let attempt = 0; attempt < 4; attempt++) {
      I._resetRate();
      const t0 = Date.now();
      lastRetryAfterSec = null;
      const res = await chat.handler({
        httpMethod: "POST",
        headers: { origin: ORIGIN[site], "x-forwarded-for": "198.51.100." + (attempt + 1) },
        body: JSON.stringify({ lang: q[0], site, messages: [{ role: "user", content: q[2] }] }),
      });
      const body = JSON.parse(res.body);
      if (res.statusCode === 429 && (NO_RETRY || WAIT_ON_429)) {
        const d = decide429({ wait: WAIT_ON_429, noRetry: NO_RETRY, retryAfterSec: lastRetryAfterSec, now: Date.now(), stopAt: STOP_AT, waitsSoFar: waits });
        if (d.action === "wait") {
          waits++;
          process.stdout.write("  429 (" + lastUpstream429 + "); waiting " + Math.round(d.ms / 1000) + " s, then retrying (wait " + waits + "/" + WAIT_MAX + ")\n");
          await sleep(d.ms);
          attempt--; // waits don't use up the normal retries
          continue;
        }
        return { status: 429, body, raw, model: usedModel, ms: Date.now() - t0, stopReason: d.reason };
      }
      if (res.statusCode === 429 || (res.statusCode >= 500 && res.statusCode !== 503)) {
        process.stdout.write("  retry (" + res.statusCode + ")…\n");
        await sleep(30000 + attempt * 15000);
        continue;
      }
      return { status: res.statusCode, body, raw, model: usedModel, ms: Date.now() - t0 };
    }
    return { status: 429, body: { error: "rate_limited_giveup" }, raw, ms: 0 };
  } finally {
    globalThis.fetch = realFetch;
  }
}

async function main() {
  const prov = I.resolveProvider();
  if (!prov) {
    console.error("No hay GROQ_API_KEY ni OPENAI_API_KEY en el entorno.");
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const sites = SITES_ARG.length ? SITES_ARG : Object.keys(Q);
  const summaryPath = path.join(OUT, "summary.json");
  const summary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, "utf8")) : {};
  console.log("Provider:", prov.provider, "· model:", prov.model);
  let first = true;
  let halted = "";
  for (const site of sites) {
    const prev = summary[site] && summary[site].items ? summary[site].items : [];
    const items = prev.slice();
    for (let i = 0; i < Q[site].length; i++) {
      if (ONLY.length && ONLY.indexOf(site + ":" + i) === -1) continue;
      const q = Q[site][i];
      if (!halted && pastStop()) halted = "hard stop " + STOP_AT;
      if (halted) {
        process.stdout.write(site + " #" + i + " skipped (" + halted + ")\n");
        continue;
      }
      if (!first) await sleep(GAP);
      first = false;
      process.stdout.write(site + " #" + i + " " + q[2].slice(0, 50) + "\n");
      const r = await ask(site, q);
      const reply = r.body.reply || "[" + (r.body.error || "error") + "] " + (r.body.message || "");
      const guarded = r.body.reply && r.raw && r.body.reply !== I.tidyReply(r.raw).trim() && r.body.reply !== r.raw.trim() ? I.guardViolation(r.raw, site) || "yes" : null;
      const flags = r.body.reply ? score(site, q, reply, r.raw, guarded) : ["http_" + r.status];
      items[i] = { i, lang: q[0], kind: q[1], q: q[2], status: r.status, model: r.model, reply, raw: guarded ? r.raw : undefined, guarded, flags, ms: r.ms, at: new Date().toISOString() };
      process.stdout.write("  → " + r.status + " " + (flags.join(", ") || "ok") + "\n");
      if (r.status === 429 && (NO_RETRY || WAIT_ON_429)) {
        halted = "quota: " + lastUpstream429 + (r.stopReason ? " · " + r.stopReason : "");
        process.stdout.write("  quota exhausted (" + lastUpstream429 + "); stopping\n");
      }
    }
    summary[site] = { model: prov.model, origin: ORIGIN[site], items };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    writeMd(site, summary[site]);
  }
}

function writeMd(site, s) {
  const lines = [
    "# Live test — " + site + " (" + s.origin + ")",
    "",
    "Modelo: `" + s.model + "` · proveedor vía variables de entorno (la clave no se registra).",
    "",
  ];
  for (const it of s.items.filter(Boolean)) {
    lines.push("## " + (it.i + 1) + ". [" + it.lang + " · " + it.kind + "] " + it.q, "");
    lines.push("HTTP " + it.status + " · modelo " + (it.model || "?") + " · " + it.ms + " ms · flags: " + (it.flags.join(", ") || "ninguno"), "");
    lines.push(it.reply.split("\n").map((l) => "> " + l).join("\n"), "");
    if (it.raw) {
      lines.push("<details><summary>Respuesta original del modelo (bloqueada por el guard)</summary>", "");
      lines.push(it.raw.split("\n").map((l) => "    " + l).join("\n"), "", "</details>", "");
    }
  }
  fs.writeFileSync(path.join(OUT, site + ".md"), lines.join("\n"));
}

module.exports = { decide429, parseRetryAfter, stopAtMs, Q };

if (require.main === module) {
  main().catch((e) => {
    console.error("live-test error:", e && e.message);
    process.exit(1);
  });
}
