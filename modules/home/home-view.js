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
  { value: "8", label: "ÁREAS DE TECNOLOGIA" },
  { value: "1×/mês", label: "ENCONTRO AO VIVO" },
  { value: "100%", label: "ENCONTROS GRAVADOS" },
  { value: "4", label: "MÓDULOS NO HUB" }
]);

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
        ctx.strokeStyle = `rgba(244,250,248,${0.16 * (1 - distance / maxDistance)})`;
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
    ctx.fillStyle = "rgba(244,250,248,0.55)";
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
      ctx.shadowColor = pulse.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
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

export function createHomeView({ root, stats } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");

  const document = root.ownerDocument;
  const windowImpl = document.defaultView || globalThis;
  const reducedMotion = windowImpl.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const normalizedStats = normalizeStats(stats);

  const shell = element(document, "section", "mse-home");

  const canvas = document.createElement("canvas");
  canvas.className = "mse-home__constellation";
  canvas.setAttribute("aria-hidden", "true");
  shell.append(canvas);

  if (!reducedMotion) shell.append(renderFloaters(document));

  const inner = element(document, "div", "mse-home__inner");
  inner.append(element(document, "span", "mse-home__eyebrow", "Hub de Tecnologias Digitais"));

  const heading = element(document, "h1", "mse-home__title");
  heading.append(
    document.createTextNode("Tecnologia que "),
    element(document, "em", "mse-home__accent", "conecta"),
    document.createTextNode(". Pessoas que "),
    element(document, "em", "mse-home__accent mse-home__accent--warm", "transformam"),
    document.createTextNode(".")
  );
  inner.append(heading);

  inner.append(element(
    document,
    "p",
    "mse-home__sub",
    "Power Platform, SAP, Azure, Microsoft 365, IA e outras ferramentas do ambiente corporativo — reunidas em um só lugar para automatizar processos, resolver problemas do dia a dia e aprender com quem já resolveu."
  ));

  const actions = element(document, "div", "mse-home__actions");
  const forumLink = element(document, "a", "mse-home__button mse-home__button--primary", "Entrar no fórum");
  forumLink.href = "#forum";
  const videotecaLink = element(document, "a", "mse-home__button mse-home__button--ghost", "Ver workshops gravados");
  videotecaLink.href = "#videoteca";
  actions.append(forumLink, videotecaLink);
  inner.append(actions);

  inner.append(renderStats(document, normalizedStats));

  shell.append(inner);
  root.replaceChildren(shell);

  const disposeConstellation = initConstellation(canvas, { reducedMotion, windowImpl });

  return () => {
    disposeConstellation?.();
  };
}
