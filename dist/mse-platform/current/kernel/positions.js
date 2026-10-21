/**
 * Funções puras de Posições do Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
 * seção 4, `kernel/positions.js`: "módulos por posição/vigência/atribuição ao menu";
 * seção 5: "Módulos, posições, atribuição por menu" → `positions.js` + `MSEModules*`).
 *
 * Nenhuma função aqui faz REST, toca rede ou DOM: todas recebem arrays de itens
 * já carregados em memória (o shape de campos é o de `MSE_MODULES_SCHEMA` /
 * `MSE_MODULES_MENU_SCHEMA`, ver `kernel/schemas/mse-modules.js`) e devolvem
 * dados derivados. Este módulo é intencionalmente autossuficiente — sem
 * importar `menu.js`, `extension-registry.js` ou `content-services.js` —,
 * seguindo o mesmo princípio de `kernel/menu.js` ("não é importado aqui para
 * manter este módulo sem dependências"): quem chama já resolveu o item de
 * menu ativo (`kernel/menu.js`, campo `Id`) e passa apenas o `Id` relevante.
 *
 * Opera sobre o shape cru de item de lista SharePoint (PascalCase), mesma
 * "altura de abstração" de `kernel/menu.js`/`kernel/extension-registry.js`
 * (ver seção 4.1 do plano) — não o shape normalizado em português/camelCase
 * de `kernel/content-services.js`.
 *
 * Fase 4 da normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`):
 * este módulo passou a ler os campos em inglês de `MSEModules`/
 * `MSEModulesMenu` (listas novas desde a Fase 3) em vez dos campos PT de
 * `MSEModulos`/`MSEModulosMenu` (listas antigas, ainda vivas em produção,
 * mas não mais lidas por nenhum código consumidor).
 *
 * Shape esperado de cada item de `modulos` (um registro da lista MSEModules
 * já lido do SharePoint):
 *   {
 *     Id: number,              // id nativo do item na lista; necessário para
 *                               // casar com `ModuleId` em `modulosMenu`
 *     Title: string,
 *     Module: string,
 *     Position: string,        // kebab-case, mesma convenção de kernel/layout.js
 *     Ordering: number,
 *     Published: "Published" | "Unpublished" | "Trashed",
 *     PublishUp: string | Date | null | undefined,   // vigência; sem limite = sem restrição
 *     PublishDown: string | Date | null | undefined,
 *     ShowTitle: boolean,
 *     Style: string | null | undefined,
 *     MenuAssignment: "All" | "None" | "Only" | "AllExcept",
 *     ParamsJson: string | null | undefined,
 *     SchemaVersion: number | null | undefined
 *   }
 *
 * Shape esperado de cada item de `modulosMenu` (um registro da lista
 * MSEModulesMenu, junção N:N entre MSEModules e MSEMenu):
 *   {
 *     Id: number,
 *     ModuleId: number,        // referencia o `Id` de um item de `modulos`
 *     MenuId: number           // referencia o `Id` de um item de menu
 *                               // (`kernel/menu.js`, mesmo campo `Id`)
 *   }
 *
 * Relevante apenas para módulos com `MenuAssignment` igual a "Only" ou
 * "AllExcept"; para "All"/"None" nenhum par de `modulosMenu` é consultado.
 */

const PUBLISHED = "Published";

function toArray(items) {
  return Array.isArray(items) ? items : [];
}

/**
 * Resolve um valor "agora" para um `Date` válido. Aceita `Date`, string/number
 * parseável, ou nada (usa o relógio atual). Um valor inválido também cai no
 * relógio atual, em vez de propagar uma data inválida para as comparações.
 * Mesmo comportamento de `resolveNow` em `kernel/content-services.js`,
 * replicado aqui para manter este módulo sem dependências (ver cabeçalho).
 */
