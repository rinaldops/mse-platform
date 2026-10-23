/**
 * `templates/mse-default` — template padrão/fallback de 2º nível do Site
 * Kernel (mse-platform), shipped pela PLATAFORMA (não por um consumidor como
 * CAMAP-AGP). Layout inspirado no template padrão do Joomla! original
 * (cabeçalho com marca + navegação, trilha de breadcrumbs, grade de conteúdo
 * com posições, rodapé) — deliberadamente genérico e sem identidade visual
 * de nenhum tenant específico.
 *
 * Papel no mecanismo de fallback de 3 níveis
 * (`host-adapters/modern-script-editor/site-boot.js#createTemplateLayoutResolver`):
 * 1º nível é o template configurado pelo site (`MSETemplateStyles`/
 * `MSEConfiguracoes.Tema`, ex.: "camap-tema-01"); se ele falhar ao
 * importar/montar, o 2º nível é ESTE template (`mse-default`) — ainda um
 * template "normal", com layout/CSS reais, não um shell técnico vazio; só se
 * `mse-default` também falhar o 3º nível (`templates/system`, sem design,
 * só estrutura mínima) assume, e só se isso também falhar o kernel cai no
 * layout neutro de `kernel/layout.js`.
 *
 * Mesmo contrato de `createTemplate({root, positions, componentPosition})`
 * de qualquer outro template do Site Kernel (ver `CAMAP-AGP/templates/
 * camap-tema-01/index.js`, `templates/system/index.js`): nunca importa nada
 * do kernel (acoplamento zero, só fatos de DOM).
 *
 * Posições "de chrome" reconhecidas por convenção (se presentes em
 * `positions`, são posicionadas nos slots correspondentes do shell: topo,
 * menu de navegação, trilha, barra lateral, rodapé); qualquer outra posição
 * cai na grade de conteúdo genérica, na ordem em que aparece em `positions`
 * — mesmo princípio de "nenhum nome de posição exigido" de `kernel/layout.js`
 * (um site consumidor pode não ter nenhuma das posições de chrome e ainda
 * funcionar corretamente).
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
  if (head.querySelector?.(`link[data-mse-default-template-style="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-mse-default-template-style", href);
  head.appendChild(link);
}

function createRegion(document, name, tag = "div", part = "region") {
  const element = document.createElement(tag);
  element.setAttribute(REGION_ATTR, name);
  element.setAttribute("data-mse-position", name);
  element.dataset.templateRegion = name;
  element.classList.add("mse-default-template__region", `mse-default-template__region--${part}`);
  return element;
}

function createHeader(document) {
  const header = document.createElement("div");
  header.className = "mse-default-template__brand";
  header.setAttribute("data-template-chrome", "brand");
  header.innerHTML = '<a class="mse-default-template__brand-link" href="#/" aria-label="Início">'
    + '<span class="mse-default-template__brand-mark" aria-hidden="true">◆</span>'
    + '<span class="mse-default-template__brand-label">Site</span></a>';
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
  root.classList.add("mse-default-template");
  root.dataset.template = "mse-default";

  const shell = document.createElement("div");
  shell.className = "mse-default-template__shell";

  const component = createRegion(document, componentPosition, "main", "main");
  component.setAttribute("data-mse-component", "");
  component.setAttribute("data-mse-component-position", componentPosition);

  const regions = new Map();
  const chromeByPosition = new Map(CHROME_SLOTS.map((slot) => [slot.position, slot]));

  const topSlot = CHROME_SLOTS[0];
  const navSlot = CHROME_SLOTS[1];
  const breadcrumbsSlot = CHROME_SLOTS[2];
  const sidebarSlot = CHROME_SLOTS[3];
  const footerSlot = CHROME_SLOTS[4];

  const headerBar = document.createElement("header");
  headerBar.className = "mse-default-template__header";
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
  body.className = "mse-default-template__body";
  body.appendChild(component);
  regions.set(componentPosition, component);

  if (positions.includes(sidebarSlot.position)) {
    const region = createRegion(document, sidebarSlot.position, sidebarSlot.tag, sidebarSlot.part);
    body.appendChild(region);
    regions.set(sidebarSlot.position, region);
  }
  shell.appendChild(body);

  // Qualquer posição não reconhecida como "chrome" (ou a própria
  // "conteudo-principal" se coincidir com componentPosition, já tratada
  // acima) cai na grade de conteúdo genérica, na ordem declarada.
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
      root.classList.remove("mse-default-template");
      delete root.dataset.template;
    }
  };
}
