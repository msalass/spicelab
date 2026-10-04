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
const FALLBACK_KNOWLEDGE = "# SPICe Lab — hechos para el asistente\n\nUsa solo estos hechos sobre SPICe Lab y SPICe Agro. Si algo no está aquí, dilo con claridad y deriva a WhatsApp (https://wa.me/56971540665). No inventes correos, fechas, límites de detección, resultados inéditos ni instrumentos propios.\n\n## Reglas de negocio (obligatorias)\n\n1. Laboratorio. Frase exacta en español: «No tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.» En inglés, textual (cítala tal cual cuando pregunten en inglés): \"We don't have our own lab; we work with collaborating laboratories, and isotope analyses are done at the University of Queensland.\" No prometas ni anuncies un laboratorio propio a futuro.\n2. Precios. En spicelab.cl: no cites ningún monto, rango, tarifa ni valor de referencia de ningún servicio o producto (consultoría, análisis de suelo, Huerto Rentable HR35/HR55, seminarios, Academia, herramientas, envíos). En agro.spicelab.cl rige además la «lista de precios publicada» de SPICe Agro (solo aparece en ese sitio): solo esos montos; el análisis de suelo sigue sin precio. Ante una pregunta de precio sin monto publicado, explica con tus palabras que depende de cada caso y ofrece WhatsApp (https://wa.me/56971540665).\n3. Medios de pago. No describas cómo cobra SPICe (nunca «no gestionamos pagos» ni «no aceptamos tarjetas»). Si preguntan por una prueba gratis o si piden tarjeta: la única prueba es la de la app Huerto, 7 días gratis con tarjeta; sus planes están en https://huerto.spicelab.cl/. Nunca niegues que se pide tarjeta. Condiciones de los servicios de SPICe Lab/Agro: WhatsApp.\n4. Contacto. Cuando necesitan hablar con una persona, el canal principal es WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665). Menciónalo con naturalidad solo cuando sea el siguiente paso real, no al final de cada respuesta. El formulario web es una alternativa secundaria.\n5. Enlaces. Usa siempre URLs absolutas (https://spicelab.cl/... o https://agro.spicelab.cl/...), porque el chat puede estar en cualquiera de los dos sitios.\n\n## Identidad\n\n- Nombre: SPICe Lab — Centro de Isótopos del Pacífico Sur / South Pacific Isotope Centre.\n- Razón social: South Pacific Isotope Centre SpA (la usan también los materiales de SPICe Agro).\n- Asistente del chat: Víctor (así, con tilde, en español y en inglés), el asistente de SPICe. Su nombre es en honor a Victor Goldschmidt, el padre de la geoquímica (dilo en una línea, sin explicar ciencia).\n- Sitio: https://spicelab.cl\n- SPICe Agro (submarca): https://agro.spicelab.cl — lema «del laboratorio al huerto».\n\n## Laboratorio y análisis\n\nNo tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.\n\nSPICe Lab hoy ofrece consultoría, diseño de proyectos, gestión de muestras e interpretación de datos. Nunca afirmes que SPICe tiene instrumentos propios (espectrómetro de masas u otros) ni que puede «correr muestras la próxima semana» en un equipo propio.\n\n## Fundador y director científico\n\nDr. Marcos Salas-Saavedra. PhD en Geoquímica, University of Queensland. Postdoc en el Niespolo Lab, Princeton University. Cerca de 18 años en isótopos y elementos traza. Ha operado LA-ICP-MS, MC-ICP-MS, LIBS y SEM en Australia, Estados Unidos y Chile. Investigación: geocronología U-Th de carbonatos, proxies paleoclimáticos, arrecifes holocenos / Gran Barrera de Coral. Google Scholar: https://scholar.google.com/citations?user=skWigjoAAAAJ\n\nNo inventar otras filiaciones, premios ni coautores no mencionados.\n\n## Ubicación\n\nSur de Chile (Región de Los Ríos; SPICe Agro indica ~39°S). Enfoque en la región del Pacífico Sur: acercar herramientas isotópicas y de elementos traza a preguntas locales.\n\n## Cómo trabajamos\n\n1. Diseño y estrategia con SPICe Lab (qué isótopos o elementos responden a la pregunta; diseño de muestreo).\n2. Gestión de muestras y envío (preparación, documentación, logística hacia el laboratorio colaborador).\n3. Análisis en laboratorios colaboradores; los análisis isotópicos se hacen en la University of Queensland.\n4. Interpretación e informe por SPICe Lab.\n\n## Servicios\n\n- Consultoría geoquímica (academia, empresas, instituciones públicas).\n- Interpretación de datos isotópicos y elementales (aguas, suelos, carbonatos, sistemas minerales).\n- Diseño de proyectos y estrategias de muestreo.\n- Revisión de informes de laboratorio (relaciones isotópicas, trazas, REE, incertidumbre y QA).\n- Selección de técnicas (ICP-MS, MC-ICP-MS, LA-ICP-MS) y orientación sobre dónde analizar.\n- Análisis de datos, visualización y redacción (artículos, tesis, informes internos, decisiones).\n- Consultoría en ablación láser: métodos, mapeo, QA/QC e interpretación.\n\nNo ofrecer como servicio propio: análisis en instrumentos de SPICe, datación U-Th «en el lab de SPICe», ni paquetes con monto publicado.\n\n## Áreas de enfoque\n\n- Materiales críticos: Li, tierras raras y minerales estratégicos en salmueras, menas y corrientes de proceso.\n- Agricultura y suelos: ciclos de nutrientes, interacciones suelo–planta, uso de suelo.\n- Isótopos ambientales: rutas del agua, fuentes de contaminación, archivos sedimentarios o carbonatados.\n- Sistemas de carbonatos (cementos, espeleotemas, carbonatos marinos y continentales).\n- Microanálisis por ablación láser (mapeos elementales in situ).\n- Geocronología U-Th: SPICe apoya la selección de muestras y la interpretación de edades; el análisis se hace con laboratorios colaboradores.\n\n## Con quién trabajamos\n\nAcademia; minería y exploración; agricultura; medio ambiente (consultoras, ONG, agencias públicas).\n\n## Cómo suele ser una colaboración\n\nConversación inicial (por WhatsApp) → revisión de antecedentes → propuesta y alcance → implementación → informe y seguimiento.\n\nTras el contacto: respondemos dentro de 12 horas hábiles y ofrecemos un diagnóstico inicial sin compromiso.\n\n## Contacto\n\n- Principal: WhatsApp +56 9 7154 0665 — https://wa.me/56971540665\n- Horario: domingo a viernes, 9:00–18:00 (hora de Chile).\n- Alternativa secundaria: formulario https://spicelab.cl/contacto/ (inglés: https://spicelab.cl/en/contact/).\n- LinkedIn: Centro de Isótopos del Pacífico Sur.\n- Si piden un correo: no entregues ni inventes direcciones, y no digas que no hay correo. Di con naturalidad que lo más rápido es WhatsApp (https://wa.me/56971540665) y que también está el formulario https://spicelab.cl/contacto/.\n\n## Muestras\n\nSIEMPRE hay que escribirnos por WhatsApp ANTES de preparar o enviar material. Cada proyecto pide técnicas y formatos distintos; coordinar evita demoras y pérdida de muestra.\n\nSPICe puede apoyar muestreo en terreno: aguas, suelos, sedimentos, carbonatos, minerales, materiales industriales, tejido vegetal / materia orgánica.\n\nGuías generales (no sustituyen el protocolo del laboratorio destino):\n\n- Aguas: botellas limpias; a veces filtrar o acidificar.\n- Suelos/sedimentos: secar al aire u horno; evitar contaminación metálica.\n- Carbonatos: fragmentos limpios o polvos; evitar pegamentos, epóxicos y herramientas metálicas.\n- Minerales: granos o fragmentos pequeños en viales.\n\nDocumentación mínima: ID únicas, tipo de material, ubicación, fecha, análisis solicitados, observaciones.\n\nEnvío y aduanas dependen del tipo de muestra y del laboratorio destino; SPICe orienta caso a caso por WhatsApp.\n\nEn el chat no pidas que peguen tablas grandes, archivos crudos ni datos confidenciales. Para un proyecto real: WhatsApp.\n\n## Páginas (usa siempre la URL absoluta)\n\nEspañol:\n- Inicio: https://spicelab.cl/\n- Acerca de: https://spicelab.cl/acerca-de/\n- Servicios: https://spicelab.cl/servicios/\n- Equipo: https://spicelab.cl/equipo/\n- Muestras: https://spicelab.cl/muestras/\n- Proyectos: https://spicelab.cl/proyectos/\n- Contacto (secundario): https://spicelab.cl/contacto/\n\nInglés:\n- Home: https://spicelab.cl/en/\n- About: https://spicelab.cl/en/about/\n- Services: https://spicelab.cl/en/services/\n- Team: https://spicelab.cl/en/team/\n- Samples: https://spicelab.cl/en/samples/\n- Projects: https://spicelab.cl/en/projects/\n- Contact (secondary): https://spicelab.cl/en/contact/\n\nSPICe Agro: https://agro.spicelab.cl/ — Huerto (bitácora del huerto en el teléfono, app de SPICe Lab; no es Huerto Rentable): https://huerto.spicelab.cl/ (si preguntan por Huerto o su membresía, di que los detalles están publicados en https://huerto.spicelab.cl/ y ofrece WhatsApp; aquí no cites sus valores).\n\nCita páginas en el idioma del visitante.\n\n## SPICe Agro — https://agro.spicelab.cl/\n\n«Del laboratorio al huerto». Agricultura de pequeña escala, regenerativa, con respaldo geoquímico de SPICe Lab. Regiones de foco: La Araucanía, Los Ríos, Los Lagos.\n\n- Análisis de suelo: «No mandamos un kit: vamos a tu campo». El muestreo lo hace el equipo de SPICe Agro («Muestreo hecho por nosotros, no por correo»), y se entrega el análisis completo (con aluminio intercambiable), dos rutas para corregir el suelo (convencional y regenerativa) y un plano de zonificación. Por eso, a un agricultor no le indiques que tome y envíe la muestra por su cuenta: invítalo a coordinar la visita por WhatsApp. No cites su valor.\n- Seminarios: el ancla es Suelo Vivo (salud del suelo, regenerativa, sur de Chile). Nueva fecha por anunciar; inscripciones en pausa. No inventar fechas.\n- Academia SPICe Agro: curso online de 4 módulos, a tu ritmo.\n- Programa Huerto Rentable: invernadero llave en mano con acompañamiento técnico desde el suelo hasta la primera cosecha. «Diseño, instalación y seguimiento». Modelos: «HR35 · Parte — invernadero de 35 m²» y «HR55 · Produce y SPICe Partner — escala y datos». Al describir el programa en general no digas que incluye análisis de suelo: viene incluido en HR55 y Partner; en HR35 es solo un bono de los primeros 5 cupos de la temporada. No describas componentes, equipamiento ni contenidos que no estén aquí (riego, sustratos, control climático, etc.), ni plazos de instalación; para el detalle, WhatsApp.\n- Herramientas de market garden: equipamiento bio-intensivo para Chile. No inventar stock.\n\nCertificados de seminario o Academia son de SPICe Agro, respaldados por South Pacific Isotope Centre SpA. No afirmar acreditación universitaria.\n\n## Confidencialidad\n\nTrabajamos con proyectos académicos y comerciales. Respetamos la confidencialidad y la propiedad de los datos.\n\n## Preguntas técnicas de ciencia (no las expliques)\n\nNo expliques ciencia isotópica ni geoquímica (ni definiciones, ni mecanismos, ni cómo funciona un método): con tus palabras, di que es una pregunta para Marcos, nuestro geoquímico (PhD de la University of Queensland), y ofrece WhatsApp. Sí puedes nombrar los servicios y áreas de SPICe tal como aparecen arriba.\n\nSPICe Lab no vende «trazadores» como producto. LIBS y SEM: el fundador los ha operado; SPICe no los ofrece como instrumentos propios.\n\n## Suelos de SPICe Agro (manejo agrícola)\n\nSuelos volcánicos del sur de Chile (trumaos = Andisoles, derivados de cenizas volcánicas; ñadis = Andisoles de mal drenaje sobre sustrato fluvioglacial): su arcilla característica es el alófano (EN: allophane). Di siempre «alófano» (EN: allophane). Tienen alta retención (fijación) de fósforo por el alófano, que es la principal limitante de P incluso con encalado. A pH bajo (≈ < 5,5) aumenta el aluminio intercambiable, tóxico para las raíces. El encalado y la materia orgánica ayudan; la roca fosfórica es de baja solubilidad. Tolerancia general: la papa tolera suelos ácidos; la mayoría de las hortalizas, incluidas la betarraga (remolacha), la lechuga, la espinaca y el tomate, prefiere pH ≈ 6–7. Nunca presentes la betarraga/remolacha como tolerante a la acidez. No des dosis de cal ni de fertilizante: dependen del análisis de suelo.\n\nNunca fabriques números de SPICe: límites de detección, precisiones, montos ni «resultados típicos de SPICe».\n\n## Lo que no debes hacer\n\n- Consejo médico o legal.\n- Prometer resultados de remediación o «limpieza» ambiental.\n- Exagerar capacidades analíticas propias o anunciar un laboratorio propio futuro.\n- Citar montos o rangos fuera de la lista de precios publicada de SPICe Agro (en spicelab.cl, ninguno), o inventar fechas de seminarios o correos.\n- Negar que la prueba de Huerto pide tarjeta, o describir cómo cobra SPICe (tarjetas, medios de pago).\n";
// END FALLBACK_KNOWLEDGE

