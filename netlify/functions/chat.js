/**
 * SPICe Lab chat API — Netlify Function (CommonJS).
 * POST /.netlify/functions/chat
 * Body: { messages: [{ role: "user"|"assistant", content: string }], lang?: "es"|"en", site?: string }
 *   `site` is only a hint, honoured for localhost dev. In production the site is
 *   resolved server-side from the Origin header (or SITE_ID for same-site previews).
 * Returns: { reply: string }  or  { error, message }
 *
 * Env (key precedence): OPENAI_API_KEY → else GROQ_API_KEY (Groq base URL by default).
 *      OPENAI_BASE_URL, OPENAI_MODEL (override for either), GROQ_MODEL (Groq only),
 *      ALLOWED_ORIGINS (optional, comma-separated extra origins),
 *      SITE_ID (optional: spicelab | agro | huerto — site used for same-site
 *      deploy previews, extra origins and requests without Origin; default spicelab)
 * Knowledge: knowledge/spicelab.md (spicelab + agro) and knowledge/huerto.md (huerto),
 * with inlined copies kept in sync by `npm run sync`.
 *
 * Works on spicelab.cl, agro.spicelab.cl and huerto.spicelab.cl (and www. variants).
 * Same-origin requests (e.g. Netlify deploy previews) are always allowed.
 * Only huerto may quote prices, and only the Huerto membership prices.
 */
"use strict";

const fs = require("fs");
const path = require("path");

