const CATEGORY_ACCENT = Object.freeze({
  "Power Platform": "#3DDAFF",
  "Microsoft 365": "#00B2A9",
  "SAP": "#006298",
  "Azure e APIs": "#ED8B00",
  "KNIME": "#C4D600",
  "Automation Anywhere": "#EBFF00",
  "IA e Machine Learning": "#008542",
  "Outros": "#75787B"
});

const CAROUSEL_INTERVAL_MS = 6000;

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function accentFor(category) {
  return CATEGORY_ACCENT[category] || CATEGORY_ACCENT.Outros;
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
  const track = element(document, "div", "mse-videoteca__carousel-track");
  const dotsWrap = element(document, "div", "mse-videoteca__carousel-dots");
  const dots = [];
  let index = 0;
  let timer = null;

  featured.forEach((video, i) => {
    const slide = element(document, "a", "mse-videoteca__slide");
    slide.href = video.URL;
    slide.target = "_blank";
    slide.rel = "noopener noreferrer";
    slide.style.setProperty("--accent", accentFor(video.Categoria));
    if (video.Miniatura) slide.style.backgroundImage = `url('${video.Miniatura}')`;
    const info = element(document, "div", "mse-videoteca__slide-info");
    info.append(element(document, "span", "mse-videoteca__slide-eyebrow", "Edição em destaque"));
    info.append(element(document, "span", "mse-videoteca__slide-title", video.Title));
    const sub = [video.Apresentador, formattedDate(video.Data)].filter(Boolean).join(" · ");
    if (sub) info.append(element(document, "span", "mse-videoteca__slide-sub", sub));
    slide.append(info);
    track.append(slide);

    const dot = element(document, "button", "mse-videoteca__dot");
    dot.type = "button";
    dot.setAttribute("aria-label", `Ir para o vídeo ${i + 1}`);
    dot.addEventListener("click", () => goTo(i));
    dots.push(dot);
    dotsWrap.append(dot);
  });

  function render() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle("mse-videoteca__dot--active", i === index));
  }

  function goTo(nextIndex) {
    index = (nextIndex + featured.length) % featured.length;
    render();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function start() {
    if (reducedMotion || featured.length < 2) return;
    stop();
    timer = setInterval(() => goTo(index + 1), CAROUSEL_INTERVAL_MS);
  }

  const prev = element(document, "button", "mse-videoteca__nav mse-videoteca__nav--prev", "‹");
  prev.type = "button";
  prev.setAttribute("aria-label", "Vídeo anterior");
  prev.addEventListener("click", () => goTo(index - 1));

  const next = element(document, "button", "mse-videoteca__nav mse-videoteca__nav--next", "›");
  next.type = "button";
  next.setAttribute("aria-label", "Próximo vídeo");
  next.addEventListener("click", () => goTo(index + 1));

  section.addEventListener("mouseenter", stop);
  section.addEventListener("mouseleave", start);
  section.addEventListener("focusin", stop);
  section.addEventListener("focusout", start);

  section.append(track, prev, next, dotsWrap);
  render();
  start();

  return { element: section, dispose: stop };
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
