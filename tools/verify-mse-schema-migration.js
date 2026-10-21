// mse-platform/tools/verify-mse-schema-migration.js
//
// Fase 3 da normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`),
// item 5 do "Escopo de execução": valida a migração feita por
// `tools/migrate-mse-schemas-to-english.js` — contagem de registros
// origem (listas PT legadas) vs. destino (listas novas em inglês + os
// campos novos de `MSEMenu`), com diff campo a campo (incluindo a
// tradução de valores `Choice` já esperada).
//
// Puramente de LEITURA — nunca grava nada. Reaproveita as mesmas funções de
// tradução de `tools/migrate-mse-schemas-to-english.js` para calcular o
// valor ESPERADO em inglês a partir do dado real em português, e compara
// contra o que de fato está gravado nas listas novas.

import {
  translateModuloItem,
  translateExtensaoItem,
  translateMenuItemFields,
  readLegacyMseData
} from "./migrate-mse-schemas-to-english.js";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function diffValues(expected, actual) {
  const diffs = [];
  for (const [field, expectedValue] of Object.entries(expected)) {
    const actualValue = actual ? actual[field] : undefined;
    if (actualValue !== expectedValue) {
      diffs.push({ field, expected: expectedValue, actual: actualValue ?? null });
    }
  }
  return diffs;
}

/**
 * Compara os módulos reais (PT) contra `MSEModules` (EN), por `Title`.
 *
 * @param {object[]} modulos Itens reais de MSEModulos.
 * @param {object[]} modulesNew Itens reais de MSEModules (lista nova).
 */
export function diffModules(modulos, modulesNew) {
  const newByTitle = new Map(modulesNew.map((item) => [item.Title, item]));
  const results = modulos.map((item) => {
    const { Title, values } = translateModuloItem(item);
    const actual = newByTitle.get(Title);
    return {
      title: Title,
      found: Boolean(actual),
      diffs: actual ? diffValues(values, actual) : []
    };
  });
  const expectedTitles = new Set(modulos.map((item) => item.Title));
  const extra = modulesNew.filter((item) => !expectedTitles.has(item.Title)).map((item) => item.Title);
  return deepFreeze({ results, extra });
}

/**
 * Compara as extensões reais (PT) contra `MSEExtensions` (EN), por
 * `Element` (chave natural mais estável que `Title`, que pode conter
 * acentuação livre).
 */
export function diffExtensions(extensoes, extensionsNew) {
  const newByElement = new Map(extensionsNew.map((item) => [item.Element, item]));
  const results = extensoes.map((item) => {
    const { Title, values } = translateExtensaoItem(item);
    const actual = newByElement.get(values.Element);
    return {
      title: Title,
      element: values.Element,
      found: Boolean(actual),
      diffs: actual ? diffValues(values, actual) : []
    };
  });
  const expectedElements = new Set(extensoes.map((item) => item.Elemento));
  const extra = extensionsNew.filter((item) => !expectedElements.has(item.Element)).map((item) => item.Element);
  return deepFreeze({ results, extra });
}

/**
 * Compara os campos em inglês já gravados in-place em `MSEMenu` (mesma
 * lista, mesmo `Id`) contra o valor esperado calculado a partir dos campos
 * PT do mesmo registro.
 */
export function diffMenu(menu) {
  const results = menu.map((item) => {
    const { Id, values } = translateMenuItemFields(item);
    return { id: Id, diffs: diffValues(values, item) };
  });
  return deepFreeze({ results });
}

/**
 * Compara as associações módulo×menu reais (PT, `MSEModulosMenu`) contra
 * `MSEModulesMenu` (EN) — via o par (Title do módulo de origem, MenuId),
 * já que o `ModuleId` muda de valor entre as duas listas (Ids próprios).
 *
 * @param {object[]} modulosMenu Itens reais de MSEModulosMenu.
 * @param {object[]} modulos Itens reais de MSEModulos (para resolver Title a partir de ModuloId).
 * @param {object[]} modulesNew Itens reais de MSEModules (para resolver o Id novo a partir do Title).
 * @param {object[]} modulesMenuNew Itens reais de MSEModulesMenu (lista nova).
 */
