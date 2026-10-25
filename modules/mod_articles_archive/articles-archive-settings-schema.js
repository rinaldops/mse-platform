import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Settings do módulo de posição `mod_articles_archive` (equivalente ao
 * `mod_articles_archive` real do Joomla!, ver
 * `web-devs\JOOMLA\modules\mod_articles_archive\mod_articles_archive.xml`
 * — o módulo mais simples da família: só `count` no fieldset "basic" real).
 *
 * MVP aceitável desta rodada (Wave 2): cobre somente `count`. Campos
 * avançados (`layout`/`moduleclass_sfx`/`cache`/`cache_time`/`cachemode`)
 * ficam fora, mesmo critério dos demais módulos desta Wave.
 *
 * Limite conhecido ESPECÍFICO deste módulo: o `mod_articles_archive` real
 * do Joomla! lista MESES/ANOS com contagem de artigos, linkando para a
 * view de arquivo filtrada por período (`com_content&view=archive&year=…
 * &month=…`) — não há uma view de arquivo dedicada no router do Site
 * Kernel (ver plano da Wave 2: só `#/<alias>[/<id>-<slug>]`, sem "kind"
 * de arquivo). Este módulo, portanto, lista diretamente os artigos com
 * `estado === "Arquivado"` (mais recentes primeiro, limitados a `count`),
 * como aproximação — não agrupa por mês/ano.
 */
export const ARTICLES_ARCHIVE_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "articles-archive",
      label: "Artigos — Arquivo",
      fields: [
        { id: "count", type: "number", label: "Quantidade de itens", default: 10, min: 1 }
      ]
    }
  ]
});

export default ARTICLES_ARCHIVE_SETTINGS_SCHEMA;