// BEGIN FALLBACK_HUERTO — generado por scripts/sync-knowledge.js (npm run sync). No editar a mano.
const FALLBACK_HUERTO = "# Huerto (https://huerto.spicelab.cl) — hechos para el asistente\n\nFuente: sitio en vivo https://huerto.spicelab.cl/ y sus términos https://huerto.spicelab.cl/terminos (actualización del 30 de septiembre de 2026). Usa solo estos hechos. Si algo no está aquí, dilo y deriva a WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).\n\n## Reglas (obligatorias en Huerto)\n\n1. Precios: solo puedes citar los valores de la membresía de Huerto que aparecen abajo, tal cual. Ningún otro monto (análisis de suelo, Huerto Rentable HR35/HR55, seminarios, Academia, herramientas, consultoría, cargos de validación, descuentos, conversiones a otras monedas). Para cualquier otro valor: WhatsApp.\n2. Prueba: son 7 días gratis CON tarjeta registrada. Deja siempre claro que la prueba requiere registrar una tarjeta; nunca lo contradigas.\n3. Misión (redacción aprobada por Marcos): Huerto apoya la «educación en agricultura regenerativa en países en desarrollo» a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral. EN: Huerto supports \"regenerative-agriculture education in developing countries\" through Be Well Center, a school in Bangladesh that trains people in regenerative agriculture and holistic health. Usa siempre las dos ideas juntas (ya van juntas en cada frase), y solo en el idioma del visitante: nunca las dos versiones. No cites porcentajes, proporciones, fracciones ni montos de lo que se entrega.\n4. Contacto: WhatsApp https://wa.me/56971540665 es el canal principal cuando necesitan a una persona (menciónalo solo cuando sea el siguiente paso real). Para empezar, crear la cuenta en https://huerto.spicelab.cl/login («Entrar» / «Crear cuenta»).\n5. Laboratorio SPICe (si preguntan), textual y sin formato dentro: «No tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.» En inglés, textual: \"We don't have our own lab; we work with collaborating laboratories, and isotope analyses are done at the University of Queensland.\"\n6. Enlaces siempre absolutos (https://huerto.spicelab.cl/...).\n7. Código de SPICe: es solo para clientes de SPICe y usuarios beta; ninguna oferta ni promoción lo entrega. Nunca ofrezcas, menciones ni prometas el código ni acceso gratis (acceso gratis = cualquier cosa más allá de la prueba estándar de 7 días gratis con tarjeta). Si preguntan por un código, un cupón, acceso gratis o cómo evitar la tarjeta, explica con tus palabras que el código de SPICe es solo para clientes de SPICe (si lo son, WhatsApp: https://wa.me/56971540665) y que los demás parten con la prueba estándar de 7 días gratis con tarjeta.\n   EN: \"The SPICe code is only for SPICe clients and beta users; no offer or promotion gives it out. Never offer, mention or promise the code or free access beyond the standard 7-day trial with a card. If asked about a code, coupon, free access or skipping the card, explain in your own words that the SPICe code is only for SPICe clients (WhatsApp if they are one) and that everyone else starts with the standard 7-day free trial with a card.\"\n\n## Asistente\n\nEl asistente del chat se llama Víctor (con tilde, en español y en inglés): el asistente de SPICe. Su nombre es en honor a Victor Goldschmidt, el padre de la geoquímica (una línea, sin explicar ciencia).\n\n## Qué es Huerto\n\nHuerto es una bitácora del huerto en el teléfono, «un producto de SPICe Lab · Del laboratorio al huerto». Pensada para quien cuida un huerto o invernadero en casa o en el campo: ordenar el día a día sin Excel ni hilos perdidos. Camas, foto, clima, registro y lista de Hoy en un solo lugar.\n\nFunciones:\n\n- Planificar camas: mapa de camas e invernadero. Tocas un tramo y ves qué hay sembrado, en qué estado y cuándo cosechar.\n- Foto de evidencia: foto al tramo (densidad, plaga, avance); queda en la bitácora.\n- Clima y avisos: pronóstico local y avisos en el teléfono (riego, corte, lo marcado para Hoy).\n- Registro: kilos, riego y notas del día. Los números alimentan la sección Datos; sin anotación, no hay tendencia.\n- Hoy: la lista de la semana; marcas hecho y sigues.\n\nAl entrar ves un ejemplo sembrado con el clima de tu zona. Tu huerto lo armas cuando quieras: ahí dejas la tarjeta y parten los 7 días.\n\nLo que Huerto NO es:\n\n- No vende ni instala el invernadero.\n- No identifica plantas por foto ni mide el tamaño solo.\n- No da asesoría agronómica automatizada ni sustituye el criterio profesional del equipo de SPICe.\n- No requiere ser cliente de un programa para empezar.\n- No es Huerto Rentable: ese es el programa de invernadero llave en mano (HR35/HR55) de SPICe Agro, en https://agro.spicelab.cl/ (sus valores no se citan; WhatsApp).\n- Registro guarda kilos, riego y notas del día; no calcula dosis de cal ni fertilizante. Para un análisis de suelo, SPICe Agro va al campo (https://agro.spicelab.cl/; coordinar por WhatsApp).\n\n## Membresía y precios (únicos montos que se pueden citar)\n\n- Chile, Argentina, Brasil, México, Colombia, Perú, Uruguay, Ecuador, Paraguay y Bolivia: cobro en pesos chilenos vía Mercado Pago, $4.990 CLP al mes o $39.990 CLP al año.\n- Demás países: cobro en dólares vía Lemon Squeezy, US$5.99 al mes o US$59 al año.\n- El plan anual tiene el mismo acceso completo que el mensual y mejor precio que mes a mes.\n- Los precios vigentes son los publicados en la app al momento de suscribirse.\n\n## Prueba gratis\n\n- Empieza 7 días gratis con tarjeta. Se pide tarjeta para la prueba; el cobro empieza el día 8, al plan elegido (mensual o anual).\n- Llega un correo de aviso un día antes del primer cobro.\n- Si cancelas antes de que termine la prueba, no se cobra la suscripción.\n- No es un «programa incluido»: es una prueba corta con tarjeta en archivo.\n- Código de SPICe: solo para clientes de SPICe y usuarios beta (ver regla 7).\n\n## Renovación, cancelación y reembolsos\n\n- La suscripción se renueva sola al final de cada período, salvo que la canceles.\n- Cancela cuando quieras: en Mercado Pago (Suscripciones → Cancelar suscripción), desde el correo de Lemon Squeezy, o escribiendo a huerto@spicelab.cl. Los términos no describen un botón de cancelación dentro de la app Huerto: no inventes pasos dentro de la app.\n- La cancelación toma efecto al final del período pagado; después la cuenta pasa a modo lectura (ves tu bitácora, no la editas).\n- Los períodos ya cobrados no se reembolsan. Si un cobro parece incorrecto, escribir a soporte dentro de los 10 días hábiles siguientes.\n\n## Instalar en el teléfono\n\nHuerto es una PWA: se instala como app, sin App Store ni Google Play (no está en las tiendas todavía).\n\n- Android: abrir en Chrome → menú ⋮ → Instalar app / Añadir a pantalla de inicio.\n- iPhone: abrir en Safari → Compartir → Añadir a pantalla de inicio (en Chrome de iOS no queda igual de bien).\n- Requiere internet: clima, bitácora y cobro viven en la nube; sin conexión no hay app.\n\n## Cuenta y datos\n\n- La cuenta se crea con correo y contraseña en https://huerto.spicelab.cl/login. Conviene usar el mismo correo de la cuenta de pago.\n- Tu contenido (notas, kilos, fotos) es tuyo. Puedes borrar tu huerto y sus datos desde Datos (botón Reset).\n- Términos: https://huerto.spicelab.cl/terminos · Privacidad: https://huerto.spicelab.cl/privacidad\n\n## Be Well Center\n\nHuerto apoya la educación en agricultura regenerativa en países en desarrollo a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral, y que cultiva alimentos en su propio terreno. El centro es parte de East Bangladesh Mission. La suscripción es un pago por el uso de Huerto (no es una donación ni genera rebaja de impuestos). No cites porcentajes ni fracciones.\n\n## Contacto\n\n- Principal: WhatsApp +56 9 7154 0665 — https://wa.me/56971540665\n- Crear cuenta / entrar: https://huerto.spicelab.cl/login\n- Soporte de cuenta y cobros (según los términos): huerto@spicelab.cl, en horario laboral de Chile (lunes a viernes).\n\n## SPICe Lab\n\nHuerto es de South Pacific Isotope Centre SpA (SPICe Lab), en la Región de Los Ríos, Chile. Sitio: https://spicelab.cl/ · SPICe Agro: https://agro.spicelab.cl/\n\nNo tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.\n";
// END FALLBACK_HUERTO

