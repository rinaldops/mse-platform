import { buildPathway, findActiveMenuItem } from "../../kernel/menu.js";
import { createBreadcrumbsReadService } from "./breadcrumbs-data.js";
import { createBreadcrumbsView } from "./breadcrumbs-view.js";

function readBreadcrumbsService(services) {
  const client = services?.adminClient;
  const list = services?.listIds?.MSEMenu;
  if (!client || !list) {
    throw new TypeError("services.adminClient e services.listIds.MSEMenu são obrigatórios para o módulo de Trilha de navegação.");
  }
  return createBreadcrumbsReadService({ client, list });
}

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-breadcrumbs__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, context = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readBreadcrumbsService(services);

  let disposed = false;
  let disposeView = null;

  try {
    const items = await service.listMenuItems();
    if (disposed) return Object.freeze({ dispose() {} });
    const activeItem = findActiveMenuItem(items, context.route);
    const pathway = buildPathway(items, activeItem);
    disposeView = createBreadcrumbsView({ root, pathway });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar a trilha de navegação."));
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
