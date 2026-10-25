import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Esquema de settings do `mod_tags_similar`, adaptado de
 * `mod_tags_similar.xml` do Joomla! real (ver cabeçalho de `similar-data.js`
 * para a correspondência completa de cada campo e o que ficou fora do MVP).
 *
 * `matchtype`: só `"any"` (qualquer tag em comum) é implementado no MVP —
 * o comportamento mais simples e mais comumente usado no Joomla! real.
 * `"all"`/`"half"` ficam fora.
 *
 * `layout`/`owncache`/`cache_time` (Joomla! real) ficam fora do MVP: não há
 * mecanismo de layout alternativo nem de cache próprio por módulo no Site
 * Kernel hoje.
 */
export const TAGS_SIMILAR_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "tags-similar",
      label: "Artigos similares",
      fields: [
        { id: "maximum", type: "number", label: "Quantidade máxima de artigos", default: 5, min: 0 },
        {
          id: "matchType",
          type: "select",
          label: "Critério de correspondência",
          default: "any",
          options: ["any"],
          optionLabels: { any: "Qualquer tag em comum" }
        },
        {
          id: "ordering",
          type: "select",
          label: "Ordenar por",
          default: "title",
          options: ["title", "date"],
          optionLabels: { title: "Título", date: "Data de criação" }
        },
        { id: "noResultsText", type: "text", label: "Texto quando não há sugestões", default: "Nenhum artigo similar encontrado." }
      ]
    }
  ]
});

export default TAGS_SIMILAR_SETTINGS_SCHEMA;
