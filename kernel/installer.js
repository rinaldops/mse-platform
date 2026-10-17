/**
 * Instalador do Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
 * Fase 3): cria/atualiza o conjunto FIXO de 5 listas SharePoint que
 * sustentam o kernel mini-Joomla! — MSEMenuTipos, MSEMenu, MSEExtensoes,
 * MSEModulos e MSEModulosMenu (`kernel/schemas/mse-menu.js`,
 * `kernel/schemas/mse-extensoes.js`, `kernel/schemas/mse-modulos.js`).
 *
 * Este arquivo é um wrapper fino sobre `inspectLists`/`provisionLists`/
 * `verifyLists` de `core/list-provisioning.js` — nenhuma lógica de
 * inspeção, criação de campos ou verificação é reimplementada aqui.
 *
 * Distinção com `admin/installer.js` (NÃO confundir numa futura Fase 5 —
 * Administrator):
 * - `admin/installer.js` (`createModuleInstaller`) é indexado por
 *   `moduleId`: o catálogo de módulos (forum, recursos, videoteca, ...) é
 *   variável e registrado em tempo de execução via `schemasByModule`.
 * - `kernel/installer.js` (`createKernelInstaller`) NÃO é indexado por
 *   nada: o kernel sempre tem exatamente este conjunto fixo de 5 listas
 *   (`KERNEL_LIST_SCHEMAS`), conhecido em tempo de build. Um futuro
 *   Administrator deve orquestrar os dois instaladores lado a lado (kernel
 *   primeiro, módulos depois) — nunca um substituindo o outro.
 */
import { inspectLists, provisionLists, verifyLists } from "../core/list-provisioning.js";
import { MSE_MENU_TIPOS_SCHEMA, MSE_MENU_SCHEMA } from "./schemas/mse-menu.js";
import { MSE_EXTENSOES_SCHEMA } from "./schemas/mse-extensoes.js";
import { MSE_MODULOS_SCHEMA, MSE_MODULOS_MENU_SCHEMA } from "./schemas/mse-modulos.js";

export const KERNEL_LIST_SCHEMAS = Object.freeze([
  MSE_MENU_TIPOS_SCHEMA,
  MSE_MENU_SCHEMA,
  MSE_EXTENSOES_SCHEMA,
  MSE_MODULOS_SCHEMA,
  MSE_MODULOS_MENU_SCHEMA
]);

/**
 * @param {{ client?: object, webUrl?: string, fetchImpl?: typeof fetch }} [options]
 * @returns {{ inspect: () => Promise<object>, apply: (confirm: (plan: object) => (boolean | Promise<boolean>)) => Promise<object>, verify: () => Promise<object> }}
 */
export function createKernelInstaller({ client, webUrl, fetchImpl } = {}) {
  const options = { schemas: KERNEL_LIST_SCHEMAS, client, webUrl, fetchImpl };
  return Object.freeze({
    inspect: () => inspectLists(options),
    apply: (confirm) => provisionLists({ ...options, confirm }),
    verify: () => verifyLists(options)
  });
}
