/**
 * Funções puras de Posições do Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
 * seção 4, `kernel/positions.js`: "módulos por posição/vigência/atribuição ao menu";
 * seção 5: "Módulos, posições, atribuição por menu" → `positions.js` + `MSEModulos*`).
 *
 * Nenhuma função aqui faz REST, toca rede ou DOM: todas recebem arrays de itens
 * já carregados em memória (o shape de campos é o de `MSE_MODULOS_SCHEMA` /
 * `MSE_MODULOS_MENU_SCHEMA`, ver `kernel/schemas/mse-modulos.js`) e devolvem
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
 * Shape esperado de cada item de `modulos` (um registro da lista MSEModulos
 * já lido do SharePoint):
 *   {
 *     Id: number,              // id nativo do item na lista; necessário para
 *                               // casar com `ModuloId` em `modulosMenu`
 *     Title: string,
 *     ModuloTipo: string,
 *     Posicao: string,         // kebab-case, mesma convenção de kernel/layout.js
 *     Ordem: number,
 *     Estado: "Publicado" | "Despublicado" | "Lixeira",
 *     PublicarEm: string | Date | null | undefined,   // vigência; sem limite = sem restrição
 *     PublicarAte: string | Date | null | undefined,
 *     MostrarTitulo: boolean,
 *     Estilo: string | null | undefined,
 *     AtribuicaoMenu: "Todas" | "Nenhuma" | "Somente" | "Todas exceto",
 *     ParamsJson: string | null | undefined,
 *     SchemaVersao: number | null | undefined
 *   }
 *
 * Shape esperado de cada item de `modulosMenu` (um registro da lista
 * MSEModulosMenu, junção N:N entre MSEModulos e MSEMenu):
 *   {
 *     Id: number,
 *     ModuloId: number,        // referencia o `Id` de um item de `modulos`
 *     MenuId: number           // referencia o `Id` de um item de menu
 *                               // (`kernel/menu.js`, mesmo campo `Id`)
 *   }
 *
 * Relevante apenas para módulos com `AtribuicaoMenu` igual a "Somente" ou
 * "Todas exceto"; para "Todas"/"Nenhuma" nenhum par de `modulosMenu` é
 * consultado.
 */

const PUBLISHED = "Publicado";

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
  return modulo?.Estado === PUBLISHED;
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
    if (par && par.ModuloId === moduloId) ids.add(par.MenuId);
  }
  return ids;
}

/**
 * Decide se `modulo` deve aparecer no item de menu `menuItemId`, de acordo
 * com `modulo.AtribuicaoMenu`:
 * - `"Todas"` → aparece em qualquer item de menu (inclusive sem item ativo).
 * - `"Nenhuma"` → nunca aparece atribuído a um item de menu.
 * - `"Somente"` → aparece só quando `menuItemId` está entre os `MenuId`
 *   listados em `modulosMenu` para este módulo; sem `menuItemId` (null/
 *   undefined), nunca combina (não há item para ser "o único").
 * - `"Todas exceto"` → aparece em qualquer item de menu, exceto quando
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
  const atribuicao = modulo?.AtribuicaoMenu;
  const temMenuItemId = menuItemId !== null && menuItemId !== undefined;

  switch (atribuicao) {
    case "Todas":
      return true;
    case "Nenhuma":
      return false;
    case "Somente": {
      if (!temMenuItemId) return false;
      const ids = menuIdsForModulo(modulosMenu, modulo.Id);
      return ids.has(menuItemId);
    }
    case "Todas exceto": {
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
 * Ordena estavelmente por `Ordem` ascendente: itens sem `Ordem` numérico vão
 * para o final, preservando a ordem relativa de entrada entre si (e entre
 * empates de mesma `Ordem`). Mesma técnica de decoração por índice original
 * usada por `sortPlugins` em `kernel/extension-registry.js`, para garantir
 * estabilidade independente do motor de `Array#sort` do runtime.
 *
 * @param {Array<object>} modulos
 * @returns {Array<object>}
 */
function sortByOrdemEstavel(modulos) {
  const decorated = modulos.map((item, index) => ({ item, index }));
  decorated.sort((a, b) => {
    const aTem = typeof a.item.Ordem === "number";
    const bTem = typeof b.item.Ordem === "number";
    if (aTem && bTem) {
      if (a.item.Ordem !== b.item.Ordem) return a.item.Ordem - b.item.Ordem;
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
 * 1. `Posicao === posicao` (comparação exata).
 * 2. `Estado === "Publicado"` (despublicado e lixeira são excluídos).
 * 3. Dentro da janela de vigência `PublicarEm`/`PublicarAte` (lado ausente
 *    ou inválido = sem restrição naquele lado — mesmo padrão de
 *    `isWithinWindow` em `kernel/content-services.js`).
 * 4. Atribuição ao item de menu ativo, conforme `AtribuicaoMenu` (ver
 *    `matchesMenuAssignment` para a semântica completa de
 *    "Todas"/"Nenhuma"/"Somente"/"Todas exceto").
 *
 * O resultado é ordenado por `Ordem` ascendente, de forma estável, com
 * itens sem `Ordem` numérica ao final (ver `sortByOrdemEstavel`).
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
    if (!modulo || modulo.Posicao !== posicao) return false;
    if (!isPublished(modulo)) return false;
    if (!isWithinWindow(now, modulo.PublicarEm, modulo.PublicarAte)) return false;
    return matchesMenuAssignment(modulo, menuItemId, pares);
  });

  return sortByOrdemEstavel(candidatos);
}

/**
 * Conveniência sobre `resolveModulesForPosition`: agrupa, de uma vez, o
 * resultado para TODAS as posições presentes em `modulos` (valores distintos
 * e não vazios de `Posicao`, na ordem em que aparecem pela primeira vez em
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
    const posicao = modulo?.Posicao;
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
