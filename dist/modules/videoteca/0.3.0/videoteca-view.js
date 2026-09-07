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

function errorMessage() {
  return "Não foi possível carregar a videoteca. Tente novamente em instantes.";
}

function thumb(document, video) {
  const node = element(document, "div", "mse-videoteca__thumb");
  node.style.setProperty("--accent", accentFor(video.Categoria));
  if (video.Miniatura) node.style.backgroundImage = `url('${video.Miniatura}')`;
  const duration = video.Duracao ? element(document, "span", "mse-videoteca__duration", video.Duracao) : null;
  if (duration) node.append(duration);
  return node;
}

function videoCard(document, video) {
  const card = element(document, "a", "mse-videoteca__card");
  card.href = video.URL;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.append(thumb(document, video));
  const meta = element(document, "div", "mse-videoteca__meta");
  meta.append(element(document, "span", "mse-videoteca__title", video.Title));
  const sub = [video.Apresentador, formattedDate(video.Data)].filter(Boolean).join(" · ");
  if (sub) meta.append(element(document, "span", "mse-videoteca__sub", sub));
  card.append(meta);
  return card;
}

function renderCarousel(document, featured, { reducedMotion }) {
  const section = element(document, "div", "mse-videoteca__carousel");
  const carousel = mountCarousel({
    root: section,
    items: featured,
    autoAdvance: CAROUSEL_INTERVAL_MS,
    reducedMotion,
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
      slide.style.setProperty("--accent", accentFor(video.Categoria));
      if (video.Miniatura) slide.style.backgroundImage = `url('${video.Miniatura}')`;
      const info = element(ownerDocument, "div", "mse-videoteca__slide-info");
      info.append(element(ownerDocument, "span", "mse-videoteca__slide-eyebrow", "Edição em destaque"));
      info.append(element(ownerDocument, "span", "mse-videoteca__slide-title", video.Title));
      const sub = [video.Apresentador, formattedDate(video.Data)].filter(Boolean).join(" · ");
      if (sub) info.append(element(ownerDocument, "span", "mse-videoteca__slide-sub", sub));
      slide.append(info);
      return slide;
    }
  });

  return { element: section, dispose: carousel.destroy };
}

export function createVideotecaView({ root, service, reducedMotion } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!service || typeof service.listCatalog !== "function") {
    throw new TypeError("service deve implementar listCatalog().");
  }

  const document = root.ownerDocument;
  const prefersReducedMotion = reducedMotion ?? globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  let disposed = false;
  let carousel = null;

  async function render() {
    root.replaceChildren(element(document, "p", "mse-videoteca__status", "Carregando videoteca..."));
    let catalog;
    try {
      catalog = await service.listCatalog();
    } catch {
      if (disposed) return;
      root.replaceChildren(element(document, "p", "mse-videoteca__status mse-videoteca__status--error", errorMessage()));
      return;
    }
    if (disposed) return;

    if (!catalog.groups.length) {
      root.replaceChildren(element(document, "p", "mse-videoteca__status", "Nenhum vídeo publicado ainda."));
      return;
    }

    const container = element(document, "div", "mse-videoteca");
    if (catalog.featured.length) {
      carousel = renderCarousel(document, catalog.featured, { reducedMotion: prefersReducedMotion });
      container.append(carousel.element);
    }

    for (const group of catalog.groups) {
      const section = element(document, "section", "mse-videoteca__row");
      section.style.setProperty("--accent", accentFor(group.category));
      section.append(element(document, "h3", "mse-videoteca__row-title", group.category));
      const track = element(document, "div", "mse-videoteca__row-track");
      for (const video of group.videos) track.append(videoCard(document, video));
      section.append(track);
      container.append(section);
    }

    root.replaceChildren(container);
  }

  render();

  return () => {
    disposed = true;
    carousel?.dispose();
  };
}
