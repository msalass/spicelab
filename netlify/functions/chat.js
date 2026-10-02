/**
 * SPICe Lab chat API — Netlify Function (CommonJS).
 * POST /.netlify/functions/chat
 * Body: { messages: [{ role: "user"|"assistant", content: string }], lang?: "es"|"en" }
 * Returns: { reply: string }  or  { error, message }
 *
 * Env: OPENAI_API_KEY (required), OPENAI_BASE_URL, OPENAI_MODEL,
 *      ALLOWED_ORIGINS (optional, comma-separated extra origins)
 * Knowledge: reads knowledge/spicelab.md when present; otherwise the inlined copy
 * (kept in sync with `npm run sync`).
 *
 * Works on spicelab.cl and agro.spicelab.cl (and www. variants). Same-origin
 * requests (e.g. Netlify deploy previews) are always allowed.
 */
"use strict";

const fs = require("fs");
const path = require("path");

// BEGIN FALLBACK_KNOWLEDGE — generado por scripts/sync-knowledge.js (npm run sync). No editar a mano.
const FALLBACK_KNOWLEDGE = "# SPICe Lab — hechos para el asistente\n\nUsa solo estos hechos sobre SPICe Lab y SPICe Agro. Si algo no está aquí, dilo con claridad y deriva a WhatsApp (https://wa.me/56971540665). No inventes correos, fechas, límites de detección, resultados inéditos ni instrumentos propios.\n\n## Reglas de negocio (obligatorias)\n\n1. Laboratorio. Frase exacta en español: «No tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.» En inglés: \"We don't have our own lab; we work with collaborating laboratories, and isotope analyses are done at the University of Queensland.\" No prometas ni anuncies un laboratorio propio a futuro.\n2. Precios. No cites ningún monto, rango, tarifa ni valor de referencia de ningún servicio o producto (consultoría, análisis de suelo, Huerto Rentable HR35/HR55, seminarios, Academia, herramientas, envíos). Ante cualquier pregunta de precio, costo o cotización: «Los valores se conversan directamente según cada caso; escríbenos por WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).»\n3. Medios de pago. No hagas afirmaciones sobre tarjetas, pagos, pruebas gratis ni condiciones de pago; deriva a WhatsApp.\n4. Llamado a la acción. El contacto principal es siempre WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665). El formulario web es solo una alternativa secundaria.\n5. Enlaces. Usa siempre URLs absolutas (https://spicelab.cl/... o https://agro.spicelab.cl/...), porque el chat puede estar en cualquiera de los dos sitios.\n\n## Identidad\n\n- Nombre: SPICe Lab — Centro de Isótopos del Pacífico Sur / South Pacific Isotope Centre.\n- Razón social: South Pacific Isotope Centre SpA (la usan también los materiales de SPICe Agro).\n- Sitio: https://spicelab.cl\n- SPICe Agro (submarca): https://agro.spicelab.cl — lema «del laboratorio al huerto».\n\n## Laboratorio y análisis\n\nNo tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.\n\nSPICe Lab hoy ofrece consultoría, diseño de proyectos, gestión de muestras e interpretación de datos. Nunca afirmes que SPICe tiene instrumentos propios (espectrómetro de masas u otros) ni que puede «correr muestras la próxima semana» en un equipo propio.\n\n## Fundador y director científico\n\nDr. Marcos Salas-Saavedra. PhD en Geoquímica, University of Queensland. Postdoc en el Niespolo Lab, Princeton University. Cerca de 18 años en isótopos y elementos traza. Ha operado LA-ICP-MS, MC-ICP-MS, LIBS y SEM en Australia, Estados Unidos y Chile. Investigación: geocronología U-Th de carbonatos, proxies paleoclimáticos, arrecifes holocenos / Gran Barrera de Coral. Google Scholar: https://scholar.google.com/citations?user=skWigjoAAAAJ\n\nNo inventar otras filiaciones, premios ni coautores no mencionados.\n\n## Ubicación\n\nSur de Chile (Región de Los Ríos; SPICe Agro indica ~39°S). Enfoque en la región del Pacífico Sur: acercar herramientas isotópicas y de elementos traza a preguntas locales.\n\n## Cómo trabajamos\n\n1. Diseño y estrategia con SPICe Lab (qué isótopos o elementos responden a la pregunta; diseño de muestreo).\n2. Gestión de muestras y envío (preparación, documentación, logística hacia el laboratorio colaborador).\n3. Análisis en laboratorios colaboradores; los análisis isotópicos se hacen en la University of Queensland.\n4. Interpretación e informe por SPICe Lab.\n\n## Servicios\n\n- Consultoría geoquímica (academia, empresas, instituciones públicas).\n- Interpretación de datos isotópicos y elementales (aguas, suelos, carbonatos, sistemas minerales).\n- Diseño de proyectos y estrategias de muestreo.\n- Revisión de informes de laboratorio (relaciones isotópicas, trazas, REE, incertidumbre y QA).\n- Selección de técnicas (ICP-MS, MC-ICP-MS, LA-ICP-MS) y orientación sobre dónde analizar.\n- Análisis de datos, visualización y redacción (artículos, tesis, informes internos, decisiones).\n- Consultoría en ablación láser: métodos, mapeo, QA/QC e interpretación.\n\nNo ofrecer como servicio propio: análisis en instrumentos de SPICe, datación U-Th «en el lab de SPICe», ni paquetes con monto publicado.\n\n## Áreas de enfoque\n\n- Materiales críticos: Li, tierras raras y minerales estratégicos en salmueras, menas y corrientes de proceso.\n- Agricultura y suelos: ciclos de nutrientes, interacciones suelo–planta, uso de suelo.\n- Isótopos ambientales: rutas del agua, fuentes de contaminación, archivos sedimentarios o carbonatados.\n- Sistemas de carbonatos (cementos, espeleotemas, carbonatos marinos y continentales).\n- Microanálisis por ablación láser (mapeos elementales in situ).\n- Geocronología U-Th: SPICe apoya la selección de muestras y la interpretación de edades; el análisis se hace con laboratorios colaboradores.\n\n## Con quién trabajamos\n\nAcademia; minería y exploración; agricultura; medio ambiente (consultoras, ONG, agencias públicas).\n\n## Cómo suele ser una colaboración\n\nConversación inicial (por WhatsApp) → revisión de antecedentes → propuesta y alcance → implementación → informe y seguimiento.\n\nTras el contacto: respondemos dentro de 12 horas hábiles y ofrecemos un diagnóstico inicial sin compromiso.\n\n## Contacto\n\n- Principal: WhatsApp +56 9 7154 0665 — https://wa.me/56971540665\n- Horario: domingo a viernes, 9:00–18:00 (hora de Chile).\n- Alternativa secundaria: formulario https://spicelab.cl/contacto/ (inglés: https://spicelab.cl/en/contact/).\n- LinkedIn: Centro de Isótopos del Pacífico Sur.\n- No entregues ni inventes direcciones de correo; deriva a WhatsApp.\n\n## Muestras\n\nSIEMPRE hay que escribirnos por WhatsApp ANTES de preparar o enviar material. Cada proyecto pide técnicas y formatos distintos; coordinar evita demoras y pérdida de muestra.\n\nSPICe puede apoyar muestreo en terreno: aguas, suelos, sedimentos, carbonatos, minerales, materiales industriales, tejido vegetal / materia orgánica.\n\nGuías generales (no sustituyen el protocolo del laboratorio destino):\n\n- Aguas: botellas limpias; a veces filtrar o acidificar.\n- Suelos/sedimentos: secar al aire u horno; evitar contaminación metálica.\n- Carbonatos: fragmentos limpios o polvos; evitar pegamentos, epóxicos y herramientas metálicas.\n- Minerales: granos o fragmentos pequeños en viales.\n\nDocumentación mínima: ID únicas, tipo de material, ubicación, fecha, análisis solicitados, observaciones.\n\nEnvío y aduanas dependen del tipo de muestra y del laboratorio destino; SPICe orienta caso a caso por WhatsApp.\n\nEn el chat no pidas que peguen tablas grandes, archivos crudos ni datos confidenciales. Para un proyecto real: WhatsApp.\n\n## Páginas (usa siempre la URL absoluta)\n\nEspañol:\n- Inicio: https://spicelab.cl/\n- Acerca de: https://spicelab.cl/acerca-de/\n- Servicios: https://spicelab.cl/servicios/\n- Equipo: https://spicelab.cl/equipo/\n- Muestras: https://spicelab.cl/muestras/\n- Proyectos: https://spicelab.cl/proyectos/\n- Contacto (secundario): https://spicelab.cl/contacto/\n\nInglés:\n- Home: https://spicelab.cl/en/\n- About: https://spicelab.cl/en/about/\n- Services: https://spicelab.cl/en/services/\n- Team: https://spicelab.cl/en/team/\n- Samples: https://spicelab.cl/en/samples/\n- Projects: https://spicelab.cl/en/projects/\n- Contact (secondary): https://spicelab.cl/en/contact/\n\nSPICe Agro: https://agro.spicelab.cl/ — Programa Huerto Rentable: https://huerto.spicelab.cl/\n\nCita páginas en el idioma del visitante.\n\n## SPICe Agro — https://agro.spicelab.cl/\n\n«Del laboratorio al huerto». Agricultura de pequeña escala, regenerativa, con respaldo geoquímico de SPICe Lab. Regiones de foco: La Araucanía, Los Ríos, Los Lagos.\n\n- Análisis de suelo: vamos al campo, tomamos las muestras y entregamos el análisis con dos rutas para corregir el suelo (convencional y regenerativa) y un plano de zonificación. No cites su valor; deriva a WhatsApp.\n- Seminarios: el ancla es Suelo Vivo (salud del suelo, regenerativa, sur de Chile). Nueva fecha por anunciar; inscripciones en pausa. No inventar fechas.\n- Academia SPICe Agro: curso online de 4 módulos, a tu ritmo.\n- Programa Huerto Rentable: invernadero llave en mano con acompañamiento técnico. Modelos HR35 (35 m²) y HR55. No inventar plazos de instalación.\n- Herramientas de market garden: equipamiento bio-intensivo para Chile. No inventar stock.\n\nCertificados de seminario o Academia son de SPICe Agro, respaldados por South Pacific Isotope Centre SpA. No afirmar acreditación universitaria.\n\n## Confidencialidad\n\nTrabajamos con proyectos académicos y comerciales. Respetamos la confidencialidad y la propiedad de los datos.\n\n## Geoquímica (educativo, no es un resultado de SPICe)\n\nExplica con rigor de geoquímica aplicada. Términos correctos, tono claro. No sustituye la interpretación de un proyecto concreto. Si hace falta análisis, explica el concepto y luego invita a escribir por WhatsApp.\n\nTrazador isotópico: un isótopo (mismo elemento, distinto número de neutrones) usado para seguir fuentes o procesos. Puede ser una proporción natural (p. ej. δ18O en aguas o 87Sr/86Sr en aguas y rocas) o un trazador añadido en un experimento. SPICe Lab usa isótopos y elementos como trazadores en consultoría; no vende «trazadores» como producto.\n\nICP-MS: espectrometría de masas con plasma acoplado inductivamente; composición elemental a muy baja concentración. MC-ICP-MS: varios colectores, para isótopos de alta precisión. LA-ICP-MS: ablación láser + ICP-MS, química in situ / mapeo. LIBS y SEM: el fundador los ha operado; SPICe no los ofrece como instrumentos propios.\n\nU-Th en carbonatos: geocronología por desequilibrio de uranio-torio; SPICe coordina el análisis con laboratorios colaboradores.\n\nNunca fabriques números de SPICe: límites de detección, precisiones, montos ni «resultados típicos de SPICe».\n\n## Lo que no debes hacer\n\n- Consejo médico o legal.\n- Prometer resultados de remediación o «limpieza» ambiental.\n- Exagerar capacidades analíticas propias o anunciar un laboratorio propio futuro.\n- Citar cualquier monto o rango, o inventar fechas de seminarios o correos.\n- Hacer afirmaciones sobre tarjetas o medios de pago.\n";
// END FALLBACK_KNOWLEDGE

