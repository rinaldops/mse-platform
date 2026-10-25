import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Esquema de settings do `mod_related_items`, adaptado de
 * `mod_related_items.xml` do Joomla! real (ver cabeçalho de
 * `related-data.js` para a correspondência completa de cada campo e o que
 * ficou fora do MVP).
 *
 * `layout`/`moduleclass_sfx`/`owncache`/`cache_time` (Joomla! real) ficam
 * fora do MVP: não há mecanismo de layout alternativo nem de cache próprio
 * por módulo no Site Kernel hoje — mesmo limite já assumido por
 * `mod_tags_popular`/`mod_tags_similar`.
 */
export const RELATED_ITEMS_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "related-items",
      label: "Artigos relacionados",
      fields: [
        { id: "maximum", type: "number", label: "Quantidade máxima de artigos", default: 5, min: 1 },
        { id: "showDate", type: "boolean", label: "Mostrar data de criação", default: false },
        { id: "noResultsText", type: "text", label: "Texto quando não há artigos relacionados", default: "Nenhum artigo relacionado encontrado." }
      ]
    }
  ]
});

export default RELATED_ITEMS_SETTINGS_SCHEMA;
