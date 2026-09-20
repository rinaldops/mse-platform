const MAX_LINK_DISTANCE = 170;
const NODE_DENSITY_WIDE = 30;
const NODE_DENSITY_NARROW = 17;
const PULSE_SPAWN_RATE = 0.02;
const PULSE_SPEED = 0.014;

const FLOATER_TERMS = Object.freeze([
  { term: "RPA", left: 64, top: 12 },
  { term: "Datasphere", left: 86, top: 20 },
  { term: "M365", left: 58, top: 33 },
  { term: "APIs", left: 66, top: 46 },
  { term: "Machine Learning", left: 78, top: 59 },
  { term: "Power BI", left: 87, top: 74 },
  { term: "KNIME", left: 60, top: 70 },
  { term: "Azure", left: 92, top: 44 },
  { term: "Copilot", left: 70, top: 83 },
  { term: "SharePoint", left: 80, top: 10 }
]);

export const DEFAULT_STATS = Object.freeze([
  { value: "17", label: "ENCONTROS REALIZADOS" },
  { value: "1×/mês", label: "ENCONTRO AO VIVO" },
  { value: "—", label: "APRESENTAÇÕES REALIZADAS" },
  { value: "—", label: "MENSAGENS NO FÓRUM" }
]);

export const DEFAULT_CONTENT = Object.freeze({
  eyebrow: "Digital workspace",
  title: "Tecnologia que conecta. Pessoas que transformam.",
  highlights: Object.freeze({
    primary: Object.freeze({ text: "conecta", colorRole: "accentPrimary", customColor: "#FDC82F" }),
    secondary: Object.freeze({ text: "transformam", colorRole: "accentSecondary", customColor: "#ED8B00" })
  }),
  description: "A shared space for useful content, discussions and learning.",
  primaryAction: Object.freeze({ label: "Open discussions", href: "#discussions" }),
  secondaryAction: Object.freeze({ label: "Browse videos", href: "#videos" })
});

const HIGHLIGHT_ROLES = Object.freeze({
  accentPrimary: "mse-home__accent--primary",
  accentSecondary: "mse-home__accent--secondary",
  custom: "mse-home__accent--custom"
});

export function highlightedTitleParts(title, highlights = {}) {
  const source = String(title ?? "");
  const occupied = [];
  const matches = [highlights.primary, highlights.secondary].flatMap((highlight) => {
    const text = String(highlight?.text ?? "").trim();
    if (!text) return [];
    const start = source.toLocaleLowerCase("pt-BR").indexOf(text.toLocaleLowerCase("pt-BR"));
    const end = start + text.length;
    if (start < 0 || occupied.some((range) => start < range.end && end > range.start)) return [];
    occupied.push({ start, end });
    const colorRole = HIGHLIGHT_ROLES[highlight?.colorRole] ? highlight.colorRole : "accentPrimary";
    const customColor = /^#[0-9a-f]{6}$/i.test(highlight?.customColor ?? "") ? highlight.customColor : "";
    return [{ start, end, colorRole, customColor }];
  }).sort((left, right) => left.start - right.start);

  const parts = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) parts.push({ text: source.slice(cursor, match.start) });
    parts.push({ ...match, text: source.slice(match.start, match.end) });
    cursor = match.end;
  }
  if (cursor < source.length || !parts.length) parts.push({ text: source.slice(cursor) });
  return parts;
}

function renderHighlightedTitle(document, title, highlights) {
  const heading = element(document, "h1", "mse-home__title");
  for (const part of highlightedTitleParts(title, highlights)) {
    if (!part.colorRole) {
      heading.append(document.createTextNode(part.text));
      continue;
    }
    const accent = element(document, "span", `mse-home__accent ${HIGHLIGHT_ROLES[part.colorRole]}`, part.text);
    if (part.colorRole === "custom" && part.customColor) accent.style.color = part.customColor;
    heading.append(accent);
  }
  return heading;
}