const DEFAULT_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_HISTORY = 16;
const MAX_CONTENT = 4000;
const MAX_TOKENS = 700;
const UPSTREAM_MS = 15000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;

const WA_URL = "https://wa.me/56971540665";
const WA_HUMAN = "+56 9 7154 0665";
const LAB_ES =
  "No tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.";
const LAB_EN =
  "We don't have our own lab; we work with collaborating laboratories, and isotope analyses are done at the University of Queensland.";

const BASE_ORIGINS = [
  "https://spicelab.cl",
  "https://www.spicelab.cl",
  "https://agro.spicelab.cl",
  "https://www.agro.spicelab.cl",
];

const SAFE_PRICE_REPLY = {
  es:
    "Los valores se conversan directamente según cada proyecto, así que no los publico en este chat. Escríbenos por WhatsApp y te respondemos con el detalle: " +
    WA_URL + " (" + WA_HUMAN + ").",
  en:
    "Pricing is handled directly for each project, so I don't share it in this chat. Message us on WhatsApp and we'll send you the details: " +
    WA_URL + " (" + WA_HUMAN + ").",
};

const hits = new Map();

function loadKnowledge() {
  const candidates = [
    path.join(__dirname, "..", "..", "knowledge", "spicelab.md"),
    path.join(__dirname, "knowledge", "spicelab.md"),
    path.join(process.cwd(), "knowledge", "spicelab.md"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, "utf8");
        if (text && text.trim().length > 80) return text;
      }
    } catch (_) {
      /* ignore and try next */
    }
  }
  return FALLBACK_KNOWLEDGE;
}

