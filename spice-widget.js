/* SPICe Lab chat widget — IIFE, no build step.
 * <script src="/spice-widget.js" defer></script>
 * Optional attributes:
 *   data-endpoint  URL of the function. Default: relative "/.netlify/functions/chat"
 *                  (same Netlify site). Use an absolute URL to call a function hosted
 *                  on another site, e.g. https://spicelab.cl/.netlify/functions/chat
 *   data-site      Base for relative links in replies (default https://spicelab.cl)
 *   data-lang      es | en
 *   data-right / data-bottom   force launcher position (CSS lengths)
 * Works with or without a .whatsapp-float button on the host page.
 */
(function () {
  "use strict";
  if (window.__SPICeChatLoaded) return;
  window.__SPICeChatLoaded = true;

  var LOGO = "https://spicelab.cl/assets/images/isotipo-sin-fondo.png";
  var WA = "https://wa.me/56971540665";
  var STORE = "spice-chat-v2";

  var script =
    document.currentScript ||
    document.querySelector("script[src*='spice-widget']");

  var ENDPOINT =
    (script && script.getAttribute("data-endpoint")) ||
    "/.netlify/functions/chat";
  var SITE = ((script && script.getAttribute("data-site")) || "https://spicelab.cl").replace(/\/+$/, "");
  var forcedLang = script && script.getAttribute("data-lang");
  var forcedRight = script && script.getAttribute("data-right");
  var forcedBottom = script && script.getAttribute("data-bottom");

  var I = {
    es: {
      launcher: "Abrir chat de SPICe Lab",
      close: "Cerrar chat",
      title: "SPICe",
      sub: "Consultas de geoquímica",
      welcome:
        "Hola, soy SPICe. Te oriento sobre SPICe Lab, SPICe Agro y preguntas de geoquímica. Para un proyecto, una cotización o enviar muestras, escríbenos por WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).",
      chips: [
        "¿Qué servicios ofrecen?",
        "¿Cómo envío muestras?",
        "¿Qué es un trazador isotópico?",
      ],
      placeholder: "Escribe tu consulta…",
      send: "Enviar",
      langBtn: "EN",
      langAria: "Switch to English",
      thinking: "SPICe está escribiendo",
      errNet: "No pude conectar. Inténtalo de nuevo o escríbenos por WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).",
      errKey:
        "El asistente aún no está activo. Escríbenos por WhatsApp y te respondemos directamente: https://wa.me/56971540665 (+56 9 7154 0665).",
      errRate: "Hay muchas consultas seguidas. Espera un momento o escríbenos por WhatsApp: https://wa.me/56971540665",
      errGeneric: "No pude completar la respuesta. Escríbenos por WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).",
      footWa: "WhatsApp +56 9 7154 0665",
      footer: "No sustituye un diagnóstico de proyecto",
      you: "Tú",
    },
    en: {
      launcher: "Open SPICe Lab chat",
      close: "Close chat",
      title: "SPICe",
      sub: "Geochemistry desk",
      welcome:
        "Hi, I’m SPICe. I can help with SPICe Lab, SPICe Agro and geoscience questions. For a project, a quote or sending samples, message us on WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).",
      chips: [
        "What services do you offer?",
        "How do I send samples?",
        "What is an isotopic tracer?",
      ],
      placeholder: "Write your question…",
      send: "Send",
      langBtn: "ES",
      langAria: "Cambiar a español",
      thinking: "SPICe is typing",
      errKey:
        "The assistant isn’t active yet. Message us on WhatsApp and we’ll reply directly: https://wa.me/56971540665 (+56 9 7154 0665).",
      errNet: "Could not connect. Try again or message us on WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).",
      errRate: "Too many questions in a short time. Wait a moment or message us on WhatsApp: https://wa.me/56971540665",
      errGeneric: "I could not finish that reply. Message us on WhatsApp: https://wa.me/56971540665 (+56 9 7154 0665).",
      footWa: "WhatsApp +56 9 7154 0665",
      footer: "Not a substitute for a project diagnostic",
      you: "You",
    },
  };

  function detectLang() {
    if (forcedLang === "en" || forcedLang === "es") return forcedLang;
    try {
      var saved = sessionStorage.getItem(STORE);
      if (saved) {
        var p = JSON.parse(saved);
        if (p.lang === "en" || p.lang === "es") return p.lang;
      }
    } catch (_) {}
    var path = (location.pathname || "").toLowerCase();
    if (path === "/en" || path.indexOf("/en/") === 0) return "en";
    var html = (document.documentElement.lang || "").toLowerCase();
    if (html.indexOf("en") === 0) return "en";
    if (html.indexOf("es") === 0) return "es";
    var nav = (navigator.language || "es").toLowerCase();
    return nav.indexOf("en") === 0 ? "en" : "es";
  }

  var lang = detectLang();
  var messages = [];
  var started = false;
  var open = false;
  var pending = false;

  try {
    var prev = sessionStorage.getItem(STORE);
    if (prev) {
      var parsed = JSON.parse(prev);
      if (Array.isArray(parsed.messages) && parsed.messages.length) {
        messages = parsed.messages.slice(-16);
        started = messages.some(function (m) {
          return m.role === "user";
        });
      }
    }
  } catch (_) {}

  function persist() {
    try {
      sessionStorage.setItem(
        STORE,
        JSON.stringify({ lang: lang, messages: messages.slice(-16) })
      );
    } catch (_) {}
  }

  function t() {
    return I[lang] || I.es;
  }

  function loadFonts() {
    if (document.getElementById("spice-chat-fonts")) return;
    var p1 = document.createElement("link");
    p1.rel = "preconnect";
    p1.href = "https://fonts.googleapis.com";
    var p2 = document.createElement("link");
    p2.rel = "preconnect";
    p2.href = "https://fonts.gstatic.com";
    p2.crossOrigin = "anonymous";
    var l = document.createElement("link");
    l.id = "spice-chat-fonts";
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(p1);
    document.head.appendChild(p2);
    document.head.appendChild(l);
  }

  var CSS = [
    ":host{display:block;}",
    ":host, *{box-sizing:border-box;}",
    ".wrap{position:fixed;inset:0;pointer-events:none;z-index:9998;font-family:'Hanken Grotesk',system-ui,sans-serif;color:#191f39;}",
    ".launcher,.panel,.chips button,.send,a{pointer-events:auto;}",
    ".launcher{position:absolute;right:var(--spice-right,24px);bottom:var(--spice-bottom,24px);width:56px;height:56px;border:0;border-radius:50%;background:#317286;color:#fffbdc;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(49,114,134,.45);transition:transform .2s ease, background .2s ease, box-shadow .2s ease;}",
    ".launcher:hover{background:#255d6e;transform:translateY(-1px);}",
    ".launcher:focus-visible{outline:2px solid #fffbdc;outline-offset:3px;}",
    ".launcher img,.launcher .iso{width:34px;height:34px;border-radius:50%;background:#fffbdc;object-fit:contain;padding:3px;}",
    ".launcher svg.chat{width:26px;height:26px;}",
    ".wrap.is-open .launcher{display:none;}",
    ".panel{position:absolute;right:var(--spice-right,24px);bottom:calc(var(--spice-bottom,24px) + 68px);width:min(400px, calc(100vw - 24px));height:min(640px, calc(100dvh - 120px));display:flex;flex-direction:column;background:#f5f4ee;border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(25,31,57,.06),0 22px 48px -18px rgba(25,31,57,.4);opacity:0;transform:translateY(10px) scale(.98);pointer-events:none;transition:opacity .2s ease, transform .2s ease;}",
    ".wrap.is-open .panel{opacity:1;transform:none;pointer-events:auto;}",
    "header{display:flex;align-items:center;gap:10px;padding:12px 12px 12px 14px;background:linear-gradient(180deg,#10162b,#191f39);color:#fffbdc;border-bottom:1px solid #317286;flex-shrink:0;}",
    "header img, header .iso{width:32px;height:32px;border-radius:50%;background:#fffbdc;object-fit:contain;padding:3px;flex-shrink:0;}",
    "header .titles{flex:1;min-width:0;}",
    "header h2{font-family:Fraunces,Georgia,serif;font-optical-sizing:auto;font-weight:600;font-size:18px;line-height:1.15;margin:0;color:#fffbdc;}",
    "header .sub{margin:2px 0 0;font-size:12px;color:#a8a894;font-weight:500;}",
    ".icon-btn{width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:#fffbdc;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}",
    ".icon-btn:hover{background:rgba(255,251,220,.08);}",
    ".icon-btn:focus-visible{outline:2px solid #317286;outline-offset:2px;}",
    ".lang{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.04em;width:36px;}",
    ".log{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}",
    ".msg{max-width:92%;font-size:14px;line-height:1.5;padding:10px 12px;border-radius:12px;word-wrap:break-word;overflow-wrap:anywhere;}",
    ".msg a{color:#317286;text-decoration:underline;text-underline-offset:2px;}",
    ".msg.bot{align-self:flex-start;background:#fff;color:#191f39;border:1px solid #e7e7dd;border-bottom-left-radius:4px;}",
    ".msg.user{align-self:flex-end;background:#317286;color:#fffbdc;border-bottom-right-radius:4px;}",
    ".msg.user a{color:#fffbdc;}",
    ".msg.err{align-self:flex-start;background:#e7e7dd;color:#191f39;border:1px solid #a8a894;}",
    ".who{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#5a6072;margin:0 0 4px;}",
    ".msg.user .who{color:rgba(255,251,220,.75);}",
    ".dots{display:inline-flex;gap:4px;padding:4px 2px;align-items:center;}",
    ".dots i{width:6px;height:6px;border-radius:50%;background:#317286;opacity:.35;animation:spice-d 1s infinite;}",
    ".dots i:nth-child(2){animation-delay:.15s;}",
    ".dots i:nth-child(3){animation-delay:.3s;}",
    "@keyframes spice-d{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}",
    ".chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 14px 10px;}",
    ".chips[hidden],.typing[hidden]{display:none !important;}",
    ".chips button{border:1px solid #317286;background:#e7e7dd;color:#191f39;border-radius:999px;padding:7px 12px;font:500 13px/1.3 'Hanken Grotesk',system-ui,sans-serif;cursor:pointer;text-align:left;}",
    ".chips button:hover{background:#317286;color:#fffbdc;}",
    "form{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#191f39;flex-shrink:0;}",
    "form input{flex:1;min-width:0;height:42px;border:1px solid #317286;border-radius:10px;background:#10162b;color:#fffbdc;padding:0 12px;font:400 14px/1.3 'Hanken Grotesk',system-ui,sans-serif;}",
    "form input::placeholder{color:#a8a894;}",
    "form input:focus{outline:2px solid #317286;outline-offset:0;}",
    ".send{width:42px;height:42px;border:0;border-radius:10px;background:#317286;color:#fffbdc;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}",
    ".send:hover{background:#255d6e;}",
    ".send:disabled{opacity:.45;cursor:not-allowed;}",
    ".foot a{color:#fffbdc;text-decoration:underline;text-underline-offset:2px;}",
    ".foot{margin:0;padding:0 12px 8px;background:#191f39;color:#a8a894;font:400 10px/1.3 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.02em;}",
    "@media (max-width:640px){",
    ".panel{top:max(8px, env(safe-area-inset-top));left:8px;right:8px;bottom:calc(var(--spice-bottom,24px) + env(safe-area-inset-bottom,0px));width:auto;height:auto;max-height:none;border-radius:16px;}",
    ".launcher{bottom:calc(var(--spice-bottom,24px) + env(safe-area-inset-bottom,0px));right:calc(var(--spice-right,24px) + env(safe-area-inset-right,0px));}",
    "}",
    "@media (prefers-reduced-motion:reduce){",
    ".panel,.launcher,.dots i{transition:none;animation:none;}",
    ".log{scroll-behavior:auto;}",
    "}",
  ].join("");

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sanitizeUrl(href) {
    var u = String(href || "").trim();
    if (!u) return null;
    if (u.charAt(0) === "/" && u.charAt(1) !== "/") return SITE + u;
    if (/^https?:\/\//i.test(u)) return u;
    if (/^mailto:/i.test(u)) return u;
    return null;
  }

  function renderRich(text) {
    var s = escapeHtml(text);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      var u = sanitizeUrl(href.replace(/&amp;/g, "&"));
      if (!u) return label;
      var ext = /^https?:\/\//i.test(u);
      return (
        '<a href="' +
        escapeHtml(u) +
        '"' +
        (ext ? ' target="_blank" rel="noopener noreferrer"' : "") +
        ">" +
        label +
        "</a>"
      );
    });
    s = s.replace(
      /(^|[\s>])((https?:\/\/[^\s<]+)|(\/(?:acerca-de|servicios|equipo|muestras|proyectos|contacto|en)[^\s<]*))/g,
      function (_, pre, all) {
        if (pre.slice(-1) === '"' || /href=/.test(_)) return pre + all;
        var u = sanitizeUrl(all.replace(/&amp;/g, "&").replace(/[).,;]+$/, ""));
        var trail = "";
        if (!u) return pre + all;
        var raw = all.replace(/&amp;/g, "&");
        if (raw.length > u.length) trail = escapeHtml(raw.slice(u.length));
        var ext = /^https?:\/\//i.test(u);
        return (
          pre +
          '<a href="' +
          escapeHtml(u) +
          '"' +
          (ext ? ' target="_blank" rel="noopener noreferrer"' : "") +
          ">" +
          escapeHtml(u) +
          "</a>" +
          trail
        );
      }
    );
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\n/g, "<br>");
    return s;
  }

  function isoImg(cls) {
    return (
      '<img class="' +
      cls +
      '" src="' +
      LOGO +
      '" alt="" width="32" height="32">'
    );
  }

  loadFonts();

  var host = document.createElement("div");
  host.id = "spice-chat-host";
  host.style.cssText = "position:fixed;inset:0;z-index:9998;pointer-events:none;";
  var shadow = host.attachShadow({ mode: "open" });

  shadow.innerHTML =
    "<style>" +
    CSS +
    "</style>" +
    '<div class="wrap">' +
    '<button type="button" class="launcher" aria-expanded="false">' +
    isoImg("iso") +
    "</button>" +
    '<section class="panel" role="dialog" aria-modal="true" aria-labelledby="spice-title" hidden>' +
    "<header>" +
    isoImg("") +
    '<div class="titles"><h2 id="spice-title">SPICe</h2><p class="sub"></p></div>' +
    '<button type="button" class="icon-btn lang"></button>' +
    '<button type="button" class="icon-btn close" aria-label="">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
    "</button></header>" +
    '<div class="log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
    '<div class="chips"></div>' +
    "<form>" +
    '<input type="text" name="spice-q" autocomplete="off" maxlength="2000">' +
    '<button type="submit" class="send" aria-label="">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
    "</button></form>" +
    '<p class="foot"></p>' +
    "</section></div>";

  document.body.appendChild(host);

  var wrap = shadow.querySelector(".wrap");
  var launcher = shadow.querySelector(".launcher");
  var panel = shadow.querySelector(".panel");
  var log = shadow.querySelector(".log");
  var chipsEl = shadow.querySelector(".chips");
  var form = shadow.querySelector("form");
  var input = shadow.querySelector("input");
  var sendBtn = shadow.querySelector(".send");
  var closeBtn = shadow.querySelector(".close");
  var langBtn = shadow.querySelector(".lang");
  var subEl = shadow.querySelector(".sub");
  var footEl = shadow.querySelector(".foot");

  shadow.querySelectorAll("img").forEach(function (img) {
    img.addEventListener("error", function () {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("class", img.className || "chat");
      svg.setAttribute("width", "26");
      svg.setAttribute("height", "26");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.8");
      svg.innerHTML =
        '<path d="M5 6.5A2.5 2.5 0 017.5 4h9A2.5 2.5 0 0119 6.5v7A2.5 2.5 0 0116.5 16H10l-4 3.5V16H7.5A2.5 2.5 0 015 13.5v-7z"/>';
      img.replaceWith(svg);
    });
  });

  function applyCopy() {
    var c = t();
    launcher.setAttribute("aria-label", c.launcher);
    closeBtn.setAttribute("aria-label", c.close);
    sendBtn.setAttribute("aria-label", c.send);
    langBtn.textContent = c.langBtn;
    langBtn.setAttribute("aria-label", c.langAria);
    subEl.textContent = c.sub;
    input.placeholder = c.placeholder;
    footEl.innerHTML =
      '<a href="' + WA + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(c.footWa) +
      "</a> · " +
      escapeHtml(c.footer);
    renderChips();
  }

  function renderChips() {
    chipsEl.innerHTML = "";
    if (started) {
      chipsEl.hidden = true;
      return;
    }
    chipsEl.hidden = false;
    t().chips.forEach(function (label) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", function () {
        input.value = label;
        submit();
      });
      chipsEl.appendChild(b);
    });
  }

  function addBubble(role, text, extra) {
    var div = document.createElement("div");
    div.className = "msg " + (extra || role);
    var who = document.createElement("div");
    who.className = "who";
    who.textContent = role === "user" ? t().you : "SPICe";
    div.appendChild(who);
    var body = document.createElement("div");
    body.innerHTML = renderRich(text);
    div.appendChild(body);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function showWelcome() {
    log.innerHTML = "";
    addBubble("bot", t().welcome);
    if (messages.length) {
      messages.forEach(function (m) {
        addBubble(m.role === "user" ? "user" : "bot", m.content);
      });
    }
    renderChips();
  }

  var typingEl = null;
  function setTyping(on) {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
    if (!on) return;
    typingEl = document.createElement("div");
    typingEl.className = "msg bot";
    typingEl.innerHTML =
      '<div class="who">SPICe</div><span class="dots" aria-label="' +
      escapeHtml(t().thinking) +
      '"><i></i><i></i><i></i></span>';
    log.appendChild(typingEl);
    log.scrollTop = log.scrollHeight;
  }

  function setOpen(next) {
    open = next;
    host.style.zIndex = open ? "10000" : "9998";
    wrap.classList.toggle("is-open", open);
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      if (!log.childNodes.length) showWelcome();
      setTimeout(function () {
        input.focus();
      }, 30);
    } else {
      launcher.focus();
    }
  }

  function layoutAgainstWhatsApp() {
    if (forcedRight) wrap.style.setProperty("--spice-right", forcedRight);
    if (forcedBottom) wrap.style.setProperty("--spice-bottom", forcedBottom);
    if (forcedRight || forcedBottom) return;
    var wa = document.querySelector("a.whatsapp-float");
    if (!wa) return;
    var rect = wa.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    var gap = 14;
    var bottom = Math.round(window.innerHeight - rect.top + gap);
    var right = Math.round(window.innerWidth - rect.right);
    if (bottom < 24) bottom = 24;
    if (right < 16) right = 16;
    wrap.style.setProperty("--spice-bottom", bottom + "px");
    wrap.style.setProperty("--spice-right", right + "px");
  }

  function errorText(code, fallbackMsg) {
    if (code === "missing_api_key") {
      try {
        console.warn("[SPICe chat] " + (fallbackMsg || "missing_api_key"));
      } catch (_) {}
      return t().errKey;
    }
    if (code === "rate_limited") return t().errRate;
    if (code === "timeout" || code === "upstream") return t().errGeneric;
    return fallbackMsg || t().errGeneric;
  }

  async function submit() {
    var text = (input.value || "").trim();
    if (!text || pending) return;
    input.value = "";
    started = true;
    renderChips();
    addBubble("user", text);
    messages.push({ role: "user", content: text });
    persist();
    pending = true;
    sendBtn.disabled = true;
    setTyping(true);
    try {
      var res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages, lang: lang }),
      });
      var data = {};
      try {
        data = await res.json();
      } catch (_) {}
      setTyping(false);
      if (!res.ok || data.error) {
        addBubble("bot", errorText(data.error, data.message), "err");
        return;
      }
      var reply = (data.reply || "").trim();
      if (!reply) {
        addBubble("bot", t().errGeneric, "err");
        return;
      }
      messages.push({ role: "assistant", content: reply });
      persist();
      addBubble("bot", reply);
    } catch (_) {
      setTyping(false);
      addBubble("bot", t().errNet, "err");
    } finally {
      pending = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  launcher.addEventListener("click", function () {
    setOpen(!open);
  });
  closeBtn.addEventListener("click", function () {
    setOpen(false);
  });
  langBtn.addEventListener("click", function () {
    lang = lang === "es" ? "en" : "es";
    persist();
    applyCopy();
    showWelcome();
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submit();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) setOpen(false);
  });

  applyCopy();
  layoutAgainstWhatsApp();
  window.addEventListener("resize", layoutAgainstWhatsApp);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", layoutAgainstWhatsApp);
  } else {
    setTimeout(layoutAgainstWhatsApp, 50);
  }
})();