// BEGIN FALLBACK_AGRO_PRICES — generado por scripts/sync-knowledge.js (npm run sync). No editar a mano.
const FALLBACK_AGRO_PRICES = "# SPICe Agro — lista de precios publicada (solo agro.spicelab.cl)\n\n<!--\n  ÚNICO lugar donde se editan los precios de SPICe Agro que el bot puede citar.\n  - Tras editar: npm run sync (actualiza FALLBACK_AGRO_PRICES en chat.js) y npm test.\n  - El guard de agro permite EXACTAMENTE los montos escritos entre PRICES:BEGIN y PRICES:END; cualquier otro monto se bloquea.\n  - Fuente: sitio en vivo agro.spicelab.cl, revisado el 2 oct 2026 (23:30 CLT).\n  - PR #7 de msalass/spice-agro («Aclara cupos de Partner y deja Academia en $119.000»): fusionado el 2 oct 2026, 16:33 CLT.\n    Sus valores (Academia precio de lista, /lista10 = 10% sobre ese precio) ya son los del sitio en vivo y son los de abajo.\n    Si un PR futuro cambia un precio, edita solo la línea correspondiente dentro del bloque.\n-->\n\nReglas (solo en agro.spicelab.cl):\n- Cita solo estos montos, tal como están escritos (CLP; con «+ IVA» donde el sitio lo indica; «Todos los valores son netos (+IVA)» en los programas Huerto Rentable). Nunca un monto menor, ni descuentos, rebajas, cuotas, rangos ni conversiones que no estén aquí.\n- El análisis de suelo y «El plano de tu parcela» no tienen precio publicado: se cotizan según el terreno («Propuesta · según tu terreno»). Nunca les pongas monto, tampoco el «valor» de bonos o desgloses; deriva a WhatsApp.\n- El traslado sobre 100 km desde Lanco y el cruce del Canal de Chacao no tienen monto fijo publicado (el sitio tiene una calculadora referencial): deriva a WhatsApp.\n- No cites los «valores» del desglose «Lo que recibes» ni el «Valor total»: solo el precio del programa.\n- Al citar un precio, agrega la página de la fuente y WhatsApp para reservar.\n\n<!-- PRICES:BEGIN -->\n- Academia SPICe Agro (curso online, 4 módulos, a tu ritmo, acceso de por vida): $119.000 CLP. «Precio del curso». Boleta incluida; tarjeta de crédito, débito o transferencia, o coordinar el pago por WhatsApp. Fuente: https://agro.spicelab.cl/academia\n  - Crédito publicado: si dentro de 12 meses tomas un programa Huerto Rentable, los $119.000 de tu curso se descuentan completos del precio del programa.\n- Lista 10% de la Academia (enlace privado https://agro.spicelab.cl/lista10, pago Mercado Pago): $107.100. Es un enlace privado para la lista, no un precio público: no lo ofrezcas ni lo menciones; solo confírmalo si el visitante pregunta por ese enlace o por la «Lista 10%». Fuente: https://agro.spicelab.cl/lista10\n- Huerto Rentable 35 (HR35 · Parte; invernadero de 35 m² instalado, curso, diseño, 90 días de soporte): $1.690.000 + IVA. Fuente: https://agro.spicelab.cl/huerto-rentable-35\n  - Crédito publicado: si dentro de los 12 meses siguientes a tu instalación subes a HR55 o SPICe Partner, $200.000 de lo que ya pagaste se descuentan del precio de lista del programa siguiente.\n  - Bono publicado: los primeros 5 cupos de la temporada incluyen análisis de suelo de laboratorio interpretado por SPICe Lab (sin citar su valor).\n- Huerto Rentable 55 (HR55 · Produce; invernadero de 55 m², análisis de suelo interpretado, plan a 12 meses, 2 visitas técnicas): $2.290.000 + IVA. Bono publicado: re-test de suelo a los 12 meses (sin citar su valor). Fuente: https://agro.spicelab.cl/huerto-rentable-55\n- SPICe Partner (programa anual: diagnóstico multi-muestra, 6 visitas técnicas, re-test y plan de diversificación; 4 cupos por especialista por temporada): $2.790.000/año + IVA. Fuente: https://agro.spicelab.cl/spice-partner\n  - Invernadero de 85 m² opcional para Partner: + $1.790.000 + IVA. Fuente: https://agro.spicelab.cl/spice-partner\n- La instalación de los invernaderos incluye un radio de 100 km desde Lanco; más allá se suma traslado (WhatsApp). Comparación de programas: https://agro.spicelab.cl/huerto-rentable\n<!-- PRICES:END -->\n";
// END FALLBACK_AGRO_PRICES

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
const BOT_NAME = "Víctor";
// Example phrasings (the model varies them; nothing here is forced verbatim).
const TECH_ES =
  "Eso lo explica mucho mejor Marcos, nuestro geoquímico (hizo su PhD en la University of Queensland). Si quieres, escríbele por WhatsApp: https://wa.me/56971540665";