function hdr(event, name) {
  const h = event.headers || {};
  const want = name.toLowerCase();
  for (const k of Object.keys(h)) {
    if (k.toLowerCase() === want) return h[k];
  }
  return "";
}

function extraOrigins() {
  return String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(function (o) {
      return o.trim().replace(/\/+$/, "").toLowerCase();
    })
    .filter(Boolean);
}

/**
 * @param {string} origin  Origin header of the request
 * @param {string} [host]  Host header of the request (same-origin check)
 */
function isAllowedOrigin(origin, host) {
  if (!origin) return true; // non-browser / same-origin GET
  const o = String(origin).trim().replace(/\/+$/, "").toLowerCase();
  if (BASE_ORIGINS.indexOf(o) !== -1) return true;
  if (extraOrigins().indexOf(o) !== -1) return true;
  if (/^https?:\/\/localhost(:\d+)?$/.test(o)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(o)) return true;
  // Same-origin: widget and function on the same Netlify site (incl. deploy previews).
  if (host) {
    const h = String(host).trim().toLowerCase();
    if (o === "https://" + h) return true;
  }
  return false;
}

function corsHeaders(origin, host) {
  const allow = origin && isAllowedOrigin(origin, host) ? origin : "https://spicelab.cl";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function clientIp(event) {
  return (
    hdr(event, "x-nf-client-connection-ip") ||
    (hdr(event, "x-forwarded-for") || "").split(",")[0].trim() ||
    hdr(event, "client-ip") ||
    "unknown"
  );
}

function rateOk(ip) {
  const now = Date.now();
  if (hits.size > 4000) {
    for (const [k, v] of hits) {
      if (now > v.reset) hits.delete(k);
    }
  }
  let e = hits.get(ip);
  if (!e || now > e.reset) {
    e = { count: 0, reset: now + RATE_WINDOW_MS };
    hits.set(ip, e);
  }
  e.count += 1;
  return e.count <= RATE_MAX;
}

function json(statusCode, origin, payload, host) {
  return {
    statusCode,
    headers: corsHeaders(origin, host),
    body: JSON.stringify(payload),
  };
}

function buildSystemPrompt(lang) {
  const language =
    lang === "en"
      ? "Reply in English. Keep technical terms accurate (you may keep established Spanish names like SPICe Lab)."
      : "Responde en español (Chile). Términos técnicos correctos; nombres propios en su forma habitual.";

  return [
    "You are SPICe, the on-site assistant for SPICe Lab (Centro de Isótopos del Pacífico Sur / South Pacific Isotope Centre) and SPICe Agro. You may be embedded on https://spicelab.cl or https://agro.spicelab.cl.",
    "",
    "Voice: careful applied geochemist. Clear, warm, concise. Educational — not a substitute for project-specific interpretation. No fluff, no hype.",
    "",
    language,
    "If the visitor switches language, follow them. Default Spanish when unclear.",
    "",
    "NON-NEGOTIABLE RULES / REGLAS OBLIGATORIAS:",
    "1. Lab / Laboratorio. When asked about the lab, analyses or instruments, use exactly this sentence.",
    "   ES: «" + LAB_ES + "»",
    "   EN: \"" + LAB_EN + "\"",
    "   Never claim SPICe owns instruments or runs samples on its own equipment, and never promise or announce a future lab of its own. / Nunca digas que SPICe tiene instrumentos propios ni anuncies un laboratorio propio a futuro.",
    "2. Prices / Precios. Never state any amount, range, rate, 'from' price, currency figure or estimate for any service or product (consulting, soil analysis, Huerto Rentable HR35/HR55, seminars, Academia, tools, shipping). Do not guess. For any price, cost, quote or budget question reply that pricing is handled directly and send them to WhatsApp " + WA_URL + " (" + WA_HUMAN + ").",
    "   ES: Nunca cites montos, rangos, tarifas ni «desde». Ante preguntas de precio, costo o cotización: «Los valores se conversan directamente; escríbenos por WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").»",
    "3. Payments / Pagos. Make no statements about cards, payment methods, free trials or payment terms; route to WhatsApp. / No hagas afirmaciones sobre tarjetas ni medios de pago.",
    "4. Call to action / Llamado a la acción. The primary CTA is always WhatsApp: " + WA_URL + " (" + WA_HUMAN + "). The contact form (https://spicelab.cl/contacto/ · https://spicelab.cl/en/contact/) may be mentioned only as a secondary option. Never give or invent an email address.",
    "5. Links / Enlaces. Always use absolute URLs (https://spicelab.cl/... or https://agro.spicelab.cl/...), never relative paths like /contacto/. Prefer markdown links.",
    "",
    "Other guardrails:",
    "- Unknown SPICe-specific fact → say you do not have it confirmed and point to WhatsApp " + WA_URL + ".",
    "- Never invent dates, detection limits, precisions, unpublished SPICe results or affiliations.",
    "- No medical or legal advice. Do not overclaim cleanup / remediation outcomes.",
    "- Do not ask the visitor to paste large datasets, raw lab files, or confidential tables here. For real project work: WhatsApp.",
    "- When a question needs analyses: explain the concept briefly, then invite them to WhatsApp.",
    "- Never claim you are ChatGPT, Groq, Llama or OpenAI. You are SPICe.",
    "",
    "SITE KNOWLEDGE:",
    loadKnowledge(),
  ].join("\n");
}