export function normalizeStats(stats) {
  if (!Array.isArray(stats) || !stats.length) return DEFAULT_STATS;
  const normalized = stats
    .filter((stat) => stat && typeof stat.value === "string" && typeof stat.label === "string")
    .slice(0, 8);
  return normalized.length ? Object.freeze(normalized) : DEFAULT_STATS;
}

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderStats(document, stats) {
  const wrap = element(document, "div", "mse-home__stats");
  for (const stat of stats) {
    const item = element(document, "div", "mse-home__stat");
    item.append(
      element(document, "b", null, stat.value),
      element(document, "span", null, stat.label)
    );
    wrap.append(item);
  }
  return wrap;
}

const SVG_NS = "http://www.w3.org/2000/svg";

// Two thin accent strokes crossing the hero for balance/movement — each a single
// "hill" (rise, plateau, fall; plateau ~2x the length of each end segment), but the
// two hills use different slopes/plateau tilts so they actually cross rather than
// running parallel. Every interior angle stays strictly between 90° and 180° (no
// zigzag: each line only changes vertical direction once), and every fold is an
// actual drawn arc (a short Q curve replacing the vertex), never a sharp/pointed
// corner. Not a reproduction of the EGP mark. One line uses the same amarelo as the
// heading accent.
function renderLines(document) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "mse-home__lines");
  svg.setAttribute("viewBox", "0 0 1000 400");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const lineA = document.createElementNS(SVG_NS, "path");
  lineA.setAttribute("d", "M 420 400 L 587 82 Q 600 58 630 62 L 840 86 Q 870 90 892 108 L 1000 202");
  lineA.setAttribute("fill", "none");
  lineA.setAttribute("stroke", "var(--home-amarelo)");
  lineA.setAttribute("stroke-width", "2");
  lineA.setAttribute("stroke-linecap", "round");
  lineA.setAttribute("stroke-linejoin", "round");
  lineA.setAttribute("opacity", "0.9");

  const lineB = document.createElementNS(SVG_NS, "path");
  lineB.setAttribute("d", "M 414 454 L 670 187 Q 690 166 718 156 L 892 95 Q 920 85 939 106 L 1000 175");
  lineB.setAttribute("fill", "none");
  lineB.setAttribute("stroke", "var(--home-laranja)");
  lineB.setAttribute("stroke-width", "1.5");
  lineB.setAttribute("stroke-linecap", "round");
  lineB.setAttribute("stroke-linejoin", "round");
  lineB.setAttribute("opacity", "0.7");

  svg.append(lineA, lineB);
  return svg;
}

function renderFloaters(document) {
  const host = element(document, "div", "mse-home__floaters");
  host.setAttribute("aria-hidden", "true");
  FLOATER_TERMS.forEach((spot, index) => {
    const span = element(document, "span", "mse-home__floater", spot.term);
    span.style.left = `${spot.left}%`;
    span.style.top = `${spot.top}%`;
    span.style.animationDelay = `${index * 1.3}s`;
    host.append(span);
  });
  return host;
}