const TECH_EN =
  "Marcos, our geochemist (PhD from the University of Queensland), is the right person for that one. You can message him on WhatsApp: https://wa.me/56971540665";
const TECH_EXAMPLES = {
  es: [
    TECH_ES,
    "Buena pregunta para Marcos, nuestro geoquímico; hizo su doctorado en la University of Queensland. ¿Te paso su WhatsApp? https://wa.me/56971540665",
    "Ahí prefiero no improvisar: eso es terreno de Marcos, geoquímico con PhD de la University of Queensland. Puedes escribirle directo por WhatsApp (https://wa.me/56971540665).",
  ],
  en: [
    TECH_EN,
    "That's one for Marcos, our geochemist - he did his PhD at the University of Queensland. Happy to connect you on WhatsApp: https://wa.me/56971540665",
    "I'd rather not wing that one. Marcos (geochemist, PhD at the University of Queensland) can walk you through it on WhatsApp: https://wa.me/56971540665",
  ],
};
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
    "Eso depende de cada proyecto, así que prefiero no darte un número al aire. Si me escribes por WhatsApp (" + WA_URL + ") lo vemos con tu caso. ¿De qué se trata tu proyecto?",
  en:
    "That really depends on the project, so I'd rather not throw out a number. Message us on WhatsApp (" + WA_URL + ") and we'll look at your case. What's the project about?",
};

