import { setDisclosure } from "../../../core/accessibility.js";

function assertRoot(root) {
  if (!root || typeof root.replaceChildren !== "function") {
    throw new TypeError("root deve ser um elemento do DOM.");
  }
}

function appendContent(document, panel, content) {
  if (content && typeof content === "object" && typeof content.nodeType === "number") panel.append(content);
  else panel.textContent = String(content ?? "");
}

export function mountAccordion({
  root,
  items,
  exclusive = true,
  initiallyOpen = 0,
  className = "mse-ui-accordion",
  itemClass = "mse-ui-accordion__item",
  buttonClass = "mse-ui-accordion__button",
  panelClass = "mse-ui-accordion__panel",
  renderTitle,
  renderContent
} = {}) {
  assertRoot(root);
  if (!Array.isArray(items)) throw new TypeError("items deve ser uma lista.");
  const document = root.ownerDocument;
  if (!document?.createElement) throw new TypeError("root deve pertencer a um documento.");

  const entries = [];
  root.replaceChildren();
  root.classList.add(...className.split(/\s+/).filter(Boolean));

  function toggle(entry, open) {
    if (exclusive && open) {
      entries.filter((other) => other !== entry).forEach((other) => toggle(other, false));
    }
    entry.open = Boolean(open);
    setDisclosure(entry.button, entry.panel, entry.open);
    entry.item.classList.toggle(`${itemClass}--open`, entry.open);
  }

  items.forEach((item, index) => {
    if (!item || (!renderTitle && typeof item.title !== "string")) {
      throw new TypeError("Cada item precisa de title ou renderTitle.");
    }
    const itemRoot = document.createElement("section");
    itemRoot.className = itemClass;
    const button = document.createElement("button");
    button.type = "button";
    button.className = buttonClass;
    const title = renderTitle?.(item, index, document);
    if (title && typeof title === "object" && typeof title.nodeType === "number") button.append(title);
    else if (Array.isArray(title)) button.append(...title);
    else button.textContent = title === undefined ? item.title : String(title);
    const panel = document.createElement("div");
    panel.className = panelClass;
    const content = renderContent?.(item, index, document) ?? item.content;
    appendContent(document, panel, content);
    const entry = { item: itemRoot, button, panel, open: false };
    button.addEventListener("click", () => toggle(entry, !entry.open));
    itemRoot.append(button, panel);
    root.append(itemRoot);
    entries.push(entry);
  });

  if (entries[initiallyOpen]) toggle(entries[initiallyOpen], true);

  return {
    open(index) {
      if (!entries[index]) return false;
      toggle(entries[index], true);
      return true;
    },
    close(index) {
      if (!entries[index]) return false;
      toggle(entries[index], false);
      return true;
    },
    destroy() {
      entries.length = 0;
      root.classList.remove(...className.split(/\s+/).filter(Boolean));
      root.replaceChildren();
    }
  };
}
