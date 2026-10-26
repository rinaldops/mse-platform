import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Settings do módulo de posição `mod_articles_categories` (equivalente ao
 * `mod_articles_categories` real do Joomla!, ver
 * `web-devs\JOOMLA\modules\mod_articles_categories\mod_articles_categories.xml`).
 *
 * Diferente dos demais 5 módulos `mod_articles_*` desta Wave, este módulo
 * lista CATEGORIAS (`kernel/categories.js#buildCategoryTree`/
 * `listPublishedCategories`), não artigos. O piloto usa somente a nova lista
 * `mseCategories`; contagens dependentes de conteúdo ficam fora deste gate.
 *
 * MVP aceitável desta rodada: cobre `parent`/`show_description`/
 * `show_children`/`count`/`maxlevel` — os parâmetros de apresentação da árvore
 * fieldset "basic". Fora de escopo (fieldset "advanced" do Joomla! real,
 * mesmo critério dos demais módulos desta Wave): `layout`
 * (`item_heading`)/`moduleclass_sfx`/`owncache`/`cache_time`.
 *
 */
export const ARTICLES_CATEGORIES_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "articles-categories",
      label: "Artigos — Lista de Categorias",
      fields: [
        {
          id: "parent",
          type: "text",
          label: "Categoria pai (Id, Alias ou Título)",
          help: "Deixe vazio para listar a partir da raiz (todas as categorias de nível superior)."
        },
        { id: "showDescription", type: "boolean", label: "Mostrar descrição", default: false },
        { id: "showChildren", type: "boolean", label: "Mostrar subcategorias", default: false },
        { id: "count", type: "number", label: "Quantidade de categorias (0 = todas)", default: 0, min: 0 },
        { id: "maxlevel", type: "number", label: "Níveis (0 = todos)", default: 0, min: 0 }
      ]
    }
  ]
});

export default ARTICLES_CATEGORIES_SETTINGS_SCHEMA;