// BEGIN FALLBACK_KNOWLEDGE — generado por scripts/sync-knowledge.js (npm run sync). No editar a mano.
const FALLBACK_KNOWLEDGE = "# SPICe Lab — hechos para el asistente\n\nUsa solo estos hechos sobre SPICe Lab y SPICe Agro. Si algo no está aquí, dilo con claridad y deriva a WhatsApp (https://wa.me/56971540665). No inventes correos, fechas, límites de detección, resultados inéditos ni instrumentos propios.\n\n## Reglas de negocio (obligatorias)\n\n1. Laboratorio. Frase exacta en español: «No tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.» En inglés, textual (cítala tal cual cuando pregunten en inglés): \"We don't have our own lab; we work with collaborating laboratories, and isotope analyses are done at the University of Queensland.\" No prometas ni anuncies un laboratorio propio a futuro.\n2. Precios. No cites ningún monto, rango, tarifa ni valor de referencia de ningún servicio o producto (consultoría, análisis de suelo, Huerto Rentable HR35/HR55, seminarios, Academia, herramientas, envíos). Ante cualquier pregunta de precio, costo o cotización: «Los valores se conversan directamente según cada caso; escríbenos por WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).»\n3. Medios de pago. No describas cómo cobra SPICe (nunca «no gestionamos pagos» ni «no aceptamos tarjetas»). Si preguntan por una prueba gratis o si piden tarjeta: la única prueba es la de la app Huerto, 7 días gratis con tarjeta; sus planes están en https://huerto.spicelab.cl/. Nunca niegues que se pide tarjeta. Condiciones de los servicios de SPICe Lab/Agro: WhatsApp.\n4. Llamado a la acción. El contacto principal es siempre WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665). El formulario web es solo una alternativa secundaria.\n5. Enlaces. Usa siempre URLs absolutas (https://spicelab.cl/... o https://agro.spicelab.cl/...), porque el chat puede estar en cualquiera de los dos sitios.\n\n## Identidad\n\n- Nombre: SPICe Lab — Centro de Isótopos del Pacífico Sur / South Pacific Isotope Centre.\n- Razón social: South Pacific Isotope Centre SpA (la usan también los materiales de SPICe Agro).\n- Sitio: https://spicelab.cl\n- SPICe Agro (submarca): https://agro.spicelab.cl — lema «del laboratorio al huerto».\n\n## Laboratorio y análisis\n\nNo tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.\n\nSPICe Lab hoy ofrece consultoría, diseño de proyectos, gestión de muestras e interpretación de datos. Nunca afirmes que SPICe tiene instrumentos propios (espectrómetro de masas u otros) ni que puede «correr muestras la próxima semana» en un equipo propio.\n\n## Fundador y director científico\n\nDr. Marcos Salas-Saavedra. PhD en Geoquímica, University of Queensland. Postdoc en el Niespolo Lab, Princeton University. Cerca de 18 años en isótopos y elementos traza. Ha operado LA-ICP-MS, MC-ICP-MS, LIBS y SEM en Australia, Estados Unidos y Chile. Investigación: geocronología U-Th de carbonatos, proxies paleoclimáticos, arrecifes holocenos / Gran Barrera de Coral. Google Scholar: https://scholar.google.com/citations?user=skWigjoAAAAJ\n\nNo inventar otras filiaciones, premios ni coautores no mencionados.\n\n## Ubicación\n\nSur de Chile (Región de Los Ríos; SPICe Agro indica ~39°S). Enfoque en la región del Pacífico Sur: acercar herramientas isotópicas y de elementos traza a preguntas locales.\n\n## Cómo trabajamos\n\n1. Diseño y estrategia con SPICe Lab (qué isótopos o elementos responden a la pregunta; diseño de muestreo).\n2. Gestión de muestras y envío (preparación, documentación, logística hacia el laboratorio colaborador).\n3. Análisis en laboratorios colaboradores; los análisis isotópicos se hacen en la University of Queensland.\n4. Interpretación e informe por SPICe Lab.\n\n## Servicios\n\n- Consultoría geoquímica (academia, empresas, instituciones públicas).\n- Interpretación de datos isotópicos y elementales (aguas, suelos, carbonatos, sistemas minerales).\n- Diseño de proyectos y estrategias de muestreo.\n- Revisión de informes de laboratorio (relaciones isotópicas, trazas, REE, incertidumbre y QA).\n- Selección de técnicas (ICP-MS, MC-ICP-MS, LA-ICP-MS) y orientación sobre dónde analizar.\n- Análisis de datos, visualización y redacción (artículos, tesis, informes internos, decisiones).\n- Consultoría en ablación láser: métodos, mapeo, QA/QC e interpretación.\n\nNo ofrecer como servicio propio: análisis en instrumentos de SPICe, datación U-Th «en el lab de SPICe», ni paquetes con monto publicado.\n\n## Áreas de enfoque\n\n- Materiales críticos: Li, tierras raras y minerales estratégicos en salmueras, menas y corrientes de proceso.\n- Agricultura y suelos: ciclos de nutrientes, interacciones suelo–planta, uso de suelo.\n- Isótopos ambientales: rutas del agua, fuentes de contaminación, archivos sedimentarios o carbonatados.\n- Sistemas de carbonatos (cementos, espeleotemas, carbonatos marinos y continentales).\n- Microanálisis por ablación láser (mapeos elementales in situ).\n- Geocronología U-Th: SPICe apoya la selección de muestras y la interpretación de edades; el análisis se hace con laboratorios colaboradores.\n\n## Con quién trabajamos\n\nAcademia; minería y exploración; agricultura; medio ambiente (consultoras, ONG, agencias públicas).\n\n## Cómo suele ser una colaboración\n\nConversación inicial (por WhatsApp) → revisión de antecedentes → propuesta y alcance → implementación → informe y seguimiento.\n\nTras el contacto: respondemos dentro de 12 horas hábiles y ofrecemos un diagnóstico inicial sin compromiso.\n\n## Contacto\n\n- Principal: WhatsApp +56 9 7154 0665 — https://wa.me/56971540665\n- Horario: domingo a viernes, 9:00–18:00 (hora de Chile).\n- Alternativa secundaria: formulario https://spicelab.cl/contacto/ (inglés: https://spicelab.cl/en/contact/).\n- LinkedIn: Centro de Isótopos del Pacífico Sur.\n- Si piden un correo: no entregues ni inventes direcciones, y no digas que no hay correo. Responde: «El canal más rápido para escribirnos es WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665). También puedes usar el formulario: https://spicelab.cl/contacto/.»\n\n## Muestras\n\nSIEMPRE hay que escribirnos por WhatsApp ANTES de preparar o enviar material. Cada proyecto pide técnicas y formatos distintos; coordinar evita demoras y pérdida de muestra.\n\nSPICe puede apoyar muestreo en terreno: aguas, suelos, sedimentos, carbonatos, minerales, materiales industriales, tejido vegetal / materia orgánica.\n\nGuías generales (no sustituyen el protocolo del laboratorio destino):\n\n- Aguas: botellas limpias; a veces filtrar o acidificar.\n- Suelos/sedimentos: secar al aire u horno; evitar contaminación metálica.\n- Carbonatos: fragmentos limpios o polvos; evitar pegamentos, epóxicos y herramientas metálicas.\n- Minerales: granos o fragmentos pequeños en viales.\n\nDocumentación mínima: ID únicas, tipo de material, ubicación, fecha, análisis solicitados, observaciones.\n\nEnvío y aduanas dependen del tipo de muestra y del laboratorio destino; SPICe orienta caso a caso por WhatsApp.\n\nEn el chat no pidas que peguen tablas grandes, archivos crudos ni datos confidenciales. Para un proyecto real: WhatsApp.\n\n## Páginas (usa siempre la URL absoluta)\n\nEspañol:\n- Inicio: https://spicelab.cl/\n- Acerca de: https://spicelab.cl/acerca-de/\n- Servicios: https://spicelab.cl/servicios/\n- Equipo: https://spicelab.cl/equipo/\n- Muestras: https://spicelab.cl/muestras/\n- Proyectos: https://spicelab.cl/proyectos/\n- Contacto (secundario): https://spicelab.cl/contacto/\n\nInglés:\n- Home: https://spicelab.cl/en/\n- About: https://spicelab.cl/en/about/\n- Services: https://spicelab.cl/en/services/\n- Team: https://spicelab.cl/en/team/\n- Samples: https://spicelab.cl/en/samples/\n- Projects: https://spicelab.cl/en/projects/\n- Contact (secondary): https://spicelab.cl/en/contact/\n\nSPICe Agro: https://agro.spicelab.cl/ — Huerto (bitácora del huerto en el teléfono, app de SPICe Lab; no es Huerto Rentable): https://huerto.spicelab.cl/ (si preguntan por Huerto o su membresía, di que los detalles están publicados en https://huerto.spicelab.cl/ y ofrece WhatsApp; aquí no cites sus valores).\n\nCita páginas en el idioma del visitante.\n\n## SPICe Agro — https://agro.spicelab.cl/\n\n«Del laboratorio al huerto». Agricultura de pequeña escala, regenerativa, con respaldo geoquímico de SPICe Lab. Regiones de foco: La Araucanía, Los Ríos, Los Lagos.\n\n- Análisis de suelo: «No mandamos un kit: vamos a tu campo». El muestreo lo hace el equipo de SPICe Agro («Muestreo hecho por nosotros, no por correo»), y se entrega el análisis completo (con aluminio intercambiable), dos rutas para corregir el suelo (convencional y regenerativa) y un plano de zonificación. Por eso, a un agricultor no le indiques que tome y envíe la muestra por su cuenta: invítalo a coordinar la visita por WhatsApp. No cites su valor.\n- Seminarios: el ancla es Suelo Vivo (salud del suelo, regenerativa, sur de Chile). Nueva fecha por anunciar; inscripciones en pausa. No inventar fechas.\n- Academia SPICe Agro: curso online de 4 módulos, a tu ritmo.\n- Programa Huerto Rentable: invernadero llave en mano con acompañamiento técnico desde el suelo hasta la primera cosecha. «Diseño, instalación y seguimiento». Modelos: «HR35 · Parte — invernadero de 35 m²» y «HR55 · Produce y SPICe Partner — escala y datos». No describas componentes, equipamiento ni contenidos que no estén aquí (riego, sustratos, control climático, etc.), ni plazos de instalación; para el detalle, WhatsApp.\n- Herramientas de market garden: equipamiento bio-intensivo para Chile. No inventar stock.\n\nCertificados de seminario o Academia son de SPICe Agro, respaldados por South Pacific Isotope Centre SpA. No afirmar acreditación universitaria.\n\n## Confidencialidad\n\nTrabajamos con proyectos académicos y comerciales. Respetamos la confidencialidad y la propiedad de los datos.\n\n## Geoquímica (educativo, no es un resultado de SPICe)\n\nExplica con rigor de geoquímica aplicada. Términos correctos, tono claro. No sustituye la interpretación de un proyecto concreto. Si hace falta análisis, explica el concepto y luego invita a escribir por WhatsApp.\n\nTrazador isotópico: un isótopo (mismo elemento, distinto número de neutrones) usado para seguir fuentes o procesos. Puede ser una proporción natural (p. ej. δ18O en aguas o 87Sr/86Sr en aguas y rocas) o un trazador añadido en un experimento. SPICe Lab usa isótopos y elementos como trazadores en consultoría; no vende «trazadores» como producto.\n\nICP-MS: espectrometría de masas con plasma acoplado inductivamente; composición elemental a muy baja concentración. MC-ICP-MS: varios colectores, para isótopos de alta precisión. LA-ICP-MS: ablación láser + ICP-MS, química in situ / mapeo. LIBS y SEM: el fundador los ha operado; SPICe no los ofrece como instrumentos propios.\n\nU-Th en carbonatos: geocronología por desequilibrio de uranio-torio; SPICe coordina el análisis con laboratorios colaboradores.\n\n87Sr/86Sr en aguas, suelos y cultivos: refleja las rocas y minerales con que interactuó el agua (y las mezclas de fuentes, incluidas enmiendas o fertilizantes); prácticamente no fracciona en procesos naturales, por eso sirve como trazador de procedencia y de mezcla. No sirve para datar aguas jóvenes. δ18O (y δ2H) en aguas: reflejan la precipitación de recarga (efectos de altitud, continentalidad y estacionalidad) y la evaporación (enriquecimiento).\n\nSuelos volcánicos del sur de Chile (trumaos = Andisoles, derivados de cenizas volcánicas; ñadis = Andisoles de mal drenaje sobre sustrato fluvioglacial): su arcilla característica es el alófano (EN: allophane), junto con imogolita y complejos Al/Fe-humus. Di siempre «alófano» (EN: allophane); no es un óxido de aluminio. Tienen alta retención (fijación) de fósforo por el alófano, que es la principal limitante de P incluso con encalado. A pH bajo (≈ < 5,5) aumenta el aluminio intercambiable, tóxico para las raíces. El encalado y la materia orgánica ayudan; la roca fosfórica es de baja solubilidad. Tolerancia general: la papa tolera suelos ácidos; la mayoría de las hortalizas, incluidas la betarraga (remolacha), la lechuga, la espinaca y el tomate, prefiere pH ≈ 6–7. Nunca presentes la betarraga/remolacha como tolerante a la acidez. No des dosis de cal ni de fertilizante: dependen del análisis de suelo.\n\nNunca fabriques números de SPICe: límites de detección, precisiones, montos ni «resultados típicos de SPICe».\n\n## Lo que no debes hacer\n\n- Consejo médico o legal.\n- Prometer resultados de remediación o «limpieza» ambiental.\n- Exagerar capacidades analíticas propias o anunciar un laboratorio propio futuro.\n- Citar cualquier monto o rango, o inventar fechas de seminarios o correos.\n- Negar que la prueba de Huerto pide tarjeta, o describir cómo cobra SPICe (tarjetas, medios de pago).\n";
// END FALLBACK_KNOWLEDGE

