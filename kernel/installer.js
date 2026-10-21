/**
 * Instalador do Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
 * Fase 3): cria/atualiza o conjunto FIXO de listas SharePoint que
 * sustentam o kernel mini-Joomla!.
 *
 * Fase 3 da normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`):
 * `KERNEL_LIST_SCHEMAS` passou a gerir as listas em INGLÊS
 * (`MSEModules`/`MSEExtensions`/`MSEModulesMenu`/`MSEMenuTypes`) e o
 * `MSEMenu` com os campos novos em inglês acrescentados in-place — as
 * listas PT antigas (`MSEModulos`/`MSEExtensoes`/`MSEModulosMenu`/
 * `MSEMenuTipos`) e os campos PT de `MSEMenu` continuam existindo e sendo
 * lidos pelo código consumidor atual (`kernel/positions.js`,
 * `kernel/menu.js`, `kernel/extension-registry.js`, etc.) até a Fase 4
 * migrar esses consumidores; este instalador simplesmente não as
 * cria/gerencia mais. Decisão de decomissionar as listas/campos PT fica
 * para a Fase 5/limpeza — nunca excluídas por este arquivo.
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
 *   nada: o kernel sempre tem exatamente este conjunto fixo de listas
 *   (`KERNEL_LIST_SCHEMAS`), conhecido em tempo de build. Um futuro
 *   Administrator deve orquestrar os dois instaladores lado a lado (kernel
 *   primeiro, módulos depois) — nunca um substituindo o outro.
 */
import { inspectLists, provisionLists, verifyLists } from "../core/list-provisioning.js";
import { MSE_MENU_SCHEMA } from "./schemas/mse-menu.js";
import { MSE_MENU_TYPES_SCHEMA } from "./schemas/mse-menu-types.js";
import { MSE_EXTENSIONS_SCHEMA } from "./schemas/mse-extensions.js";
import { MSE_MODULES_SCHEMA } from "./schemas/mse-modules.js";
import { MSE_MODULES_MENU_SCHEMA } from "./schemas/mse-modules-menu.js";

export const KERNEL_LIST_SCHEMAS = Object.freeze([
  MSE_MENU_TYPES_SCHEMA,
  MSE_MENU_SCHEMA,
  MSE_EXTENSIONS_SCHEMA,
  MSE_MODULES_SCHEMA,
  MSE_MODULES_MENU_SCHEMA
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