export function diffModulesMenu(modulosMenu, modulos, modulesNew, modulesMenuNew) {
  const modulosById = new Map(modulos.map((item) => [item.Id, item]));
  const newModuleIdByTitle = new Map(modulesNew.map((item) => [item.Title, item.Id]));
  const newPairs = new Set(modulesMenuNew.map((item) => `${item.ModuleId}:${item.MenuId}`));

  const results = modulosMenu.map((item) => {
    const modulo = modulosById.get(item.ModuloId);
    if (!modulo) {
      return { moduloId: item.ModuloId, menuId: item.MenuId, found: false, error: "ModuloId inexistente em MSEModulos" };
    }
    const newModuleId = newModuleIdByTitle.get(modulo.Title);
    if (newModuleId == null) {
      return { moduleTitle: modulo.Title, menuId: item.MenuId, found: false, error: "Title ausente em MSEModules" };
    }
    const found = newPairs.has(`${newModuleId}:${item.MenuId}`);
    return { moduleTitle: modulo.Title, menuId: item.MenuId, newModuleId, found };
  });
  return deepFreeze({ results });
}

/**
 * Executa a verificação completa: lê as 4 listas legadas (PT) + as 3 listas
 * novas (EN) + o estado atual de `MSEMenu`, e devolve um relatório
 * consolidado — `ok: true` só se não houver nenhuma divergência/item
 * ausente/sobra.
 *
 * @param {{
 *   installer: { verify: () => Promise<object> },
 *   legacyListIds: { MSEModulos: {listId:string}, MSEMenu: {listId:string}, MSEExtensoes: {listId:string}, MSEModulosMenu: {listId:string} },
 *   client: { getListItems: Function }
 * }} options
 */
export async function verifyMseSchemaMigration({ installer, legacyListIds, client } = {}) {
  if (!installer || typeof installer.verify !== "function") {
    throw new TypeError("installer deve expor verify().");
  }
  if (!legacyListIds?.MSEModulos || !legacyListIds?.MSEMenu
    || !legacyListIds?.MSEExtensoes || !legacyListIds?.MSEModulosMenu) {
    throw new TypeError("legacyListIds deve informar MSEModulos, MSEMenu, MSEExtensoes e MSEModulosMenu.");
  }
  if (!client || typeof client.getListItems !== "function") {
    throw new TypeError("client deve expor getListItems(list, options).");
  }

  const verification = await installer.verify();
  const listIdByInternalName = new Map(
    (verification?.plan?.lists ?? []).map((entry) => [entry.internalName, entry.listId])
  );
  function resolveNewList(internalName) {
    const listId = listIdByInternalName.get(internalName);
    if (!listId) throw new Error(`listId não resolvido para ${internalName}.`);
    return { listId };
  }

  const legacyData = await readLegacyMseData(client, legacyListIds);
  const modulesNew = await client.getListItems(resolveNewList("MSEModules"), {
    select: ["Id", "Title", "Module", "Position", "Ordering", "Published", "PublishUp", "PublishDown",
      "ShowTitle", "Style", "MenuAssignment", "ParamsJson", "SchemaVersion"]
  });
  const extensionsNew = await client.getListItems(resolveNewList("MSEExtensions"), {
    select: ["Id", "Title", "Type", "Element", "Version", "Enabled", "Protected", "Ordering", "ParamsJson"]
  });
  const modulesMenuNew = await client.getListItems(resolveNewList("MSEModulesMenu"), {
    select: ["Id", "Title", "ModuleId", "MenuId"]
  });

  const modules = diffModules(legacyData.modulos, modulesNew);
  const extensions = diffExtensions(legacyData.extensoes, extensionsNew);
  const menu = diffMenu(legacyData.menu);
  const modulesMenu = diffModulesMenu(legacyData.modulosMenu, legacyData.modulos, modulesNew, modulesMenuNew);

  const ok = modules.results.every((r) => r.found && r.diffs.length === 0) && modules.extra.length === 0
    && extensions.results.every((r) => r.found && r.diffs.length === 0) && extensions.extra.length === 0
    && menu.results.every((r) => r.diffs.length === 0)
    && modulesMenu.results.every((r) => r.found);

  return deepFreeze({
    ok,
    counts: {
      modulos: legacyData.modulos.length, modulesNew: modulesNew.length,
      extensoes: legacyData.extensoes.length, extensionsNew: extensionsNew.length,
      menu: legacyData.menu.length,
      modulosMenu: legacyData.modulosMenu.length, modulesMenuNew: modulesMenuNew.length
    },
    modules, extensions, menu, modulesMenu
  });
}