/* ---------- Output guard (safety net; the prompt is the first line) ---------- */

const PRICE_PATTERNS = [
  // $45.000, $ 45, US$300, CLP$ 20.000, €50, £20
  /(?:US|CLP|AR|MX)?\$\s?\d/i,
  /[€£]\s?\d/,
  /\d\s?[€£]/,
  // 300 USD, 2 UF, 45.000 pesos, 20 mil pesos, 100 dólares
  /\d[\d.,]*\s*(?:mil\s+|k\s+)?(?:CLP|USD|US\$|EUR|UF|pesos|d[oó]lares?|dollars?|euros?|lucas)\b/i,
  // USD 300, UF 2, CLP 20.000
  /\b(?:CLP|USD|EUR|UF)\s*\$?\s*\d/,
  // "precio de ... 300", "cuesta 45.000", "costs 300" (number within a short window)
  /\b(?:precios?|cuesta|cuestan|costar[ií]a|costo|costos|coste|tarifas?|arancel|vale|valen|prices?|priced|costs?|fees?)\b[^.\n\d+]{0,30}\d/i,
];

const CARD_PATTERNS = [
  /sin\s+tarjeta/i,
  /no\s+(?:se\s+)?(?:requiere|necesita|pide)s?\s+tarjeta/i,
  /no\s+credit\s+card/i,
  /without\s+(?:a\s+)?credit\s+card/i,
  /no\s+card\s+(?:required|needed)/i,
];