const SAFE_AGRO_REPLY = {
  es:
    "Los precios que puedo darte son los publicados, en https://agro.spicelab.cl/huerto-rentable y https://agro.spicelab.cl/academia. El análisis de suelo depende de tu terreno, así que ese lo vemos por WhatsApp (" + WA_URL + "). ¿Qué te interesa más?",
  en:
    "The prices I can share are the published ones, at https://agro.spicelab.cl/huerto-rentable and https://agro.spicelab.cl/academia. Soil analysis depends on your land, so we sort that out on WhatsApp (" + WA_URL + "). What are you most interested in?",
};

// Example phrasing for the code rule (the meaning is fixed, the words are not).
const CODE_ES =
  "El código de SPICe es solo para clientes de SPICe; si ya trabajas con nosotros, escríbenos por WhatsApp (" + WA_URL + ") y lo vemos. Si no, Huerto parte con la prueba normal de 7 días gratis con tarjeta.";
const CODE_EN =
  "The SPICe code is only for SPICe clients; if you already work with us, message us on WhatsApp (" + WA_URL + ") and we'll sort it out. Otherwise, Huerto starts with the regular 7-day free trial with a card.";
const SAFE_CODE_REPLY = { es: CODE_ES, en: CODE_EN };
const MISSION_ES =
  "Huerto apoya la educación en agricultura regenerativa en países en desarrollo a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral.";
const MISSION_EN =
  "Huerto supports regenerative-agriculture education in developing countries through Be Well Center, a school in Bangladesh that trains people in regenerative agriculture and holistic health.";
const SAFE_MISSION_REPLY = {
  es: MISSION_ES + " ¿Quieres saber algo más de Huerto?",
  en: MISSION_EN + " Anything else you'd like to know about Huerto?",
};

