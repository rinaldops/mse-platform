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
const PAGE_SIZE = 12;
const SHOWCASE_LIMIT = 6;

const SORT_LABELS = Object.freeze({ recentes: "Mais recentes", vistos: "Mais assistidos", curtos: "Menor duração" });

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
  const clock = String(text || "").match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (clock) return Number(clock[1] || 0) * 60 + Number(clock[2]) + Number(clock[3]) / 60;
  const hourMatch = (text || "").match(/(\d+)\s*h/i);
  const minMatch = (text || "").match(/(\d+)\s*m/i);
  const total = (hourMatch ? Number(hourMatch[1]) * 60 : 0) + (minMatch ? Number(minMatch[1]) : 0);
  return total > 0 ? total : Infinity;
}

export function presentersFor(video) {
  const value = video?.Apresentadores || video?.Apresentador || "";
  return [...new Set(String(value).split(/\r?\n|;|\|/).map((name) => name.trim()).filter(Boolean))];
}

export function thumbnailFor(video) {
  return video?.Miniatura || "";
}

function shuffled(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
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

  let state = { search: "", category: "todas", sort: "recentes", page: 1 };
  let showcaseVideos = [];

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
    if (sort === "curtos") return [...list].sort((a, b) => {
      const left = Number(a.DuracaoSegundos) > 0 ? Number(a.DuracaoSegundos) / 60 : durationMinutes(a.Duracao);
      const right = Number(b.DuracaoSegundos) > 0 ? Number(b.DuracaoSegundos) / 60 : durationMinutes(b.Duracao);
      return left - right;
    });
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
        setState({ search: value.slice(0, 100), page: 1 });
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
    allChip.addEventListener("click", () => setState({ category: "todas", page: 1 }));
    chips.append(allChip);
    const categories = [...new Set([
      ...VIDEOTECA_CATEGORIES,
      ...allVideos.map((video) => video.Categoria).filter(Boolean)
    ])];
    for (const category of categories) {
      const chip = element(document, "button", "mse-videoteca__chip");
      chip.type = "button";
      if (state.category === category) chip.classList.add("mse-videoteca__chip--active");
      chip.append(
        element(document, "span", null, category),
        element(document, "span", "mse-videoteca__chip-count", String(counts.get(category) ?? 0))
      );
      chip.addEventListener("click", () => setState({ category, page: 1 }));
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
    sortLabel.append(sort);

    sort.addEventListener("change", () => setState({ sort: sort.value, page: 1 }));
    row2.append(sortLabel);
    wrap.append(chips, row2);

    if (state.category !== "todas" || state.search.trim()) {
      const summary = element(document, "div", "mse-videoteca__filter-summary");
      const parts = [];
      if (state.category !== "todas") parts.push(state.category);
      if (state.search.trim()) parts.push(`"${state.search.trim()}"`);
      summary.append(element(document, "span", null, parts.join(" · ")));
      const clear = element(document, "button", "mse-videoteca__clear-filters", "Limpar filtros ✕");
      clear.type = "button";
      clear.addEventListener("click", () => setState({ category: "todas", search: "", page: 1 }));
      summary.append(clear);
      wrap.append(summary);
    }

    return wrap;
  }

  function playInline(container, video) {
    handleOpen(video);
    const player = element(document, "video", "mse-videoteca__player");
    player.src = video.URL;
    player.controls = true;
    player.autoplay = true;
    player.playsInline = true;
    player.preload = "metadata";
    player.setAttribute("aria-label", `Reproduzindo ${video.Title}`);
    container.replaceChildren(player);
    container.classList.add("mse-videoteca__media--playing");
    player.play?.().catch?.(() => {});
  }

  function thumb(video) {
    const node = element(document, "button", "mse-videoteca__thumb");
    node.type = "button";
    node.setAttribute("aria-label", `Assistir ${video.Title}`);
    node.style.setProperty("--accent", accentFor(video.Categoria));
    const image = thumbnailFor(video);
    if (image) node.style.backgroundImage = `url('${image}')`;
    if (video.Duracao) node.append(element(document, "span", "mse-videoteca__duration", video.Duracao));
    node.addEventListener("click", () => playInline(node, video));
    return node;
  }

  function videoCard(video, { chip = false } = {}) {
    const card = element(document, "article", "mse-videoteca__card");
    const media = thumb(video);
    card.append(media);
    const stripe = element(document, "span", "mse-videoteca__card-accent");
    stripe.style.setProperty("--accent", accentFor(video.Categoria));
    card.append(stripe);
    const meta = element(document, "div", "mse-videoteca__meta");
    const title = element(document, "button", "mse-videoteca__title", video.Title);
    title.type = "button";
    title.addEventListener("click", () => playInline(media, video));
    meta.append(title);
    const date = formattedDate(video.Data);
    if (date) meta.append(element(document, "span", "mse-videoteca__date", date));
    for (const presenter of presentersFor(video)) {
      meta.append(element(document, "span", "mse-videoteca__presenter", presenter));
    }
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
        const slide = element(ownerDocument, "div", "mse-videoteca__slide-content");

        const media = element(ownerDocument, "button", "mse-videoteca__slide-media");
        media.type = "button";
        media.setAttribute("aria-label", `Assistir ${video.Title}`);
        media.style.setProperty("--accent", accentFor(video.Categoria));
        const image = thumbnailFor(video);
        if (image) media.style.backgroundImage = `url('${image}')`;
        media.addEventListener("click", () => playInline(media, video));

        const text = element(ownerDocument, "div", "mse-videoteca__slide-text");
        text.append(element(ownerDocument, "span", "mse-videoteca__slide-eyebrow", `Seleção da videoteca · ${video.Categoria || ""}`));
        text.append(element(ownerDocument, "h2", "mse-videoteca__slide-title", video.Title));
        if (video.Descricao) text.append(element(ownerDocument, "p", "mse-videoteca__slide-description", video.Descricao));
        const sub = [formattedDate(video.Data), ...presentersFor(video), video.Duracao].filter(Boolean).join(" · ");
        if (sub) text.append(element(ownerDocument, "span", "mse-videoteca__slide-sub", sub));
        const actions = element(ownerDocument, "div", "mse-videoteca__slide-actions");
        const watch = element(ownerDocument, "button", "mse-videoteca__slide-watch", "▶ Assistir");
        watch.type = "button";
        watch.addEventListener("click", () => playInline(media, video));
        actions.append(watch);
        text.append(actions);

        slide.append(media, text);
        return slide;
      }
    });
    return { element: section, dispose: built.destroy };
  }

  function recentList(videos) {
    const aside = element(document, "aside", "mse-videoteca__latest");
    aside.append(element(document, "h2", "mse-videoteca__latest-title", "Vídeos mais recentes"));
    const list = element(document, "div", "mse-videoteca__latest-list");
    for (const video of videos.slice(0, SHOWCASE_LIMIT)) {
      const item = element(document, "article", "mse-videoteca__latest-item");
      const image = element(document, "button", "mse-videoteca__latest-thumb");
      image.type = "button";
      image.setAttribute("aria-label", `Assistir ${video.Title}`);
      const imageUrl = thumbnailFor(video);
      if (imageUrl) image.style.backgroundImage = `url('${imageUrl}')`;
      image.addEventListener("click", () => playInline(image, video));
      const text = element(document, "span", "mse-videoteca__latest-meta");
      const title = element(document, "button", "mse-videoteca__latest-name", video.Title);
      title.type = "button";
      title.addEventListener("click", () => playInline(image, video));
      text.append(title);
      const date = formattedDate(video.Data);
      if (date) text.append(element(document, "span", "mse-videoteca__latest-date", date));
      item.append(image, text);
      list.append(item);
    }
    aside.append(list);
    return aside;
  }

  function showcase() {
    const section = element(document, "section", "mse-videoteca__showcase");
    carousel = renderCarousel(showcaseVideos);
    section.append(carousel.element, recentList(allVideos));
    return section;
  }

  function catalogView(videos) {
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
      const track = element(document, "div", "mse-videoteca__catalog-list");
      for (const video of items) track.append(videoCard(video));
      section.append(track);
      wrap.append(section);
    }
    return wrap;
  }

  function pagination(total) {
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) return null;
    const nav = element(document, "nav", "mse-videoteca__pagination");
    nav.setAttribute("aria-label", "Paginação da videoteca");
    const button = (label, page, disabled = false, current = false) => {
      const control = element(document, "button", "mse-videoteca__page-button", label);
      control.type = "button";
      control.disabled = disabled;
      if (current) control.setAttribute("aria-current", "page");
      control.addEventListener("click", () => setState({ page }));
      return control;
    };
    nav.append(button("Anterior", Math.max(1, state.page - 1), state.page === 1));
    for (let page = 1; page <= pages; page += 1) nav.append(button(String(page), page, false, page === state.page));
    nav.append(button("Próxima", Math.min(pages, state.page + 1), state.page === pages));
    return nav;
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

    if (showcaseVideos.length) page.append(showcase());

    const videos = filteredVideos();
    if (!videos.length) {
      page.append(emptyFilteredState());
    } else {
      const pages = Math.max(1, Math.ceil(videos.length / PAGE_SIZE));
      if (state.page > pages) state.page = pages;
      const start = (state.page - 1) * PAGE_SIZE;
      page.append(catalogView(videos.slice(start, start + PAGE_SIZE)));
      const controls = pagination(videos.length);
      if (controls) page.append(controls);
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
    showcaseVideos = shuffled(allVideos).slice(0, SHOWCASE_LIMIT);
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
    const image = thumbnailFor(video);
    if (image) thumb.style.backgroundImage = `url('${image}')`;
    if (video.Duracao) thumb.append(element(document, "span", "mse-videoteca__summary-duration", video.Duracao));

    const meta = element(document, "span", "mse-videoteca__summary-meta");
    meta.append(element(document, "span", "mse-videoteca__summary-item-title", video.Title));
    const date = formattedDate(video.Data);
    if (date) meta.append(element(document, "span", "mse-videoteca__summary-date", date));
    for (const presenter of presentersFor(video)) {
      meta.append(element(document, "span", "mse-videoteca__summary-sub", presenter));
    }

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
