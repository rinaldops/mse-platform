const CONTENT_FORMAT = "HtmlSeguroV1";

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function normalizeMarkup(root) {
  for (const [source, target] of [["b", "strong"], ["i", "em"]]) {
    for (const node of [...root.querySelectorAll(source)]) {
      const replacement = root.ownerDocument.createElement(target);
      replacement.append(...node.childNodes);
      node.replaceWith(replacement);
    }
  }
}

function selectionRange(document, editor) {
  const selection = document.getSelection?.();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer.nodeType === 1
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  return editor.contains(container) ? range : null;
}

function insertFragment(document, editor, fragment) {
  const range = selectionRange(document, editor);
  if (!range) {
    editor.append(fragment);
    return;
  }
  range.deleteContents();
  const last = fragment.lastChild;
  range.insertNode(fragment);
  if (last) {
    range.setStartAfter(last);
    range.collapse(true);
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function safeLink(document, sanitizeRichText, input) {
  const anchor = document.createElement("a");
  anchor.href = String(input ?? "").trim();
  anchor.textContent = "link";
  const template = document.createElement("template");
  template.innerHTML = sanitizeRichText(anchor.outerHTML, { documentImpl: document });
  return template.content.querySelector("a")?.getAttribute("href") ?? null;
}

export function createForumRichTextEditor({
  document,
  value = "",
  renderRichText,
  sanitizeRichText,
  promptImpl = globalThis.prompt
} = {}) {
  if (!document?.createElement) throw new TypeError("document deve oferecer createElement.");
  if (typeof renderRichText !== "function" || typeof sanitizeRichText !== "function") {
    throw new TypeError("renderRichText e sanitizeRichText devem ser funções.");
  }

  const root = element(document, "div", "mse-forum__editor");
  const toolbar = element(document, "div", "mse-forum__editor-toolbar");
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Formatação do conteúdo");

  const editor = element(document, "div", "mse-forum__rich-editor mse-forum__body mse-forum__body--rich");
  editor.contentEditable = "true";
  editor.setAttribute("role", "textbox");
  editor.setAttribute("aria-multiline", "true");
  editor.setAttribute("aria-label", "Conteúdo do tópico");
  editor.setAttribute("data-placeholder", "Escreva o conteúdo do tópico…");
  editor.setAttribute("name", "forumContent");
  editor.spellcheck = true;
  renderRichText(editor, value);

  function commandButton(label, title, command, commandValue) {
    const button = element(document, "button", "mse-forum__editor-button", label);
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      editor.focus();
      // ponytail: execCommand é o menor MVP nativo; trocar por Range se o piloto exigir histórico avançado.
      document.execCommand(command, false, commandValue);
      normalizeMarkup(editor);
    });
    toolbar.append(button);
    return button;
  }

  const blocks = element(document, "select", "mse-forum__editor-select");
  blocks.setAttribute("aria-label", "Tipo de bloco");
  for (const [value, label] of [["p", "Parágrafo"], ["h2", "Título 2"], ["h3", "Título 3"], ["h4", "Título 4"]]) {
    const option = element(document, "option", null, label);
    option.value = value;
    blocks.append(option);
  }
  blocks.addEventListener("change", () => {
    editor.focus();
    document.execCommand("formatBlock", false, blocks.value);
    blocks.value = "p";
  });
  toolbar.append(blocks);

  commandButton("N", "Negrito", "bold");
  commandButton("I", "Itálico", "italic");
  commandButton("• Lista", "Lista com marcadores", "insertUnorderedList");
  commandButton("1. Lista", "Lista numerada", "insertOrderedList");
  commandButton("❝", "Citação", "formatBlock", "blockquote");
  commandButton("</>", "Bloco de código", "formatBlock", "pre");

  const link = element(document, "button", "mse-forum__editor-button", "Link");
  link.type = "button";
  link.title = "Inserir link";
  link.setAttribute("aria-label", "Inserir link");
  link.addEventListener("mousedown", (event) => event.preventDefault());
  link.addEventListener("click", () => {
    const href = safeLink(document, sanitizeRichText, promptImpl?.("Informe uma URL https:// ou mailto:"));
    if (!href) return;
    editor.focus();
    document.execCommand("createLink", false, href);
  });
  toolbar.append(link);

  const table = element(document, "button", "mse-forum__editor-button", "Tabela");
  table.type = "button";
  table.title = "Inserir tabela 2 por 2";
  table.setAttribute("aria-label", "Inserir tabela 2 por 2");
  table.addEventListener("mousedown", (event) => event.preventDefault());
  table.addEventListener("click", () => {
    editor.focus();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = "<table><thead><tr><th scope=\"col\">Coluna 1</th><th scope=\"col\">Coluna 2</th></tr></thead><tbody><tr><td>Dado 1</td><td>Dado 2</td></tr></tbody></table><p><br></p>";
    insertFragment(document, editor, wrapper.ownerDocument.createRange().createContextualFragment(wrapper.innerHTML));
  });
  toolbar.append(table);

  editor.addEventListener("paste", (event) => {
    event.preventDefault();
    const html = event.clipboardData?.getData("text/html");
    const text = event.clipboardData?.getData("text/plain") ?? "";
    const template = document.createElement("template");
    if (html) template.innerHTML = sanitizeRichText(html, { documentImpl: document });
    else {
      const lines = text.replaceAll("\r\n", "\n").split("\n");
      lines.forEach((line, index) => {
        if (index) template.content.append(document.createElement("br"));
        template.content.append(document.createTextNode(line));
      });
    }
    insertFragment(document, editor, template.content.cloneNode(true));
    normalizeMarkup(editor);
  });

  root.append(toolbar, editor);
  return Object.freeze({
    root,
    editor,
    contentFormat: CONTENT_FORMAT,
    focus: () => editor.focus(),
    clear() { editor.replaceChildren(); },
    getValue() {
      normalizeMarkup(editor);
      const safeHtml = sanitizeRichText(editor.innerHTML, { documentImpl: document });
      const template = document.createElement("template");
      template.innerHTML = safeHtml;
      const hasContent = Boolean(template.content.textContent.trim()
        || template.content.querySelector("table, hr"));
      return hasContent ? safeHtml : "";
    }
  });
}
