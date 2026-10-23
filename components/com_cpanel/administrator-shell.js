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
 * @param {{ root: Element, activeOption?: string }} options
 * @returns {{ contentElement: Element, dispose(): void }}
 */
export const ADMINISTRATOR_NAV_LINKS = Object.freeze([
  ["com_cpanel", "Painel"],
  ["com_config", "Configuração global"],
  ["com_diagnostics", "Diagnóstico"],
  ["com_content", "Publicador"],
  ["com_extensions", "Extensões"],
  ["com_menus", "Menus"],
  ["com_modules", "Módulos"],
  ["com_templates", "Templates"],
  ["com_installer", "Instalador"]
]);

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

export function createAdministratorShell({ root, activeOption } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  root.replaceChildren();
  root.classList.add("mse-administrator-shell");

  const header = document.createElement("header");
  header.className = "mse-administrator-shell__header";
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
  header.append(brand, tagline);

  const body = document.createElement("div");
  body.className = "mse-administrator-shell__body";

  const nav = document.createElement("nav");
  nav.className = "mse-administrator-shell__nav";
  nav.setAttribute("aria-label", "Administração");
  for (const [option, label] of ADMINISTRATOR_NAV_LINKS) {
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
    nav.append(a);
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
