/**
 * Serviço de leitura de MSEMenu para o módulo de posição `mod_breadcrumbs`.
 *
 * Mesmo contrato de serviços de `modules/mod_menu/menu-data.js`
 * (`services.adminClient` + `services.listIds.MSEMenu`, ver aquele arquivo
 * para a justificativa completa) — padrão a seguir por qualquer módulo de
 * posição que precise ler listas administrativas do kernel.
 */

import { listAdminItems } from "../../kernel/admin-data.js";

// Campos mínimos consumidos por findActiveMenuItem/buildPathway
// (kernel/menu.js): Id/Title/Alias/ParentId/Ordering/Published/Default.
const MENU_FIELDS = ["Id", "Title", "Alias", "ParentId", "Ordering", "Published", "Default"];

/**
 * @param {{ client: { getListItems: Function }, list: {listId: string} }} options
 * @returns {{ listMenuItems: () => Promise<object[]> }}
 */
export function createBreadcrumbsReadService({ client, list } = {}) {
  if (!client || typeof client.getListItems !== "function") {
    throw new TypeError("client deve expor getListItems().");
  }
  if (!list || typeof list !== "object") {
    throw new TypeError("list deve ser o identificador resolvido de MSEMenu ({ listId }).");
  }

  async function listMenuItems() {
    return listAdminItems({ client, list, select: MENU_FIELDS, orderby: "Ordering asc" });
  }

  return Object.freeze({ listMenuItems });
}
