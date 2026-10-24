/**
 * Shell formal do Administrator — análogo ao template de backend do
 * Joomla! real (`atum`): cabeçalho + navegação persistente (visível em
 * TODA tela do Administrator, não só na tela inicial) + 1 slot de conteúdo
 * onde a tela ativa (`option=com_*`) é montada.
 *
 * Antes deste módulo, cada `*-screen.js` (com_config, com_content/publisher,
 * com_diagnostics, com_extensions, com_installer, com_menus, com_modules,
 * com_templates) só criava seu próprio `<section class="mse-administrator__panel">`
 * — sem nenhuma navegação além da tela inicial (`control-panel.js`, cujo
 * `<nav>` próprio só aparecia em `option=com_cpanel`). Resultado: ao entrar
 * em qualquer outra tela, não havia como voltar/trocar de seção sem editar a
 * URL manualmente. Este shell resolve isso: `components/com_cpanel/
 * component.js#mount` passa a montar ESTE shell uma vez por navegação e
 * injetar a tela ativa dentro de `contentElement`, em vez de cada tela
 * aparecer "nua" sem chrome compartilhado.
 *
 * Reaproveita exatamente os mesmos links que `control-panel.js` desenhava
 * inline (mesmo rótulo/opção) — a tela inicial deixa de desenhar seu próprio
 * `<nav>` porque este shell já cobre esse papel em toda tela, inclusive ela.
 *
 * Contrato deliberadamente mínimo, nenhum acoplamento a `kernel/*`: só fatos
 * de DOM, mesmo princípio de qualquer `createTemplate()` de
 * `templates/<nome>/index.js` — este shell NÃO é um Template de Site (não
 * implementa `createTemplate({root,positions,componentPosition})`), é
 * puramente a composição visual fixa do Administrator.
 *
 * Redesenho visual (ver docs/PROMPT-REDESIGN-VISUAL-ADMINISTRATOR.md): a
 * estrutura de DOM/contrato público não mudou — só ganhou um ícone SVG
 * inline por link (`ADMINISTRATOR_NAV_ICONS`, mesmo padrão de
 * `modules/mod_forum/forum-view.js#ICON_PATHS`: glifos monocromáticos
 * `currentColor`, sem CDN/fonte externa) dentro de cada `<a>` já existente —
 * nenhum `<a>` novo foi adicionado (o teste
 * `administrator-shell.test.js` conta TODOS os `<a>` do shell e exige que
 * seja exatamente `ADMINISTRATOR_NAV_LINKS.length`, então qualquer link
 * extra — ex. "voltar ao site" — quebraria essa asserção; por isso não
 * existe nenhum outro `<a>` aqui, de propósito).
 *
 * Agrupamento hierárquico (24/10/2026 — fidelidade estrutural ao Joomla!
 * real, ver comparação direta com uma instância PHP de referência): o
 * backend `atum` do Joomla! real nunca lista as telas em texto corrido —
 * agrupa em categorias colapsáveis ("Conteúdo", "Menus", "Componentes",
 * "Usuários", "Sistema"), cada uma com seu próprio ícone, e só o item
 * "Painel Principal" fica solto no topo. `ADMINISTRATOR_NAV_LINKS`
 * continua existindo (mesma forma `[option, label][]`, mesmo papel de
 * fonte única de verdade para rótulo/rota por `option` — reaproveitada
 * tanto pelos testes quanto por `control-panel.js`), mas sua ORDEM agora é
 * contígua por grupo (antes era: cpanel, config, diagnostics, content,
 * extensions, menus, modules, templates, installer — uma ordem que não
 * correspondia a nenhum agrupamento visual; ver
 * `docs/AUDITORIA-JOOMLA-PENTE-FINO.md`/relato do usuário de "dois menus
 * com itens repetidos" nesta rodada). `ADMINISTRATOR_NAV_GROUPS` declara a
 * qual grupo cada `option` pertence — `com_cpanel` fica de fora (é o link
 * solto do topo, nunca um grupo). Mapeamento Joomla! real → mse-platform:
 * - "Conteúdo" → com_content (Publicador/Artigos) e com_media (gerenciador
 *   de mídia); Campos/Grupos de Campos do Joomla! real não têm equivalente
 *   implementado ainda.
 * - "Menus" → com_menus (igual ao Joomla! real, 1:1).
 * - "Sistema" → com_extensions/com_modules/com_templates (no Joomla! real
 *   vivem sob "Sistema > Gerenciar/Temas", não sob "Componentes" — ver
 *   inspeção da instância de referência), com_config (Configurações
 *   Globais), com_diagnostics (mais próximo de "Informações do Sistema",
 *   adaptado: aqui é verificação estrutural + permissões efetivas,
 *   conceito próprio do mse-platform) e com_installer (próximo de
 *   "Sistema > Instalar", adaptado para o provisionamento de listas do
 *   kernel).
 * "Componentes" e "Usuários" do Joomla! real não têm grupo equivalente
 * aqui de propósito: `components/com_categories|com_tags` seguem
 * reservados sem implementação (ver seus README.md), e gestão de usuário é
 * uma decisão arquitetural já declarada (SharePoint é a autoridade de
 * permissão, não um `com_users` próprio) — não é uma lacuna a preencher
 * nesta rodada.
 *
 * @param {{ root: Element, activeOption?: string }} options
 * @returns {{ contentElement: Element, dispose(): void }}
 */
