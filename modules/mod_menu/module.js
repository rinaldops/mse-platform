import { buildMenuTree, findActiveMenuItem } from "../../kernel/menu.js";
import { createMenuReadService } from "./menu-data.js";
import { createMenuView } from "./menu-view.js";

function readMenuService(services) {
  const client = services?.adminClient;
  const list = services?.listIds?.MSEMenu;
  if (!client || !list) {
    throw new TypeError("services.adminClient e services.listIds.MSEMenu são obrigatórios para o módulo de Menu.");
  }
  return createMenuReadService({ client, list });
}

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-menu__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, context = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readMenuService(services);

  let disposed = false;
  let disposeView = null;

  try {
    const items = await service.listMenuItems();
    if (disposed) return Object.freeze({ dispose() {} });
    const tree = buildMenuTree(items);
    const activeItem = findActiveMenuItem(items, context.route);
    disposeView = createMenuView({ root, tree, activeItem });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar o menu."));
  }

  return Object.freeze({
    dispose() {
      disposed = true;
      disposeView?.();
      root.replaceChildren();
    }
  });
}

export function dispose() {}
