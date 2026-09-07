const SUMMERNOTE_VERSION = "0.9.0";
const JQUERY_VERSION = "3.7.1";
const DEFAULT_TOOLBAR = [
  ["style", ["style"]],
  ["font", ["bold", "italic", "underline", "clear"]],
  ["para", ["ul", "ol", "paragraph"]],
  ["insert", ["link", "picture", "table"]],
  ["view", ["codeview"]]
];

let jqueryRequest;
let summernoteRequest;
const loadedStyles = new Set();

function loadStyle(href) {
  if (loadedStyles.has(href) || !globalThis.document?.head) return;
  if ([...document.querySelectorAll("link[rel='stylesheet']")].some((link) => link.href === href)) {
    loadedStyles.add(href);
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
  loadedStyles.add(href);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const originalDefine = globalThis.define;
    const shouldMaskAmd = typeof originalDefine === "function" && originalDefine.amd;
    if (shouldMaskAmd) globalThis.define = undefined;
    const restoreAmd = () => {
      if (shouldMaskAmd) globalThis.define = originalDefine;
    };
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      restoreAmd();
      resolve();
    }, { once: true });
    script.addEventListener("error", () => {
      restoreAmd();
      reject(new Error(`Unable to load script: ${src}`));
    }, { once: true });
    document.head.append(script);
  });
}

async function loadJQuery(base) {
  if (globalThis.jQuery?.fn) return globalThis.jQuery;
  jqueryRequest ||= loadScript(new URL(`vendor/jquery/${JQUERY_VERSION}/jquery.min.js`, base).href).then(() => {
    if (!globalThis.jQuery?.fn) throw new Error("jQuery loaded without exposing window.jQuery.");
    return globalThis.jQuery;
  });
  return jqueryRequest;
}

async function loadSummernote(base) {
  const $ = await loadJQuery(base);
  if ($.fn.summernote) return $;
  summernoteRequest ||= loadScript(new URL(`vendor/summernote/${SUMMERNOTE_VERSION}/summernote-lite.min.js`, base).href)
    .then(() => {
      if (!$.fn.summernote) throw new Error("Summernote loaded without registering $.fn.summernote.");
      return $;
    });
  return summernoteRequest;
}

function hasContent(html, documentImpl) {
  const template = documentImpl.createElement("template");
  template.innerHTML = html;
  return Boolean(template.content.textContent.trim() || template.content.querySelector("img, table, hr, pre, blockquote"));
}

export async function createSummernoteRichTextEditor({
  root,
  initialHtml = "",
  placeholder = "Escreva o conteúdo...",
  toolbar = DEFAULT_TOOLBAR,
  sanitizeRichText,
  onChange
} = {}) {
  if (!root?.ownerDocument?.createElement) throw new TypeError("root deve ser um elemento DOM.");
  if (typeof sanitizeRichText !== "function") throw new TypeError("sanitizeRichText deve ser uma função.");

  const documentImpl = root.ownerDocument;
  const base = new URL("./", import.meta.url);
  loadStyle(new URL(`vendor/summernote/${SUMMERNOTE_VERSION}/summernote-lite.min.css`, base).href);
  loadStyle(new URL("editor-summernote.css", base).href);
  const $ = await loadSummernote(base);

  root.classList.add("mse-summernote");
  const host = documentImpl.createElement("div");
  root.replaceChildren(host);
  const instance = $(host);

  function getHtml() {
    const safe = sanitizeRichText(instance.summernote("code"), { documentImpl });
    return hasContent(safe, documentImpl) ? safe : "";
  }

  function setHtml(html) {
    instance.summernote("code", sanitizeRichText(String(html ?? ""), { documentImpl }));
  }

  instance.summernote({
    dialogsInBody: true,
    height: 220,
    placeholder,
    toolbar,
    callbacks: {
      onChange: () => onChange?.(getHtml())
    }
  });
  setHtml(initialHtml);

  return Object.freeze({
    root,
    contentFormat: "HtmlSeguroV1",
    getHtml,
    getValue: getHtml,
    setHtml,
    focus: () => instance.summernote("focus"),
    clear: () => instance.summernote("code", ""),
    destroy() {
      instance.summernote("destroy");
      root.replaceChildren();
      root.classList.remove("mse-summernote");
    }
  });
}
