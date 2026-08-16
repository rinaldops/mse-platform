const QUILL_VERSION = "2.0.3";
const DEFAULT_TOOLBAR = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "blockquote", "code-block"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link"],
  ["clean"]
];

let quillRequest;
const loadedStyles = new Set();

function existingQuill() {
  const Quill = globalThis.Quill || globalThis.exports?.Quill || globalThis.module?.exports;
  if (Quill && !globalThis.Quill) globalThis.Quill = Quill;
  return Quill;
}

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
  const loaded = existingQuill();
  if (loaded) return Promise.resolve(loaded);
  if (quillRequest) return quillRequest;
  quillRequest = new Promise((resolve, reject) => {
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
      const Quill = existingQuill();
      if (Quill) resolve(Quill);
      else reject(new Error("Quill loaded without exposing window.Quill."));
    }, { once: true });
    script.addEventListener("error", () => {
      restoreAmd();
      reject(new Error(`Unable to load Quill ${QUILL_VERSION}.`));
    }, { once: true });
    document.head.append(script);
  }).catch((error) => {
    quillRequest = null;
    throw error;
  });
  return quillRequest;
}

function hasContent(html, documentImpl) {
  const template = documentImpl.createElement("template");
  template.innerHTML = html;
  return Boolean(template.content.textContent.trim() || template.content.querySelector("table, hr, pre, blockquote"));
}

export async function createRichTextEditor({
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
  loadStyle(new URL(`vendor/quill/${QUILL_VERSION}/quill.core.css`, base).href);
  loadStyle(new URL(`vendor/quill/${QUILL_VERSION}/quill.snow.css`, base).href);
  loadStyle(new URL("editor-quill.css", base).href);
  const Quill = await loadScript(new URL(`vendor/quill/${QUILL_VERSION}/quill.js`, base).href);

  root.classList.add("mse-quill");
  const host = documentImpl.createElement("div");
  root.replaceChildren(host);

  const quill = new Quill(host, {
    modules: { toolbar },
    placeholder,
    theme: "snow"
  });

  function setHtml(html) {
    const safe = sanitizeRichText(String(html ?? ""), { documentImpl });
    quill.setText("");
    if (safe) quill.clipboard.dangerouslyPasteHTML(safe);
  }

  function getHtml() {
    const html = typeof quill.getSemanticHTML === "function"
      ? quill.getSemanticHTML()
      : host.querySelector(".ql-editor")?.innerHTML ?? "";
    const safe = sanitizeRichText(html, { documentImpl });
    return hasContent(safe, documentImpl) ? safe : "";
  }

  quill.on("text-change", () => onChange?.(getHtml(), quill.getContents()));
  setHtml(initialHtml);

  return Object.freeze({
    root,
    contentFormat: "HtmlSeguroV1",
    getHtml,
    getValue: getHtml,
    getDelta: () => quill.getContents(),
    setHtml,
    focus: () => quill.focus(),
    clear: () => quill.setText(""),
    destroy() {
      root.replaceChildren();
      root.classList.remove("mse-quill");
    }
  });
}
