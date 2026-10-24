/**
 * Esquema declarativo da lista MSECategories (Site Kernel).
 *
 * Segue o mesmo formato de `defineListSchema` em `core/list-provisioning.js`
 * já usado por `kernel/schemas/mse-modules.js`/`mse-menu.js`: objeto
 * normalizado/congelado com `key`, `internalName`, `displayName`,
 * `titleField` e `fields[]`.
 *
 * MSECategories ≈ Joomla! #__categories: taxonomia hierárquica de conteúdo,
 * hoje escopada só a `com_content` (`Extension` sempre `"com_content"`,
 * ver campo abaixo) — campo mantido para permitir escopo futuro por
 * componente, do mesmo jeito que o Joomla! real reaproveita `#__categories`
 * para com_content/com_contact/com_newsfeeds/etc.
 *
 * Referências:
 * - mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4 e 6.
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_CATEGORIES_SCHEMA = defineListSchema({
  key: "mse-categories",
  internalName: "MSECategories",
  displayName: "MSE Categories",
  titleField: { displayName: "Title", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Alias",
      displayName: "Alias",
      type: "Text",
      required: true,
      indexed: true,
      unique: true,
      maxLength: 128
      // ≈ Joomla! #__categories.alias.
    },
    {
      internalName: "Extension",
      displayName: "Extension",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 64
      // ≈ Joomla! #__categories.extension (ex.: "com_content"). Escopa a
      // categoria a um componente — hoje sempre "com_content", mas o
      // campo já existe para permitir escopo futuro por componente.
    },
    {
      internalName: "Description",
      displayName: "Description",
      type: "Note",
      required: false,
      lines: 4
      // ≈ Joomla! #__categories.description.
    },
    {
      internalName: "ParentId",
      displayName: "Parent category",
      type: "Number",
      required: false,
      min: 0,
      defaultValue: 0
      // Ausente/0 = categoria raiz. Mesmo princípio de
      // kernel/schemas/mse-menu.js#ParentId.
    },
    {
      internalName: "Level",
      displayName: "Level",
      type: "Number",
      required: false,
      min: 1,
      defaultValue: 1
      // ≈ Joomla! #__categories.level.
    },
    {
      internalName: "Ordering",
      displayName: "Ordering",
      type: "Number",
      required: false,
      min: 0,
      defaultValue: 0
      // ≈ Joomla! #__categories.lft/ordering (ordenação entre irmãos).
    },
    {
      internalName: "Published",
      displayName: "Published",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Published", "Unpublished", "Trashed"],
      defaultValue: "Published"
      // ≈ Joomla! #__categories.published.
    },
    {
      internalName: "ParamsJson",
      displayName: "Parameters (JSON)",
      type: "Note",
      required: false,
      lines: 8
      // ≈ Joomla! #__categories.params.
    }
  ]
});
