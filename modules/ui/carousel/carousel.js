const currentModuleUrl = new URL(import.meta.url);
const publishedVersion = currentModuleUrl.pathname.match(/\/modules\/ui\/([^/]+)\/carousel\//)?.[1];
const accessibilityUrl = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(publishedVersion || "")
  ? new URL(`../../../../core/${publishedVersion}/accessibility.js`, currentModuleUrl)
  : new URL("../../../core/accessibility.js", currentModuleUrl);
const { prefersReducedMotion } = await import(accessibilityUrl.href);

function assertRoot(root) {
  if (!root || typeof root.replaceChildren !== "function") {
    throw new TypeError("root deve ser um elemento do DOM.");
  }
}

export function mountCarousel({
  root,
  items,
  renderItem,
  autoAdvance = 0,
  window = globalThis,
  label = "Carrossel",
  className = "mse-ui-carousel",
  trackClass = "mse-ui-carousel__track",
  slideClass = "mse-ui-carousel__slide",
  controlClass = "mse-ui-carousel__control",
  previousClass = "mse-ui-carousel__control--previous",
  nextClass = "mse-ui-carousel__control--next",
  previousLabel = "Item anterior",
  nextLabel = "Próximo item",
  indicatorClass = null,
  indicatorItemClass,
  indicatorActiveClass,
  reducedMotion
} = {}) {
  assertRoot(root);
  if (!Array.isArray(items)) throw new TypeError("items deve ser uma lista.");
  if (typeof renderItem !== "function") throw new TypeError("renderItem deve ser uma função.");
  const document = root.ownerDocument;
  if (!document?.createElement) throw new TypeError("root deve pertencer a um documento.");

  let index = 0;
  let timer = null;
  const slides = [];
  const track = document.createElement("div");
  track.className = trackClass;
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = `${controlClass} ${previousClass}`;
  previous.textContent = "‹";
  previous.setAttribute("aria-label", previousLabel);
  const next = document.createElement("button");
  next.type = "button";
  next.className = `${controlClass} ${nextClass}`;
  next.textContent = "›";
  next.setAttribute("aria-label", nextLabel);
  const status = document.createElement("span");
  status.className = "mse-sr-only";
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  const indicators = indicatorClass ? document.createElement("div") : null;
  if (indicators) indicators.className = indicatorClass;
  const indicatorNodes = [];

  root.replaceChildren();
  root.classList.add(...className.split(/\s+/).filter(Boolean));
  root.setAttribute("role", "region");
  root.setAttribute("aria-roledescription", "carrossel");
  root.setAttribute("aria-label", label);
  items.forEach((item, itemIndex) => {
    const slide = document.createElement("div");
    slide.className = slideClass;
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${itemIndex + 1} de ${items.length}`);
    slide.append(renderItem(item, itemIndex, document));
    track.append(slide);
    slides.push(slide);
    if (indicators) {
      const indicator = document.createElement("button");
      indicator.type = "button";
      indicator.className = indicatorItemClass || `${indicatorClass}__item`;
      indicator.setAttribute("aria-label", `Ir para o item ${itemIndex + 1}`);
      indicator.addEventListener("click", () => goTo(itemIndex));
      indicators.append(indicator);
      indicatorNodes.push(indicator);
    }
  });

  function render() {
    track.style.transform = `translateX(-${index * 100}%)`;
    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== index;
      slide.setAttribute("aria-hidden", String(slideIndex !== index));
    });
    indicatorNodes.forEach((indicator, indicatorIndex) => {
      indicator.classList.toggle(indicatorActiveClass || `${indicatorClass}--active`, indicatorIndex === index);
    });
    status.textContent = items.length ? `Item ${index + 1} de ${items.length}` : "Carrossel vazio";
  }

  function goTo(nextIndex) {
    if (!items.length) return;
    index = (nextIndex + items.length) % items.length;
    render();
  }

  function stop() {
    if (timer !== null) window.clearInterval?.(timer);
    timer = null;
  }

  function start() {
    stop();
    if (!autoAdvance || items.length < 2 || (reducedMotion ?? prefersReducedMotion({ window }))) return;
    timer = window.setInterval?.(() => goTo(index + 1), autoAdvance) ?? null;
  }

  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
  };

  previous.addEventListener("click", () => goTo(index - 1));
  next.addEventListener("click", () => goTo(index + 1));
  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", start);
  root.append(track, previous, next);
  if (indicators) root.append(indicators);
  root.append(status);
  render();
  start();

  return {
    next: () => goTo(index + 1),
    previous: () => goTo(index - 1),
    stop,
    start,
    destroy() {
      stop();
      root.removeEventListener("keydown", onKeyDown);
      root.replaceChildren();
      root.classList.remove(...className.split(/\s+/).filter(Boolean));
    }
  };
}
