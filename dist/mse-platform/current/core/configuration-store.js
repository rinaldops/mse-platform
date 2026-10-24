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

async function resolveListPath({ webUrl, listTitle, fetchImpl }) {
  const base = webPath(webUrl);
  const internalName = String(listTitle || "").trim();
  if (!internalName) throw new TypeError("listTitle é obrigatório.");
  try {
    const response = await fetchImpl(
      `${base}/_api/web/lists?$select=Id,RootFolder/Name&$expand=RootFolder&$top=5000`,
      { headers: { Accept: "application/json;odata=nometadata" } }
    );
    if (response.ok) {
      const payload = await response.json();
      const expected = internalName.toLowerCase();
      const list = (payload?.value || []).find((item) => String(item.RootFolder?.Name || "").toLowerCase() === expected);
      const id = String(list?.Id || "").trim();
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return `${base}/_api/web/lists(guid'${id.toLowerCase()}')`;
      }
    }
  } catch {
    // Fallback for older sites and test doubles without list discovery.
  }
  return `${base}/_api/web/lists/getbytitle('${internalName.replaceAll("'", "''")}')`;
}

async function loadPublished({ webUrl, listTitle, fetchImpl }) {
  const listPath = await resolveListPath({ webUrl, listTitle, fetchImpl });
  // Fase 3b (23/10/2026, docs/AUDITORIA-JOOMLA-PENTE-FINO.md §2.8): este é o
  // único leitor real identificado de MSEConfiguracoes — por isso lê só os
  // campos EM INGLÊS (Scope/Module/Theme/ConfigurationJson/Active/State/
  // ExtensionElement); os equivalentes PT (Escopo/Modulo/Tema/...) ficam
  // DEPRECATED em core/provisioning.js, sem leitor novo.
  const fields = "Id,Title,Scope,Module,Layout,Theme,ConfigurationJson,Active,State,ExtensionElement";
  const response = await fetchImpl(
    `${listPath}/items?$select=${fields}`
      + "&$filter=Active eq 1&$top=5000",
    { headers: { Accept: "application/json;odata=nometadata" } }
  );
  if (response.status === 404) return { instances: {}, global: null, extensions: {} };
  if (!response.ok) throw new Error(`Não foi possível carregar configurações publicadas (HTTP ${response.status}).`);
  const payload = await response.json();
  if (!Array.isArray(payload?.value)) throw new Error("A lista de configurações retornou um formato inválido.");
  const activeItems = await Promise.all(payload.value.map(async (item) => {
    if (String(item.State || "Published") === "Published") return item;
    const versionsResponse = await fetchImpl(
      `${listPath}/items(${item.Id})/versions`
        + "?$select=Layout,Theme,ConfigurationJson,State&$orderby=Created desc&$top=50",
      { headers: { Accept: "application/json;odata=nometadata" } }
    );
    if (!versionsResponse.ok) throw new Error(`Não foi possível carregar a versão publicada de ${item.Title} (HTTP ${versionsResponse.status}).`);
    const versions = (await versionsResponse.json())?.value;
    if (!Array.isArray(versions)) throw new Error(`O histórico de ${item.Title} retornou um formato inválido.`);
    const published = versions.find((version) => String(version.State) === "Published");
    return published ? { ...item, ...published } : null;
  }));
  const instancesByModule = {};
  let globalConfiguration = null;
  const configByExtensao = {};
  for (const item of activeItems) {
    if (!item) continue;
    const scope = String(item.Scope).toLowerCase();
    const configuration = JSON.parse(item.ConfigurationJson || "{}");
    if (String(item.Layout).toLowerCase() === "contained") configuration.layout = { ...configuration.layout, mode: "contained" };
    if (String(item.Layout).toLowerCase() === "fullbleed") configuration.layout = { ...configuration.layout, mode: "fullBleed" };
    if (item.Theme) configuration.theme = { ...configuration.theme, name: item.Theme };

    if (scope === "instance") {
      const moduleId = String(item.Module || "").toLowerCase();
      if (!moduleId || !item.Title) continue;
      instancesByModule[moduleId] ||= {};
      instancesByModule[moduleId][item.Title] = configuration;
    } else if (scope === "global") {
      globalConfiguration = configuration;
    } else if (scope === "extension") {
      const elemento = String(item.ExtensionElement || "").toLowerCase();
      if (!elemento) continue;
      configByExtensao[elemento] = configuration;
    }
  }
  return { instances: instancesByModule, global: globalConfiguration, extensions: configByExtensao };
}

async function loadHistory({ webUrl, listTitle, fetchImpl }, itemId) {
  if (!Number.isInteger(itemId) || itemId < 1) throw new TypeError("itemId inválido.");
  const listPath = await resolveListPath({ webUrl, listTitle, fetchImpl });
  const response = await fetchImpl(
    `${listPath}/items(${itemId})/versions`
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
      const published = await loadPublished(common);
      return published.instances[moduleName]?.[key] ?? {};
    },
    async loadGlobal() {
      const published = await loadPublished(common);
      return published.global ?? {};
    },
    async loadExtension(elemento) {
      const normalized = instanceKey(elemento, "elemento").toLowerCase();
      const published = await loadPublished(common);
      return published.extensions[normalized] ?? {};
    },
    list: (moduleId) => listConfigurationItems({ ...common, module: instanceKey(moduleId, "moduleId") }),
    loadForEdit: (itemId) => loadConfigurationItemForEdit({ ...common, itemId }),
    history: (itemId) => loadHistory(common, itemId),
    create({ moduleId, instanceId, view = "Full", configuration = {}, layout = "Herdar", theme = null,
      settingsVersion = 1, moduleVersion = null, state = "Draft", active = true }) {
      return createConfigurationItem({
        ...common,
        item: { key: instanceKey(instanceId, "instanceId"), scope: "Instance", module: instanceKey(moduleId, "moduleId"),
          view, layout, theme, configuration, settingsVersion, moduleVersion, state, active }
      });
    },
    save(record, configuration, changes = {}) {
      if (!record?.id || !record?.etag) throw new TypeError("record editável é obrigatório.");
      return updateConfigurationItem({ ...common, itemId: record.id, etag: record.etag, changes: { configuration, ...changes } });
    }
  });
}
