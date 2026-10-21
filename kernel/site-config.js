/**
 * Camada fina de nomenclatura sobre `core/configuration-store.js`, para o
 * Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seção 4,
 * `kernel/site-config.js`: "configuração global (escopo global/extensão)";
 * seção 4.1, item "Persistência" — `MSEConfiguracoes` v3 acrescenta os
 * escopos global e por extensão).
 *
 * Este módulo NÃO faz `fetch`, não conhece SharePoint e não instancia
 * `createSharePointConfigurationStore(...)`. Ele recebe, por injeção de
 * dependência, um `store` já criado por quem chama (mesmo padrão usado
 * pelos demais wrappers do kernel) e só valida a FORMA desse `store` e dos
 * parâmetros recebidos antes de delegar à função correspondente. A
 * validação de conteúdo (ex.: formato de `elemento`/`moduleId`/`instanceId`)
 * já é feita dentro de `core/configuration-store.js` (função `instanceKey`)
 * e não é duplicada aqui.
 *
 * Decisão sobre migração de settings (ver tarefa de K5, item 3): NENHUMA
 * migração de dados é necessária nesta fase. O schema v3 de `MSEConfiguracoes`
 * (`core/provisioning.js`, `CONFIGURATION_LIST_SCHEMA`) é aditivo — a choice
 * `"Extensao"` do campo `Escopo` e o novo campo `ExtensaoElemento` são
 * adições; nenhum item de configuração v2 existente (`Escopo: "Global"` ou
 * `"Instancia"`) deixa de ser válido ou muda de forma. `core/settings-migrations.js`
 * (`defineSettingsMigrations`/`migrateSettings`) continua sendo a infraestrutura
 * genérica correta para quando um módulo específico precisar migrar o
 * conteúdo de `ConfiguracaoJson` entre versões de settings — mas isso é
 * decisão de cada módulo (via sua própria `VersaoSettings`), não algo que o
 * wrapper de leitura `site-config.js` precise fazer por conta própria.
 *
 * @typedef {object} ConfigurationStoreLike
 * @property {() => Promise<object>} loadGlobal
 * @property {(elemento: string) => Promise<object>} loadExtension
 * @property {(args: { moduleId: string, instanceId: string }) => Promise<object>} load
 */

/**
 * Valida que `store` tem a forma mínima esperada (as três funções usadas por
 * este módulo). Lança `TypeError` com mensagem clara caso contrário — este é
 * o único papel de validação deste módulo quanto ao `store` em si; o
 * conteúdo dos parâmetros de cada chamada é validado nas funções abaixo.
 *
 * @param {ConfigurationStoreLike} store
 * @param {"loadGlobal"|"loadExtension"|"load"} method
 */
function assertStoreMethod(store, method) {
  if (!store || typeof store !== "object") {
    throw new TypeError("store é obrigatório e deve ser um objeto com os métodos de core/configuration-store.js.");
  }
  if (typeof store[method] !== "function") {
    throw new TypeError(`store inválido: esperado um método "${method}()" (ver createSharePointConfigurationStore em core/configuration-store.js).`);
  }
}

/**
 * Carrega a configuração de escopo global (`Escopo: "Global"` em
 * `MSEConfiguracoes`), delegando a `store.loadGlobal()`.
 *
 * @param {ConfigurationStoreLike} store
 * @returns {Promise<object>}
 */
export function loadGlobalConfig(store) {
  assertStoreMethod(store, "loadGlobal");
  return store.loadGlobal();
}

/**
 * Carrega a configuração de escopo "Extensao" para o `elemento` informado
 * (item de `MSEConfiguracoes` com `Escopo: "Extensao"` e
 * `ExtensaoElemento === elemento`, case-insensitive), delegando a
 * `store.loadExtension(elemento)`.
 *
 * @param {ConfigurationStoreLike} store
 * @param {string} elemento
 * @returns {Promise<object>}
 */
export function loadExtensionConfig(store, elemento) {
  assertStoreMethod(store, "loadExtension");
  if (typeof elemento !== "string" || elemento.trim() === "") {
    throw new TypeError("elemento é obrigatório e deve ser uma string não vazia.");
  }
  return store.loadExtension(elemento);
}

/**
 * Carrega a configuração de escopo "Instancia" para o par `moduleId`/`instanceId`
 * informado, delegando a `store.load({ moduleId, instanceId })`.
 *
 * @param {ConfigurationStoreLike} store
 * @param {{ moduleId: string, instanceId: string }} args
 * @returns {Promise<object>}
 */
export function loadInstanceConfig(store, { moduleId, instanceId } = {}) {
  assertStoreMethod(store, "load");
  if (typeof moduleId !== "string" || moduleId.trim() === "") {
    throw new TypeError("moduleId é obrigatório e deve ser uma string não vazia.");
  }
  if (typeof instanceId !== "string" || instanceId.trim() === "") {
    throw new TypeError("instanceId é obrigatório e deve ser uma string não vazia.");
  }
  return store.load({ moduleId, instanceId });
}