export const ADMINISTRATOR_NAV_LINKS = Object.freeze([
  ["com_cpanel", "Painel"],
  ["com_content", "Publicador"],
  ["com_media", "Mídia"],
  ["com_menus", "Menus"],
  ["com_extensions", "Extensões"],
  ["com_modules", "Módulos"],
  ["com_templates", "Templates"],
  ["com_config", "Configuração global"],
  ["com_diagnostics", "Diagnóstico"],
  ["com_installer", "Instalador"]
]);

// Grupos colapsáveis da navegação lateral — mesma ideia das categorias
// "Conteúdo"/"Menus"/"Sistema" do backend `atum` do Joomla! real.
// `options` lista as `option` (mesma chave de ADMINISTRATOR_NAV_LINKS) que
// pertencem ao grupo, NA ORDEM em que devem ser renderizadas — precisa
// bater com a ordem contígua de ADMINISTRATOR_NAV_LINKS acima (verificado
// por teste em administrator-shell.test.js). `com_cpanel` nunca aparece
// aqui: é o único link que fica fora de qualquer grupo.
export const ADMINISTRATOR_NAV_GROUPS = Object.freeze([
  { key: "content", label: "Conteúdo", options: Object.freeze(["com_content", "com_media"]) },
  { key: "menus", label: "Menus", options: Object.freeze(["com_menus"]) },
  {
    key: "system",
    label: "Sistema",
    options: Object.freeze(["com_extensions", "com_modules", "com_templates", "com_config", "com_diagnostics", "com_installer"])
  }
]);

// Ícones dos CABEÇALHOS de grupo (distintos dos ícones por item abaixo) —
// mesmos glifos monocromáticos `currentColor`, inspirados nos ícones de
// categoria do Joomla! real (arquivo/documento para Conteúdo, lista para
// Menus, chave-de-fenda para Sistema).
const ADMINISTRATOR_NAV_GROUP_ICON_PATHS = Object.freeze({
  content: '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M8 12h8M8 16h8M8 8h3"/>',
  menus: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  system: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>'
});

// Ícones monocromáticos (stroke="currentColor", sem fill, 24x24 viewBox) —
// glifos simples desenhados à mão, mesmo princípio de
// modules/mod_forum/forum-view.js#ICON_PATHS: nenhum ícone depende de fonte
// de ícones ou CDN externo, só texto SVG literal embutido no JS. Exportado
// (não só uso interno) porque control-panel.js reaproveita os MESMOS
// glifos nos cards da tela inicial, em vez de duplicar os paths.
export const ADMINISTRATOR_NAV_ICON_PATHS = Object.freeze({
  com_cpanel: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9.5 20v-6h5v6"/>',
  com_config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3.09 12H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 1.6a1.65 1.65 0 0 0 1-1.51V0"/>',
  com_diagnostics: '<path d="M9 11.5 11 13.5 15.5 9"/><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z"/>',
  com_content: '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M8 12h8M8 16h8M8 8h3"/>',
  com_media: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
  com_extensions: '<path d="M9 3h2a1 1 0 0 1 1 1v1.5a1.5 1.5 0 0 0 3 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1.5a1.5 1.5 0 0 0 0 3H19a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5a1.5 1.5 0 0 0-3 0V14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1.5a1.5 1.5 0 0 0 0-3H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>',
  com_menus: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  com_modules: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  com_templates: '<rect x="3" y="3" width="18" height="18"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/>',
  com_installer: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 19h14"/>'
});

function createIcon(document, option) {
  const paths = ADMINISTRATOR_NAV_ICON_PATHS[option];
  if (!paths) return null;
  const span = document.createElement("span");
  span.className = "mse-administrator-shell__nav-icon";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return span;
}

