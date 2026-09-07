function assertElement(value, label) {
  if (!value || typeof value.addEventListener !== "function") {
    throw new TypeError(`${label} deve ser um elemento do DOM.`);
  }
}

function normalizeHash(value) {
  const hash = String(value || "");
  return hash.startsWith("#") ? hash : `#${hash}`;
}

export function getHashRoute(location = globalThis.location) {
  return decodeURIComponent(String(location?.hash || "").replace(/^#/, ""));
}

export function createHashRouter({
  window = globalThis,
  onRoute,
  initial = true,
  scroll = true
} = {}) {
  if (typeof onRoute !== "function") throw new TypeError("onRoute deve ser uma função.");
  if (!window?.addEventListener) throw new TypeError("window deve suportar eventos.");

  const dispatch = () => {
    const route = getHashRoute(window.location);
    onRoute(route);
    if (scroll && route) {
      const target = window.document?.getElementById?.(route);
      target?.scrollIntoView?.({ behavior: prefersReducedMotion(window) ? "auto" : "smooth" });
    }
  };

  window.addEventListener("hashchange", dispatch);
  if (initial) dispatch();
  return () => window.removeEventListener("hashchange", dispatch);
}

function prefersReducedMotion(window) {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

export function navigateTo(route, {
  window = globalThis,
  replace = false,
  scroll = true
} = {}) {
  if (!window?.location) throw new TypeError("window deve possuir location.");
  const hash = normalizeHash(route);
  if (replace && typeof window.location.replace === "function") window.location.replace(hash);
  else window.location.hash = hash;
  if (scroll) window.document?.getElementById?.(hash.slice(1))?.scrollIntoView?.({
    behavior: prefersReducedMotion(window) ? "auto" : "smooth"
  });
  return hash;
}

export function createBreadcrumb({ root, items, document = root?.ownerDocument } = {}) {
  assertElement(root, "root");
  if (!Array.isArray(items) || items.length === 0) throw new TypeError("items deve ser uma lista não vazia.");
  if (!document?.createElement) throw new TypeError("document deve criar elementos.");

  root.replaceChildren();
  root.setAttribute("aria-label", "Breadcrumb");
  const list = document.createElement("ol");
  list.className = "mse-breadcrumb__list";

  items.forEach((item, index) => {
    if (!item || typeof item.label !== "string" || item.label.trim() === "") {
      throw new TypeError("Cada item do breadcrumb precisa de um label.");
    }
    const listItem = document.createElement("li");
    listItem.className = "mse-breadcrumb__item";
    const isCurrent = index === items.length - 1 || !item.href;
    if (isCurrent) {
      const current = document.createElement("span");
      current.textContent = item.label;
      current.setAttribute("aria-current", "page");
      listItem.append(current);
    } else {
      const link = document.createElement("a");
      link.href = item.href;
      link.textContent = item.label;
      listItem.append(link);
    }
    list.append(listItem);
  });

  root.append(list);
  return root;
}