// BEGIN FALLBACK_HUERTO — generado por scripts/sync-knowledge.js (npm run sync). No editar a mano.
const FALLBACK_HUERTO = "# Huerto (https://huerto.spicelab.cl) — hechos para el asistente\n\nFuente: sitio en vivo https://huerto.spicelab.cl/ y sus términos https://huerto.spicelab.cl/terminos (actualización del 30 de septiembre de 2026). Usa solo estos hechos. Si algo no está aquí, dilo y deriva a WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).\n\n## Reglas (obligatorias en Huerto)\n\n1. Precios: solo puedes citar los valores de la membresía de Huerto que aparecen abajo, tal cual. Ningún otro monto (análisis de suelo, Huerto Rentable HR35/HR55, seminarios, Academia, herramientas, consultoría, cargos de validación, descuentos, conversiones a otras monedas). Para cualquier otro valor: WhatsApp.\n2. Prueba: son 7 días gratis CON tarjeta registrada. Deja siempre claro que la prueba requiere registrar una tarjeta; nunca lo contradigas.\n3. Misión (redacción aprobada por Marcos): Huerto apoya la «educación en agricultura regenerativa en países en desarrollo» a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral. EN: Huerto supports \"regenerative-agriculture education in developing countries\" through Be Well Center, a school in Bangladesh that trains people in regenerative agriculture and holistic health. Usa siempre las dos ideas juntas. No cites porcentajes, proporciones, fracciones ni montos de lo que se entrega.\n4. Llamado a la acción: WhatsApp https://wa.me/56971540665 es el contacto principal. Para empezar, crear la cuenta en https://huerto.spicelab.cl/login («Entrar» / «Crear cuenta»).\n5. Laboratorio SPICe (si preguntan), textual y sin formato dentro: «No tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.» En inglés, textual: \"We don't have our own lab; we work with collaborating laboratories, and isotope analyses are done at the University of Queensland.\"\n6. Enlaces siempre absolutos (https://huerto.spicelab.cl/...).\n7. Código de SPICe: es solo para clientes de SPICe y usuarios beta; ninguna oferta ni promoción lo entrega. Nunca ofrezcas, menciones ni prometas el código ni acceso gratis (acceso gratis = cualquier cosa más allá de la prueba estándar de 7 días gratis con tarjeta). Si preguntan por un código, un cupón, acceso gratis o cómo evitar la tarjeta, responde: «El código de SPICe es para clientes de SPICe; escríbenos por WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).»\n   EN: \"The SPICe code is only for SPICe clients and beta users; no offer or promotion gives it out. Never offer, mention or promise the code or free access beyond the standard 7-day trial with a card. If asked about a code, coupon, free access or skipping the card, reply: 'The SPICe code is for SPICe clients; message us on WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).'\"\n\n## Qué es Huerto\n\nHuerto es una bitácora del huerto en el teléfono, «un producto de SPICe Lab · Del laboratorio al huerto». Pensada para quien cuida un huerto o invernadero en casa o en el campo: ordenar el día a día sin Excel ni hilos perdidos. Camas, foto, clima, registro y lista de Hoy en un solo lugar.\n\nFunciones:\n\n- Planificar camas: mapa de camas e invernadero. Tocas un tramo y ves qué hay sembrado, en qué estado y cuándo cosechar.\n- Foto de evidencia: foto al tramo (densidad, plaga, avance); queda en la bitácora.\n- Clima y avisos: pronóstico local y avisos en el teléfono (riego, corte, lo marcado para Hoy).\n- Registro: kilos, riego y notas del día. Los números alimentan la sección Datos; sin anotación, no hay tendencia.\n- Hoy: la lista de la semana; marcas hecho y sigues.\n\nAl entrar ves un ejemplo sembrado con el clima de tu zona. Tu huerto lo armas cuando quieras: ahí dejas la tarjeta y parten los 7 días.\n\nLo que Huerto NO es:\n\n- No vende ni instala el invernadero.\n- No identifica plantas por foto ni mide el tamaño solo.\n- No da asesoría agronómica automatizada ni sustituye el criterio profesional del equipo de SPICe.\n- No requiere ser cliente de un programa para empezar.\n- No es Huerto Rentable: ese es el programa de invernadero llave en mano (HR35/HR55) de SPICe Agro, en https://agro.spicelab.cl/ (sus valores no se citan; WhatsApp).\n- Registro guarda kilos, riego y notas del día; no calcula dosis de cal ni fertilizante. Para un análisis de suelo, SPICe Agro va al campo (https://agro.spicelab.cl/; coordinar por WhatsApp).\n\n## Membresía y precios (únicos montos que se pueden citar)\n\n- Chile, Argentina, Brasil, México, Colombia, Perú, Uruguay, Ecuador, Paraguay y Bolivia: cobro en pesos chilenos vía Mercado Pago, $4.990 CLP al mes o $39.990 CLP al año.\n- Demás países: cobro en dólares vía Lemon Squeezy, US$5.99 al mes o US$59 al año.\n- El plan anual tiene el mismo acceso completo que el mensual y mejor precio que mes a mes.\n- Los precios vigentes son los publicados en la app al momento de suscribirse.\n\n## Prueba gratis\n\n- Empieza 7 días gratis con tarjeta. Se pide tarjeta para la prueba; el cobro empieza el día 8, al plan elegido (mensual o anual).\n- Llega un correo de aviso un día antes del primer cobro.\n- Si cancelas antes de que termine la prueba, no se cobra la suscripción.\n- No es un «programa incluido»: es una prueba corta con tarjeta en archivo.\n- Código de SPICe: solo para clientes de SPICe y usuarios beta (ver regla 7).\n\n## Renovación, cancelación y reembolsos\n\n- La suscripción se renueva sola al final de cada período, salvo que la canceles.\n- Cancela cuando quieras: en Mercado Pago (Suscripciones → Cancelar suscripción), desde el correo de Lemon Squeezy, o escribiendo a huerto@spicelab.cl. Los términos no describen un botón de cancelación dentro de la app Huerto: no inventes pasos dentro de la app.\n- La cancelación toma efecto al final del período pagado; después la cuenta pasa a modo lectura (ves tu bitácora, no la editas).\n- Los períodos ya cobrados no se reembolsan. Si un cobro parece incorrecto, escribir a soporte dentro de los 10 días hábiles siguientes.\n\n## Instalar en el teléfono\n\nHuerto es una PWA: se instala como app, sin App Store ni Google Play (no está en las tiendas todavía).\n\n- Android: abrir en Chrome → menú ⋮ → Instalar app / Añadir a pantalla de inicio.\n- iPhone: abrir en Safari → Compartir → Añadir a pantalla de inicio (en Chrome de iOS no queda igual de bien).\n- Requiere internet: clima, bitácora y cobro viven en la nube; sin conexión no hay app.\n\n## Cuenta y datos\n\n- La cuenta se crea con correo y contraseña en https://huerto.spicelab.cl/login. Conviene usar el mismo correo de la cuenta de pago.\n- Tu contenido (notas, kilos, fotos) es tuyo. Puedes borrar tu huerto y sus datos desde Datos (botón Reset).\n- Términos: https://huerto.spicelab.cl/terminos · Privacidad: https://huerto.spicelab.cl/privacidad\n\n## Be Well Center\n\nHuerto apoya la educación en agricultura regenerativa en países en desarrollo a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral, y que cultiva alimentos en su propio terreno. El centro es parte de East Bangladesh Mission. La suscripción es un pago por el uso de Huerto (no es una donación ni genera rebaja de impuestos). No cites porcentajes ni fracciones.\n\n## Contacto\n\n- Principal: WhatsApp +56 9 7154 0665 — https://wa.me/56971540665\n- Crear cuenta / entrar: https://huerto.spicelab.cl/login\n- Soporte de cuenta y cobros (según los términos): huerto@spicelab.cl, en horario laboral de Chile (lunes a viernes).\n\n## SPICe Lab\n\nHuerto es de South Pacific Isotope Centre SpA (SPICe Lab), en la Región de Los Ríos, Chile. Sitio: https://spicelab.cl/ · SPICe Agro: https://agro.spicelab.cl/\n\nNo tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.\n";
// END FALLBACK_HUERTO

