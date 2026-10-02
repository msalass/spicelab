# Brief de integración — Chat SPICe

Para: Victor (dev). Estado: **borrador, no enviado**. Repo spicelab.cl: `msalass/spicelab`; Agro: `msalass/spice-agro`. Dominio: **por confirmar** (spicelab.cl, agro.spicelab.cl o ambos).

## Reglas de trabajo

- Trabaja en una **rama nueva** (p. ej. `feat/spice-chat`) de `msalass/spice-agro` y/o del repo de spicelab.cl, y abre un PR.
- **No hagas merge ni push a `main`**: `main` en `msalass/spice-agro` despliega en vivo por Netlify. **Marcos hace el merge.**
- No crees cuentas ni API keys: la clave de Groq la configura Marcos en Netlify.

## Archivos (del zip `spicelab-chatbot.zip`)

| Origen | Destino en el repo |
|---|---|
| `public/spice-widget.js` | carpeta publicada del sitio (`/spice-widget.js`) |
| `netlify/functions/chat.js` | `netlify/functions/chat.js` |
| `knowledge/spicelab.md` y `knowledge/huerto.md` | `knowledge/` (raíz, junto a `netlify.toml`) |
| `test/`, `scripts/sync-knowledge.js`, `package.json` (scripts) | opcional, para `npm test` |

## netlify.toml (fusionar, no reemplazar)

Mantén el `[build]`/`publish` actual del sitio. Solo agrega:

```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[functions.chat]
  included_files = ["knowledge/spicelab.md", "knowledge/huerto.md"]
```

Si el repo ya define otro directorio de funciones, usa ese y deja `chat.js` ahí.

## Script tag (antes de `</body>`)

Mismo sitio que la función:

```html
<script src="/spice-widget.js" defer></script>
```

Si el widget va en el otro dominio (función en un solo sitio):

```html
<script src="https://spicelab.cl/spice-widget.js" defer
        data-endpoint="https://spicelab.cl/.netlify/functions/chat"></script>
```

CORS ya cubre spicelab.cl, agro.spicelab.cl y sus www. Funciona con o sin `.whatsapp-float`.

Aprovechando la rama: el botón flotante de WhatsApp de spicelab.cl apunta hoy a un número placeholder; cambiarlo a `https://wa.me/56971540665`.

## Variables de entorno (Netlify)

Proveedor aprobado: **Groq (free tier)**. Marcos carga la clave; tú solo deja documentado:

- `GROQ_API_KEY`: clave de Groq. **La configura Marcos en Netlify como secreta.** No va en el repo, el PR ni el chat.
- `GROQ_MODEL=openai/gpt-oss-120b` (opcional; es el valor por defecto. `llama-3.3-70b-versatile` ya no está disponible en Groq).
- `GROQ_FALLBACK_MODEL=openai/gpt-oss-20b` (opcional; es el valor por defecto). En el plan gratis de Groq cada modelo tiene un tope diario de tokens (~200k en 120b ≈ 40 chats/día); al recibir 429 se reintenta una vez con este modelo. `none` lo desactiva.
- `SITE_ID=spicelab` (o `agro`, según el sitio). **Obligatorio en deploy previews:** define `SITE_ID` (`spicelab`, `agro` o `huerto`) en el sitio de Netlify. Los previews no tienen el `Origin` de producción, y una petición sin Origin reconocido y sin `SITE_ID` se resuelve como `spicelab` (comportamiento intencional, no se cambia), así que un preview de agro o Huerto respondería con las reglas y precios equivocados.

Con la clave configurada (Deploy Previews incluido), el chat responde de verdad en el preview. Sin clave, muestra «aún no está activo» y deriva a WhatsApp.

## Cómo probar en el deploy preview

1. `npm test` y `npm run check` en local (offline, sin clave).
2. Push de la rama → Netlify crea el deploy preview (`deploy-preview-N--<sitio>.netlify.app`).
3. Abre el preview: el launcher teal aparece abajo a la derecha (sobre el botón de WhatsApp si existe).
4. Abre el chat: bienvenida con enlace a WhatsApp. Envía «hola»: sin clave debe responder «El asistente aún no está activo…» con https://wa.me/56971540665.
5. `GET https://deploy-preview-N--<sitio>.netlify.app/.netlify/functions/chat` → `{"ok":true,...,"configured":false}`.
6. Revisa en móvil que no tape el botón de WhatsApp ni el contenido.
7. Deja el PR abierto con el enlace del preview para que Marcos revise y haga merge.

## Pendientes

- **Dominio por confirmar** (Marcos): spicelab.cl, agro.spicelab.cl o ambos.
- Clave Groq: Marcos la carga en Netlify (proveedor ya aprobado).
- Frase de laboratorio: pendiente de confirmación final de Marcos.
