import { VIDEOTECA_CATEGORIES } from "./videoteca-schema.js";

const currentModuleUrl = new URL(import.meta.url);
const publishedVersion = currentModuleUrl.pathname.match(/\/modules\/videoteca\/([^/]+)\//)?.[1];
const carouselUrl = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(publishedVersion || "")
  ? new URL(`../../ui/${publishedVersion}/carousel/carousel.js`, currentModuleUrl)
  : new URL("../ui/carousel/carousel.js", currentModuleUrl);
const { mountCarousel } = await import(carouselUrl.href);

// Paleta de apoio visual da plataforma. Fixa por design: não é conteúdo do site.
// Nomes de categoria vêm da lista
// SharePoint de cada site e nunca são hardcoded aqui — accentFor() só escolhe uma cor
// determinística da paleta a partir do nome, para o módulo continuar reutilizável em
// qualquer site sem editar código por categoria.
const ACCENT_PALETTE = Object.freeze([
  "#3DDAFF", "#00B2A9", "#006298", "#ED8B00",
  "#C4D600", "#EBFF00", "#008542", "#75787B"
]);

const CAROUSEL_INTERVAL_MS = 6000;
const RECENT_STORAGE_KEY = "mse-videoteca-recentes";
const RECENT_LIMIT = 10;

const SORT_LABELS = Object.freeze({ recentes: "Mais recentes", vistos: "Mais assistidos", curtos: "Menor duração" });
const VIEW_LABELS = Object.freeze({ trilhas: "Por tema", grade: "Todos os vídeos" });

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function accentFor(category) {
  if (!category) return ACCENT_PALETTE[ACCENT_PALETTE.length - 1];
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) hash = (hash * 31 + category.charCodeAt(i)) | 0;
  return ACCENT_PALETTE[Math.abs(hash) % ACCENT_PALETTE.length];
}

function formattedDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

function durationMinutes(text) {
  const hourMatch = (text || "").match(/(\d+)\s*h/i);
  const minMatch = (text || "").match(/(\d+)\s*m/i);
  const total = (hourMatch ? Number(hourMatch[1]) * 60 : 0) + (minMatch ? Number(minMatch[1]) : 0);
  return total > 0 ? total : Infinity;
}

function errorMessage() {
  return "Não foi possível carregar a videoteca. Tente novamente em instantes.";
}

// "Continuar assistindo" não tem origem de dados real (os vídeos abrem em nova aba,
// não há player embutido para medir progresso) — decisão de produto foi usar
// localStorage, então gravamos o que dá para observar honestamente: quais vídeos o
// usuário abriu e quando. Vira uma lista de "abertos recentemente", sem barra de
// progresso fabricada (não inventamos porcentagem que não temos como saber).
function readRecent(storage) {
  try {
    const raw = storage?.getItem(RECENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && Number.isInteger(entry.id)) : [];
  } catch {
    return [];
  }
}

function registerRecent(storage, videoId) {
  try {
    const list = readRecent(storage).filter((entry) => entry.id !== videoId);
    list.unshift({ id: videoId, openedAt: Date.now() });
    storage?.setItem(RECENT_STORAGE_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT)));
  } catch {
    // localStorage indisponível (janela privada, contexto restrito) — degrada em silêncio.
  }
}