// Ícone do toggle "Recolher Menu" (24/10/2026 — fidelidade ao Joomla! real:
// o `atum` real tem um controle fixo no topo da sidebar para recolher toda
// a navegação para só-ícones). Glifo de seta dupla, mesmo princípio dos
// demais ícones deste arquivo.
const COLLAPSE_ICON_PATH = '<path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/>';
const SIDEBAR_COLLAPSED_STORAGE_KEY = "mse-administrator:sidebar-collapsed";

function createCollapseIcon(document) {
  const span = document.createElement("span");
  span.className = "mse-administrator-shell__collapse-icon";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${COLLAPSE_ICON_PATH}</svg>`;
  return span;
}

// Acesso defensivo ao storage (pode não existir em ambiente de teste, ou
// lançar em navegadores com armazenamento bloqueado) — mesmo princípio de
// `observeViewportOffset`/`observeAdministratorMode` em
// CAMAP-AGP/templates/camap-tema-01/index.js: nunca lança, degrada
// silenciosamente para "sem persistência".
function readCollapsedState(storage) {
  if (!storage || typeof storage.getItem !== "function") return false;
  try {
    return storage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsedState(storage, collapsed) {
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Sem persistência disponível — o toggle ainda funciona na sessão atual.
  }
}

function createGroupIcon(document, groupKey) {
  const paths = ADMINISTRATOR_NAV_GROUP_ICON_PATHS[groupKey];
  if (!paths) return null;
  const span = document.createElement("span");
  span.className = "mse-administrator-shell__group-icon";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return span;
}

function createNavLink(document, option, label, activeOption) {
  const a = document.createElement("a");
  a.className = "mse-administrator-shell__nav-link";
  a.href = `#/administrator?option=${option}`;
  const icon = createIcon(document, option);
  if (icon) a.append(icon);
  const text = document.createElement("span");
  text.className = "mse-administrator-shell__nav-label";
  text.textContent = label;
  a.append(text);
  if (option === activeOption) a.setAttribute("aria-current", "page");
  return a;
}

