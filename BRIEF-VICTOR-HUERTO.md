# Brief de integración: Chat SPICe en Huerto

Para: Victor (dev). Estado: **borrador, no enviado**. Sitio: https://huerto.spicelab.cl. Repo: **`msalass/huerto-app`** (TanStack Start + Nitro → Netlify; `msalass/huerto` está vacío). Confirmar con Marcos que es el repo correcto.

## Reglas de trabajo

- Rama nueva (p. ej. `feat/spice-chat`) en `msalass/huerto-app` y PR. **No hagas merge ni push a `main`**, porque despliega en vivo por Netlify. **Marcos hace el merge.**
- No crees cuentas ni API keys: la clave de Groq la configura Marcos en Netlify.

## Archivos (del zip `spicelab-chatbot.zip`)

| Origen | Destino en `huerto-app` |
|---|---|
| `public/spice-widget.js` | `public/spice-widget.js` (Nitro lo copia a `dist/`, servido como `/spice-widget.js`) |
| `netlify/functions/chat.js` | `netlify/functions/chat.js` |
| `knowledge/huerto.md` y `knowledge/spicelab.md` | `knowledge/` en la raíz |

`netlify.toml`: mantener `[build]`, los headers y el redirect 301 actuales. Solo agregar:

```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[functions.chat]
  included_files = ["knowledge/spicelab.md", "knowledge/huerto.md"]
```

Nitro publica su handler SSR en `.netlify/functions-internal/`; verifica en el deploy que `/.netlify/functions/chat` responda y que el SSR no lo tape.

## Script tag

En el layout raíz (p. ej. `src/routes/__root.tsx`, dentro de `<body>`), o solo en la landing y en `/login` si dentro de la app logueada molesta:

```html
<script src="/spice-widget.js" defer data-site="huerto"></script>
```

Alternativa sin función propia: agregar `data-endpoint="https://spicelab.cl/.netlify/functions/chat"` (el servidor igual decide «huerto» por el Origin).

## Variables de entorno (Netlify del sitio Huerto)

- `GROQ_API_KEY`: **la carga Marcos como secreta.** Nunca en el repo, el PR ni el chat.
- `GROQ_MODEL=openai/gpt-oss-120b` (opcional; es el valor por defecto).
- `GROQ_FALLBACK_MODEL=openai/gpt-oss-20b` (opcional; por defecto). En el plan gratis de Groq cada modelo tiene un tope diario de tokens (~200k en 120b ≈ 40 chats/día); al recibir 429 se reintenta una vez con este modelo.
- `SITE_ID=huerto`. **Obligatorio en deploy previews:** define `SITE_ID` (`spicelab`, `agro` o `huerto`) en el sitio de Netlify. Los previews no tienen el `Origin` de producción, y una petición sin Origin reconocido y sin `SITE_ID` se resuelve como `spicelab` (comportamiento intencional, no se cambia), así que un preview de agro o Huerto respondería con las reglas y precios equivocados.

## Reglas que aplica el bot en Huerto

Solo cita $4.990 CLP/mes · $39.990 CLP/año (Mercado Pago, Chile + 9 países) y US$5.99/mes · US$59/año (Lemon Squeezy). La prueba es de 7 días **con tarjeta**. **El código de SPICe es solo para clientes de SPICe y usuarios beta**: el bot nunca lo ofrece ni promete acceso gratis, y deriva a WhatsApp. El texto de la app no se toca.

## Probar en el deploy preview

1. Local: `npm test` y `npm run check`.
2. Push de la rama, y Netlify crea `deploy-preview-N--huerto-spicelab.netlify.app`.
3. `GET /.netlify/functions/chat` → `{"ok":true,"site":"huerto","configured":true|false}`.
4. Abre el chat: bienvenida de Huerto con `/login` y WhatsApp. Prueba «¿Cuánto vale Huerto?», «¿La prueba es sin tarjeta?» y «¿Tienen un código para usarlo gratis?».
5. Revisa en móvil (la app es una PWA) que el launcher no tape la navegación ni los botones.
6. Deja el PR abierto con el enlace del preview para Marcos.

## Pendientes

- Confirmar que `msalass/huerto-app` es el repo del sitio en vivo.
- Confirmar con Marcos: cargo de validación de Mercado Pago (el bot no lo cita) y la mención de «más de la mitad» a Be Well Center (el bot no la cita).
