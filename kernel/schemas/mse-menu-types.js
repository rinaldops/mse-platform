/**
 * Esquema declarativo da lista MSEMenuTypes (Site Kernel) — versão em
 * inglês, substituindo `kernel/schemas/mse-menu.js#MSE_MENU_TIPOS_SCHEMA`
 * (Fase 3 da normalização Joomla!, `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`).
 *
 * MSEMenuTypes ≈ Joomla! #__menu_types. Tradução 1:1: Chave→Key,
 * Descricao→Description.
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_MENU_TYPES_SCHEMA = defineListSchema({
  key: "mse-menu-types",
  internalName: "MSEMenuTypes",
  displayName: "MSE Menu types",
  titleField: { displayName: "Title", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Key",
      displayName: "Key",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 64
      // ≈ Chave. kebab-case (ex.: "principal", "rodape").
    },
    {
      internalName: "Description",
      displayName: "Description",
      type: "Note",
      required: false,
      lines: 4
      // ≈ Descricao.
    }
  ]
});