export function createAdministratorShell({ root, activeOption, storage } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  // `storage` é opcional e aditivo (extensão de contrato, não quebra
  // chamadores existentes): por padrão usa `window.sessionStorage` quando
  // disponível — preferência de sessão de trabalho, não deve sobreviver a
  // login/dispositivo diferentes num SharePoint compartilhado (ao contrário
  // de localStorage), mas também não deve ser perdida num F5 dentro da
  // mesma sessão (ao contrário de um estado só em memória).
  const sidebarStorage = storage !== undefined
    ? storage
    : (typeof window !== "undefined" ? window.sessionStorage : null);
  root.replaceChildren();
  root.classList.add("mse-administrator-shell");

  // Rótulo por `option`, lido de ADMINISTRATOR_NAV_LINKS (fonte única de
  // verdade) — o agrupamento (ADMINISTRATOR_NAV_GROUPS) só decide
  // ORDEM/moldura visual, nunca duplica o rótulo. Calculado ANTES do
  // cabeçalho porque o header magro (ver abaixo) também lê daqui.
  const labelByOption = new Map(ADMINISTRATOR_NAV_LINKS);
  const groupedOptions = new Set(ADMINISTRATOR_NAV_GROUPS.flatMap((group) => group.options));

  // Header magro, estilo breadcrumb (24/10/2026 — fidelidade ao Joomla!
  // real: o header do `atum` real é uma faixa fina com só um ícone + o
  // título da tela atual à esquerda, nunca um banner de marca cheio de
  // cor). Reaproveita `createIcon`/`labelByOption`, nenhuma fonte nova de
  // verdade. A marca "Administrator"/"mini-Joomla!" (antes vivia aqui)
  // migra para o topo de `nav`, abaixo — o próprio Joomla real também não
  // exibe o nome do produto no header superior.
  const header = document.createElement("header");
  header.className = "mse-administrator-shell__header";
  const headerIcon = createIcon(document, activeOption);
  if (headerIcon) {
    headerIcon.classList.add("mse-administrator-shell__header-icon");
    header.append(headerIcon);
  }
  const headerTitle = document.createElement("span");
  headerTitle.className = "mse-administrator-shell__header-title";
  headerTitle.textContent = labelByOption.get(activeOption) || "Administrator";
  header.append(headerTitle);

  const body = document.createElement("div");
  body.className = "mse-administrator-shell__body";

  const nav = document.createElement("nav");
  nav.className = "mse-administrator-shell__nav";
  nav.setAttribute("aria-label", "Administração");

  // Marca do produto (movida do header para o topo da sidebar — ver
  // comentário acima).
  const brand = document.createElement("strong");
  brand.className = "mse-administrator-shell__brand";
  const brandIcon = createIcon(document, "com_cpanel");
  if (brandIcon) {
    brandIcon.classList.add("mse-administrator-shell__brand-icon");
    brand.append(brandIcon);
  }
  const brandLabel = document.createElement("span");
  brandLabel.className = "mse-administrator-shell__brand-label";
  brandLabel.textContent = "Administrator";
  brand.append(brandLabel);
  const tagline = document.createElement("span");
  tagline.className = "mse-administrator-shell__tagline";
  tagline.textContent = "mini-Joomla!";
  nav.append(brand, tagline);

  // Toggle "Recolher Menu" (item 1.4 — fidelidade ao Joomla! real): alterna
  // a classe `--collapsed` em `nav`, que o CSS usa para encolher a sidebar
  // para só-ícones. Não é um <a> (não conta na asserção de
  // `administrator-shell.test.js` que soma todos os <a>) nem reaproveita a
  // classe `__group-toggle` (não conta na asserção que soma botões de
  // grupo). Estado persiste via `storage` (ver topo da função) para
  // sobreviver a uma navegação/F5 dentro da mesma sessão.
  const collapseToggle = document.createElement("button");
  collapseToggle.type = "button";
  collapseToggle.className = "mse-administrator-shell__collapse-toggle";
  collapseToggle.append(createCollapseIcon(document));
  const collapseLabel = document.createElement("span");
  collapseLabel.className = "mse-administrator-shell__collapse-label";
  collapseLabel.textContent = "Recolher Menu";
  collapseToggle.append(collapseLabel);
  let navCollapsed = readCollapsedState(sidebarStorage);
  const applyNavCollapsed = () => {
    nav.classList.toggle("mse-administrator-shell__nav--collapsed", navCollapsed);
    collapseToggle.setAttribute("aria-pressed", String(navCollapsed));
  };
  applyNavCollapsed();
  collapseToggle.addEventListener("click", () => {
    navCollapsed = !navCollapsed;
    applyNavCollapsed();
    writeCollapsedState(sidebarStorage, navCollapsed);
  });
  nav.append(collapseToggle);

  // "Painel" (com_cpanel) fica solto no topo, fora de qualquer grupo —
  // mesmo papel do item "Painel Principal" no backend `atum` do Joomla!
  // real (nunca pertence a uma categoria).
  for (const [option, label] of ADMINISTRATOR_NAV_LINKS) {
    if (groupedOptions.has(option)) continue;
    nav.append(createNavLink(document, option, label, activeOption));
  }

  // Grupos colapsáveis — cada cabeçalho é um <button> (não <a>: o teste
  // `administrator-shell.test.js` conta TODOS os <a> do shell e exige que
  // seja exatamente ADMINISTRATOR_NAV_LINKS.length, então o cabeçalho de
  // grupo não pode ser um link navegável, só um controle de
  // expandir/recolher — mesmo papel do "has-arrow" do atum, que também não
  // navega, só expande).
  for (const group of ADMINISTRATOR_NAV_GROUPS) {
    const groupActive = group.options.includes(activeOption);
    const section = document.createElement("div");
    section.className = "mse-administrator-shell__group";
    if (groupActive) section.classList.add("mse-administrator-shell__group--active");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mse-administrator-shell__group-toggle";
    const groupIcon = createGroupIcon(document, group.key);
    if (groupIcon) toggle.append(groupIcon);
    const groupLabel = document.createElement("span");
    groupLabel.className = "mse-administrator-shell__group-label";
    groupLabel.textContent = group.label;
    toggle.append(groupLabel);

    const sublist = document.createElement("div");
    sublist.className = "mse-administrator-shell__group-items";
    for (const option of group.options) {
      const label = labelByOption.get(option);
      if (label == null) continue;
      sublist.append(createNavLink(document, option, label, activeOption));
    }

    let expanded = groupActive;
    const applyExpanded = () => {
      toggle.setAttribute("aria-expanded", String(expanded));
      sublist.hidden = !expanded;
      section.classList.toggle("mse-administrator-shell__group--collapsed", !expanded);
    };
    applyExpanded();
    toggle.addEventListener("click", () => {
      expanded = !expanded;
      applyExpanded();
    });

    section.append(toggle, sublist);
    nav.append(section);
  }

  const content = document.createElement("div");
  content.className = "mse-administrator-shell__content";

  body.append(nav, content);
  root.append(header, body);

  return {
    contentElement: content,
    dispose() {
      root.replaceChildren();
      root.classList.remove("mse-administrator-shell");
    }
  };
}
