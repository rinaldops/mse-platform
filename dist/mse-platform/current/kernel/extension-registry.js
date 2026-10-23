/**
 * Registro de extensões do Site Kernel (MSEExtensions).
 *
 * Funções puras: recebem e retornam dados em memória (arrays de objetos no
 * shape de item de lista do SharePoint, com os mesmos nomes de campo do
 * esquema em `kernel/schemas/mse-extensions.js`). Nenhuma função aqui faz
 * `fetch`, acessa REST do SharePoint ou tem qualquer outro efeito colateral.
 *
 * Shape esperado de cada item (campos relevantes):
 *   { Title, Type: "Component"|"Module"|"Plugin", Element, Version,
 *     Enabled: boolean, Protected: boolean, Ordering: number|undefined,
 *     ParamsJson: string|undefined }
 *
 * Fase 4 da normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`):
 * este módulo passou a ler os campos em inglês de `MSEExtensions` (lista
 * nova desde a Fase 3) em vez dos campos PT de `MSEExtensoes` (lista antiga,
 * ainda viva em produção, mas não mais lida por nenhum código consumidor).
 *
 * A camada de tradução entre `type` do manifesto v2 (`core/module-contract.js`,
 * "component"|"module"|"plugin") e o `Type` desta lista foi removida nesta
 * fase: no Joomla! original, `#__extensions.type` já É o mesmo identificador
 * interno da extensão — não existe uma camada de tradução dedicada entre
 * "tipo do manifesto" e "tipo da lista", os dois vocabulários sempre foram
 * um só. A única diferença real (capitalização, por convenção de Choice
 * field do SharePoint) é cosmética e, no único consumidor real que hoje
 * compararia os dois (`isEnabled`), nunca é necessária — a comparação é
 * feita por `Element`, não por `Type`.
 *
 * Referências: mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4 e 5
 * (MSEExtensions substitui `data-enabled-modules`).
 */

/**
 * Retorna `true` se existe, em `items`, um registro com `Element === elemento`
 * e `Enabled === true`. Caso contrário (não encontrado ou desabilitado),
 * retorna `false`.
 *
 * @param {Array<object>|null|undefined} items
 * @param {string} elemento
 * @returns {boolean}
 */
export function isEnabled(items, elemento) {
  const found = resolveExtension(items, elemento);
  return Boolean(found) && found.Enabled === true;
}

/**
 * Retorna o item completo correspondente a `elemento`, ou `null` se não
 * encontrado. Tolerante a `items` vazio/undefined.
 *
 * @param {Array<object>|null|undefined} items
 * @param {string} elemento
 * @returns {object|null}
 */
export function resolveExtension(items, elemento) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const found = items.find((item) => item && item.Element === elemento);
  return found ?? null;
}

/**
 * Retorna um NOVO array (não muta `items`) contendo apenas os itens com
 * `Type === "Plugin"` e `Enabled === true`, ordenados por `Ordering`
 * ascendente. Itens sem `Ordering` definido (undefined ou null) vão para o
 * final, mantendo ordem relativa estável entre si.
 *
 * @param {Array<object>|null|undefined} items
 * @returns {Array<object>}
 */
export function sortPlugins(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  const plugins = items.filter(
    (item) => item && item.Type === "Plugin" && item.Enabled === true
  );

  // Decora com o índice original para garantir sort estável e para separar
  // "sem Ordering" (vai para o final) de "Ordering numérica" (ordena
  // ascendente), sem depender da estabilidade de Array#sort em todos os
  // motores.
  const decorated = plugins.map((item, index) => ({ item, index }));
  decorated.sort((a, b) => {
    const aHasOrdem = typeof a.item.Ordering === "number";
    const bHasOrdem = typeof b.item.Ordering === "number";
    if (aHasOrdem && bHasOrdem) {
      if (a.item.Ordering !== b.item.Ordering) {
        return a.item.Ordering - b.item.Ordering;
      }
      return a.index - b.index;
    }
    if (aHasOrdem && !bHasOrdem) {
      return -1;
    }
    if (!aHasOrdem && bHasOrdem) {
      return 1;
    }
    return a.index - b.index;
  });

  return decorated.map((entry) => entry.item);
}

/**
 * Retorna um array com todos os itens de `Type === tipo`, habilitados ou
 * não — a filtragem por `Enabled` é responsabilidade de quem chama.
 *
 * @param {Array<object>|null|undefined} items
 * @param {"Component"|"Module"|"Plugin"} tipo
 * @returns {Array<object>}
 */
export function listByType(items, tipo) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter((item) => item && item.Type === tipo);
}

/**
 * Retorna um array com todos os itens de `ClientId === clientId` ("Site" ou
 * "Administrator" — ver `kernel/schemas/mse-extensions.js#ClientId`,
 * ≈ `#__extensions.client_id`). A filtragem por `Enabled`/`Type` é
 * responsabilidade de quem chama, mesmo princípio de `listByType`.
 * Tolerante a `items` vazio/undefined — nunca lança.
 *
 * @param {Array<object>|null|undefined} items
 * @param {"Site"|"Administrator"} clientId
 * @returns {Array<object>}
 */
export function listByClientId(items, clientId) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter((item) => item && item.ClientId === clientId);
}
