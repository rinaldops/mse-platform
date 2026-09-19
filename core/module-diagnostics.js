import { defineModuleManifest } from "./module-contract.js";
import { createSharePointRestClient } from "./rest.js";

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function unwrap(value) {
  return value?.value ?? value?.d?.results ?? value?.d ?? value;
}

export async function diagnoseModuleInstallation({ manifest, client, webUrl, fetchImpl } = {}) {
  const normalized = defineModuleManifest(manifest);
  const rest = client ?? createSharePointRestClient({ webUrl, fetchImpl });
  if (!rest || typeof rest.request !== "function") throw new TypeError("client deve expor request().");
  const response = await rest.request(
    "/_api/web/lists?$select=Id,Title,BaseTemplate,RootFolder/Name&$expand=RootFolder&$top=5000"
  );
  const lists = unwrap(response.data);
  if (!Array.isArray(lists)) throw new Error("O SharePoint não retornou o catálogo de listas.");

  const sources = normalized.dataSources.map((source) => {
    const list = lists.find((candidate) => candidate.RootFolder?.Name?.toLowerCase() === source.internalName.toLowerCase());
    const expectedTemplate = source.type === "library" ? 101 : 100;
    const status = !list ? "missing" : Number(list.BaseTemplate) === expectedTemplate ? "ready" : "conflict";
    return {
      ...source,
      status,
      listId: list?.Id ?? null,
      actualTemplate: list ? Number(list.BaseTemplate) : null,
      expectedTemplate
    };
  });
  const status = sources.some((source) => source.status === "conflict")
    ? "conflict"
    : sources.some((source) => source.status === "missing") ? "installation-required" : "ready";
  return freeze({
    moduleId: normalized.id,
    status,
    permissions: normalized.permissions,
    sources
  });
}