const DEFAULT_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const GROQ_BASE = "https://api.groq.com/openai/v1";
// llama-3.3-70b-versatile returned 404 on Groq (2 Oct 2026); gpt-oss-120b is the free-tier default.
const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";
const GROQ_FALLBACK_DEFAULT = "openai/gpt-oss-20b";

/**
 * Which provider/key to use. OPENAI_API_KEY wins; else GROQ_API_KEY.
 * Never log the returned key.
 * @returns {null | { provider: "openai"|"groq", apiKey: string, baseUrl: string, model: string }}
 */
function resolveProvider(env) {
  env = env || process.env;
  const pick = function (v) {
    return String(v || "").trim();
  };
  const openaiKey = pick(env.OPENAI_API_KEY);
  const groqKey = pick(env.GROQ_API_KEY);
  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      baseUrl: pick(env.OPENAI_BASE_URL) || DEFAULT_BASE,
      model: pick(env.OPENAI_MODEL) || DEFAULT_MODEL,
    };
  }
  if (groqKey) {
    return {
      provider: "groq",
      apiKey: groqKey,
      baseUrl: pick(env.OPENAI_BASE_URL) || GROQ_BASE,
      model: pick(env.GROQ_MODEL) || pick(env.OPENAI_MODEL) || GROQ_DEFAULT_MODEL,
      // Free tier: each model has its own daily token cap (TPD). On 429, retry once here.
      // Set GROQ_FALLBACK_MODEL=none to disable.
      fallbackModel: (function () {
        const f = pick(env.GROQ_FALLBACK_MODEL);
        if (f.toLowerCase() === "none") return "";
        return f || GROQ_FALLBACK_DEFAULT;
      })(),
    };
  }
  return null;
}
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

const SITES = ["spicelab", "agro", "huerto"];
const ORIGIN_SITE = {
  "https://spicelab.cl": "spicelab",
  "https://www.spicelab.cl": "spicelab",
  "https://agro.spicelab.cl": "agro",
  "https://www.agro.spicelab.cl": "agro",
  "https://huerto.spicelab.cl": "huerto",
  "https://www.huerto.spicelab.cl": "huerto",
};
const BASE_ORIGINS = Object.keys(ORIGIN_SITE);
const SIGNUP_HUERTO = "https://huerto.spicelab.cl/login";

const SAFE_PRICE_REPLY = {
  es:
    "Los valores se conversan directamente según cada proyecto, así que no los publico en este chat. Escríbenos por WhatsApp y te respondemos con el detalle: " +
    WA_URL + " (" + WA_HUMAN + ").",
  en:
    "Pricing is handled directly for each project, so I don't share it in this chat. Message us on WhatsApp and we'll send you the details: " +
    WA_URL + " (" + WA_HUMAN + ").",
};

