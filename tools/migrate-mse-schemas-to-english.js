// mse-platform/tools/migrate-mse-schemas-to-english.js
//
// Fase 3 da normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`):
// copia os dados REAIS já vigentes nas listas PT do Site Kernel
// (`MSEModulos`, `MSEExtensoes`, `MSEModulosMenu` — legadas, fora de
// `kernel/installer.js#KERNEL_LIST_SCHEMAS` a partir desta fase) para as
// novas listas em inglês (`MSEModules`, `MSEExtensions`, `MSEModulesMenu`),
// e atualiza `MSEMenu` IN-PLACE, preenchendo os campos novos em inglês
// (`MenuType`/`Path`/`Level`/`Ordering`/`Component`/`View`/`Default`/
// `Target`/`Published`) a partir dos campos PT já existentes no mesmo
// registro — `MSEMenu` não ganha lista irmã (mesmo nome em PT/EN).
//
// IMPORTANTE — este NÃO é mais o "migrar os 12 registros de
// CAMAPModulosConfiguracoes" do plano original: levantamento ao vivo em
// produção (ver `docs/inventario/C1-INVENTARIO-MODULOS.md` e a seção
// "Reconciliação" da Fase 3 no plano) mostrou que os dados reais já foram
// migrados para as listas PT atuais por uma sessão anterior
// (`tools/migrate-camap-home.js`, C3/C4). Este script só traduz
// nome-de-lista/nome-de-campo/valores `Choice`, sem reinterpretar o
// conteúdo.
//
// Traduções de valor (`Choice`), fixas e puras (sem rede):
//   Published: Publicado→Published, Despublicado→Unpublished, Lixeira→Trashed
//   MenuAssignment: Todas→All, Nenhuma→None, Somente→Only, "Todas exceto"→AllExcept
//   Type (extensão): Componente→Component, Modulo→Module, Plugin→Plugin
//   Target: MesmaAba→SameTab, NovaAba→NewTab
//
// Idempotente (mesmo princípio de `upsertByKey`/`createIfMissing` dos
// scripts irmãos `tools/migrate-camap-home.js`/
// `tools/migrate-mse-administrator-route.js`):
// - MSEModules/MSEExtensions: criado só se não existir item com o mesmo
//   `Title` (Modules) / `Element` (Extensions) na lista nova.
// - MSEModulesMenu: criado só se não existir uma linha com o mesmo par
//   (ModuleId novo, MenuId) — resolvido via o `Title` do módulo de origem
//   (ModuleId antigo aponta para MSEModulos, não para MSEModules; a
//   remapagem é necessária porque a lista nova tem Ids próprios).
// - MSEMenu: UPDATE in-place (MERGE com ETag) só se os valores em inglês
//   ainda não baterem com os já gravados — nunca cria um item novo (o Id
//   já existe, é a mesma linha).
//
// NUNCA aplicar este script contra o tenant real sem revisão humana — ver
// `confirm` abaixo (mesmo padrão de todo o resto de `tools/`).

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const PUBLISHED_PT_TO_EN = Object.freeze({
  Publicado: "Published",
  Despublicado: "Unpublished",
  Lixeira: "Trashed"
});

const MENU_ASSIGNMENT_PT_TO_EN = Object.freeze({
  Todas: "All",
  Nenhuma: "None",
  Somente: "Only",
  "Todas exceto": "AllExcept"
});

const EXTENSION_TYPE_PT_TO_EN = Object.freeze({
  Componente: "Component",
  Modulo: "Module",
  Plugin: "Plugin"
});

const TARGET_PT_TO_EN = Object.freeze({
  MesmaAba: "SameTab",
  NovaAba: "NewTab"
});

function translateChoice(map, value, label) {
  if (value === null || value === undefined) return null;
  const translated = map[value];
  if (translated === undefined) {
    throw new Error(`Valor de ${label} sem tradução conhecida: "${value}".`);
  }
  return translated;
}

/**
 * Traduz um item real de `MSEModulos` (PT) para os valores de `MSEModules`
 * (EN) — nenhuma interpretação de conteúdo, só nome/valor de campo.
 *
 * @param {object} item Item real de MSEModulos (campos PT, incluindo Title).
 * @returns {{ Title: string, values: object }}
 */
