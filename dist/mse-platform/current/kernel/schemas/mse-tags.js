/**
 * Esquema declarativo da lista MSETags (Site Kernel) — sustenta o
 * componente `components/com_tags` do Administrator.
 *
 * Segue o mesmo formato de `defineListSchema` em `core/list-provisioning.js`
 * já usado por `kernel/schemas/mse-modules.js`: objeto normalizado/congelado
 * com `key`, `internalName`, `displayName`, `titleField` e `fields[]`.
 *
 * MSETags ≈ Joomla! #__tags. Ao contrário de categorias
 * (`kernel/schemas/mse-categories.js`, quando existir), tags no Joomla! real
 * NÃO têm hierarquia de pai — por isso este schema não inclui
 * `ParentId`/`Level`.
 *
 * Referências:
 * - mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4, 4.1 e 5.
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_TAGS_SCHEMA = defineListSchema({
  key: "mse-tags",
  internalName: "MSETags",
  displayName: "MSE Tags",
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
      // ≈ #__tags.alias.
    },
    {
      internalName: "Description",
      displayName: "Description",
      type: "Note",
      required: false,
      lines: 4
      // ≈ #__tags.description.
    },
    {
      internalName: "Published",
      displayName: "Published",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Published", "Unpublished", "Trashed"],
      defaultValue: "Published"
      // ≈ #__tags.published.
    },
    {
      internalName: "Ordering",
      displayName: "Ordering",
      type: "Number",
      required: false,
      min: 0,
      defaultValue: 0
      // ≈ #__tags.lft (ordenação simples — tags não têm hierarquia de árvore).
    },
    {
      internalName: "ParamsJson",
      displayName: "Parameters (JSON)",
      type: "Note",
      required: false,
      lines: 8
      // ≈ #__tags.params.
    }
  ]
});
