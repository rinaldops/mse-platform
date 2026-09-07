const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function assertElement(value, label) {
  if (!value || typeof value.addEventListener !== "function") {
    throw new TypeError(`${label} deve ser um elemento do DOM.`);
  }
}

function resolveDocument(element) {
  return element?.ownerDocument || globalThis.document;
}

export function prefersReducedMotion({ window = globalThis, mediaQuery = REDUCED_MOTION_QUERY } = {}) {
  return Boolean(window?.matchMedia?.(mediaQuery)?.matches);
}

export function handleEscape(target, callback) {
  assertElement(target, "target");
  if (typeof callback !== "function") throw new TypeError("callback deve ser uma função.");

  const listener = (event) => {
    if (event.key === "Escape") callback(event);
  };
  target.addEventListener("keydown", listener);
  return () => target.removeEventListener("keydown", listener);
}

export function announce(message, { document = globalThis.document, priority = "polite" } = {}) {
  if (!document?.createElement || typeof message !== "string") {
    throw new TypeError("document e message válidos são obrigatórios.");
  }
  if (!new Set(["polite", "assertive", "off"]).has(priority)) {
    throw new TypeError("priority deve ser polite, assertive ou off.");
  }

  const node = document.createElement("div");
  node.className = "mse-sr-only";
  node.setAttribute("aria-live", priority);
  node.setAttribute("aria-atomic", "true");
  node.textContent = message;
  (document.body || document.documentElement)?.append(node);

  return () => node.remove?.();
}

export function setDisclosure(button, panel, open, { manageFocus = false } = {}) {
  assertElement(button, "button");
  assertElement(panel, "panel");
  const isOpen = Boolean(open);
  const panelId = panel.id || `mse-panel-${Math.random().toString(36).slice(2)}`;
  panel.id = panelId;
  button.setAttribute("aria-controls", panelId);
  button.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) panel.removeAttribute("hidden");
  else panel.setAttribute("hidden", "");
  if (manageFocus && isOpen) panel.focus?.();
  return isOpen;
}

export function createFocusTrap(container, { returnFocus = true } = {}) {
  assertElement(container, "container");
  const document = resolveDocument(container);
  const previous = document?.activeElement;
  const selector = [
    "a[href]", "button:not([disabled])", "textarea:not([disabled])",
    "input:not([disabled])", "select:not([disabled])", "[tabindex]:not([tabindex=\"-1\"])"
  ].join(",");

  const focusables = () => [...container.querySelectorAll?.(selector) || []]
    .filter((element) => !element.hasAttribute?.("hidden") && element.offsetParent !== null);

  const listener = (event) => {
    if (event.key !== "Tab") return;
    const items = focusables();
    if (!items.length) {
      event.preventDefault();
      container.focus?.();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener("keydown", listener);
  focusables()[0]?.focus?.();

  return () => {
    container.removeEventListener("keydown", listener);
    if (returnFocus) previous?.focus?.();
  };
}