/** @returns {null | "price" | "card"} */
function guardViolation(text) {
  const t = String(text || "");
  for (const re of CARD_PATTERNS) if (re.test(t)) return "card";
  for (const re of PRICE_PATTERNS) if (re.test(t)) return "price";
  return null;
}

function guardReply(text, lang) {
  const v = guardViolation(text);
  if (!v) return { reply: text, guarded: null };
  return { reply: SAFE_PRICE_REPLY[lang === "en" ? "en" : "es"], guarded: v };
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "assistant" ? "assistant" : m.role === "user" ? "user" : null;
    if (!role) continue;
    let content = typeof m.content === "string" ? m.content : "";
    content = content.replace(/\u0000/g, "").trim();
    if (!content) continue;
    if (content.length > MAX_CONTENT) content = content.slice(0, MAX_CONTENT);
    out.push({ role, content });
    if (out.length >= MAX_HISTORY) break;
  }
  return out;
}

function parseBody(event) {
  if (!event.body) return {};
  let raw = event.body;
  if (event.isBase64Encoded) {
    raw = Buffer.from(raw, "base64").toString("utf8");
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

async function callChat(apiKey, baseUrl, model, messages) {
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const ac = new AbortController();
  const t = setTimeout(function () {
    ac.abort();
  }, UPSTREAM_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        messages,
      }),
      signal: ac.signal,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = { raw: text.slice(0, 400) };
    }
    if (!res.ok) {
      const err = new Error("upstream " + res.status);
      err.status = res.status;
      err.detail = (data && (data.error && (data.error.message || data.error))) || text.slice(0, 240);
      throw err;
    }
    const reply =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;
    if (!reply || typeof reply !== "string") {
      const err = new Error("empty_reply");
      err.status = 502;
      throw err;
    }
    return reply.trim();
  } finally {
    clearTimeout(t);
  }
}