export function createVideotecaView({ root, service, reducedMotion, storage = globalThis.localStorage } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!service || typeof service.listCatalog !== "function") {
    throw new TypeError("service deve implementar listCatalog().");
  }

  const document = root.ownerDocument;
  const prefersReducedMotion = reducedMotion ?? globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  let disposed = false;
  let carousel = null;
  let catalog = null;
  let allVideos = [];

  let state = { search: "", category: "todas", sort: "recentes", view: "trilhas" };

  function status(text, modifier) {
    return element(document, "p", ["mse-videoteca__status", modifier].filter(Boolean).join(" "), text);
  }

  function setState(changes) {
    state = { ...state, ...changes };
    renderShell();
  }

  function handleOpen(video) {
    registerRecent(storage, video.Id);
    service.registerView?.(video.Id)?.catch?.(() => {});
  }

  function sortedVideos(list, sort) {
    if (sort === "vistos") return [...list].sort((a, b) => Number(b.Visualizacoes ?? 0) - Number(a.Visualizacoes ?? 0));
    if (sort === "curtos") return [...list].sort((a, b) => durationMinutes(a.Duracao) - durationMinutes(b.Duracao));
    return list; // "recentes": já vem "Data desc,Id desc" do servidor.
  }

  function filteredVideos() {
    const term = state.search.trim().toLowerCase();
    const base = allVideos.filter((video) => {
      if (state.category !== "todas" && video.Categoria !== state.category) return false;
      if (!term) return true;
      return (video.Title || "").toLowerCase().includes(term)
        || (video.Apresentador || "").toLowerCase().includes(term)
        || (video.Categoria || "").toLowerCase().includes(term);
    });
    return sortedVideos(base, state.sort);
  }

  function pageBar() {
    const bar = element(document, "header", "mse-videoteca__pagebar");
    const inner = element(document, "div", "mse-videoteca__pagebar-inner");

    const crumb = element(document, "div", "mse-videoteca__breadcrumb");
    const home = element(document, "a", "mse-videoteca__breadcrumb-link", "Hub TD");
    home.href = "#inicio";
    crumb.append(home, element(document, "span", "mse-videoteca__breadcrumb-sep", "/"));
    crumb.lastChild.setAttribute("aria-hidden", "true");
    crumb.append(element(document, "h1", "mse-videoteca__pagebar-title", "Videoteca"));
    inner.append(crumb);

    const searchLabel = element(document, "label", "mse-videoteca__search");
    searchLabel.append(element(document, "span", "mse-videoteca__search-icon", "⌕"));
    const search = element(document, "input", "mse-videoteca__search-input");
    search.type = "search";
    search.placeholder = "Buscar vídeos...";
    search.setAttribute("aria-label", "Buscar vídeos");
    search.maxLength = 100;
    search.value = state.search;
    let debounce = null;
    search.addEventListener("input", () => {
      clearTimeout(debounce);
      const value = search.value;
      debounce = setTimeout(() => {
        if (disposed) return;
        setState({ search: value.slice(0, 100) });
        const refocused = root.querySelector(".mse-videoteca__search-input");
        if (refocused) {
          refocused.focus();
          const caret = refocused.value.length;
          refocused.setSelectionRange?.(caret, caret);
        }
      }, 250);
    });
    searchLabel.append(search);
    inner.append(searchLabel);

    // "+ Sugerir tema" e "Minha lista": o fluxo não está desenhado (README, "Fora de
    // escopo") — presentes por especificação visual, inertes até haver decisão.
    const actions = element(document, "div", "mse-videoteca__pagebar-actions");
    const suggest = element(document, "button", "mse-videoteca__pagebar-button mse-videoteca__pagebar-button--primary", "+ Sugerir tema");
    suggest.type = "button";
    const myList = element(document, "button", "mse-videoteca__pagebar-button mse-videoteca__pagebar-button--ghost", "Minha lista");
    myList.type = "button";
    actions.append(suggest, myList);
    inner.append(actions);

    bar.append(inner);
    return bar;
  }

  function filterBar() {
    const wrap = element(document, "div", "mse-videoteca__filterbar");

    const chips = element(document, "div", "mse-videoteca__chips");
    const counts = new Map();
    for (const video of allVideos) counts.set(video.Categoria, (counts.get(video.Categoria) ?? 0) + 1);
    const allChip = element(document, "button", "mse-videoteca__chip", "Todas");
    allChip.type = "button";
    if (state.category === "todas") allChip.classList.add("mse-videoteca__chip--active");
    allChip.addEventListener("click", () => setState({ category: "todas" }));
    chips.append(allChip);
    for (const category of VIDEOTECA_CATEGORIES) {
      const chip = element(document, "button", "mse-videoteca__chip");
      chip.type = "button";
      if (state.category === category) chip.classList.add("mse-videoteca__chip--active");
      chip.append(
        element(document, "span", null, category),
        element(document, "span", "mse-videoteca__chip-count", String(counts.get(category) ?? 0))
      );
      chip.addEventListener("click", () => setState({ category }));
      chips.append(chip);
    }

    const row2 = element(document, "div", "mse-videoteca__row2");
    const sortLabel = element(document, "label", "mse-videoteca__sort");
    sortLabel.append(element(document, "span", "mse-videoteca__sort-label", "Ordenar por"));
    const sort = element(document, "select", "mse-videoteca__select");
    for (const [value, label] of Object.entries(SORT_LABELS)) {
      const option = element(document, "option", null, label);
      option.value = value;
      option.selected = value === state.sort;
      sort.append(option);
    }
    sort.addEventListener("change", () => setState({ sort: sort.value }));
    sortLabel.append(sort);

    const viewGroup = element(document, "div", "mse-videoteca__view-toggle");
    viewGroup.setAttribute("role", "group");
    viewGroup.setAttribute("aria-label", "Modo de exibição");
    for (const [value, label] of Object.entries(VIEW_LABELS)) {
      const button = element(document, "button", "mse-videoteca__view-button", label);
      button.type = "button";
      if (state.view === value) button.classList.add("mse-videoteca__view-button--active");
      button.addEventListener("click", () => setState({ view: value }));
      viewGroup.append(button);
    }
    row2.append(sortLabel, viewGroup);
    wrap.append(chips, row2);

    if (state.category !== "todas" || state.search.trim()) {
      const summary = element(document, "div", "mse-videoteca__filter-summary");
      const parts = [];
      if (state.category !== "todas") parts.push(state.category);
      if (state.search.trim()) parts.push(`"${state.search.trim()}"`);
      summary.append(element(document, "span", null, parts.join(" · ")));
      const clear = element(document, "button", "mse-videoteca__clear-filters", "Limpar filtros ✕");
      clear.type = "button";
      clear.addEventListener("click", () => setState({ category: "todas", search: "" }));
      summary.append(clear);
      wrap.append(summary);
    }

    return wrap;
  }

  function thumb(video) {
    const node = element(document, "div", "mse-videoteca__thumb");
    node.style.setProperty("--accent", accentFor(video.Categoria));
    if (video.Miniatura) node.style.backgroundImage = `url('${video.Miniatura}')`;
    if (video.Duracao) node.append(element(document, "span", "mse-videoteca__duration", video.Duracao));
    return node;
  }

  function videoCard(video, { chip = false } = {}) {
    const card = element(document, "a", "mse-videoteca__card");
    card.href = video.URL;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.addEventListener("click", () => handleOpen(video));
    card.append(thumb(video));
    const stripe = element(document, "span", "mse-videoteca__card-accent");
    stripe.style.setProperty("--accent", accentFor(video.Categoria));
    card.append(stripe);
    const meta = element(document, "div", "mse-videoteca__meta");
    meta.append(element(document, "span", "mse-videoteca__title", video.Title));
    const sub = [video.Apresentador, formattedDate(video.Data)].filter(Boolean).join(" · ");
    if (sub) meta.append(element(document, "span", "mse-videoteca__sub", sub));
    if (chip && video.Categoria) meta.append(element(document, "span", "mse-videoteca__card-chip", video.Categoria));
    card.append(meta);
    return card;
  }

  function renderCarousel(featured) {
    const section = element(document, "div", "mse-videoteca__carousel");
    const built = mountCarousel({
      root: section,
      items: featured,
      autoAdvance: CAROUSEL_INTERVAL_MS,
      reducedMotion: prefersReducedMotion,
      label: "Vídeos em destaque",
      className: "mse-videoteca__carousel",
      trackClass: "mse-videoteca__carousel-track",
      slideClass: "mse-videoteca__slide",
      controlClass: "mse-videoteca__nav",
      previousClass: "mse-videoteca__nav--prev",
      nextClass: "mse-videoteca__nav--next",
      previousLabel: "Vídeo anterior",
      nextLabel: "Próximo vídeo",
      indicatorClass: "mse-videoteca__carousel-dots",
      indicatorItemClass: "mse-videoteca__dot",
      indicatorActiveClass: "mse-videoteca__dot--active",
      renderItem(video, i, ownerDocument) {
        const slide = element(ownerDocument, "a", "mse-videoteca__slide");
        slide.href = video.URL;
        slide.target = "_blank";
        slide.rel = "noopener noreferrer";
        slide.addEventListener("click", () => handleOpen(video));

        const media = element(ownerDocument, "div", "mse-videoteca__slide-media");
        media.style.setProperty("--accent", accentFor(video.Categoria));
        if (video.Miniatura) media.style.backgroundImage = `url('${video.Miniatura}')`;

        const text = element(ownerDocument, "div", "mse-videoteca__slide-text");
        text.append(element(ownerDocument, "span", "mse-videoteca__slide-eyebrow", `Edição em destaque · ${video.Categoria || ""}`));
        text.append(element(ownerDocument, "h2", "mse-videoteca__slide-title", video.Title));
        if (video.Descricao) text.append(element(ownerDocument, "p", "mse-videoteca__slide-description", video.Descricao));
        const sub = [video.Apresentador, formattedDate(video.Data), video.Duracao].filter(Boolean).join(" · ");
        if (sub) text.append(element(ownerDocument, "span", "mse-videoteca__slide-sub", sub));
        const actions = element(ownerDocument, "div", "mse-videoteca__slide-actions");
        actions.append(element(ownerDocument, "span", "mse-videoteca__slide-watch", "▶ Assistir"));
        const listButton = element(ownerDocument, "button", "mse-videoteca__slide-list", "+ Minha lista");
        listButton.type = "button";
        listButton.addEventListener("click", (event) => event.preventDefault());
        actions.append(listButton);
        text.append(actions);

        slide.append(media, text);
        return slide;
      }
    });
    return { element: section, dispose: built.destroy };
  }

  function continueWatchingSection() {
    const recent = readRecent(storage);
    if (!recent.length) return null;
    const byId = new Map(allVideos.map((video) => [video.Id, video]));
    const videos = recent.map((entry) => byId.get(entry.id)).filter(Boolean).slice(0, 8);
    if (!videos.length) return null;
    const section = element(document, "section", "mse-videoteca__row");
    section.append(element(document, "h2", "mse-videoteca__row-title", "Continuar assistindo"));
    const track = element(document, "div", "mse-videoteca__row-track");
    for (const video of videos) track.append(videoCard(video));
    section.append(track);
    return section;
  }

  function trilhasView(videos) {
    const byCategory = new Map();
    for (const video of videos) {
      if (!byCategory.has(video.Categoria)) byCategory.set(video.Categoria, []);
      byCategory.get(video.Categoria).push(video);
    }
    const wrap = element(document, "div", "mse-videoteca__rows");
    for (const group of catalog.groups) {
      const items = byCategory.get(group.category);
      if (!items?.length) continue;
      const section = element(document, "section", "mse-videoteca__row");
      section.style.setProperty("--accent", accentFor(group.category));
      const header = element(document, "div", "mse-videoteca__row-header");
      const heading = element(document, "h2", "mse-videoteca__row-title");
      heading.append(element(document, "span", "mse-videoteca__row-mark"), document.createTextNode(group.category));
      header.append(heading, element(document, "span", "mse-videoteca__row-count", `${items.length} VÍDEO${items.length === 1 ? "" : "S"}`));
      section.append(header);
      const track = element(document, "div", "mse-videoteca__row-track");
      for (const video of items) track.append(videoCard(video));
      section.append(track);
      wrap.append(section);
    }
    return wrap;
  }

  function gradeView(videos) {
    const grid = element(document, "div", "mse-videoteca__grid");
    for (const video of videos) grid.append(videoCard(video, { chip: true }));
    return grid;
  }

  function emptyFilteredState() {
    const box = element(document, "div", "mse-videoteca__empty");
    box.append(
      element(document, "p", "mse-videoteca__empty-title", "Nenhum vídeo encontrado"),
      element(document, "p", "mse-videoteca__empty-text", "Ajuste os filtros ou sugira esse tema para o próximo encontro.")
    );
    const cta = element(document, "button", "mse-videoteca__button", "Sugerir tema");
    cta.type = "button";
    box.append(cta);
    return box;
  }

  function renderShell() {
    carousel?.dispose();
    carousel = null;

    const shell = element(document, "section", "mse-videoteca mse-videoteca--list");
    shell.append(pageBar());

    const page = element(document, "div", "mse-videoteca__page");
    page.append(filterBar());

    const noFilter = state.category === "todas" && !state.search.trim();
    if (noFilter && state.view === "trilhas" && catalog.featured.length) {
      carousel = renderCarousel(catalog.featured);
      page.append(carousel.element);
    }
    if (noFilter && state.view === "trilhas") {
      const continueSection = continueWatchingSection();
      if (continueSection) page.append(continueSection);
    }

    const videos = filteredVideos();
    if (!videos.length) {
      page.append(emptyFilteredState());
    } else if (state.view === "grade") {
      page.append(gradeView(videos));
    } else {
      page.append(trilhasView(videos));
    }

    shell.append(page);
    root.replaceChildren(shell);
  }

  async function render() {
    root.replaceChildren(status("Carregando videoteca..."));
    try {
      catalog = await service.listCatalog();
    } catch {
      if (disposed) return;
      root.replaceChildren(status(errorMessage(), "mse-videoteca__status--error"));
      return;
    }
    if (disposed) return;

    if (!catalog.groups.length) {
      root.replaceChildren(status("Nenhum vídeo publicado ainda."));
      return;
    }

    allVideos = catalog.groups.flatMap((group) => group.videos);
    renderShell();
  }

  render();

  return () => {
    disposed = true;
    carousel?.dispose();
    root.replaceChildren();
  };
}

