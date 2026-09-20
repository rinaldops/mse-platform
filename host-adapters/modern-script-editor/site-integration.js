import { createSharePointConfigurationStore } from "../../core/configuration-store.js";
import { createSharePointDataSourceRegistry } from "../../core/data-sources.js";
import { selectRichTextEditor } from "../../core/editor.js";
import { resolveListSources } from "../../core/list-provisioning.js";
import { diagnoseModuleInstallation } from "../../core/module-diagnostics.js";
import { renderRichText, sanitizeRichText } from "../../core/rich-text.js";
import { provisionConfigurationList } from "../../core/provisioning.js";
import { FORUM_MANIFEST } from "../../modules/forum/manifest.js";
import { createForumReadService } from "../../modules/forum/forum-data.js";
import { FORUM_LIST_SCHEMAS } from "../../modules/forum/forum-schema.js";
import { RECURSOS_MANIFEST } from "../../modules/recursos/manifest.js";
import { createRecursosReadService } from "../../modules/recursos/recursos-data.js";
import { RECURSOS_LIST_SCHEMAS } from "../../modules/recursos/recursos-schema.js";
import { VIDEOTECA_MANIFEST } from "../../modules/videoteca/manifest.js";
import { createVideotecaReadService } from "../../modules/videoteca/videoteca-data.js";
import { VIDEOTECA_LIST_SCHEMAS } from "../../modules/videoteca/videoteca-schema.js";
import { HOME_MANIFEST } from "../../modules/home/manifest.js";
import ADMIN_MANIFEST from "../../admin/manifest.js";
import { createModuleInstaller } from "../../admin/installer.js";

const definitions = Object.freeze({
  home: { manifest: HOME_MANIFEST, schemas: [] },
  forum: { manifest: FORUM_MANIFEST, schemas: FORUM_LIST_SCHEMAS },
  "explore-mais": { manifest: RECURSOS_MANIFEST, schemas: RECURSOS_LIST_SCHEMAS },
  videoteca: { manifest: VIDEOTECA_MANIFEST, schemas: VIDEOTECA_LIST_SCHEMAS },
  "mse-admin": { manifest: ADMIN_MANIFEST, schemas: [] }
});

function normalizeWebUrl(value) {
  const webUrl = value ?? globalThis._spPageContextInfo?.webServerRelativeUrl;
  if (typeof webUrl !== "string" || !webUrl.startsWith("/")) throw new TypeError("webUrl SharePoint é obrigatório.");
  return webUrl === "/" ? "/" : webUrl.replace(/\/+$/, "");
}

export async function createSiteIntegration({
  webUrl,
  releaseBase,
  fetchImpl = globalThis.fetch,
  enabledModules = ["forum", "explore-mais", "videoteca"]
} = {}) {
  const normalizedWebUrl = normalizeWebUrl(webUrl);
  if (typeof releaseBase !== "string" || !releaseBase.startsWith("/")) throw new TypeError("releaseBase é obrigatório.");
  const selected = enabledModules.map((id) => {
    if (!definitions[id]) throw new TypeError(`Módulo desconhecido: ${id}.`);
    return definitions[id];
  });
  const schemas = selected.flatMap((definition) => definition.schemas);
  const lists = schemas.length
    ? (await resolveListSources({ webUrl: normalizedWebUrl, schemas, fetchImpl })).lists
    : [];
  const dataSources = lists.length ? createSharePointDataSourceRegistry({
      sources: lists,
      allowedWebUrls: [normalizedWebUrl],
      fetchImpl
    }) : null;
  const services = {
    richText: Object.freeze({ selectEditor: selectRichTextEditor, render: renderRichText, sanitize: sanitizeRichText })
  };
  if (dataSources) {
    services.metrics = Object.freeze({
      async itemCount(sourceKey) {
        const source = dataSources.get(sourceKey);
        const response = await dataSources.getClient(sourceKey).request(
          `/_api/web/lists(guid'${source.listId}')?$select=ItemCount`
        );
        return Number(response.data?.ItemCount ?? response.data?.d?.ItemCount ?? 0);
      }
    });
  }
  if (enabledModules.includes("forum")) {
    services.forum = createForumReadService({ dataSources, sanitizeRichText });
  }
  if (enabledModules.includes("explore-mais")) {
    services["explore-mais"] = createRecursosReadService({ dataSources });
  }
  if (enabledModules.includes("videoteca")) {
    services.videoteca = createVideotecaReadService({ dataSources });
  }

  const configurationStore = createSharePointConfigurationStore({ webUrl: normalizedWebUrl, fetchImpl });
  const installer = createModuleInstaller({
    schemasByModule: Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, definition.schemas])),
    webUrl: normalizedWebUrl,
    fetchImpl
  });
  const versions = Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, definition.manifest.version]));
  const diagnose = (manifest) => diagnoseModuleInstallation({ manifest, webUrl: normalizedWebUrl, fetchImpl });
  services.configurationStore = configurationStore;
  services.installer = installer;
  services.diagnose = diagnose;
  services.provisionConfiguration = (confirm) => provisionConfigurationList({
    webUrl: normalizedWebUrl,
    fetchImpl,
    confirm
  });
  return Object.freeze({
    configurationStore,
    services: Object.freeze(services),
    manifestResolver(moduleId) {
      const version = versions[moduleId];
      if (!version) throw new TypeError(`Manifesto não registrado: ${moduleId}.`);
      if (moduleId === "mse-admin") return `${releaseBase}/admin/manifest.js`;
      const folder = moduleId === "explore-mais" ? "recursos" : moduleId;
      return `${releaseBase}/modules/${folder}/manifest.js`;
    },
    diagnose
  });
}
