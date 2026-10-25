import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Settings do módulo de posição `mod_articles_categories` (equivalente ao
 * `mod_articles_categories` real do Joomla!, ver
 * `web-devs\JOOMLA\modules\mod_articles_categories\mod_articles_categories.xml`).
 *
 * Diferente dos demais 5 módulos `mod_articles_*` desta Wave, este módulo
 * lista CATEGORIAS (`kernel/categories.js#buildCategoryTree`/
 * `listPublishedCategories`), não artigos — por isso não usa
 * `kernel/articles-data.js#resolveArticlesList` como dependência
 * obrigatória (só opcional, quando `numitems` está habilitado).
 *
 * MVP aceitável desta rodada (Wave 2): cobre `parent`/`show_description`/
 * `numitems`/`show_children`/`count`/`maxlevel` — os 6 campos reais do
 * fieldset "basic". Fora de escopo (fieldset "advanced" do Joomla! real,
 * mesmo critério dos demais módulos desta Wave): `layout`
 * (`item_heading`)/`moduleclass_sfx`/`owncache`/`cache_time`.
 *
 * `numitems` (contagem de artigos por categoria): quando habilitado, o
 * módulo também lê `CAMAPPublicacoes` (via
 * `kernel/articles-data.js#resolveArticlesList`) e conta artigos
 * publicados por categoria com
 * `kernel/categories.js#filterArticlesByCategory`. Se a lista de artigos
 * não estiver disponível (`services.listIds` sem nenhuma entrada
 * conhecida), o módulo degrada mostrando as categorias sem contagem, em
 * vez de falhar — ver `module.js`.
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
        { id: "numitems", type: "boolean", label: "Mostrar quantidade de artigos", default: false },
        { id: "showChildren", type: "boolean", label: "Mostrar subcategorias", default: false },
        { id: "count", type: "number", label: "Quantidade de categorias (0 = todas)", default: 0, min: 0 },
        { id: "maxlevel", type: "number", label: "Níveis (0 = todos)", default: 0, min: 0 }
      ]
    }
  ]
});

export default ARTICLES_CATEGORIES_SETTINGS_SCHEMA;