// Lean read-only panel for the Home page: a handful of featured/recent videos
// with a link to the full Videoteca page. Unlike the full page's cards (which
// open the recording directly), every item here points at Videoteca.aspx —
// this panel is a teaser, not a player shortcut. No filters/carousel/tracking
// beyond plain navigation — the full experience lives there (createVideotecaView).
export function createVideotecaSummaryView({ root, service, pageHref, limit = 6 } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!service || typeof service.listCatalog !== "function") {
    throw new TypeError("service deve implementar listCatalog().");
  }
  if (typeof pageHref !== "string" || !pageHref) {
    throw new TypeError("pageHref é obrigatório.");
  }

  const document = root.ownerDocument;
  let disposed = false;
  let catalog = { featured: [], groups: [] };
  let activeCategory = null;

  function visibleVideos() {
    if (activeCategory === null) {
      const all = catalog.groups.flatMap((group) => group.videos);
      return (catalog.featured.length ? catalog.featured : all).slice(0, limit);
    }
    const group = catalog.groups.find((entry) => entry.category === activeCategory);
    return (group?.videos ?? []).slice(0, limit);
  }

  function chipRow() {
    if (catalog.groups.length < 2) return null;
    const row = element(document, "div", "mse-videoteca__summary-chips");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Filtrar por categoria");

    const make = (label, value) => {
      const chip = element(document, "button", "mse-videoteca__summary-chip-btn", label);
      chip.type = "button";
      const on = activeCategory === value;
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) chip.classList.add("mse-videoteca__summary-chip-btn--on");
      if (value) chip.style.setProperty("--accent", accentFor(value));
      chip.addEventListener("click", () => {
        if (disposed || activeCategory === value) return;
        activeCategory = value;
        renderShell();
      });
      return chip;
    };

    row.append(make("Destaques", null));
    for (const group of catalog.groups) row.append(make(group.category, group.category));
    return row;
  }

  function videoCard(video) {
    const card = element(document, "a", "mse-videoteca__summary-item");
    card.href = pageHref;
    card.style.setProperty("--accent", accentFor(video.Categoria));

    const thumb = element(document, "span", "mse-videoteca__summary-thumb");
    if (video.Duracao) thumb.append(element(document, "span", "mse-videoteca__summary-duration", video.Duracao));

    const meta = element(document, "span", "mse-videoteca__summary-meta");
    meta.append(element(document, "span", "mse-videoteca__summary-item-title", video.Title));
    const sub = [video.Apresentador, video.Categoria].filter(Boolean).join(" · ");
    if (sub) meta.append(element(document, "span", "mse-videoteca__summary-sub", sub));

    card.append(thumb, meta);
    return card;
  }

  function renderShell() {
    const panel = element(document, "section", "mse-videoteca__summary");

    const header = element(document, "div", "mse-videoteca__summary-header");
    header.append(element(document, "h2", "mse-videoteca__summary-title", "Videoteca"));
    const cta = element(document, "a", "mse-videoteca__summary-cta", "Ver videoteca completa");
    cta.href = pageHref;
    header.append(cta);
    panel.append(header);

    const chips = chipRow();
    if (chips) panel.append(chips);

    const list = element(document, "div", "mse-videoteca__summary-list");
    const videos = visibleVideos();
    list.replaceChildren(...(videos.length
      ? videos.map(videoCard)
      : [element(document, "p", "mse-videoteca__summary-empty", "Nenhum vídeo nesta categoria.")]));
    panel.append(list);

    root.replaceChildren(panel);
  }

  async function render() {
    try {
      catalog = await service.listCatalog();
      if (disposed) return;
      if (!catalog.groups.length) {
        root.replaceChildren(element(document, "p", "mse-videoteca__summary-empty", "Nenhum vídeo publicado ainda."));
        return;
      }
      renderShell();
    } catch {
      if (disposed) return;
      root.replaceChildren(element(document, "p", "mse-videoteca__summary-empty", errorMessage()));
    }
  }

  render();

  return () => {
    disposed = true;
  };
}
