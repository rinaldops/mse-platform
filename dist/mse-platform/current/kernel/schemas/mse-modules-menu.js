/**
 * Esquema declarativo da lista MSEModulesMenu (Site Kernel) — versão em
 * inglês, substituindo `kernel/schemas/mse-modulos.js#MSE_MODULOS_MENU_SCHEMA`
 * (Fase 3 da normalização Joomla!, `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`).
 *
 * MSEModulesMenu ≈ Joomla! #__modules_menu. Tabela de junção N:N entre
 * MSEModules e MSEMenu: ModuloId→ModuleId, MenuId→MenuId (mesmo nome).
 * Só é relevante para módulos com MenuAssignment "Only"/"AllExcept" — ver
 * `kernel/positions.js#matchesMenuAssignment`.
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_MODULES_MENU_SCHEMA = defineListSchema({
  key: "mse-modules-menu",
  internalName: "MSEModulesMenu",
  displayName: "MSE Modules by menu item",
  titleField: { displayName: "Title", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "ModuleId",
      displayName: "Module",
      type: "Number",
      required: true,
      indexed: true,
      min: 0
      // ≈ ModuloId. Referencia o Id nativo de um item de MSEModules.
    },
    {
      internalName: "MenuId",
      displayName: "Menu item",
      type: "Number",
      required: true,
      indexed: true,
      min: 0
      // Referencia o Id nativo de um item de MSEMenu.
    }
  ]
});
