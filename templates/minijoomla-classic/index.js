/**
 * `templates/minijoomla-classic` — template visual inspirado no Joomla!
 * Cassiopeia (cabeçalho com marca, navegação, trilha de breadcrumbs, grade
 * de conteúdo com barra lateral, rodapé), para o consumidor `MINIJOOMLA`
 * (ver `web-devs/MINIJOOMLA/docs/PLANO-MINIJOOMLA.md`).
 *
 * Mesmo contrato `createTemplate({root, positions, componentPosition})` de
 * qualquer template do Site Kernel (ver `templates/mse-default/index.js`,
 * de onde a estrutura de slots/regiões foi copiada tal como está — zero
 * acoplamento ao kernel, só fatos de DOM; a única diferença deliberada
 * deste arquivo para `mse-default` é a marca do cabeçalho e o CSS
 * carregado). Posições "de chrome" reconhecidas pela mesma convenção:
 * topo/menu-principal/breadcrumbs/lateral/rodape; qualquer outra posição
 * cai na grade de conteúdo genérica.
 */
const REGION_ATTR = "data-template-region";
const CHROME_SLOTS = [
  { position: "topo", tag: "header", part: "header" },
  { position: "menu-principal", tag: "nav", part: "nav" },
  { position: "breadcrumbs", tag: "nav", part: "breadcrumbs" },
  { position: "lateral", tag: "aside", part: "sidebar" },
  { position: "rodape", tag: "footer", part: "footer" }
];

function assertElement(value, name) {
  if (!value || typeof value.appendChild !== "function" || !value.ownerDocument) {
    throw new TypeError(`${name} deve ser um elemento DOM válido.`);
  }
}

function loadStylesheet(document) {
  const head = document && document.head;
  if (!head || typeof document.createElement !== "function") return;
  const href = new URL("./css/template.css", import.meta.url).href;
  if (head.querySelector?.(`link[data-minijoomla-classic-template-style="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-minijoomla-classic-template-style", href);
  head.appendChild(link);
}

function createRegion(document, name, tag = "div", part = "region") {
  const element = document.createElement(tag);
  element.setAttribute(REGION_ATTR, name);
  element.setAttribute("data-mse-position", name);
  element.dataset.templateRegion = name;
  element.classList.add("minijoomla-classic-template__region", `minijoomla-classic-template__region--${part}`);
  return element;
}

function createHeader(document) {
  const header = document.createElement("div");
  header.className = "minijoomla-classic-template__brand";
  header.setAttribute("data-template-chrome", "brand");
  header.innerHTML = '<a class="minijoomla-classic-template__brand-link" href="#/" aria-label="Início">'
    + '<span class="minijoomla-classic-template__brand-mark" aria-hidden="true">◆</span>'
    + '<span class="minijoomla-classic-template__brand-label">MINIJOOMLA</span></a>';
  return header;
}

export function createTemplate({ root, positions = [], componentPosition = "conteudo-principal" } = {}) {
  assertElement(root, "root");
  if (!Array.isArray(positions)) throw new TypeError("positions deve ser um array.");
  if (positions.includes(componentPosition)) {
    throw new TypeError("componentPosition não pode coincidir com uma posição de módulo.");
  }
  const document = root.ownerDocument;
  root.replaceChildren();
  loadStylesheet(document);
  root.classList.add("minijoomla-classic-template");
  root.dataset.template = "minijoomla-classic";

  const shell = document.createElement("div");
  shell.className = "minijoomla-classic-template__shell";

  const component = createRegion(document, componentPosition, "main", "main");
  component.setAttribute("data-mse-component", "");
  component.setAttribute("data-mse-component-position", componentPosition);

  const regions = new Map();
  const chromeByPosition = new Map(CHROME_SLOTS.map((slot) => [slot.position, slot]));

  const [topSlot, navSlot, breadcrumbsSlot, sidebarSlot, footerSlot] = CHROME_SLOTS;

  const headerBar = document.createElement("header");
  headerBar.className = "minijoomla-classic-template__header";
  headerBar.setAttribute("data-template-chrome", "header");
  headerBar.appendChild(createHeader(document));
  if (positions.includes(topSlot.position)) {
    const region = createRegion(document, topSlot.position, topSlot.tag, topSlot.part);
    headerBar.appendChild(region);
    regions.set(topSlot.position, region);
  }
  if (positions.includes(navSlot.position)) {
    const region = createRegion(document, navSlot.position, navSlot.tag, navSlot.part);
    headerBar.appendChild(region);
    regions.set(navSlot.position, region);
  }
  root.appendChild(headerBar);

  if (positions.includes(breadcrumbsSlot.position)) {
    const region = createRegion(document, breadcrumbsSlot.position, breadcrumbsSlot.tag, breadcrumbsSlot.part);
    shell.appendChild(region);
    regions.set(breadcrumbsSlot.position, region);
  }

  const body = document.createElement("div");
  body.className = "minijoomla-classic-template__body";
  body.appendChild(component);
  regions.set(componentPosition, component);

  if (positions.includes(sidebarSlot.position)) {
    const region = createRegion(document, sidebarSlot.position, sidebarSlot.tag, sidebarSlot.part);
    body.appendChild(region);
    regions.set(sidebarSlot.position, region);
  }
  shell.appendChild(body);

  for (const position of positions) {
    if (regions.has(position) || chromeByPosition.has(position)) continue;
    const region = createRegion(document, position, "div", "content");
    shell.appendChild(region);
    regions.set(position, region);
  }

  root.appendChild(shell);

  if (positions.includes(footerSlot.position)) {
    const region = createRegion(document, footerSlot.position, footerSlot.tag, footerSlot.part);
    root.appendChild(region);
    regions.set(footerSlot.position, region);
  }

  return {
    root,
    shell,
    regions,
    component,
    position(name) { return regions.get(name) || null; },
    dispose() {
      regions.clear();
      root.replaceChildren();
      root.classList.remove("minijoomla-classic-template");
      delete root.dataset.template;
    }
  };
}