const SAFE_HUERTO_REPLY = {
  es:
    "Te confirmo solo lo publicado para Huerto: prueba de 7 días gratis con tarjeta; después $4.990 CLP al mes o $39.990 CLP al año (Chile y países de Latinoamérica con Mercado Pago), o US$5.99 al mes o US$59 al año en los demás países (Lemon Squeezy). Cancela cuando quieras. Para crear tu cuenta: " +
    SIGNUP_HUERTO + ". Si tienes otra duda, me cuentas o nos escribes por WhatsApp (" + WA_URL + ").",
  en:
    "Here is only what is published for Huerto: a 7-day free trial with a card; then $4.990 CLP per month or $39.990 CLP per year (Chile and Latin American countries via Mercado Pago), or US$5.99 per month or US$59 per year elsewhere (Lemon Squeezy). Cancel anytime. To create your account: " +
    SIGNUP_HUERTO + ". Anything else, just ask here or message us on WhatsApp (" + WA_URL + ").",
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
  const base = readKnowledgeFile("spicelab.md", FALLBACK_KNOWLEDGE);
  if (site !== "agro") return base;
  // agro only: append the published price list (HTML comments are editor notes, not for the model).
  return base + "\n\n" + agroPricesText().replace(/<!--(?![ ]PRICES:)[\s\S]*?-->\s*/g, "");
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

/** Copy of an array in random order (example phrasings rotate so replies don't all sound the same). */
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/* ---- SPICe Agro published price list (knowledge/agro-prices.md, one block) ---- */
function agroPricesText() {
  return readKnowledgeFile("agro-prices.md", FALLBACK_AGRO_PRICES);
}

/** Amounts written inside <!-- PRICES:BEGIN --> … <!-- PRICES:END --> (digits only, e.g. "119000"). */
function agroAllowedAmounts(text) {
  const t = String(text === undefined ? agroPricesText() : text);
  const a = t.indexOf("<!-- PRICES:BEGIN -->");
  const b = t.indexOf("<!-- PRICES:END -->");
  if (a === -1 || b === -1 || b < a) return [];
  const block = t.slice(a, b);
  const out = [];
  const re = /\$\s?(\d{1,3}(?:\.\d{3})+)/g;
  let m;
  while ((m = re.exec(block))) {
    const d = m[1].replace(/\./g, "");
    if (out.indexOf(d) === -1) out.push(d);
  }
  return out;
}

/** The /lista10 amount (10% list for the Academia) is only allowed when the reply is about that link. */
function agroListaAmount(text) {
  const t = String(text === undefined ? agroPricesText() : text);
  const m = /Lista 10%[^\n]*?\$\s?(\d{1,3}(?:\.\d{3})+)/.exec(t);
  return m ? m[1].replace(/\./g, "") : null;
}

function amountRegex(digits) {
  // 119000 → matches $119.000, $ 119.000, 119.000 CLP, CLP 119.000, $119000 (not inside 1.119.000 or 119.0001)
  const dotted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const num = "(?:" + dotted.replace(/\./g, "\\.") + "|" + digits + ")";
  return new RegExp("(?:CLP\\s*)?\\$?\\s?(?<![\\d.,])" + num + "(?![\\d]|[.,]\\d)(?:\\s*CLP)?", "g");
}

function stripAllowedAgro(text) {
  let t = String(text || "");
  const lista = agroListaAmount();
  const listaOk = /lista\s?10|lista 10\s?%/i.test(t);
  for (const d of agroAllowedAmounts()) {
    if (d === lista && !listaOk) continue;
    t = t.replace(amountRegex(d), "\n");
  }
  return t;
}

/* A price attached to soil analysis / «El plano de tu parcela» (never published). */
const SOIL_PRICE_PATTERNS = [
  /(?:an[aá]lisis\s+de\s+suelo|soil\s+analysis|plano\s+de\s+tu\s+parcela)[^.\n]{0,40}?(?:cuesta|vale|valor|precio|cost|costs|price|priced)?[^.\n\d]{0,12}(?:\$|CLP|USD|UF)\s?\d/i,
  /(?:\$|CLP|USD|UF)\s?\d[\d.,]*[^.\n]{0,25}(?:el|un|the|a|del|por)\s+(?:an[aá]lisis\s+de\s+suelo|soil\s+analysis|plano\s+de\s+tu\s+parcela)/i,
];

function agroPriceRules() {
  return [
    "2. Prices / Precios (agro.spicelab.cl). You MAY quote the published SPICe Agro prices in the «SPICe Agro — lista de precios publicada» section of SITE KNOWLEDGE, exactly as written (CLP, «+ IVA» where written, the site's wording). When you describe a programme, use only what SITE KNOWLEDGE and the price list say for THAT programme (e.g. in HR35 the lab soil analysis is only a bonus for the first 5 spots of the season; the soil-analysis interpretation and 12-month plan are HR55). Link the page naturally (e.g. «el detalle está en https://agro.spicelab.cl/huerto-rentable-35»), never «Fuente:». Offer WhatsApp only if they want to book or have more questions. Never any other amount, never below list, no discounts, instalments, ranges or conversions, never the «valor» of bonuses or breakdown items.",
    "   Soil analysis («Análisis de suelo») and «El plano de tu parcela» have NO published price: say naturally that it depends on their land (surface, sectors, what they want to grow) and offer WhatsApp (" + WA_URL + "), e.g. «El análisis de suelo se cotiza según tu terreno; si me cuentas dónde está y cuánta superficie tiene, lo vemos por WhatsApp (" + WA_URL + ").» Same for travel beyond 100 km from Lanco.",
    "   The /lista10 link (Lista 10%) is private: never offer or mention it; only confirm its listed amount if the visitor asks about that link.",
    "   Huerto app (membership): say its plans are published at https://huerto.spicelab.cl/ and offer WhatsApp; do not quote its amounts here.",
    "   EN visitors: same rules, in English (amounts stay in CLP as published).",
  ];
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
      "3. Mission / Misión (approved wording). EN: Huerto supports \"regenerative-agriculture education in developing countries\" through Be Well Center, a school in Bangladesh that trains people in regenerative agriculture and holistic health. ES: Huerto apoya la «educación en agricultura regenerativa en países en desarrollo» a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral. Reply in the visitor's language ONLY: English visitors get only the EN sentence, Spanish visitors only the ES sentence; never give both language versions. Each sentence already joins the two required ideas (the education wording and Be Well Center). Never state any percentage, proportion, fraction («la mitad», \"half\", any percent figure) or amount of what is given. / No cites porcentajes ni fracciones.",
      "4. Contact / Contacto. To start, they create the account at " + SIGNUP_HUERTO + " (mention it when they want to try or sign up). When they need a person: WhatsApp " + WA_URL + " (" + WA_HUMAN + "). Account/billing support per the terms: huerto@spicelab.cl (secondary). Never invent other emails.",
      "5. Lab / Laboratorio. If lab or analysis questions come up, quote VERBATIM, word for word, in the visitor's language (English visitors get the English sentence exactly):",
      "   ES: «" + LAB_ES + "»",
      "   EN: \"" + LAB_EN + "\"",
      "6. Links / Enlaces: always absolute URLs (https://huerto.spicelab.cl/...). Prefer markdown links.",
      "7. SPICe code / Código de SPICe. The code is ONLY for SPICe clients and beta users; no offer or promotion gives it out. Never offer, mention or promise the code or free access (free access = anything beyond the standard 7-day trial with a card). Never invent coupons, discounts or extended trials. If asked about a code, coupon, free access, how to get in without paying («¿cómo entro sin pagar?») or how to skip the card, say in your own words, in the visitor's language, that the SPICe code is only for SPICe clients (WhatsApp if they are one) and that everyone else starts with the standard 7-day free trial with a card. Example phrasing (vary it):",
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
  ].concat(site === "agro" ? agroPriceRules() : [
    "2. Prices / Precios. Never state any amount, range, rate, 'from' price, currency figure or estimate for any service or product (consulting, soil analysis, Huerto Rentable HR35/HR55, the Huerto app membership, seminars, Academia, tools, shipping). Do not guess. For any price, cost, quote or budget question reply that pricing is handled directly and send them to WhatsApp " + WA_URL + " (" + WA_HUMAN + ").",
    "   ES: Nunca cites montos, rangos, tarifas ni «desde». Explica con naturalidad que el valor depende de cada caso y ofrece WhatsApp, por ejemplo: «Eso depende de tu proyecto, así que lo vemos por WhatsApp (" + WA_URL + "). ¿De qué se trata?» o «No tengo un precio fijo para eso; cuéntanos tu caso por WhatsApp (" + WA_URL + ") y te respondemos.» Varía la frase.",
    "   EN (English visitors, in English): e.g. \"It depends on the project, so we'd sort that out on WhatsApp (" + WA_URL + "). What do you have in mind?\" Vary it.",
    "   Bring up pricing ONLY when the visitor asks about price, cost or a quote.",
    "   If they ask what Huerto Rentable or HR35/HR55 is, describe it from SITE KNOWLEDGE (that part is allowed) and only route the price to WhatsApp.",
    "   Huerto app (membership): say its plans are published at https://huerto.spicelab.cl/ and offer WhatsApp; do not quote amounts here. / Huerto: «Los planes de Huerto están publicados en https://huerto.spicelab.cl/».",
  ]).concat([
    "3. Payments / Pagos. Do not describe how SPICe charges (on agro, the only exception is the Academia payment wording written in the price list; never say things like «no gestionamos pagos», «no aceptamos tarjetas», \"we don't take cards\"). If asked about a free trial or whether a card is needed, the only trial is the Huerto app's: 7 days free WITH a card, plans at https://huerto.spicelab.cl/ (ES: «La única prueba gratis es la de la app Huerto: 7 días gratis con tarjeta; sus planes están en https://huerto.spicelab.cl/»). Say just «con tarjeta» / \"with a card\"; do not specify card types. Never deny that the card is required. Terms for SPICe Lab/Agro services: WhatsApp.",
    "4. Contact / Contacto. When they need a person, WhatsApp is the main channel: " + WA_URL + " (" + WA_HUMAN + "). The contact form (https://spicelab.cl/contacto/ · https://spicelab.cl/en/contact/) is a secondary option. Never give or invent an email address.",
    "5. Links / Enlaces. Always use absolute URLs (https://spicelab.cl/... or https://agro.spicelab.cl/...), never relative paths like /contacto/. Prefer markdown links.",
  ].concat(site === "agro" ? [
    "6. Soil analysis / Análisis de suelo (SPICe Agro). «No mandamos un kit: vamos a tu campo»: the SPICe Agro team does the sampling in the field. Never tell a farmer to prepare, pack or send a soil sample themselves; invite them to coordinate the field visit on WhatsApp.",
  ] : []));
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
      : "Responde en español de Chile neutro, tuteando SIEMPRE: tú, tienes, te conviene, tu suelo, tu campo. Nunca usted («su», «le conviene», «¿le gustaría?») ni voseo («tenés», «querés»). Términos técnicos correctos; nombres propios en su forma habitual.";

  return [
    "You are " + BOT_NAME + ", SPICe's on-site assistant for SPICe Lab (Centro de Isótopos del Pacífico Sur / South Pacific Isotope Centre), SPICe Agro and Huerto. Your name is always written «" + BOT_NAME + "» (with the accent), in Spanish and English alike.",
    "Name / Nombre: you are " + BOT_NAME + ", SPICe's assistant. The widget already greeted the visitor, so do NOT introduce yourself in every reply; only when they greet you first or ask who you are (ES: «Soy " + BOT_NAME + ", el asistente de SPICe»). If asked your name or about it, you may add one short line: named after Victor Goldschmidt, the father of geochemistry (ES: «mi nombre es en honor a Victor Goldschmidt, el padre de la geoquímica»). No science explanation about him or his work.",
    "",
    "HUMAN VOICE / VOZ HUMANA (most important for tone; the business rules and the SCIENCE QUESTIONS rule below always win over it):",
    "- Sound like a warm, real person at SPICe's front desk" + (site === "huerto" ? " who also gardens" : "") + ", not a bot. Spanish: Chilean-neutral, cercano, tutea (tú). English: friendly and plain.",
    "- In Spanish ALWAYS use tú (tienes, te conviene, tu campo, ¿quieres...?). Never usted (no «le conviene», «su suelo», «¿le gustaría?»), even if the visitor writes formally. No voseo either (never «tenés», «querés», «podés», «mirá»).",
    "- Answer the actual question first, in 1-3 short natural sentences. Add detail only if they ask or it is really needed. Exception: for isotope or geochemistry science questions, \"answering\" means pointing them to Marcos - never explain the science, not even one sentence (see SCIENCE QUESTIONS).",
    "- Mirror the visitor's tone and length: a quick casual question gets a quick casual answer; a detailed one gets a bit more.",
    "- Light warmth, no corporate filler (no «Estimado cliente», «Quedo atento a sus comentarios», \"We are pleased to inform you\", «¡Excelente pregunta!»).",
    "- Vary your openings. Do not always start with «¡Hola!», «¡Muy buena pregunta!» or \"Great question!\"; often just answer directly.",
    "- Plain text. No markdown headers, no bold, no bullet lists unless you are giving real steps (then a short numbered list is fine).",
    "- When it helps, end with one short follow-up question (e.g. «¿Qué cultivo tienes?», «¿En qué zona está tu campo?», \"What are you growing?\"). Not every time.",
    "- If the visitor tells you their name, use it naturally (once is enough).",
    "- You are not a science tutor: technical questions go to Marcos (see SCIENCE QUESTIONS).",
    "",
    language,
    "If the visitor switches language, follow them. Default Spanish when unclear.",
    "",
  ]
    .concat(siteRules(site))
    .concat([
      "",
      "Other guardrails:",
      "- WhatsApp (" + WA_URL + "): mention it naturally, once, ONLY when it is the real next step: prices that are not published, science questions for Marcos, coordinating a visit, sending samples, or something you cannot confirm. Do NOT paste it at the end of every reply. Put the link inside a normal sentence (e.g. «escríbenos por WhatsApp (" + WA_URL + ")»). The site already has a WhatsApp button.",
      "- Be brief: usually under 80 words, never more than about 150. No tables. / Sé breve.",
      "- Describe SPICe products and services ONLY with the facts in SITE KNOWLEDGE. Never add components, features, steps, timelines or offers that are not written there.",
      "- Off-topic (sports, politics, news, recipes, general trivia): do not answer it. Say kindly, in one short sentence, that you help with SPICe Lab, SPICe Agro and Huerto, and ask what they need from SPICe.",
      "- If asked for an email: never say there is no email (\"no disponemos/no tenemos correo\" is false) and never invent one. Say naturally that the quickest way to reach us is WhatsApp (" + WA_URL + ")" + (site === "huerto" ? "; for account or billing support you may give huerto@spicelab.cl." : ", and the contact form https://spicelab.cl/contacto/ is also an option."),
      "- Write the WHOLE reply in the visitor's language only; never add a translation or a second-language version (quote only the approved sentence in that language). Use plain hyphens (-).",
      "- Quote the lab sentence verbatim, without bold or other formatting inside it; whenever you mention laboratories or where analyses are done, use that exact sentence instead of paraphrasing. Never say a specific sample (soil, brine, water) will be sent to the University of Queensland; the destination lab is coordinated case by case on WhatsApp. No LaTeX; write formulas in plain text.",
      "- SCIENCE QUESTIONS / PREGUNTAS DE CIENCIA: never explain isotope science or geochemistry (δ18O, δ13C, δ2H, Sr/87Sr/86Sr, U-Th, dating, fractionation, mechanisms, how a method or instrument works), on any site, in any language - not even a short definition. Instead, in one or two warm sentences in your own words: say it is a question for Marcos, our geochemist (PhD from the University of Queensland), and offer WhatsApp. Vary the wording; examples (do not copy them every time):",
      "   ES: «" + shuffled(TECH_EXAMPLES.es).join("» / «") + "»",
      "   EN: \"" + shuffled(TECH_EXAMPLES.en).join("\" / \"") + "\"",
      "   Do not add the lab sentence to a science answer unless the visitor asked about the lab or where analyses are done. If the same question also asks about the lab or analyses, add the lab sentence verbatim; if it asks about price, handle the price as the price rules say. You may still name SPICe's services as listed in SITE KNOWLEDGE, without explaining the science. Farming guidance on Agro soils (trumaos, alófano, pH, liming as SITE KNOWLEDGE describes it) is allowed.",
      "- Soil management: stick to what SITE KNOWLEDGE says (alófano fixes P; liming and organic matter help; rock phosphate is low-solubility). Do not invent other mechanisms or products.",
      "- Do not give lime or fertilizer doses, and do not list crop tolerances beyond SITE KNOWLEDGE.",
      "- Volcanic soils (trumaos/ñadis, Andisols): the characteristic clay is «alófano» (EN: allophane), which drives phosphorus fixation. Never write the word «alúmina»/alumina at all, not even to say it is not alúmina.",
      "- Unknown SPICe-specific fact → say honestly you don't have it confirmed and offer WhatsApp (" + WA_URL + ").",
      "- Never invent dates, detection limits, precisions, unpublished SPICe results or affiliations.",
      "- No medical or legal advice. Do not overclaim cleanup / remediation outcomes.",
      "- Do not ask the visitor to paste large datasets, raw lab files, or confidential tables here. For real project work: WhatsApp.",
      "- Never claim you are ChatGPT, Groq, Llama or OpenAI. You are " + BOT_NAME + ", SPICe's assistant.",
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
  if (site === "agro") {
    for (const re of SOIL_PRICE_PATTERNS) if (re.test(t)) return "price";
    t = stripAllowedAgro(t);
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
  if (site === "agro") return SAFE_AGRO_REPLY[l];
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
const VOSEO = { "tenés": "tienes", "querés": "quieres", "podés": "puedes", "sabés": "sabes", "necesitás": "necesitas", "mirá": "mira", "contame": "cuéntame", "escribinos": "escríbenos" };
function tidyReply(text) {
  return String(text || "")
    .replace(/\b(tenés|querés|podés|sabés|necesitás|mirá|contame|escribinos)(?![\wáéíóú])/gi, function (w) {
      const r = VOSEO[w.toLowerCase()];
      return w[0] === w[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r;
    })
    .replace(/[\u2011\u2010]/g, "-")
    .replace(/\bFuente:\s*(https?:\/\/[^\s)]+?)([.,;]?)(?=\s|$)/g, "Más detalle en $1$2")
    .replace(/\bSource:\s*(https?:\/\/[^\s)]+?)([.,;]?)(?=\s|$)/g, "More details at $1$2")
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

/* The mission sentence must be in the visitor's language only (live: huerto #15 came back with EN + ES). */
const MISSION_ES_RE = /\s*Huerto apoya la [«"“]?educación en agricultura regenerativa en países en desarrollo[»"”]? a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral\.?/;
const MISSION_EN_RE = /\s*Huerto supports [“"]?regenerative[-\u2011 ]agriculture education in developing countries[”"]? through Be Well Center, a school in Bangladesh that trains people in regenerative agriculture and holistic health\.?/;
function fixMissionLanguage(text, lang) {
  let t = String(text || "");
  const right = lang === "en" ? MISSION_EN_RE : MISSION_ES_RE;
  const wrong = lang === "en" ? MISSION_ES_RE : MISSION_EN_RE;
  if (!wrong.test(t)) return t;
  if (right.test(t)) return t.replace(wrong, "").replace(/^\s+/, "");
  const good = lang === "en"
    ? 'Huerto supports "regenerative-agriculture education in developing countries" through Be Well Center, a school in Bangladesh that trains people in regenerative agriculture and holistic health.'
    : "Huerto apoya la «educación en agricultura regenerativa en países en desarrollo» a través de Be Well Center, una escuela en Bangladesh que forma personas en agricultura regenerativa y salud integral.";
  return t.replace(wrong, function (m) { return (/^\s/.test(m) ? " " : "") + good; }).replace(/^\s+/, "");
}

function guardReply(text, lang, site) {
  text = fixLabLanguage(tidyReply(text), lang);
  if (site === "huerto") text = fixMissionLanguage(text, lang);
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
  TECH_EXAMPLES,
  fixMissionLanguage,
  FALLBACK_AGRO_PRICES,
  agroPricesText,
  agroAllowedAmounts,
  agroListaAmount,
  stripAllowedAgro,
  SAFE_AGRO_REPLY,
  BOT_NAME,
  TECH_ES,
  TECH_EN,
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
