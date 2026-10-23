/**
 * Template system padrão do Mini Joomla!.
 *
 * É o fallback estável do produto: não depende de um consumidor específico e
 * deve continuar funcional quando um template instalado falhar.
 */
const REGION_ATTR = "data-template-region";

function loadStylesheet(document) {
  const href = new URL("./template.css", import.meta.url).href;
  if (document.head?.querySelector?.(`link[data-mse-system-template-style="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.mseSystemTemplateStyle = href;
  document.head?.append(link);
}

function region(document, name, role) {
  const element = document.createElement(role === "main" ? "main" : "section");
  element.setAttribute(REGION_ATTR, name);
  element.dataset.msePosition = name;
  element.className = `mse-system-template__region mse-system-template__region--${name}`;
  return element;
}

export function createTemplate({ root, positions = [], componentPosition = "conteudo-principal" } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  loadStylesheet(document);
  root.replaceChildren();
  root.classList.add("mse-system-template");
  root.dataset.template = "system";
  const shell = document.createElement("div");
  shell.className = "mse-system-template__shell";
  const component = region(document, componentPosition, "main");
  shell.append(component);
  const regions = new Map([[componentPosition, component]]);
  for (const position of positions) {
    if (regions.has(position)) continue;
    const element = region(document, position, "section");
    shell.append(element);
    regions.set(position, element);
  }
  root.append(shell);
  return {
    root,
    shell,
    regions,
    component,
    position: (name) => regions.get(name) ?? null,
    dispose() { root.replaceChildren(); root.classList.remove("mse-system-template"); delete root.dataset.template; }
  };
}
