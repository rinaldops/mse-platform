/**
 * Serviço de leitura de MSEMenu para o módulo de posição `mod_menu`.
 *
 * Contrato de serviços adotado por este módulo (e, a partir dele, pelos
 * módulos de Wave 2 que também precisarem ler listas administrativas do
 * kernel a partir de um módulo de posição): `services.adminClient`
 * (cliente REST já pronto, mesmo usado por `components/com_menus`) +
 * `services.listIds.MSEMenu` (`{ listId }` já resolvido) — ambos montados
 * por `host-adapters/modern-script-editor/site-boot.js#buildAdministratorServices`
 * e injetados em `kernel/application.js#createSiteApplication` como
 * `services`. Não se usa `services.dataSources`/
 * `core/data-sources.js#createSharePointDataSourceRegistry` aqui: esse
 * registro é o contrato dos módulos "produto" (`mod_recursos`, `mod_forum`,
 * `mod_videoteca`), carregados como Componentes ou instâncias autônomas,
 * não dos módulos de posição montados por `renderModules`.
 *
 * Nenhuma lógica de árvore/trilha/item ativo mora aqui — este arquivo só
 * busca os registros crus da lista; `kernel/menu.js#buildMenuTree`/
 * `findActiveMenuItem`/`buildPathway` (funções puras já testadas) é quem
 * deriva a árvore/trilha/item ativo a partir desses registros.
 */

import { listAdminItems } from "../../kernel/admin-data.js";

// Campos mínimos consumidos por buildMenuTree/findActiveMenuItem/buildPathway
// (kernel/menu.js): Id/Title/Alias/ParentId/Ordering/Target/Published/Default.
// MenuType/Path/Level/Component/View/ParamsJson não são lidos por nenhuma
// dessas 3 funções puras — omitidos aqui para não buscar campos sem uso.
const MENU_FIELDS = ["Id", "Title", "Alias", "ParentId", "Ordering", "Target", "Published", "Default"];

/**
 * @param {{ client: { getListItems: Function }, list: {listId: string} }} options
 * @returns {{ listMenuItems: () => Promise<object[]> }}
 */
export function createMenuReadService({ client, list } = {}) {
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