function resolveNow(agora) {
  if (agora == null) return new Date();
  const date = agora instanceof Date ? agora : new Date(agora);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Converte um valor de data opcional em `Date`, ou `null` se ausente/inválido.
 * Um limite de janela inválido é tratado como ausente (sem restrição naquele
 * lado), em vez de excluir indevidamente o módulo. Mesmo comportamento de
 * `parseDateOrNull` em `kernel/content-services.js`.
 */
function parseDateOrNull(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Verifica se `now` está dentro da janela [`deValue`, `ateValue`], tratando
 * cada lado ausente/inválido como "sem restrição" naquele lado. Mesmo
 * algoritmo de `isWithinWindow` em `kernel/content-services.js`.
 */
function isWithinWindow(now, deValue, ateValue) {
  const de = parseDateOrNull(deValue);
  const ate = parseDateOrNull(ateValue);
  if (de && now.getTime() < de.getTime()) return false;
  if (ate && now.getTime() > ate.getTime()) return false;
  return true;
}

function isPublished(modulo) {
  return modulo?.Published === PUBLISHED;
}

/**
 * Retorna o conjunto de `MenuId` associados a `moduloId` em `modulosMenu`
 * (já tolerante a `modulosMenu` ausente/vazio via `toArray` no chamador).
 *
 * @param {Array<object>} modulosMenu
 * @param {number} moduloId
 * @returns {Set<number>}
 */
function menuIdsForModulo(modulosMenu, moduloId) {
  const ids = new Set();
  for (const par of modulosMenu) {
    if (par && par.ModuleId === moduloId) ids.add(par.MenuId);
  }
  return ids;
}

/**
 * Decide se `modulo` deve aparecer no item de menu `menuItemId`, de acordo
 * com `modulo.MenuAssignment`:
 * - `"All"` → aparece em qualquer item de menu (inclusive sem item ativo).
 * - `"None"` → nunca aparece atribuído a um item de menu.
 * - `"Only"` → aparece só quando `menuItemId` está entre os `MenuId`
 *   listados em `modulosMenu` para este módulo; sem `menuItemId` (null/
 *   undefined), nunca combina (não há item para ser "o único").
 * - `"AllExcept"` → aparece em qualquer item de menu, exceto quando
 *   `menuItemId` está entre os `MenuId` listados em `modulosMenu` para este
 *   módulo; sem `menuItemId`, não há exclusão a aplicar, então aparece.
 * - Qualquer outro valor (dado malformado vindo do SharePoint) é tratado de
 *   forma conservadora: não aparece, em vez de lançar — este módulo nunca
 *   lança por causa de dado de conteúdo, só por parâmetro obrigatório
 *   realmente inválido (ver JSDoc das funções exportadas).
 *
 * @param {object} modulo
 * @param {number | string | null | undefined} menuItemId
 * @param {Array<object>} modulosMenu Já normalizado via `toArray` pelo chamador.
 * @returns {boolean}
 */
function matchesMenuAssignment(modulo, menuItemId, modulosMenu) {
  const atribuicao = modulo?.MenuAssignment;
  const temMenuItemId = menuItemId !== null && menuItemId !== undefined;

  switch (atribuicao) {
    case "All":
      return true;
    case "None":
      return false;
    case "Only": {
      if (!temMenuItemId) return false;
      const ids = menuIdsForModulo(modulosMenu, modulo.Id);
      return ids.has(menuItemId);
    }
    case "AllExcept": {
      if (!temMenuItemId) return true;
      const ids = menuIdsForModulo(modulosMenu, modulo.Id);
      return !ids.has(menuItemId);
    }
    default:
      return false;
  }
}

/**
 * Valida o parâmetro obrigatório `posicao`: deve ser uma string não vazia
 * (mesmo padrão de falha alta e clara de `kernel/menu.js`/`kernel/layout.js`
 * para parâmetros obrigatórios realmente malformados — nunca devolve
 * `undefined` silenciosamente nesse caso).
 *
 * @param {*} posicao
 */
function assertValidPosicao(posicao) {
  if (typeof posicao !== "string" || posicao.trim() === "") {
    throw new TypeError("posicao é obrigatória e deve ser uma string não vazia.");
  }
}

/**
 * Ordena estavelmente por `Ordering` ascendente: itens sem `Ordering`
 * numérico vão para o final, preservando a ordem relativa de entrada entre
 * si (e entre empates de mesma `Ordering`). Mesma técnica de decoração por
 * índice original usada por `sortPlugins` em `kernel/extension-registry.js`,
 * para garantir estabilidade independente do motor de `Array#sort` do
 * runtime.
 *
 * @param {Array<object>} modulos
 * @returns {Array<object>}
 */
function sortByOrdemEstavel(modulos) {
  const decorated = modulos.map((item, index) => ({ item, index }));
  decorated.sort((a, b) => {
    const aTem = typeof a.item.Ordering === "number";
    const bTem = typeof b.item.Ordering === "number";
    if (aTem && bTem) {
      if (a.item.Ordering !== b.item.Ordering) return a.item.Ordering - b.item.Ordering;
      return a.index - b.index;
    }
    if (aTem && !bTem) return -1;
    if (!aTem && bTem) return 1;
    return a.index - b.index;
  });
  return decorated.map((entry) => entry.item);
}

/**
 * Resolve, dentre `modulos`, quais aparecem na posição `posicao`, em que
 * ordem, para o item de menu ativo `menuItemId`, no instante `agora`.
 *
 * Critérios aplicados (um módulo precisa satisfazer todos):
 * 1. `Position === posicao` (comparação exata).
 * 2. `Published === "Published"` (despublicado e lixeira são excluídos).
 * 3. Dentro da janela de vigência `PublishUp`/`PublishDown` (lado ausente
 *    ou inválido = sem restrição naquele lado — mesmo padrão de
 *    `isWithinWindow` em `kernel/content-services.js`).
 * 4. Atribuição ao item de menu ativo, conforme `MenuAssignment` (ver
 *    `matchesMenuAssignment` para a semântica completa de
 *    "All"/"None"/"Only"/"AllExcept").
 *
 * O resultado é ordenado por `Ordering` ascendente, de forma estável, com
 * itens sem `Ordering` numérica ao final (ver `sortByOrdemEstavel`).
 *
 * `modulos`/`modulosMenu` ausentes/`undefined`/não-array são tratados como
 * lista vazia (nunca lançam); `posicao` ausente ou que não seja uma string
 * não vazia lança `TypeError` (parâmetro obrigatório malformado).
 *
 * @param {Array<object> | null | undefined} modulos
 * @param {{
 *   posicao: string,
 *   menuItemId?: number | string | null,
 *   modulosMenu?: Array<object> | null | undefined,
 *   agora?: Date | string | number
 * }} options
 * @returns {Array<object>}
 */
export function resolveModulesForPosition(modulos, options = {}) {
  const { posicao, menuItemId = null, modulosMenu, agora } = options ?? {};
  assertValidPosicao(posicao);

  const now = resolveNow(agora);
  const pares = toArray(modulosMenu);

  const candidatos = toArray(modulos).filter((modulo) => {
    if (!modulo || modulo.Position !== posicao) return false;
    if (!isPublished(modulo)) return false;
    if (!isWithinWindow(now, modulo.PublishUp, modulo.PublishDown)) return false;
    return matchesMenuAssignment(modulo, menuItemId, pares);
  });

  return sortByOrdemEstavel(candidatos);
}

/**
 * Conveniência sobre `resolveModulesForPosition`: agrupa, de uma vez, o
 * resultado para TODAS as posições presentes em `modulos` (valores distintos
 * e não vazios de `Position`, na ordem em que aparecem pela primeira vez em
 * `modulos`), cada uma já filtrada/ordenada do mesmo jeito.
 *
 * `modulos`/`modulosMenu` ausentes/`undefined`/não-array são tratados como
 * lista vazia (devolve `{}` nesse caso, sem lançar).
 *
 * @param {Array<object> | null | undefined} modulos
 * @param {{
 *   modulosMenu?: Array<object> | null | undefined,
 *   menuItemId?: number | string | null,
 *   agora?: Date | string | number
 * }} [options]
 * @returns {Record<string, Array<object>>}
 */
export function groupModulesByPosition(modulos, options = {}) {
  const { modulosMenu, menuItemId = null, agora } = options ?? {};
  const lista = toArray(modulos);

  const posicoes = [];
  const vistas = new Set();
  for (const modulo of lista) {
    const posicao = modulo?.Position;
    if (typeof posicao === "string" && posicao.trim() !== "" && !vistas.has(posicao)) {
      vistas.add(posicao);
      posicoes.push(posicao);
    }
  }

  const resultado = {};
  for (const posicao of posicoes) {
    resultado[posicao] = resolveModulesForPosition(lista, { posicao, menuItemId, modulosMenu, agora });
  }
  return resultado;
}