export function translateModuloItem(item) {
  return deepFreeze({
    Title: item.Title,
    values: {
      Module: item.ModuloTipo ?? null,
      Position: item.Posicao ?? null,
      Ordering: typeof item.Ordem === "number" ? item.Ordem : 0,
      Published: translateChoice(PUBLISHED_PT_TO_EN, item.Estado, "MSEModulos.Estado") ?? "Published",
      PublishUp: item.PublicarEm ?? null,
      PublishDown: item.PublicarAte ?? null,
      ShowTitle: Boolean(item.MostrarTitulo),
      Style: item.Estilo ?? null,
      MenuAssignment: translateChoice(MENU_ASSIGNMENT_PT_TO_EN, item.AtribuicaoMenu, "MSEModulos.AtribuicaoMenu") ?? "All",
      ParamsJson: item.ParamsJson ?? null,
      SchemaVersion: typeof item.SchemaVersao === "number" ? item.SchemaVersao : null
    }
  });
}

/**
 * Traduz um item real de `MSEExtensoes` (PT) para os valores de
 * `MSEExtensions` (EN).
 *
 * @param {object} item Item real de MSEExtensoes (campos PT, incluindo Title).
 * @returns {{ Title: string, values: object }}
 */
export function translateExtensaoItem(item) {
  return deepFreeze({
    Title: item.Title,
    values: {
      Type: translateChoice(EXTENSION_TYPE_PT_TO_EN, item.Tipo, "MSEExtensoes.Tipo"),
      Element: item.Elemento,
      Version: item.Versao ?? null,
      Enabled: Boolean(item.Habilitado),
      Protected: Boolean(item.Protegido),
      Ordering: typeof item.Ordem === "number" ? item.Ordem : null,
      ParamsJson: item.ParamsJson ?? null
    }
  });
}

/**
 * Traduz um item real de `MSEMenu` (campos PT já no mesmo registro) para os
 * valores EM INGLÊS a acrescentar via UPDATE no mesmo item (mesma lista,
 * mesmo `Id` — nunca cria um item novo).
 *
 * @param {object} item Item real de MSEMenu (Id + campos PT).
 * @returns {{ Id: number, values: object }}
 */
export function translateMenuItemFields(item) {
  if (!Number.isInteger(item.Id)) throw new TypeError("item.Id (MSEMenu) deve ser um inteiro.");
  return deepFreeze({
    Id: item.Id,
    values: {
      MenuType: item.TipoMenu ?? null,
      Path: item.Caminho ?? null,
      Level: typeof item.Nivel === "number" ? item.Nivel : 1,
      Ordering: typeof item.Ordem === "number" ? item.Ordem : 0,
      Component: item.Componente ?? null,
      View: item.Visao ?? null,
      Default: Boolean(item.Padrao),
      Target: translateChoice(TARGET_PT_TO_EN, item.AbrirEm, "MSEMenu.AbrirEm") ?? "SameTab",
      Published: translateChoice(PUBLISHED_PT_TO_EN, item.Estado, "MSEMenu.Estado") ?? "Published"
    }
  });
}

/**
 * Monta o título legível de uma linha de junção `MSEModulosMenu`/
 * `MSEModulesMenu`, reaproveitando o `Title` original quando presente
 * (mesmo padrão descritivo de `tools/migrate-camap-home.js`).
 */
function junctionTitle(item, moduleTitle) {
  return item.Title || `${moduleTitle} × menu ${item.MenuId}`;
}

