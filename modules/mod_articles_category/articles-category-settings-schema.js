import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Settings do módulo de posição `mod_articles_category` (equivalente ao
 * `mod_articles_category` real do Joomla!, ver
 * `web-devs\JOOMLA\modules\mod_articles_category\mod_articles_category.xml`
 * — de longe o módulo com mais parâmetros reais da família, ~30 campos
 * organizados em 4 fieldsets: filtering/ordering/grouping/display).
 *
 * MVP aceitável desta rodada (Wave 2): cobre o essencial de `catid`/`count`/
 * `show_front`/`filter_tag`/`date_filtering`+`date_field`+
 * `start_date_range`+`end_date_range`+`relative_date`/
 * `article_ordering`+`article_ordering_direction`/`show_introtext`. Fora
 * de escopo nesta rodada (sem equivalente no shape de domínio de artigos
 * ou na plataforma hoje):
 * - `mode`/`show_on_article_page`: modo "dynamic" depende de view de
 *   artigo dedicada (`view=article`), que não existe no router do Site
 *   Kernel (ver plano da Wave 2) — este módulo só implementa o
 *   equivalente ao modo "normal".
 * - `category_filtering_type`/`show_child_category_articles`/`levels`:
 *   filtro multi-categoria com inclusão/exclusão e subcategorias — este
 *   módulo aceita só UMA categoria por instância (`catid` singular, não
 *   array), mesmo MVP de `mod_articles_latest`/`mod_articles_news`.
 * - `author_filtering_type`/`created_by`/`author_alias_filtering_type`/
 *   `created_by_alias`/`excluded_articles`: exigiriam um campo de autor no
 *   shape de domínio, que não existe hoje (ver `kernel/article-mapper.js`).
 * - `article_grouping`/`date_grouping_field`/`month_year_format`/
 *   `article_grouping_direction`: agrupamento visual — fora de escopo.
 * - `link_titles`/`show_date`+`show_date_field`+`show_date_format`/
 *   `show_category`/`show_hits`/`show_author`/`show_tags`/
 *   `introtext_limit`/`show_readmore`+`show_readmore_title`+
 *   `readmore_limit`: campos de apresentação — só `show_introtext` (central
 *   para decidir se mostra resumo) é coberto.
 * - `layout`/`moduleclass_sfx`/`owncache`/`cache_time`: avançados, mesmo
 *   critério dos outros módulos desta Wave.
 */
export const ARTICLES_CATEGORY_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "articles-category",
      label: "Artigos — Categoria",
      fields: [
        {
          id: "categoriaId",
          type: "text",
          label: "Categoria (Id, Alias ou Título)",
          help: "Deixe vazio para listar artigos de qualquer categoria."
        },
        { id: "count", type: "number", label: "Quantidade de itens (0 = todos)", default: 0, min: 0 },
        {
          id: "showFront",
          type: "select",
          label: "Destacados",
          options: ["mostrar", "ocultar", "somenteDestacados"],
          optionLabels: { mostrar: "Mostrar", ocultar: "Ocultar", somenteDestacados: "Somente destacados" },
          default: "mostrar"
        },
        { id: "filterTag", type: "text", label: "Filtrar por tag", help: "Deixe vazio para não filtrar por tag." },
        {
          id: "dateFiltering",
          type: "select",
          label: "Filtro de data",
          options: ["off", "range", "relative"],
          optionLabels: { off: "Desativado", range: "Intervalo de datas", relative: "Dias relativos" },
          default: "off"
        },
        {
          id: "dateField",
          type: "select",
          label: "Campo de data",
          options: ["criadoEm", "publicarDe"],
          optionLabels: { criadoEm: "Data de criação", publicarDe: "Data de publicação" },
          default: "criadoEm"
        },
        { id: "startDateRange", type: "text", label: "Data inicial (intervalo)" },
        { id: "endDateRange", type: "text", label: "Data final (intervalo)" },
        { id: "relativeDate", type: "number", label: "Dias relativos", default: 30, min: 1 },
        {
          id: "articleOrdering",
          type: "select",
          label: "Ordenar artigos por",
          options: ["titulo", "dataCriacao", "dataPublicacao"],
          optionLabels: { titulo: "Título", dataCriacao: "Data de criação", dataPublicacao: "Data de publicação" },
          default: "titulo"
        },
        {
          id: "articleOrderingDirection",
          type: "select",
          label: "Direção",
          options: ["asc", "desc"],
          optionLabels: { asc: "Crescente", desc: "Decrescente" },
          default: "asc"
        },
        { id: "showIntrotext", type: "boolean", label: "Mostrar resumo", default: false }
      ]
    }
  ]
});

export default ARTICLES_CATEGORY_SETTINGS_SCHEMA;