const CODE_ES =
  "El código de SPICe es para clientes de SPICe; escríbenos por WhatsApp: " + WA_URL + " (+56 9 7154 0665). Para todos los demás, Huerto parte con la prueba estándar de 7 días gratis con tarjeta.";
const CODE_EN =
  "The SPICe code is for SPICe clients; message us on WhatsApp: " + WA_URL + " (+56 9 7154 0665). For everyone else, Huerto starts with the standard 7-day free trial with a card.";
const SAFE_CODE_REPLY = { es: CODE_ES, en: CODE_EN };
const MISSION_ES =
  "Huerto apoya la educación en agricultura regenerativa en países en desarrollo a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral.";
const MISSION_EN =
  "Huerto supports regenerative-agriculture education in developing countries through Be Well Center, a school in Bangladesh that trains people in regenerative agriculture and holistic health.";
const SAFE_MISSION_REPLY = {
  es: MISSION_ES + " ¿Dudas? Escríbenos por WhatsApp: " + WA_URL + " (+56 9 7154 0665).",
  en: MISSION_EN + " Questions? Message us on WhatsApp: " + WA_URL + " (+56 9 7154 0665).",
};

const SAFE_HUERTO_REPLY = {
  es:
    "Te confirmo solo lo publicado para Huerto: prueba de 7 días gratis con tarjeta; después $4.990 CLP al mes o $39.990 CLP al año (Chile y países de Latinoamérica con Mercado Pago), o US$5.99 al mes o US$59 al año en los demás países (Lemon Squeezy). Cancela cuando quieras. Para crear tu cuenta: " +
    SIGNUP_HUERTO + ". Para cualquier otro valor o duda, escríbenos por WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").",
  en:
    "Here is only what is published for Huerto: a 7-day free trial with a card; then $4.990 CLP per month or $39.990 CLP per year (Chile and Latin American countries via Mercado Pago), or US$5.99 per month or US$59 per year elsewhere (Lemon Squeezy). Cancel anytime. To create your account: " +
    SIGNUP_HUERTO + ". For any other amount or question, message us on WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").",
};

const hits = new Map();

function readKnowledgeFile(file, fallback) {
  const candidates = [
    path.join(__dirname, "..", "..", "knowledge", file),
    path.join(__dirname, "knowledge", file),
    path.join(process.cwd(), "knowledge", file),
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
  return fallback;
}

/** @param {string} [site] spicelab | agro | huerto */
function loadKnowledge(site) {
  if (site === "huerto") return readKnowledgeFile("huerto.md", FALLBACK_HUERTO);
  return readKnowledgeFile("spicelab.md", FALLBACK_KNOWLEDGE);
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

function envSite() {
  const v = String(process.env.SITE_ID || "").trim().toLowerCase();
  return SITES.indexOf(v) !== -1 ? v : "spicelab";
}

/**
 * Resolve which site's knowledge/rules apply. Never trusts the client hint,
 * except on localhost/127.0.0.1 (local dev).
 * @param {string} origin  Origin header
 * @param {string} [hint]  body.site sent by the widget
 */
function resolveSite(origin, hint) {
  const o = String(origin || "").trim().replace(/\/+$/, "").toLowerCase();
  if (ORIGIN_SITE[o]) return ORIGIN_SITE[o];
  const h = String(hint || "").trim().toLowerCase();
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) && SITES.indexOf(h) !== -1) return h;
  // same-site deploy preview, ALLOWED_ORIGINS, or no Origin header
  return envSite();
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

function siteRules(site) {
  if (site === "huerto") {
    return [
      "SITE: https://huerto.spicelab.cl — Huerto, the garden logbook app by SPICe Lab.",
      "NON-NEGOTIABLE RULES / REGLAS OBLIGATORIAS (Huerto):",
      "1. Prices / Precios. The ONLY amounts you may state are the Huerto membership prices, exactly as written:",
      "   - Chile, Argentina, Brasil, México, Colombia, Perú, Uruguay, Ecuador, Paraguay, Bolivia (Mercado Pago): $4.990 CLP / mes o $39.990 CLP / año.",
      "   - Other countries / demás países (Lemon Squeezy): US$5.99 / month or US$59 / year.",
      "   Never state any other amount, range, discount, validation charge, currency conversion or price of other SPICe services (soil analysis, Huerto Rentable HR35/HR55, seminars, Academia, tools, consulting). For those: WhatsApp " + WA_URL + " (" + WA_HUMAN + ").",
      "   ES: Solo puedes citar esos valores de la membresía de Huerto. Cualquier otro monto: deriva a WhatsApp.",
      "2. Trial / Prueba. The trial is 7 days free WITH a registered card; charging starts on day 8. Always make clear the trial requires a registered card; never contradict that.",
      "   ES: La prueba son 7 días gratis CON tarjeta; el cobro empieza el día 8. Deja siempre claro que la prueba requiere registrar una tarjeta; nunca lo contradigas.",
      "3. Mission / Misión (approved wording). EN: Huerto supports \"regenerative-agriculture education in developing countries\" through Be Well Center, a school in Bangladesh that trains people in regenerative agriculture and holistic health. ES: Huerto apoya la «educación en agricultura regenerativa en países en desarrollo» a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral. Always use both together. Never state any percentage, proportion, fraction («la mitad», \"half\", any percent figure) or amount of what is given. / No cites porcentajes ni fracciones.",
      "4. Call to action / Llamado a la acción. Primary: WhatsApp " + WA_URL + " (" + WA_HUMAN + "). To start, create the account at " + SIGNUP_HUERTO + ". Account/billing support per the terms: huerto@spicelab.cl (secondary). Never invent other emails.",
      "5. Lab / Laboratorio. If lab or analysis questions come up, quote VERBATIM, word for word, in the visitor's language (English visitors get the English sentence exactly):",
      "   ES: «" + LAB_ES + "»",
      "   EN: \"" + LAB_EN + "\"",
      "6. Links / Enlaces: always absolute URLs (https://huerto.spicelab.cl/...). Prefer markdown links.",
      "7. SPICe code / Código de SPICe. The code is ONLY for SPICe clients and beta users; no offer or promotion gives it out. Never offer, mention or promise the code or free access (free access = anything beyond the standard 7-day trial with a card). Never invent coupons, discounts or extended trials. If asked about a code, coupon, free access, how to get in without paying («¿cómo entro sin pagar?») or how to skip the card, reply exactly in the visitor's language:",
      "   ES: «" + CODE_ES + "»",
      "   EN: \"" + CODE_EN + "\"",
    ];
  }
  return [
    "SITE: " + (site === "agro" ? "https://agro.spicelab.cl (SPICe Agro)" : "https://spicelab.cl (SPICe Lab)") + ".",
    "NON-NEGOTIABLE RULES / REGLAS OBLIGATORIAS:",
    "1. Lab / Laboratorio. When asked about the lab, analyses or instruments, quote this sentence VERBATIM, word for word, in the visitor's language (English visitors get the English sentence exactly; do not paraphrase it). / Cítala textual en el idioma del visitante.",
    "   ES: «" + LAB_ES + "»",
    "   EN: \"" + LAB_EN + "\"",
    "   Never claim SPICe owns instruments or runs samples on its own equipment, and never promise or announce a future lab of its own. / Nunca digas que SPICe tiene instrumentos propios ni anuncies un laboratorio propio a futuro.",
    "2. Prices / Precios. Never state any amount, range, rate, 'from' price, currency figure or estimate for any service or product (consulting, soil analysis, Huerto Rentable HR35/HR55, the Huerto app membership, seminars, Academia, tools, shipping). Do not guess. For any price, cost, quote or budget question reply that pricing is handled directly and send them to WhatsApp " + WA_URL + " (" + WA_HUMAN + ").",
    "   ES: Nunca cites montos, rangos, tarifas ni «desde». Ante preguntas de precio, costo o cotización: «Los valores se conversan directamente; escríbenos por WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").»",
    "   EN (English visitors, never the Spanish line): \"Pricing is discussed directly for each project; message us on WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").\"",
    "   Use that pricing line ONLY when the visitor asks about price, cost or a quote; otherwise end with the plain WhatsApp CTA.",
    "   If they ask what Huerto Rentable or HR35/HR55 is, describe it from SITE KNOWLEDGE (that part is allowed) and only route the price to WhatsApp.",
    "   Huerto app (membership): say its plans are published at https://huerto.spicelab.cl/ and offer WhatsApp; do not quote amounts here. / Huerto: «Los planes de Huerto están publicados en https://huerto.spicelab.cl/».",
    "3. Payments / Pagos. Do not describe how SPICe charges (never say things like «no gestionamos pagos», «no aceptamos tarjetas», \"we don't take cards\"). If asked about a free trial or whether a card is needed, the only trial is the Huerto app's: 7 days free WITH a card, plans at https://huerto.spicelab.cl/ (ES: «La única prueba gratis es la de la app Huerto: 7 días gratis con tarjeta; sus planes están en https://huerto.spicelab.cl/»). Say just «con tarjeta» / \"with a card\"; do not specify card types. Never deny that the card is required. Terms for SPICe Lab/Agro services: WhatsApp.",
    "4. Call to action / Llamado a la acción. The primary CTA is always WhatsApp: " + WA_URL + " (" + WA_HUMAN + "). The contact form (https://spicelab.cl/contacto/ · https://spicelab.cl/en/contact/) may be mentioned only as a secondary option. Never give or invent an email address.",
    "5. Links / Enlaces. Always use absolute URLs (https://spicelab.cl/... or https://agro.spicelab.cl/...), never relative paths like /contacto/. Prefer markdown links.",
  ].concat(site === "agro" ? [
    "6. Soil analysis / Análisis de suelo (SPICe Agro). «No mandamos un kit: vamos a tu campo»: the SPICe Agro team does the sampling in the field. Never tell a farmer to prepare, pack or send a soil sample themselves; invite them to coordinate the field visit on WhatsApp.",
  ] : []);
}

