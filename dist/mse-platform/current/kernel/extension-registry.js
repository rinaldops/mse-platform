/**
 * Registro de extensões do Site Kernel (MSEExtensoes).
 *
 * Funções puras: recebem e retornam dados em memória (arrays de objetos no
 * shape de item de lista do SharePoint, com os mesmos nomes de campo do
 * esquema em `kernel/schemas/mse-extensoes.js`). Nenhuma função aqui faz
 * `fetch`, acessa REST do SharePoint ou tem qualquer outro efeito colateral.
 *
 * Shape esperado de cada item (campos relevantes):
 *   { Title, Tipo: "Componente"|"Modulo"|"Plugin", Elemento, Versao,
 *     Habilitado: boolean, Protegido: boolean, Ordem: number|undefined,
 *     ParamsJson: string|undefined }
 *
 * Referências: mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4 e 5
 * (MSEExtensoes substitui `data-enabled-modules`).
 */

/**
 * Mapeamento único entre o `type` do manifesto v2 (`core/module-contract.js`,
 * inglês/minúsculo: "component" | "module" | "plugin") e o `Tipo` da lista
 * SharePoint `MSEExtensoes` (português/capitalizado: "Componente" | "Modulo" |
 * "Plugin"). As duas camadas são intencionalmente distintas (manifesto JS =
 * contrato de autor; lista SharePoint = dado editável pelo gestor) — mas
 * qualquer tradução entre elas deve passar por aqui, e não ser reimplementada
 * em `dispatcher.js`/`positions.js` (Fase 2) ou em qualquer outro consumidor.
 *
 * "Modulo" é escrito sem acento de propósito, espelhando exatamente a choice
 * já declarada em `kernel/schemas/mse-extensoes.js` (evita divergência entre
 * o literal usado aqui e o persistido na lista).
 */
export const EXTENSION_TYPE_BY_MANIFEST_TYPE = Object.freeze({
  component: "Componente",
  module: "Modulo",
  plugin: "Plugin"
});

/**
 * Inverso de `EXTENSION_TYPE_BY_MANIFEST_TYPE`: do `Tipo` da lista
 * `MSEExtensoes` para o `type` do manifesto v2.
 */
export const MANIFEST_TYPE_BY_EXTENSION_TYPE = Object.freeze(
  Object.fromEntries(
    Object.entries(EXTENSION_TYPE_BY_MANIFEST_TYPE).map(([manifestType, tipo]) => [tipo, manifestType])
  )
);

/**
 * Converte `type` do manifesto v2 ("component"|"module"|"plugin") para o
 * `Tipo` da lista `MSEExtensoes` ("Componente"|"Modulo"|"Plugin"). Lança
 * `TypeError` para qualquer valor fora da tríade conhecida — nunca retorna
 * `undefined` silenciosamente.
 *
 * @param {"component"|"module"|"plugin"} manifestType
 * @returns {"Componente"|"Modulo"|"Plugin"}
 */
export function extensionTypeFromManifestType(manifestType) {
  const tipo = EXTENSION_TYPE_BY_MANIFEST_TYPE[manifestType];
  if (!tipo) {
    throw new TypeError(`Tipo de manifesto desconhecido: "${manifestType}".`);
  }
  return tipo;
}

/**
 * Converte `Tipo` da lista `MSEExtensoes` ("Componente"|"Modulo"|"Plugin")
 * para o `type` do manifesto v2 ("component"|"module"|"plugin"). Lança
 * `TypeError` para qualquer valor fora da tríade conhecida.
 *
 * @param {"Componente"|"Modulo"|"Plugin"} tipo
 * @returns {"component"|"module"|"plugin"}
 */
export function manifestTypeFromExtensionType(tipo) {
  const manifestType = MANIFEST_TYPE_BY_EXTENSION_TYPE[tipo];
  if (!manifestType) {
    throw new TypeError(`Tipo de extensão desconhecido: "${tipo}".`);
  }
  return manifestType;
}

/**
 * Retorna `true` se existe, em `items`, um registro com `Elemento === elemento`
 * e `Habilitado === true`. Caso contrário (não encontrado ou desabilitado),
 * retorna `false`.
 *
 * @param {Array<object>|null|undefined} items
 * @param {string} elemento
 * @returns {boolean}
 */
export function isEnabled(items, elemento) {
  const found = resolveExtension(items, elemento);
  return Boolean(found) && found.Habilitado === true;
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
  const found = items.find((item) => item && item.Elemento === elemento);
  return found ?? null;
}

/**
 * Retorna um NOVO array (não muta `items`) contendo apenas os itens com
 * `Tipo === "Plugin"` e `Habilitado === true`, ordenados por `Ordem`
 * ascendente. Itens sem `Ordem` definido (undefined ou null) vão para o
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
    (item) => item && item.Tipo === "Plugin" && item.Habilitado === true
  );

  // Decora com o índice original para garantir sort estável e para separar
  // "sem Ordem" (vai para o final) de "Ordem numérica" (ordena ascendente),
  // sem depender da estabilidade de Array#sort em todos os motores.
  const decorated = plugins.map((item, index) => ({ item, index }));
  decorated.sort((a, b) => {
    const aHasOrdem = typeof a.item.Ordem === "number";
    const bHasOrdem = typeof b.item.Ordem === "number";
    if (aHasOrdem && bHasOrdem) {
      if (a.item.Ordem !== b.item.Ordem) {
        return a.item.Ordem - b.item.Ordem;
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
 * Retorna um array com todos os itens de `Tipo === tipo`, habilitados ou
 * não — a filtragem por `Habilitado` é responsabilidade de quem chama.
 *
 * @param {Array<object>|null|undefined} items
 * @param {"Componente"|"Modulo"|"Plugin"} tipo
 * @returns {Array<object>}
 */
export function listByType(items, tipo) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter((item) => item && item.Tipo === tipo);
}
