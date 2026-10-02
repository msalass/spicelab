# Chat SPICe (spicelab.cl · agro.spicelab.cl · huerto.spicelab.cl)

Widget de consultas para los sitios Netlify de [SPICe Lab](https://spicelab.cl), [SPICe Agro](https://agro.spicelab.cl) y [Huerto](https://huerto.spicelab.cl). Un script en el navegador y una función Netlify; la clave del modelo nunca llega al cliente. **Dominio final de spicelab/agro por confirmar.**

## Reglas de negocio (prompt, conocimiento, widget, guard y tests)

1. Laboratorio, frase exacta: «No tenemos laboratorio propio; trabajamos con laboratorios colaboradores, y los análisis isotópicos se hacen en la University of Queensland.» Sin prometer laboratorio propio a futuro.
2. Precios:
   - **spicelab.cl y agro.spicelab.cl: ningún precio** (tampoco los de Huerto). Derivan a WhatsApp.
   - **huerto.spicelab.cl: solo la membresía de Huerto**, tal como está publicada: $4.990 CLP/mes o $39.990 CLP/año (Chile y 9 países de Latinoamérica, Mercado Pago); US$5.99/mes o US$59/año en el resto (Lemon Squeezy). Ningún otro monto.
3. Nunca «sin tarjeta» ni equivalentes. En Huerto la prueba es de 7 días gratis **con tarjeta**.
4. CTA principal: WhatsApp https://wa.me/56971540665 (+56 9 7154 0665). En Huerto, además, crear cuenta en https://huerto.spicelab.cl/login.
5. Huerto: no citar porcentajes de lo que va a Be Well Center.
6. Enlaces absolutos.
7. Huerto, código de SPICe: es **solo para clientes de SPICe y usuarios beta**, y ninguna oferta lo entrega. El bot nunca ofrece, menciona ni promete el código o acceso gratis más allá de la prueba de 7 días con tarjeta. Ante preguntas por código, cupón, acceso gratis o cómo saltarse la tarjeta, responde «El código de SPICe es para clientes de SPICe; escríbenos por WhatsApp…». El guard reemplaza cualquier oferta de código, cupón o acceso gratis.

**Sitio y reglas se deciden en el servidor** según el header `Origin` (no por lo que diga el cliente). El widget manda `site` solo como pista, y el servidor la acepta únicamente en localhost. Para deploy previews o peticiones sin Origin se usa la variable `SITE_ID`.

> **Obligatorio en deploy previews:** define `SITE_ID` (`spicelab`, `agro` o `huerto`) en el sitio de Netlify. Los previews no tienen el `Origin` de producción, y una petición sin Origin reconocido y sin `SITE_ID` se resuelve como `spicelab` (comportamiento intencional, no se cambia), así que un preview de agro o Huerto respondería con las reglas y precios equivocados.

**Red de seguridad**: `chat.js` revisa cada respuesta. Si hay un monto ($, CLP, UF, USD, €, pesos, «cuesta/precio … número») o frases de tarjeta, la reemplaza por un mensaje seguro con WhatsApp. En Huerto deja pasar solo los 4 montos de la membresía (con variantes como `4.990 CLP`, `39990`, `US$5,99`, `USD 59`) y bloquea «51%». No bloquea notación isotópica (δ18O, 87Sr/86Sr, ‰, ppm, años, m²). También corrige enlaces: un subdominio inexistente de spicelab.cl (p. ej. «huertos.spicelab.cl», visto en la prueba en vivo) se cambia por el inicio del sitio, y cualquier wa.me con otro número se cambia por el oficial. En Huerto bloquea además ofertas de código, cupón o acceso gratis.

## Archivos

| Paquete | Destino en el repo del sitio |
|---|---|
| `public/spice-widget.js` | carpeta publicada, p. ej. `/spice-widget.js` |
| `netlify/functions/chat.js` | `netlify/functions/chat.js` |
| `knowledge/spicelab.md` | `knowledge/` (raíz del repo) — spicelab y agro |
| `knowledge/huerto.md` | `knowledge/` — huerto |
| `netlify.toml` | **fusionar**: solo `[functions]` y `[functions.chat]` (`included_files` con los dos .md). No tocar `publish`. |

Editar hechos: cambia el `.md` y ejecuta `npm run sync` (copia ambos al respaldo inline de `chat.js`; `npm run check` falla si no coinciden). `huerto.md` se armó solo con lo publicado en https://huerto.spicelab.cl/ y /terminos al 2 oct 2026.

## Despliegue

**A. Un sitio con su propia función** (spicelab, agro o huerto):

```html
<script src="/spice-widget.js" defer></script>
<!-- en Huerto, explícito: -->
<script src="/spice-widget.js" defer data-site="huerto"></script>
```

Endpoint relativo (`/.netlify/functions/chat`). En ese sitio de Netlify define `SITE_ID` (`spicelab`, `agro` o `huerto`) para que los deploy previews usen las reglas correctas.

**B. Una función para varios sitios**: la función vive en uno (p. ej. spicelab.cl) y los otros cargan el widget con endpoint absoluto:

```html
<script src="https://spicelab.cl/spice-widget.js" defer data-site="huerto"
        data-endpoint="https://spicelab.cl/.netlify/functions/chat"></script>
```

El servidor igual decide por `Origin`, así que agro no puede hacerse pasar por huerto. CORS permite spicelab.cl, agro.spicelab.cl, huerto.spicelab.cl (con y sin www.) y localhost; otros orígenes con `ALLOWED_ORIGINS`.

Atributos: `data-site` (`spicelab|agro|huerto` o hostname; por defecto `location.hostname`), `data-endpoint`, `data-lang="es|en"`, `data-bottom` / `data-right`. Funciona con o sin `.whatsapp-float`.

> Ojo: el botón flotante de WhatsApp de spicelab.cl hoy apunta a un número placeholder (no real); conviene corregirlo a `https://wa.me/56971540665`.

## Variables de entorno (Netlify → Site configuration → Environment variables)

**Proveedor aprobado por Marcos: Groq (free tier).** Configurar en cada sitio de Netlify que tenga la función:

| Variable | Valor | Obligatoria |
|---|---|---|
| `GROQ_API_KEY` | la clave de Groq (**solo en Netlify, marcada como secreta; nunca en el repo, README ni chat**) | sí |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | no (es el valor por defecto) |
| `GROQ_FALLBACK_MODEL` | `openai/gpt-oss-20b` | no (por defecto; si el modelo principal da 429 se reintenta una vez con este; `none` lo desactiva) |
| `SITE_ID` | `spicelab`, `agro` o `huerto` según el sitio | **sí en deploy previews** (sin Origin → `spicelab`) |
| `ALLOWED_ORIGINS` | orígenes extra, separados por coma | no |

Precedencia de clave: si existe `OPENAI_API_KEY` se usa esa (con `OPENAI_BASE_URL` / `OPENAI_MODEL`); si no, `GROQ_API_KEY` con base `https://api.groq.com/openai/v1`. `OPENAI_BASE_URL` sobreescribe la base en ambos casos.

Modelo: `llama-3.3-70b-versatile` respondió **404 (no disponible)** en Groq el 2 oct 2026, así que el valor por defecto es `openai/gpt-oss-120b` (buen español; el código lo llama con `reasoning_effort: "low"`). Alternativa probada: `qwen/qwen3.8-27b`. Free tier observado: 8.000 tokens/min y el prompt pesa unos 3.000 a 4.000 tokens, así que caben pocas consultas por minuto. Si Groq responde 429, el widget muestra «muchas consultas» + WhatsApp.

Sin clave: `503 {"error":"missing_api_key"}` y el widget muestra «aún no está activo» + WhatsApp.

Prueba en vivo (gasta tokens): `GROQ_API_KEY` en el entorno y `npm run live-test` (resultados en `live-test/`; la clave nunca se escribe).

## Integración: rama vía Victor, merge de Marcos

Un push a `main` en `msalass/spice-agro` (y en los repos de los otros sitios) sale en vivo por Netlify. Victor integra en una **rama** y abre un PR. Se revisa en el deploy preview y **solo Marcos hace el merge**. Ver `BRIEF-VICTOR.md` y `BRIEF-VICTOR-HUERTO.md`.

## Local

```bash
npm test         # tests offline (node --test), sin red ni clave
npm run check    # sintaxis + knowledge sincronizado
npm run demo     # http://localhost:8888/  (?site=huerto|agro · ?nowa = sin botón WhatsApp)
```

Node 18+, cero dependencias. Nunca hagas commit de `.env`.
