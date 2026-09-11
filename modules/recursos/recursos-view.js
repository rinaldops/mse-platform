import { RECURSOS_CATEGORIES } from "./recursos-schema.js";

const SORT_LABELS = Object.freeze({ curada: "Ordem curada", alfabetica: "Nome (A–Z)" });
const VIEW_LABELS = Object.freeze({ cartoes: "Cartões", compacta: "Lista compacta" });

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function errorMessage(error) {
  if (error?.code === "access-denied") return "Você não possui acesso aos links deste site.";
  return "Não foi possível carregar os recursos. Tente novamente em instantes.";
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sigla(link) {
  const key = (link.IconeChave || "").trim();
  if (key) return key.slice(0, 3).toUpperCase();
  const words = (link.Title || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function createRecursosView({ root, service } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!service || typeof service.listGroupedLinks !== "function") {
    throw new TypeError("service deve implementar listGroupedLinks().");
  }

  const document = root.ownerDocument;
  let disposed = false;
  let allGroups = null;

  // Estado de filtro/ordenação/visão em memória (sem espelhar na query string):
  // o módulo não tem navegação para uma "página" distinta como o Fórum, então o
  // ganho de persistência via URL não compensa a complexidade extra aqui.
  let state = { search: "", category: "todas", sort: "curada", view: "cartoes" };

  function status(text, modifier) {
    return element(document, "p", ["mse-recursos__status", modifier].filter(Boolean).join(" "), text);
  }

  function flatLinks(sort) {
    const links = allGroups.flatMap((group) => group.links);
    if (sort === "alfabetica") {
      return [...links].sort((left, right) => (left.Title || "").localeCompare(right.Title || "", "pt-BR"));
    }
    return links;
  }

  function filteredLinks() {
    const term = state.search.trim().toLowerCase();
    return flatLinks(state.sort).filter((link) => {
      if (state.category !== "todas" && link.Categoria !== state.category) return false;
      if (!term) return true;
      return (link.Title || "").toLowerCase().includes(term)
        || (link.Descricao || "").toLowerCase().includes(term)
        || (link.Categoria || "").toLowerCase().includes(term);
    });
  }

  function setState(changes) {
    state = { ...state, ...changes };
    renderShell();
  }

  function pageBar() {
    const bar = element(document, "header", "mse-recursos__pagebar");
    const inner = element(document, "div", "mse-recursos__pagebar-inner");

    const crumb = element(document, "div", "mse-recursos__breadcrumb");
    const home = element(document, "a", "mse-recursos__breadcrumb-link", "Hub TD");
    home.href = "#inicio";
    crumb.append(home, element(document, "span", "mse-recursos__breadcrumb-sep", "/"));
    crumb.lastChild.setAttribute("aria-hidden", "true");
    crumb.append(element(document, "h1", "mse-recursos__pagebar-title", "Recursos"));
    inner.append(crumb);

    const searchLabel = element(document, "label", "mse-recursos__search");
    searchLabel.append(element(document, "span", "mse-recursos__search-icon", "⌕"));
    const search = element(document, "input", "mse-recursos__search-input");
    search.type = "search";
    search.placeholder = "Buscar recursos...";
    search.setAttribute("aria-label", "Buscar recursos");
    search.maxLength = 100;
    search.value = state.search;
    let debounce = null;
    search.addEventListener("input", () => {
      clearTimeout(debounce);
      const value = search.value;
      debounce = setTimeout(() => {
        if (disposed) return;
        setState({ search: value.slice(0, 100) });
        const refocused = root.querySelector(".mse-recursos__search-input");
        if (refocused) {
          refocused.focus();
          const caret = refocused.value.length;
          refocused.setSelectionRange?.(caret, caret);
        }
      }, 250);
    });
    searchLabel.append(search);
    inner.append(searchLabel);

    // "+ Sugerir link" e "Meus favoritos": presentes por especificação visual, mas o
    // fluxo não está desenhado (README, "Pendências") — inertes até haver decisão.
    const actions = element(document, "div", "mse-recursos__pagebar-actions");
    const suggest = element(document, "button", "mse-recursos__pagebar-button mse-recursos__pagebar-button--primary", "+ Sugerir link");
    suggest.type = "button";
    const favorites = element(document, "button", "mse-recursos__pagebar-button mse-recursos__pagebar-button--ghost", "Meus favoritos");
    favorites.type = "button";
    actions.append(suggest, favorites);
    inner.append(actions);

    bar.append(inner);
    return bar;
  }

  function filterBar() {
    const wrap = element(document, "div", "mse-recursos__filterbar");

    const chips = element(document, "div", "mse-recursos__chips");
    const counts = new Map();
    for (const link of flatLinks("curada")) counts.set(link.Categoria, (counts.get(link.Categoria) ?? 0) + 1);
    const allChip = element(document, "button", "mse-recursos__chip", "Todas");
    allChip.type = "button";
    if (state.category === "todas") allChip.classList.add("mse-recursos__chip--active");
    allChip.addEventListener("click", () => setState({ category: "todas" }));
    chips.append(allChip);
    for (const category of RECURSOS_CATEGORIES) {
      const chip = element(document, "button", "mse-recursos__chip");
      chip.type = "button";
      const active = state.category === category;
      if (active) chip.classList.add("mse-recursos__chip--active");
      chip.append(
        element(document, "span", null, category),
        element(document, "span", "mse-recursos__chip-count", String(counts.get(category) ?? 0))
      );
      chip.addEventListener("click", () => setState({ category }));
      chips.append(chip);
    }

    const row2 = element(document, "div", "mse-recursos__row2");
    const sortLabel = element(document, "label", "mse-recursos__sort");
    sortLabel.append(element(document, "span", "mse-recursos__sort-label", "Ordenar por"));
    const sort = element(document, "select", "mse-recursos__select");
    for (const [value, label] of Object.entries(SORT_LABELS)) {
      const option = element(document, "option", null, label);
      option.value = value;
      option.selected = value === state.sort;
      sort.append(option);
    }
    sort.addEventListener("change", () => setState({ sort: sort.value }));
    sortLabel.append(sort);

    const viewGroup = element(document, "div", "mse-recursos__view-toggle");
    viewGroup.setAttribute("role", "group");
    viewGroup.setAttribute("aria-label", "Modo de exibição");
    for (const [value, label] of Object.entries(VIEW_LABELS)) {
      const button = element(document, "button", "mse-recursos__view-button", label);
      button.type = "button";
      if (state.view === value) button.classList.add("mse-recursos__view-button--active");
      button.addEventListener("click", () => setState({ view: value }));
      viewGroup.append(button);
    }
    row2.append(sortLabel, viewGroup);

    wrap.append(chips, row2);

    if (state.category !== "todas" || state.search.trim()) {
      const summary = element(document, "div", "mse-recursos__filter-summary");
      const parts = [];
      if (state.category !== "todas") parts.push(state.category);
      if (state.search.trim()) parts.push(`"${state.search.trim()}"`);
      summary.append(element(document, "span", null, parts.join(" · ")));
      const clear = element(document, "button", "mse-recursos__clear-filters", "Limpar filtros ✕");
      clear.type = "button";
      clear.addEventListener("click", () => setState({ category: "todas", search: "" }));
      summary.append(clear);
      wrap.append(summary);
    }

    return wrap;
  }

  function shortcutsSection() {
    const featured = allGroups.map((group) => group.links[0]).filter(Boolean);
    if (!featured.length) return null;
    const section = element(document, "section", "mse-recursos__shortcuts");
    const heading = element(document, "h2", "mse-recursos__shortcuts-title");
    heading.append(element(document, "span", "mse-recursos__shortcuts-mark"), document.createTextNode("Atalhos mais usados"));
    section.append(heading);
    const grid = element(document, "div", "mse-recursos__shortcuts-grid");
    for (const link of featured) grid.append(shortcutCard(link));
    section.append(grid);
    return section;
  }

  function shortcutCard(link) {
    const card = element(document, "a", "mse-recursos__shortcut");
    card.href = link.URL;
    if (link.AbrirNovaJanela) { card.target = "_blank"; card.rel = "noopener noreferrer"; }
    card.append(
      element(document, "span", "mse-recursos__shortcut-sigla", sigla(link)),
      (() => {
        const body = element(document, "span", "mse-recursos__shortcut-body");
        body.append(
          element(document, "span", "mse-recursos__shortcut-name", link.Title),
          element(document, "span", "mse-recursos__shortcut-category", link.Categoria || "")
        );
        return body;
      })()
    );
    return card;
  }

  function resourceCard(link) {
    const card = element(document, "a", "mse-recursos__card");
    card.href = link.URL;
    if (link.AbrirNovaJanela) { card.target = "_blank"; card.rel = "noopener noreferrer"; }
    card.append(element(document, "span", "mse-recursos__card-sigla", sigla(link)));

    const body = element(document, "span", "mse-recursos__card-body");
    const titleLine = element(document, "span", "mse-recursos__card-title-line");
    titleLine.append(element(document, "span", "mse-recursos__card-title", link.Title));
    if (link.AbrirNovaJanela) {
      const external = element(document, "span", "mse-recursos__card-external", "↗");
      external.setAttribute("aria-label", "Abre em nova janela");
      external.title = "Abre em nova janela";
      titleLine.append(external);
    }
    body.append(titleLine);
    if (link.Descricao) body.append(element(document, "span", "mse-recursos__card-description", link.Descricao));
    const host = hostFromUrl(link.URL);
    if (host) body.append(element(document, "span", "mse-recursos__card-host", host));
    card.append(body);
    return card;
  }

  function compactRow(link) {
    const row = element(document, "a", "mse-recursos__row");
    row.href = link.URL;
    if (link.AbrirNovaJanela) { row.target = "_blank"; row.rel = "noopener noreferrer"; }
    const left = element(document, "span", "mse-recursos__row-left");
    left.append(element(document, "span", "mse-recursos__row-title", link.Title));
    if (link.Descricao) left.append(element(document, "span", "mse-recursos__row-description", link.Descricao));
    row.append(left);
    const right = element(document, "span", "mse-recursos__row-right");
    right.append(element(document, "span", "mse-recursos__row-category", link.Categoria || ""));
    right.append(element(document, "span", "mse-recursos__row-external", "↗"));
    row.append(right);
    return row;
  }

  function groupedCards(links) {
    const byCategory = new Map();
    for (const link of links) {
      if (!byCategory.has(link.Categoria)) byCategory.set(link.Categoria, []);
      byCategory.get(link.Categoria).push(link);
    }
    const wrap = element(document, "div", "mse-recursos__groups");
    for (const group of allGroups) {
      const items = byCategory.get(group.category);
      if (!items?.length) continue;
      const section = element(document, "section", "mse-recursos__group");
      const heading = element(document, "h2", "mse-recursos__group-title");
      heading.append(
        element(document, "span", "mse-recursos__group-mark"),
        document.createTextNode(group.category)
      );
      const count = element(document, "span", "mse-recursos__group-count", `${items.length} LINK${items.length === 1 ? "" : "S"}`);
      const headerRow = element(document, "div", "mse-recursos__group-header");
      headerRow.append(heading, count);
      section.append(headerRow);
      const grid = element(document, "div", "mse-recursos__card-grid");
      for (const link of items) grid.append(resourceCard(link));
      section.append(grid);
      wrap.append(section);
    }
    return wrap;
  }

  function emptyFilteredState() {
    const box = element(document, "div", "mse-recursos__empty");
    box.append(
      element(document, "p", "mse-recursos__empty-title", "Nenhum recurso encontrado"),
      element(document, "p", "mse-recursos__empty-text", "Ajuste os filtros ou indique esse link para entrar na curadoria.")
    );
    const cta = element(document, "button", "mse-recursos__button", "Sugerir link");
    cta.type = "button";
    box.append(cta);
    return box;
  }

  function renderShell() {
    const shell = element(document, "section", "mse-recursos mse-recursos--list");
    shell.append(pageBar());

    const page = element(document, "div", "mse-recursos__page");
    page.append(filterBar());

    const links = filteredLinks();
    const noFilter = state.category === "todas" && !state.search.trim();
    if (noFilter && state.view === "cartoes") {
      const shortcuts = shortcutsSection();
      if (shortcuts) page.append(shortcuts);
    }

    if (!links.length) {
      page.append(emptyFilteredState());
    } else if (state.view === "compacta") {
      const list = element(document, "div", "mse-recursos__compact-list");
      for (const link of links) list.append(compactRow(link));
      page.append(list);
    } else {
      page.append(groupedCards(links));
    }

    shell.append(page);
    root.replaceChildren(shell);
  }

  async function render() {
    root.replaceChildren(status("Carregando recursos..."));
    try {
      allGroups = await service.listGroupedLinks();
    } catch (error) {
      if (disposed) return;
      root.replaceChildren(status(errorMessage(error), "mse-recursos__status--error"));
      return;
    }
    if (disposed) return;
    if (!allGroups.length) {
      root.replaceChildren(status("Nenhum recurso publicado ainda."));
      return;
    }
    renderShell();
  }

  render();

  return () => {
    disposed = true;
    root.replaceChildren();
  };
}

// Lean read-only panel for the Home page: the top link of each category with
// a link to the full Recursos page. Unlike the full page's shortcuts (which
// open the resource directly), every item here points at Recursos.aspx —
// this panel is a teaser, not a shortcut bar. No filters/search/interactivity
// beyond plain navigation — the full experience lives there (createRecursosView).
export function createRecursosSummaryView({ root, service, pageHref, limit = 6 } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!service || typeof service.listGroupedLinks !== "function") {
    throw new TypeError("service deve implementar listGroupedLinks().");
  }
  if (typeof pageHref !== "string" || !pageHref) {
    throw new TypeError("pageHref é obrigatório.");
  }

  const document = root.ownerDocument;
  let disposed = false;
  let groups = [];
  let activeCategory = null;

  function visibleLinks() {
    if (activeCategory === null) {
      return groups.map((group) => group.links[0]).filter(Boolean).slice(0, limit);
    }
    const group = groups.find((entry) => entry.category === activeCategory);
    return (group?.links ?? []).slice(0, limit);
  }

  function chipRow() {
    if (groups.length < 2) return null;
    const row = element(document, "div", "mse-recursos__summary-chips");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Filtrar por categoria");

    const make = (label, value) => {
      const chip = element(document, "button", "mse-recursos__summary-chip-btn", label);
      chip.type = "button";
      const on = activeCategory === value;
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) chip.classList.add("mse-recursos__summary-chip-btn--on");
      chip.addEventListener("click", () => {
        if (disposed || activeCategory === value) return;
        activeCategory = value;
        renderShell();
      });
      return chip;
    };

    row.append(make("Mais usados", null));
    for (const group of groups) row.append(make(group.category, group.category));
    return row;
  }

  function linkCard(link) {
    const card = element(document, "a", "mse-recursos__summary-item");
    card.href = pageHref;
    const body = element(document, "span", "mse-recursos__summary-body");
    body.append(element(document, "span", "mse-recursos__summary-name", link.Title));
    const host = hostFromUrl(link.URL);
    if (host) body.append(element(document, "span", "mse-recursos__summary-host", host));
    body.append(element(document, "span", "mse-recursos__summary-category", link.Categoria || ""));
    card.append(element(document, "span", "mse-recursos__summary-sigla", sigla(link)), body);
    return card;
  }

  function renderShell() {
    const panel = element(document, "section", "mse-recursos__summary");

    const header = element(document, "div", "mse-recursos__summary-header");
    header.append(element(document, "h2", "mse-recursos__summary-title", "Recursos"));
    const cta = element(document, "a", "mse-recursos__summary-cta", "Ver todos os recursos");
    cta.href = pageHref;
    header.append(cta);
    panel.append(header);

    const chips = chipRow();
    if (chips) panel.append(chips);

    const list = element(document, "div", "mse-recursos__summary-list");
    const links = visibleLinks();
    list.replaceChildren(...(links.length
      ? links.map(linkCard)
      : [element(document, "p", "mse-recursos__summary-empty", "Nenhum recurso nesta categoria.")]));
    panel.append(list);

    root.replaceChildren(panel);
  }

  async function render() {
    try {
      groups = await service.listGroupedLinks();
      if (disposed) return;
      if (!groups.length) {
        root.replaceChildren(element(document, "p", "mse-recursos__summary-empty", "Nenhum recurso publicado ainda."));
        return;
      }
      renderShell();
    } catch (error) {
      if (disposed) return;
      root.replaceChildren(element(document, "p", "mse-recursos__summary-empty", errorMessage(error)));
    }
  }

  render();

  return () => {
    disposed = true;
  };
}
