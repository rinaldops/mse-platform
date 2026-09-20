import {
  createConfigurationItem,
  listConfigurationItems,
  loadConfigurationItemForEdit,
  updateConfigurationItem
} from "./provisioning.js";

function webPath(value) {
  const candidate = value ?? globalThis._spPageContextInfo?.webServerRelativeUrl;
  if (typeof candidate !== "string") throw new TypeError("webUrl é obrigatório.");
  return candidate.replace(/\/+$/, "");
}

async function loadPublished({ webUrl, listTitle, fetchImpl }) {
  const title = listTitle.replaceAll("'", "''");
  const fields = "Id,Title,Escopo,Modulo,Layout,Tema,ConfiguracaoJson,Ativo,Estado";
  const response = await fetchImpl(
    `${webPath(webUrl)}/_api/web/lists/getbytitle('${title}')/items?$select=${fields}`
      + "&$filter=Ativo eq 1&$top=5000",
    { headers: { Accept: "application/json;odata=nometadata" } }
  );
  if (response.status === 404) return {};
  if (!response.ok) throw new Error(`Não foi possível carregar configurações publicadas (HTTP ${response.status}).`);
  const payload = await response.json();
  if (!Array.isArray(payload?.value)) throw new Error("A lista de configurações retornou um formato inválido.");
  const activeItems = await Promise.all(payload.value.map(async (item) => {
    if (String(item.Estado || "Publicado") === "Publicado") return item;
    const versionsResponse = await fetchImpl(
      `${webPath(webUrl)}/_api/web/lists/getbytitle('${title}')/items(${item.Id})/versions`
        + "?$select=Layout,Tema,ConfiguracaoJson,Estado&$orderby=Created desc&$top=50",
      { headers: { Accept: "application/json;odata=nometadata" } }
    );
    if (!versionsResponse.ok) throw new Error(`Não foi possível carregar a versão publicada de ${item.Title} (HTTP ${versionsResponse.status}).`);
    const versions = (await versionsResponse.json())?.value;
    if (!Array.isArray(versions)) throw new Error(`O histórico de ${item.Title} retornou um formato inválido.`);
    const published = versions.find((version) => String(version.Estado) === "Publicado");
    return published ? { ...item, ...published } : null;
  }));
  const instancesByModule = {};
  for (const item of activeItems) {
    if (!item) continue;
    if (String(item.Escopo).toLowerCase() !== "instancia") continue;
    const moduleId = String(item.Modulo || "").toLowerCase();
    if (!moduleId || !item.Title) continue;
    const configuration = JSON.parse(item.ConfiguracaoJson || "{}");
    if (String(item.Layout).toLowerCase() === "contained") configuration.layout = { ...configuration.layout, mode: "contained" };
    if (String(item.Layout).toLowerCase() === "fullbleed") configuration.layout = { ...configuration.layout, mode: "fullBleed" };
    if (item.Tema) configuration.theme = { ...configuration.theme, name: item.Tema };
    instancesByModule[moduleId] ||= {};
    instancesByModule[moduleId][item.Title] = configuration;
  }
  return instancesByModule;
}

async function loadHistory({ webUrl, listTitle, fetchImpl }, itemId) {
  if (!Number.isInteger(itemId) || itemId < 1) throw new TypeError("itemId inválido.");
  const title = listTitle.replaceAll("'", "''");
  const response = await fetchImpl(
    `${webPath(webUrl)}/_api/web/lists/getbytitle('${title}')/items(${itemId})/versions`
      + "?$select=VersionId,VersionLabel,Created,CreatedBy/Title&$expand=CreatedBy&$orderby=Created desc&$top=20",
    { headers: { Accept: "application/json;odata=nometadata" } }
  );
  if (!response.ok) throw new Error(`Não foi possível carregar o histórico (HTTP ${response.status}).`);
  const payload = await response.json();
  const versions = payload?.value ?? payload?.d?.results;
  if (!Array.isArray(versions)) throw new Error("O histórico retornou um formato inválido.");
  return versions.map((version) => Object.freeze({
    id: version.VersionId,
    label: version.VersionLabel || String(version.VersionId),
    created: version.Created,
    author: version.CreatedBy?.Title || ""
  }));
}

function instanceKey(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,127}$/i.test(value)) throw new TypeError(`${label} inválido.`);
  return value;
}

export function createSharePointConfigurationStore({ webUrl, listTitle = "MSEConfiguracoes", fetchImpl = globalThis.fetch } = {}) {
  const common = { webUrl, listTitle, fetchImpl };
  return Object.freeze({
    async load({ moduleId, instanceId }) {
      const moduleName = instanceKey(moduleId, "moduleId").toLowerCase();
      const key = instanceKey(instanceId, "instanceId");
      const instances = await loadPublished(common);
      return instances[moduleName]?.[key] ?? {};
    },
    list: (moduleId) => listConfigurationItems({ ...common, module: instanceKey(moduleId, "moduleId") }),
    loadForEdit: (itemId) => loadConfigurationItemForEdit({ ...common, itemId }),
    history: (itemId) => loadHistory(common, itemId),
    create({ moduleId, instanceId, view = "Full", configuration = {}, layout = "Herdar", theme = null,
      settingsVersion = 1, moduleVersion = null, state = "Rascunho", active = true }) {
      return createConfigurationItem({
        ...common,
        item: { key: instanceKey(instanceId, "instanceId"), scope: "Instancia", module: instanceKey(moduleId, "moduleId"),
          view, layout, theme, configuration, settingsVersion, moduleVersion, state, active }
      });
    },
    save(record, configuration, changes = {}) {
      if (!record?.id || !record?.etag) throw new TypeError("record editável é obrigatório.");
      return updateConfigurationItem({ ...common, itemId: record.id, etag: record.etag, changes: { configuration, ...changes } });
    }
  });
}