/**
 * @param {"es"|"en"} lang
 * @param {"spicelab"|"agro"|"huerto"} [site]
 */
function buildSystemPrompt(lang, site) {
  site = SITES.indexOf(site) !== -1 ? site : "spicelab";
  const language =
    lang === "en"
      ? "Reply in English. Keep technical terms accurate (you may keep established Spanish names like SPICe Lab)."
      : "Responde en español (Chile). Términos técnicos correctos; nombres propios en su forma habitual.";

  return [
    "You are SPICe, the on-site assistant for SPICe Lab (Centro de Isótopos del Pacífico Sur / South Pacific Isotope Centre), SPICe Agro and Huerto.",
    "",
    site === "huerto"
      ? "Voice: friendly, practical garden helper backed by SPICe Lab geochemistry. Clear, warm, concise. No fluff, no hype."
      : "Voice: careful applied geochemist. Clear, warm, concise. Educational — not a substitute for project-specific interpretation. No fluff, no hype.",
    "",
    language,
    "If the visitor switches language, follow them. Default Spanish when unclear.",
    "",
  ]
    .concat(siteRules(site))
    .concat([
      "",
      "Other guardrails:",
      "- EVERY reply ends with the WhatsApp CTA (" + WA_URL + "), even very short ones (e.g. the lab sentence) and off-topic refusals. / TODA respuesta termina con el enlace de WhatsApp.",
      "- Be brief: at most about 180 words, short bullets, no large tables. / Sé breve: máximo ~180 palabras, sin tablas grandes.",
      "- Describe SPICe products and services ONLY with the facts in SITE KNOWLEDGE. Never add components, features, steps, timelines or offers that are not written there.",
      "- Off-topic (sports, politics, news, recipes, general trivia): do not answer it. Say in one sentence that you help with SPICe Lab, SPICe Agro and Huerto topics, then the WhatsApp CTA.",
      "- If asked for an email: never say there is no email (\"no disponemos/no tenemos correo\" is false). Say the fastest channel is WhatsApp" + " (on Huerto you may give huerto@spicelab.cl for account/billing support).",
      "- Write the WHOLE reply in the visitor's language only; never add a translation or a second-language version (quote only the approved sentence in that language). Use plain hyphens (-).",
      "- Quote the lab sentence verbatim, without bold or other formatting inside it; whenever you mention laboratories or where analyses are done, use that exact sentence instead of paraphrasing. Never say a specific sample (soil, brine, water) will be sent to the University of Queensland; the destination lab is coordinated case by case on WhatsApp. No LaTeX; write formulas in plain text.",
      "- Isotope basics (stay consistent with SITE KNOWLEDGE): evaporation ENRICHES the remaining water in 18O (δ18O less negative / higher) - never say evaporation leaves water lighter or depleted in 18O; more negative δ18O points to colder, higher-altitude or more continental recharge. 87Sr/86Sr traces rock/mineral sources and mixing; it does NOT date water and does not give water age. δ values are per mil (‰) deviations, not percentages.",
      "- Soil management: stick to what SITE KNOWLEDGE says (alófano fixes P; liming and organic matter help; rock phosphate is low-solubility). Do not invent other mechanisms or products.",
      "- Do not give lime or fertilizer doses, and do not list crop tolerances beyond SITE KNOWLEDGE.",
      "- Volcanic soils (trumaos/ñadis, Andisols): the characteristic clay is «alófano» (EN: allophane), which drives phosphorus fixation. Never write the word «alúmina»/alumina at all, not even to say it is not alúmina.",
      "- Unknown SPICe-specific fact → say you do not have it confirmed and point to WhatsApp " + WA_URL + ".",
      "- Never invent dates, detection limits, precisions, unpublished SPICe results or affiliations.",
      "- No medical or legal advice. Do not overclaim cleanup / remediation outcomes.",
      "- Do not ask the visitor to paste large datasets, raw lab files, or confidential tables here. For real project work: WhatsApp.",
      "- When a question needs analyses: explain the concept briefly, then invite them to WhatsApp.",
      "- Never claim you are ChatGPT, Groq, Llama or OpenAI. You are SPICe.",
      "",
      "SITE KNOWLEDGE:",
      loadKnowledge(site),
    ])
    .join("\n");
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
  /sin\s+(?:(?:usar|registrar|dejar|ingresar|poner|necesidad\s+de)\s+)?(?:una\s+|la\s+)?tarjeta/i,
  /no\s+(?:se\s+)?(?:requiere|necesita|pide|pedimos|piden|hace\s+falta)n?s?\s+(?:una\s+|la\s+)?tarjeta/i,
  /no\s+credit\s+card/i,
  /without\s+(?:a\s+|any\s+)?(?:credit\s+)?card/i,
  /no\s+(?:credit\s+)?card\s+(?:required|needed)/i,
];