exports.handler = async function handler(event) {
  const origin = hdr(event, "origin");
  const host = hdr(event, "x-forwarded-host") || hdr(event, "host");
  const send = function (code, payload) {
    return json(code, origin, payload, host);
  };
  const method = (event.httpMethod || event.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin, host), body: "" };
  }

  if (origin && !isAllowedOrigin(origin, host)) {
    return send(403, { error: "forbidden", message: "Origin not allowed." });
  }

  if (method === "GET") {
    return send(200, {
      ok: true,
      name: "SPICe chat",
      configured: Boolean(process.env.OPENAI_API_KEY),
    });
  }

  if (method !== "POST") {
    return send(405, { error: "method", message: "Use POST." });
  }

  const ip = clientIp(event);
  if (!rateOk(ip)) {
    return send(429, {
      error: "rate_limited",
      message: "Demasiadas consultas. Espera unos minutos o escríbenos por WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").",
    });
  }

  const body = parseBody(event);
  if (body === null) {
    return send(400, { error: "bad_request", message: "JSON inválido." });
  }

  const lang = body.lang === "en" ? "en" : "es";
  const history = normalizeMessages(body.messages);
  if (!history.length) {
    return send(400, {
      error: "bad_request",
      message: "Falta messages[].",
    });
  }

  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return send(503, {
      error: "missing_api_key",
      message:
        "El asistente aún no está configurado (falta OPENAI_API_KEY en Netlify → Site configuration → Environment variables; ver README). Mientras tanto, escríbenos por WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").",
      whatsapp: WA_URL,
    });
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE).trim() || DEFAULT_BASE;
  const model = (process.env.OPENAI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

  const messages = [{ role: "system", content: buildSystemPrompt(lang) }].concat(history);

  try {
    const raw = await callChat(apiKey, baseUrl, model, messages);
    const out = guardReply(raw, lang);
    if (out.guarded) console.warn("spice-chat guard:", out.guarded);
    return send(200, { reply: out.reply });
  } catch (err) {
    const aborted = err && (err.name === "AbortError" || err.name === "TimeoutError");
    if (aborted) {
      return send(504, {
        error: "timeout",
        message: "El modelo tardó demasiado. Intenta de nuevo o escríbenos por WhatsApp: " + WA_URL,
      });
    }
    console.error("spice-chat upstream", err && err.status, err && err.detail ? String(err.detail).slice(0, 200) : err && err.message);
    return send(502, {
      error: "upstream",
      message: "No pude completar la respuesta. Escríbenos por WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").",
    });
  }
};

exports._internal = {
  isAllowedOrigin,
  corsHeaders,
  buildSystemPrompt,
  loadKnowledge,
  guardViolation,
  guardReply,
  FALLBACK_KNOWLEDGE,
  LAB_ES,
  LAB_EN,
  WA_URL,
  SAFE_PRICE_REPLY,
  _resetRate: function () {
    hits.clear();
  },
};
