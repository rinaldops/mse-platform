import { mountAdminCenter } from "../../admin/admin-center.js?v=0.8.1-2";
import { createDefaultCatalog } from "../../admin/default-catalog.js?v=0.8.1-2";
import { generateMseSnippet } from "../../admin/snippet-generator.js?v=0.8.1-2";

const records = new Map();
let nextId = 1;

function saved(record, changes = {}) {
  const next = Object.freeze({ ...record, ...changes, etag: `"local-${Date.now()}"` });
  records.set(next.id, next);
  return next;
}

const configurationStore = Object.freeze({
  async list(moduleId) { return [...records.values()].filter((record) => record.moduleId === moduleId); },
  async loadForEdit(id) { return records.get(id); },
  async create({ moduleId, instanceId, view, configuration, settingsVersion, moduleVersion, state, active }) {
    return saved({
      id: nextId++, key: instanceId, moduleId, view, configuration,
      settingsVersion, moduleVersion, state, active, version: 1
    });
  },
  async save(record, configuration, changes = {}) {
    return saved(record, { ...changes, configuration, version: record.version + 1 });
  },
  async history() {
    return [{ id: 2, label: "2.0", created: new Date().toISOString(), author: "Usuário de demonstração" }];
  }
});

const installer = Object.freeze({
  has: (moduleId) => moduleId !== "home",
  async apply(moduleId, confirm) {
    const plan = { lists: [{ displayName: `${moduleId} - Conteúdo`, createList: true, fieldsToCreate: [{ internalName: "Exemplo" }] }] };
    return await confirm(plan) ? { status: "provisioned", plan } : { status: "cancelled", plan };
  }
});

const preview = document.querySelector("#preview");
mountAdminCenter({
  root: document.querySelector("#admin"),
  catalog: createDefaultCatalog(),
  configurationStore,
  installer,
  diagnose: async () => ({ status: "ready" }),
  provisionConfiguration: async () => ({ status: "unchanged" }),
  preview: (manifest, configuration) => {
    preview.textContent = JSON.stringify({ module: manifest.id, configuration }, null, 2);
  },
  generateSnippet: ({ moduleId, instanceId, view }) => generateMseSnippet({
    moduleId,
    instanceId,
    view,
    releaseBase: "/sites/demo/SiteAssets/mse-platform/releases/0.8.1"
  })
});