/*
 * Huerto membership prices — the only amounts allowed, and only on huerto.
 * Each matched amount is replaced by "\n" before the generic price check, which
 * also ends the keyword window ("cuesta $4.990 al mes, 7 días" must pass).
 * Lookarounds keep 4.990 from matching inside 4.990.000, 59 inside 590, etc.
 */
const NB = "(?<![\\d.,])"; // no digit/separator before
const NA = "(?![\\d]|[.,]\\d)"; // no digit or decimal continuation after
const CLP_AMT = "(?:4[.,\\s]?990|39[.,\\s]?990)";
const HUERTO_ALLOWED = [
  // $4.990, $ 4990, CLP$4.990, CLP 39.990, $39.990 CLP, 4.990 pesos (chilenos), 4.990 CLP
  new RegExp("(?:CLP\\s?\\$?|\\$)\\s?" + NB + CLP_AMT + NA + "(?:\\s?(?:CLP|pesos(?:\\s+chilenos)?))?", "gi"),
  new RegExp(NB + CLP_AMT + NA + "\\s?(?:CLP|pesos(?:\\s+chilenos)?)\\b", "gi"),
  new RegExp("(?<![€£]\\s?)" + NB + CLP_AMT + NA, "g"), // bare 4.990 / 39990 (e.g. "cuesta 4.990 al mes")
  // US$5.99, US $5.99, US$ 5,99, USD 5.99, U$S 5.99, $5.99 USD, 5.99 USD/dólares/dollars
  new RegExp("(?:US\\s?\\$|USD\\s?\\$?|U\\$S)\\s?" + NB + "5[.,]99" + NA + "(?:\\s?USD)?", "gi"),
  new RegExp("\\$?\\s?" + NB + "5[.,]99" + NA + "\\s?(?:USD|US\\$|d[oó]lares?|dollars?)\\b", "gi"),
  new RegExp("\\$\\s?" + NB + "5[.,]99" + NA, "g"), // $5.99 (no CLP price looks like this)
  // US$59, USD 59, 59 USD, US$59.00
  new RegExp("(?:US\\s?\\$|USD\\s?\\$?|U\\$S)\\s?" + NB + "59(?:[.,]00)?" + NA + "(?:\\s?USD)?", "gi"),
  new RegExp("\\$?\\s?" + NB + "59(?:[.,]00)?" + NA + "\\s?(?:USD|US\\$|d[oó]lares?|dollars?)\\b", "gi"),
];

/* Huerto: offers of a code / free access (rule from Marcos, 2 Oct 2026). */
const CODE_OFFER_PATTERNS = [
  /\busa(?:r|s|lo)?\s+(?:el|un|este|tu|nuestro|ese)\s+c[oó]digo/i,
  /\bc[oó]digos?\s+(?:de\s+)?(?:descuento|promo(?:ci[oó]n(?:al)?)?|regalo|invitaci[oó]n|acceso)/i,
  /\bcup[oó]n(?:es)?\b/i,
  /\bacceso\s+(?:gratis|gratuito|libre|sin\s+costo)/i,
  /\bgratis\s+(?:para\s+siempre|de\s+por\s+vida|indefinidamente)/i,
  /\b(?:te|les)\s+(?:damos|doy|damos|enviamos|env[ií]o|mando|mandamos|regalamos|paso|pasamos|puedo\s+dar|podemos\s+dar)\s+(?:un|el|este)\s+c[oó]digo/i,
  /\bc[oó]digo\s*[:«"“]?\s*[A-Z0-9]{5,}\b/,
  /\b(?:(?!7\b)\d+|un|una|dos|tres|cuatro|seis|doce)\s+(?:d[ií]as|semanas?|mes(?:es)?|años?)\s+(?:gratis|sin\s+costo)/i,
  /\bprueba\s+(?:extendida|m[aá]s\s+larga)/i,
  /\bfree\s+(?:access|forever|for\s+life|membership|account)/i,
  /\b(?:promo(?:tional)?|discount|coupon|voucher|referral|invite)\s+codes?\b/i,
  /\bcoupons?\b/i,
  /\buse\s+(?:the|a|this|our)\s+code\b/i,
  /\b(?:(?!7\b)\d+|one|two|three|six|twelve)[\s-]+(?:days?|weeks?|months?|years?)\s+(?:free|at\s+no\s+cost)/i,
  /\bextended\s+trial\b/i,
];

function stripAllowedHuerto(text) {
  let t = String(text || "");
  for (const re of HUERTO_ALLOWED) t = t.replace(re, "\n");
  return t;
}

/**
 * @param {string} text
 * @param {"spicelab"|"agro"|"huerto"} [site]  default spicelab (strictest)
 * @returns {null | "price" | "card" | "share"}
 */
function guardViolation(text, site, opts) {
  const skip = (opts && opts.skip) || [];
  let t = String(text || "");
  for (const re of CARD_PATTERNS) if (re.test(t)) return "card";
  if (site === "huerto") {
    if (/\b51\s?%|\b51\s+(?:por\s*ciento|percent)|m[aá]s\s+de\s+la\s+mitad|more\s+than\s+half|la\s+mayor\s+parte\s+de\s+lo\s+que\s+pagan/i.test(t)) return "share";
    // The approved answer itself mentions "el código de SPICe ... clientes": allow that.
    const tc = t.replace(/(?:el\s+)?c[oó]digo\s+de\s+SPICe\s+es\s+(?:solo\s+)?para\s+clientes|(?:the\s+)?SPICe\s+code\s+is\s+(?:only\s+)?for\s+SPICe\s+clients/gi, "\n");
    if (skip.indexOf("code") === -1) for (const re of CODE_OFFER_PATTERNS) if (re.test(tc)) return "code";
    t = stripAllowedHuerto(t);
  }
  // Product codes (HR35 / HR55) and areas (35 m²) are not prices.
  t = t.replace(/\bHR\s?-?\d{2}\b/gi, "HR").replace(/\d+\s?m(?:²|2)\b/g, "\n");
  for (const re of PRICE_PATTERNS) if (re.test(t)) return "price";
  return null;
}

function safeReply(site, lang, kind) {
  const l = lang === "en" ? "en" : "es";
  if (site === "huerto" && (kind === "code" || kind === "card")) return SAFE_CODE_REPLY[l];
  if (site === "huerto" && kind === "share") return SAFE_MISSION_REPLY[l];
  return site === "huerto" ? SAFE_HUERTO_REPLY[l] : SAFE_PRICE_REPLY[l];
}

/* Links: unknown *.spicelab.cl hosts (e.g. a typo like huertos.spicelab.cl) are
 * replaced by the site home; wa.me links to any other number by the real one. */
const KNOWN_HOSTS = ["spicelab.cl", "www.spicelab.cl", "agro.spicelab.cl", "www.agro.spicelab.cl", "huerto.spicelab.cl", "www.huerto.spicelab.cl"];
const SITE_HOME = { spicelab: "https://spicelab.cl/", agro: "https://agro.spicelab.cl/", huerto: "https://huerto.spicelab.cl/" };

function repairLinks(text, site) {
  let fixed = 0;
  let t = String(text || "").replace(/https?:\/\/([a-z0-9.-]*spicelab\.cl)(\/[^\s)<>\]]*)?/gi, function (all, host) {
    if (KNOWN_HOSTS.indexOf(host.toLowerCase()) !== -1) return all;
    fixed++;
    return SITE_HOME[site] || SITE_HOME.spicelab;
  });
  t = t.replace(/(?:https?:\/\/)?wa\.me\/\+?([0-9X]+)/gi, function (all, num) {
    if (num === "56971540665") return all;
    fixed++;
    return WA_URL;
  });
  return { text: t, fixed };
}