function drawGraph(ctx, nodes, maxDistance) {
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (distance < maxDistance) {
        ctx.strokeStyle = `rgba(255,255,255,${0.16 * (1 - distance / maxDistance)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }
  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
  }
}

function initConstellation(canvas, { reducedMotion, windowImpl }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let width = 0;
  let height = 0;
  let nodes = [];
  let pulses = [];
  let frameId = null;
  let disposed = false;

  function resize() {
    const dpr = Math.min(windowImpl.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement;
    width = parent ? parent.offsetWidth : canvas.clientWidth || 1;
    height = parent ? parent.offsetHeight : canvas.clientHeight || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeNodes() {
    const density = width < 640 ? NODE_DENSITY_NARROW : NODE_DENSITY_WIDE;
    nodes = Array.from({ length: density }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18
    }));
    pulses = [];
  }

  function spawnPulse() {
    if (nodes.length < 2) return;
    const a = nodes[Math.floor(Math.random() * nodes.length)];
    let best = null;
    let bestDistance = MAX_LINK_DISTANCE + 90;
    for (const b of nodes) {
      if (b === a) continue;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = b;
      }
    }
    if (best) {
      pulses.push({ a, b: best, t: 0, color: Math.random() > 0.5 ? "#3DDAFF" : "#FDC82F" });
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    drawGraph(ctx, nodes, MAX_LINK_DISTANCE);
  }

  function step() {
    if (disposed) return;
    ctx.clearRect(0, 0, width, height);
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
    }
    drawGraph(ctx, nodes, MAX_LINK_DISTANCE);

    pulses = pulses.filter((pulse) => pulse.t <= 1);
    for (const pulse of pulses) {
      pulse.t += PULSE_SPEED;
      const x = pulse.a.x + (pulse.b.x - pulse.a.x) * pulse.t;
      const y = pulse.a.y + (pulse.b.y - pulse.a.y) * pulse.t;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = pulse.color;
      ctx.fill();
    }
    if (Math.random() < PULSE_SPAWN_RATE) spawnPulse();
    frameId = windowImpl.requestAnimationFrame(step);
  }

  function handleResize() {
    resize();
    makeNodes();
    if (reducedMotion) drawStatic();
  }

  resize();
  makeNodes();
  windowImpl.addEventListener?.("resize", handleResize);

  if (reducedMotion) {
    drawStatic();
  } else {
    frameId = windowImpl.requestAnimationFrame(step);
  }

  return () => {
    disposed = true;
    if (frameId !== null) windowImpl.cancelAnimationFrame?.(frameId);
    windowImpl.removeEventListener?.("resize", handleResize);
  };
}

export function createHomeView({ root, stats, content = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");

  const document = root.ownerDocument;
  const windowImpl = document.defaultView || globalThis;
  const reducedMotion = windowImpl.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const normalizedStats = normalizeStats(stats);
  const copy = {
    ...DEFAULT_CONTENT,
    ...content,
    highlights: {
      primary: { ...DEFAULT_CONTENT.highlights.primary, ...content.highlights?.primary },
      secondary: { ...DEFAULT_CONTENT.highlights.secondary, ...content.highlights?.secondary }
    },
    primaryAction: { ...DEFAULT_CONTENT.primaryAction, ...content.primaryAction },
    secondaryAction: { ...DEFAULT_CONTENT.secondaryAction, ...content.secondaryAction }
  };

  const shell = element(document, "section", "mse-home");

  const canvas = document.createElement("canvas");
  canvas.className = "mse-home__constellation";
  canvas.setAttribute("aria-hidden", "true");
  shell.append(canvas);
  shell.append(renderLines(document));

  if (!reducedMotion) shell.append(renderFloaters(document));

  const inner = element(document, "div", "mse-home__inner");
  const eyebrow = element(document, "span", "mse-home__eyebrow", copy.eyebrow);
  inner.append(eyebrow);

  const heading = renderHighlightedTitle(document, copy.title, copy.highlights);
  inner.append(heading);

  inner.append(element(
    document,
    "p",
    "mse-home__sub",
    copy.description
  ));

  const actions = element(document, "div", "mse-home__actions");
  const forumLink = element(document, "a", "mse-home__button mse-home__button--primary", copy.primaryAction.label);
  forumLink.href = copy.primaryAction.href;
  const videotecaLink = element(document, "a", "mse-home__button mse-home__button--ghost", copy.secondaryAction.label);
  videotecaLink.href = copy.secondaryAction.href;
  actions.append(forumLink, videotecaLink);
  inner.append(actions);

  shell.append(inner);
  // Stats sit outside .mse-home__inner (and outside its z-index:2 stacking
  // context) on purpose: unlike the title, it's fine — desired, even — for
  // the accent lines to visually cross the white rule and the numbers, as a
  // cue that they're a separate depth layer. Being a direct shell child also
  // lets this row size to the hero's own width instead of the title column's
  // narrower, line-safe max-width.
  shell.append(renderStats(document, normalizedStats));
  root.replaceChildren(shell);

  const disposeConstellation = initConstellation(canvas, { reducedMotion, windowImpl });

  return () => {
    disposeConstellation?.();
  };
}
