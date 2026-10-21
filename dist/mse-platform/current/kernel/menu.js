/**
 * Funções puras do Menu do Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
 * seção 4, `kernel/menu.js`; seção 6).
 *
 * Nenhuma função aqui faz REST ou toca rede: todas recebem um array de itens
 * já carregado em memória (o shape de campos é o de `MSE_MENU_SCHEMA`, ver
 * `kernel/schemas/mse-menu.js`), e devolvem dados derivados.
 *
 * Fase 4 da normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`):
 * este módulo passou a ler os campos em inglês de `MSEMenu` (já presentes na
 * mesma lista desde a Fase 3, gravados in-place junto aos campos PT antigos)
 * em vez dos campos PT (`TipoMenu`/`Caminho`/`Nivel`/`Ordem`/`Componente`/
 * `Visao`/`Padrao`/`AbrirEm`/`Estado`), que continuam vivos na lista mas não
 * são mais lidos por nenhum código consumidor.
 *
 * Shape esperado de cada item de `items` (um registro da lista MSEMenu já
 * lido do SharePoint e normalizado pelo chamador):
 *   {
 *     Id: number,            // id do item na lista (não faz parte do
 *                             // esquema declarado — é o ID nativo do
 *                             // SharePoint; necessário para resolver ParentId)
 *     Title: string,
 *     Alias: string,
 *     MenuType: string,
 *     ParentId: number | null | undefined,  // ausente/0 = raiz
 *     Path: string | null,
 *     Level: number,
 *     Ordering: number,
 *     Component: string | null,
 *     View: string | null,
 *     ParamsJson: string | null,
 *     Default: boolean,
 *     Target: "SameTab" | "NewTab",
 *     Published: "Published" | "Unpublished" | "Trashed"
 *   }
 *
 * Shape esperado do objeto `route` (produzido pelo router do kernel,
 * `kernel/router.js`, hash SEF `#/<alias>[/<id>-<slug>][?k=v]` — não é
 * importado aqui para manter este módulo sem dependências):
 *   {
 *     alias: string,          // alias do item de menu da rota ("" na raiz)
 *     id: number | null,      // id do conteúdo (ex.: artigo), se houver
 *     slug: string | null,
 *     params: Record<string, string>
 *   }
 */

const PUBLISHED = "Published";

function isRootParent(parentId) {
  return parentId === null || parentId === undefined || parentId === 0;
}

function isPublished(item) {
  return item?.Published === PUBLISHED;
}

/**
 * Monta a árvore hierárquica dos itens de menu publicados, a partir de
 * ParentId. Cada nível é ordenado por Ordering (crescente). Itens cujo
 * Published não é "Published" são ignorados — tanto como nós quanto como pais
 * (um filho de um item despublicado também não aparece na árvore, pois seu
 * ParentId não resolve a nenhum nó presente).
 *
 * @param {Array<object>} items
 * @returns {Array<object>} nós raiz, cada um com uma propriedade `children`
 *   (array, possivelmente vazio) contendo os descendentes publicados.
 */
export function buildMenuTree(items) {
  if (!Array.isArray(items)) throw new TypeError("items deve ser um array.");

  const published = items.filter(isPublished);
  const nodesById = new Map();
  for (const item of published) {
    nodesById.set(item.Id, { ...item, children: [] });
  }

  const roots = [];
  for (const node of nodesById.values()) {
    if (isRootParent(node.ParentId) || !nodesById.has(node.ParentId)) {
      roots.push(node);
    } else {
      nodesById.get(node.ParentId).children.push(node);
    }
  }

  const byOrdem = (a, b) => (a.Ordering ?? 0) - (b.Ordering ?? 0);
  const sortTree = (nodes) => {
    nodes.sort(byOrdem);
    for (const node of nodes) sortTree(node.children);
  };
  sortTree(roots);

  return roots;
}

/**
 * Encontra o item de menu ativo para a rota corrente.
 *
 * - Se `route.alias` for um texto não vazio, procura o item publicado cujo
 *   Alias corresponde exatamente.
 * - Se `route.alias` for vazio/ausente (raiz do site), cai no item
 *   publicado com `Default === true` (o item "Início").
 * - Retorna `null` quando nenhum item publicado corresponde.
 *
 * @param {Array<object>} items
 * @param {{ alias?: string }} route
 * @returns {object | null}
 */
export function findActiveMenuItem(items, route) {
  if (!Array.isArray(items)) throw new TypeError("items deve ser um array.");

  const alias = typeof route?.alias === "string" ? route.alias.trim() : "";
  const published = items.filter(isPublished);

  if (alias !== "") {
    return published.find((item) => item.Alias === alias) ?? null;
  }
  return published.find((item) => item.Default === true) ?? null;
}

/**
 * Monta a trilha de navegação (pathway/breadcrumb) do item ativo: sobe por
 * ParentId até a raiz e devolve o caminho ordenado da raiz até o item,
 * cada entrada como `{ title, alias }`.
 *
 * Para um item raiz, devolve um array de 1 elemento (ele mesmo).
 * Devolve `[]` quando `activeItem` é nulo/ausente.
 *
 * @param {Array<object>} items
 * @param {object | null} activeItem
 * @returns {Array<{ title: string, alias: string }>}
 */
export function buildPathway(items, activeItem) {
  if (!Array.isArray(items)) throw new TypeError("items deve ser um array.");
  if (!activeItem) return [];

  const byId = new Map(items.map((item) => [item.Id, item]));
  const trail = [];
  const visited = new Set();

  let current = activeItem;
  while (current && !visited.has(current.Id)) {
    visited.add(current.Id);
    trail.unshift({ title: current.Title, alias: current.Alias });
    if (isRootParent(current.ParentId)) break;
    current = byId.get(current.ParentId) ?? null;
  }

  return trail;
}