/* Cosmetic cleanup: non-breaking hyphens → "-", and drop asides like "(no «alúmina»)". */
function tidyReply(text) {
  return String(text || "")
    .replace(/[\u2011\u2010]/g, "-")
    .replace(/\s*\((?:y\s+)?(?:no|nunca|not|never)\s*[«“"']?\s*al[uú]mina\s*[»”"']?\)/gi, "");
}

/* The lab sentence must be in the visitor's language: swap a wrong-language copy for the exact one. */
function fixLabLanguage(text, lang) {
  const from = lang === "en" ? LAB_ES : LAB_EN;
  const to = lang === "en" ? LAB_EN : LAB_ES;
  const norm = function (x) { return x.replace(/[’]/g, "'"); };
  const t = norm(String(text || ""));
  const i = t.indexOf(norm(from));
  return i === -1 ? String(text || "") : t.slice(0, i) + to + t.slice(i + from.length);
}

function guardReply(text, lang, site) {
  text = fixLabLanguage(tidyReply(text), lang);
  const rl = repairLinks(text, site);
  if (rl.fixed) {
    console.warn("spice-chat guard:", site, "link_repaired", rl.fixed);
    text = rl.text;
  }
  const v = guardViolation(text, site);
  if (!v) return { reply: text, guarded: rl.fixed ? "link" : null };
  return { reply: safeReply(site, lang, v), guarded: v };
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

/** Reasoning models (gpt-oss) spend tokens thinking: keep effort low, raise the cap. */
function requestBody(model, messages) {
  const body = { model, temperature: 0.3, max_tokens: MAX_TOKENS, messages };
  if (/gpt-oss/i.test(model)) {
    body.reasoning_effort = "low";
    body.max_tokens = MAX_TOKENS + 800;
  }
  return body;
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
      body: JSON.stringify(requestBody(model, messages)),
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
      site: resolveSite(origin),
      configured: Boolean(resolveProvider()),
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
  const site = resolveSite(origin, body.site);
  const history = normalizeMessages(body.messages);
  if (!history.length) {
    return send(400, {
      error: "bad_request",
      message: "Falta messages[].",
    });
  }

  const prov = resolveProvider();
  if (!prov) {
    return send(503, {
      error: "missing_api_key",
      message:
        "El asistente aún no está configurado (falta GROQ_API_KEY u OPENAI_API_KEY en Netlify → Site configuration → Environment variables; ver README). Mientras tanto, escríbenos por WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").",
      whatsapp: WA_URL,
    });
  }

  const apiKey = prov.apiKey;
  const baseUrl = prov.baseUrl;
  const model = prov.model;

  const messages = [{ role: "system", content: buildSystemPrompt(lang, site) }].concat(history);

  try {
    let raw;
    try {
      raw = await callChat(apiKey, baseUrl, model, messages);
    } catch (e) {
      const fb = prov.fallbackModel;
      if (!(e && e.status === 429 && fb && fb !== model)) throw e;
      console.warn("spice-chat: primary model rate-limited, using fallback model");
      raw = await callChat(apiKey, baseUrl, fb, messages);
    }
    const out = guardReply(raw, lang, site);
    if (out.guarded) console.warn("spice-chat guard:", site, out.guarded);
    return send(200, { reply: out.reply, site });
  } catch (err) {
    const aborted = err && (err.name === "AbortError" || err.name === "TimeoutError");
    if (aborted) {
      return send(504, {
        error: "timeout",
        message: "El modelo tardó demasiado. Intenta de nuevo o escríbenos por WhatsApp: " + WA_URL,
      });
    }
    if (err && err.status === 429) {
      return send(429, {
        error: "rate_limited",
        message: "Hay muchas consultas en este momento. Intenta en un minuto o escríbenos por WhatsApp: " + WA_URL + " (" + WA_HUMAN + ").",
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
  tidyReply,
  fixLabLanguage,
  isAllowedOrigin,
  corsHeaders,
  resolveSite,
  resolveProvider,
  requestBody,
  repairLinks,
  stripAllowedHuerto,
  FALLBACK_HUERTO,
  SAFE_HUERTO_REPLY,
  SAFE_CODE_REPLY,
  SAFE_MISSION_REPLY,
  MISSION_ES,
  MISSION_EN,
  CODE_ES,
  CODE_EN,
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
