import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Esquema de settings do `mod_tags_popular`, adaptado de
 * `mod_tags_popular.xml` do Joomla! real (ver cabeçalho de `popular-data.js`
 * para a correspondência completa de cada campo e o que ficou fora do MVP).
 *
 * `parentTag` (filtro por tag-pai no Joomla! original) fica FORA do MVP:
 * `kernel/schemas/mse-tags.js` documenta que MSETags não é hierárquico (sem
 * `ParentId`), então não há "tag-pai" para filtrar por aqui.
 *
 * `layout`/`owncache`/`cache_time` (Joomla! real) também ficam fora do MVP:
 * não há mecanismo de layout alternativo nem de cache próprio por módulo no
 * Site Kernel hoje.
 */
export const TAGS_POPULAR_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "tags-popular",
      label: "Tags populares",
      fields: [
        { id: "maximum", type: "number", label: "Quantidade máxima de tags", default: 5, min: 0 },
        {
          id: "timeframe",
          type: "select",
          label: "Período",
          default: "all",
          options: ["all", "year", "month", "week"],
          optionLabels: { all: "Todo o período", year: "Último ano", month: "Último mês", week: "Última semana" }
        },
        {
          id: "orderValue",
          type: "select",
          label: "Ordenar por",
          default: "count",
          options: ["title", "count"],
          optionLabels: { title: "Título", count: "Contagem" }
        },
        {
          id: "orderDirection",
          type: "select",
          label: "Direção da ordenação",
          default: "desc",
          options: ["asc", "desc"],
          optionLabels: { asc: "Crescente", desc: "Decrescente" }
        },
        { id: "displayCount", type: "boolean", label: "Mostrar contagem ao lado de cada tag", default: false },
        { id: "noResultsText", type: "text", label: "Texto quando não há tags", default: "Nenhuma tag encontrada." },
        { id: "cloud", type: "boolean", label: "Exibir como nuvem (tamanho proporcional à contagem)", default: true },
        { id: "minSize", type: "number", label: "Nível mínimo de tamanho da nuvem (1 a 5)", default: 1, min: 1, max: 5 },
        { id: "maxSize", type: "number", label: "Nível máximo de tamanho da nuvem (1 a 5)", default: 5, min: 1, max: 5 }
      ]
    }
  ]
});

export default TAGS_POPULAR_SETTINGS_SCHEMA;
