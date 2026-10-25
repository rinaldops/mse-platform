import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Settings do módulo de posição `mod_articles_popular` ("Mais acessados" —
 * equivalente ao `mod_articles_popular` real do Joomla!, ver
 * `web-devs\JOOMLA\modules\mod_articles_popular\mod_articles_popular.xml`).
 *
 * MVP aceitável desta rodada (Wave 2) — e LIMITE CONHECIDO MAIS IMPORTANTE
 * deste módulo específico: o Joomla! real ordena por `a.hits` (contador de
 * acessos por artigo, incrementado a cada visualização). O shape de
 * domínio de artigos (`kernel/article-mapper.js`) e o Publicador
 * (`kernel/publisher-data.js`) NÃO possuem um contador de acessos — não há
 * telemetria de visualização nesta plataforma hoje. Este módulo portanto
 * NÃO implementa "popularidade" de verdade: ordena por `criadoEm` (mais
 * recentes primeiro), igual a `mod_articles_latest`, como aproximação
 * aceitável até que um contador de acessos real exista. Documentado
 * explicitamente em README.md/USAGE.md para não criar uma falsa expectativa
 * de "Mais lidos" baseado em acessos reais.
 *
 * Cobre `catid`/`count`/`show_front`/filtro de data
 * (`date_filtering`/`date_field`/`start_date_range`/`end_date_range`/
 * `relative_date`, via `kernel/content-services.js#filterByDateWindow`,
 * mesma função reaproveitada por `mod_articles_category`). Fora de escopo:
 * `layout`/`moduleclass_sfx`/`cache`/`cache_time`/`cachemode` (avançados,
 * mesmo critério dos demais módulos desta Wave).
 */
export const ARTICLES_POPULAR_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "articles-popular",
      label: "Artigos — Mais acessados",
      fields: [
        {
          id: "categoriaId",
          type: "text",
          label: "Categoria (Id, Alias ou Título)",
          help: "Deixe vazio para listar artigos de qualquer categoria."
        },
        { id: "count", type: "number", label: "Quantidade de itens", default: 5, min: 1 },
        { id: "showFront", type: "boolean", label: "Mostrar destacados", default: true },
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
        { id: "relativeDate", type: "number", label: "Dias relativos", default: 30, min: 1 }
      ]
    }
  ]
});

export default ARTICLES_POPULAR_SETTINGS_SCHEMA;