function odataLiteral(value) {
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

async function findItemByKey(client, list, keyField, keyValue, extraSelect = []) {
  const select = [...new Set(["Id", keyField, ...extraSelect])];
  const found = await client.getListItems(list, {
    select,
    filter: `${keyField} eq ${odataLiteral(keyValue)}`,
    top: 1
  });
  return Array.isArray(found) && found.length > 0 ? found[0] : null;
}

function valuesAlreadyMatch(item, values) {
  return Object.entries(values).every(([field, value]) => item?.[field] === value);
}

/**
 * Lê todos os itens reais das 4 listas legadas (PT) envolvidas nesta
 * migração, usando os `listId` já resolvidos pelo chamador (não são mais
 * geridas por `kernel/installer.js` a partir desta fase — ver cabeçalho).
 *
 * @param {object} client
 * @param {{ MSEModulos: {listId:string}, MSEMenu: {listId:string}, MSEExtensoes: {listId:string}, MSEModulosMenu: {listId:string} }} legacyListIds
 * @returns {Promise<{ modulos: object[], menu: object[], extensoes: object[], modulosMenu: object[] }>}
 */
export async function readLegacyMseData(client, legacyListIds) {
  const modulos = await client.getListItems(legacyListIds.MSEModulos, {
    select: ["Id", "Title", "ModuloTipo", "Posicao", "Ordem", "Estado", "PublicarEm", "PublicarAte",
      "MostrarTitulo", "Estilo", "AtribuicaoMenu", "ParamsJson", "SchemaVersao"]
  });
  const menu = await client.getListItems(legacyListIds.MSEMenu, {
    select: ["Id", "Title", "Alias", "TipoMenu", "Caminho", "Nivel", "Ordem", "Componente", "Visao",
      "Padrao", "AbrirEm", "Estado"]
  });
  const extensoes = await client.getListItems(legacyListIds.MSEExtensoes, {
    select: ["Id", "Title", "Tipo", "Elemento", "Versao", "Habilitado", "Protegido", "Ordem", "ParamsJson"]
  });
  const modulosMenu = await client.getListItems(legacyListIds.MSEModulosMenu, {
    select: ["Id", "Title", "ModuloId", "MenuId"]
  });
  return { modulos, menu, extensoes, modulosMenu };
}

/**
 * Monta o plano puro de migração (sem rede) a partir dos dados legados já
 * lidos — útil para revisão humana via `confirm(plan)` antes de qualquer
 * escrita.
 *
 * @param {{ modulos: object[], menu: object[], extensoes: object[], modulosMenu: object[] }} legacyData
 * @returns {{
 *   modules: Array<{ Title: string, values: object }>,
 *   extensions: Array<{ Title: string, values: object }>,
 *   menuUpdates: Array<{ Id: number, values: object }>,
 *   modulesMenu: Array<{ title: string, moduleTitle: string, menuId: number }>
 * }}
 */
export function buildMseSchemaMigrationPlan(legacyData) {
  const modulosById = new Map(legacyData.modulos.map((item) => [item.Id, item]));
  return deepFreeze({
    modules: legacyData.modulos.map(translateModuloItem),
    extensions: legacyData.extensoes.map(translateExtensaoItem),
    menuUpdates: legacyData.menu.map(translateMenuItemFields),
    modulesMenu: legacyData.modulosMenu.map((item) => {
      const modulo = modulosById.get(item.ModuloId);
      if (!modulo) {
        throw new Error(`MSEModulosMenu Id=${item.Id} referencia ModuloId=${item.ModuloId} inexistente em MSEModulos.`);
      }
      return { title: junctionTitle(item, modulo.Title), moduleTitle: modulo.Title, menuId: item.MenuId };
    })
  });
}

/**
 * Aplica a migração de fato, só atrás de `confirm(plan)` explícito (mesmo
 * padrão de todo o resto de `tools/`). `installer.verify()` resolve os
 * `listId` das listas NOVAS (`MSEModules`/`MSEExtensions`/`MSEModulesMenu`/
 * `MSEMenu`, já em `KERNEL_LIST_SCHEMAS` desta fase); `legacyListIds` é
 * informado pelo chamador para as 3 listas PT que não são mais geridas
 * pelo installer (`MSEModulos`/`MSEExtensoes`/`MSEModulosMenu`).
 *
 * @param {{
 *   installer: { verify: () => Promise<object> },
 *   legacyListIds: { MSEModulos: {listId:string}, MSEMenu: {listId:string}, MSEExtensoes: {listId:string}, MSEModulosMenu: {listId:string} },
 *   client: { getListItems: Function, getListItem: Function, createListItem: Function, updateListItem: Function },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{
 *   status: "migrated" | "cancelled",
 *   modulesCreated: string[],
 *   extensionsCreated: string[],
 *   menuUpdated: number[],
 *   modulesMenuCreated: string[]
 * }>}
 */
export async function migrateMseSchemasToEnglish({ installer, legacyListIds, client, confirm } = {}) {
  if (!installer || typeof installer.verify !== "function") {
    throw new TypeError("installer deve expor verify().");
  }
  if (!legacyListIds?.MSEModulos || !legacyListIds?.MSEMenu
    || !legacyListIds?.MSEExtensoes || !legacyListIds?.MSEModulosMenu) {
    throw new TypeError("legacyListIds deve informar MSEModulos, MSEMenu, MSEExtensoes e MSEModulosMenu.");
  }
  if (!client || typeof client.getListItems !== "function" || typeof client.getListItem !== "function"
    || typeof client.createListItem !== "function" || typeof client.updateListItem !== "function") {
    throw new TypeError(
      "client deve expor getListItems, getListItem, createListItem e updateListItem(list, id, values, options)."
    );
  }
  if (typeof confirm !== "function") {
    throw new TypeError("A migração exige um callback confirm(plan) explícito, no mesmo padrão dos demais scripts de tools/.");
  }

  let verification;
  try {
    verification = await installer.verify();
  } catch (error) {
    throw new Error(
      "listas MSE* (novas) não estão prontas; rode installer.apply() antes da migração.",
      { cause: error }
    );
  }
  const listIdByInternalName = new Map(
    (verification?.plan?.lists ?? []).map((entry) => [entry.internalName, entry.listId])
  );
  function resolveNewList(internalName) {
    const listId = listIdByInternalName.get(internalName);
    if (!listId) {
      throw new Error(`listId não resolvido para ${internalName} (installer.verify() incompleto ou desatualizado).`);
    }
    return { listId };
  }

  const legacyData = await readLegacyMseData(client, legacyListIds);
  const plan = buildMseSchemaMigrationPlan(legacyData);
  if (await confirm(plan) !== true) {
    return Object.freeze({ status: "cancelled", modulesCreated: [], extensionsCreated: [], menuUpdated: [], modulesMenuCreated: [] });
  }

  const modulesList = resolveNewList("MSEModules");
  const extensionsList = resolveNewList("MSEExtensions");
  const modulesMenuList = resolveNewList("MSEModulesMenu");
  const menuList = resolveNewList("MSEMenu");

  const modulesCreated = [];
  const newModuleIdByTitle = new Map();
  for (const { Title, values } of plan.modules) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await findItemByKey(client, modulesList, "Title", Title, ["Id"]);
    if (existing) {
      newModuleIdByTitle.set(Title, existing.Id);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const { item } = await client.createListItem(modulesList, { Title, ...values });
    if (item?.Id == null) throw new Error(`createListItem(MSEModules) não devolveu Id para "${Title}".`);
    newModuleIdByTitle.set(Title, item.Id);
    modulesCreated.push(Title);
  }

  const extensionsCreated = [];
  for (const { Title, values } of plan.extensions) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await findItemByKey(client, extensionsList, "Element", values.Element);
    if (existing) continue;
    // eslint-disable-next-line no-await-in-loop
    await client.createListItem(extensionsList, { Title, ...values });
    extensionsCreated.push(Title);
  }

  const menuUpdated = [];
  for (const { Id, values } of plan.menuUpdates) {
    // eslint-disable-next-line no-await-in-loop
    const { item } = await client.getListItem(menuList, Id, { select: Object.keys(values) });
    if (valuesAlreadyMatch(item, values)) continue;
    // eslint-disable-next-line no-await-in-loop
    const current = await client.getListItem(menuList, Id, { select: ["Id"] });
    // eslint-disable-next-line no-await-in-loop
    await client.updateListItem(menuList, Id, values, { etag: current.etag });
    menuUpdated.push(Id);
  }

  const modulesMenuCreated = [];
  for (const { title, moduleTitle, menuId } of plan.modulesMenu) {
    const moduleId = newModuleIdByTitle.get(moduleTitle);
    if (moduleId == null) {
      throw new Error(`Id novo de MSEModules não resolvido para "${moduleTitle}" (criação acima falhou silenciosamente?).`);
    }
    // eslint-disable-next-line no-await-in-loop
    const already = await client.getListItems(modulesMenuList, {
      select: ["ModuleId", "MenuId"],
      filter: `ModuleId eq ${Number(moduleId)} and MenuId eq ${Number(menuId)}`,
      top: 1
    });
    if (Array.isArray(already) && already.length > 0) continue;
    // eslint-disable-next-line no-await-in-loop
    await client.createListItem(modulesMenuList, { Title: title, ModuleId: moduleId, MenuId: menuId });
    modulesMenuCreated.push(title);
  }

  return Object.freeze({ status: "migrated", modulesCreated, extensionsCreated, menuUpdated, modulesMenuCreated });
}
