export const RICH_TEXT_POLICY_VERSION = 1;

const MAX_INPUT_LENGTH = 100000;
const ALLOWED_TAGS = new Set([
  "A", "BLOCKQUOTE", "BR", "CAPTION", "CODE", "DEL", "EM", "H2", "H3", "H4", "HR",
  "LI", "OL", "P", "PRE", "S", "STRONG", "SUB", "SUP", "TABLE", "TBODY", "TD",
  "TFOOT", "TH", "THEAD", "TR", "UL"
]);
const DROP_WITH_CONTENT = new Set([
  "APPLET", "AUDIO", "BUTTON", "CANVAS", "EMBED", "FORM", "IFRAME", "INPUT", "MATH",
  "META", "NOSCRIPT", "OBJECT", "OPTION", "SCRIPT", "SELECT", "STYLE", "SVG", "TEMPLATE",
  "TEXTAREA", "VIDEO"
]);

function requiredDocument(documentImpl) {
  if (!documentImpl?.createElement) {
    throw new TypeError("documentImpl deve oferecer createElement.");
  }
  return documentImpl;
}

function safeHref(value, baseUrl) {
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return null;
  if (href.startsWith("#")) return href;
  if (/^mailto:/i.test(href)) {
    const address = href.slice(7);
    return /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(address) ? `mailto:${address}` : null;
  }
  try {
    const url = new URL(href, baseUrl);
    if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password) return null;
    return href;
  } catch {
    return null;
  }
}

function boundedSpan(value) {
  return /^(?:[1-9]|1[0-9]|20)$/.test(value) ? value : null;
}

function sanitizeAttributes(element, baseUrl) {
  const source = new Map([...element.attributes].map((attribute) => [attribute.name.toLowerCase(), attribute.value]));
  for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);

  if (element.tagName === "A") {
    const href = safeHref(source.get("href") ?? "", baseUrl);
    if (href) element.setAttribute("href", href);
    const title = source.get("title")?.trim();
    if (title) element.setAttribute("title", title.slice(0, 255));
  }
  if (element.tagName === "CODE") {
    const className = source.get("class")?.trim();
    if (/^language-[a-z0-9-]{1,40}$/i.test(className ?? "")) element.className = className;
  }
  if (element.tagName === "TH" || element.tagName === "TD") {
    for (const name of ["colspan", "rowspan"]) {
      const span = boundedSpan(source.get(name) ?? "");
      if (span) element.setAttribute(name, span);
    }
  }
  if (element.tagName === "TH" && new Set(["row", "col", "rowgroup", "colgroup"]).has(source.get("scope"))) {
    element.setAttribute("scope", source.get("scope"));
  }
}

function sanitizeChildren(parent, baseUrl) {
  for (const node of [...parent.childNodes]) {
    if (node.nodeType === 3) continue;
    if (node.nodeType !== 1) {
      node.remove();
      continue;
    }
    if (DROP_WITH_CONTENT.has(node.tagName)) {
      node.remove();
      continue;
    }
    sanitizeChildren(node, baseUrl);
    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      continue;
    }
    sanitizeAttributes(node, baseUrl);
  }
}

function sanitizePass(input, documentImpl, baseUrl) {
  const template = documentImpl.createElement("template");
  template.innerHTML = input;
  sanitizeChildren(template.content, baseUrl);
  return template.innerHTML;
}

export function sanitizeRichText(input, {
  documentImpl = globalThis.document,
  baseUrl = globalThis.location?.href ?? "https://localhost/"
} = {}) {
  if (typeof input !== "string") throw new TypeError("input deve ser texto HTML.");
  if (input.length > MAX_INPUT_LENGTH) throw new TypeError(`input deve possuir até ${MAX_INPUT_LENGTH} caracteres.`);
  const document = requiredDocument(documentImpl);
  const firstPass = sanitizePass(input, document, baseUrl);
  return sanitizePass(firstPass, document, baseUrl);
}

export function renderRichText(root, input, options = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  const safeHtml = sanitizeRichText(input, { ...options, documentImpl: root.ownerDocument });
  const template = root.ownerDocument.createElement("template");
  template.innerHTML = safeHtml;
  root.replaceChildren(template.content.cloneNode(true));
  return safeHtml;
}
