import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Settings do módulo de posição `mod_articles_latest` — equivalente ao
 * `mod_articles_latest` real do Joomla! (ver `web-devs\JOOMLA\modules\mod_articles_latest\mod_articles_latest.xml`).
 *
 * MVP aceitável desta rodada (Wave 2): cobre o essencial de `catid`/`count`/
 * `show_featured`/`ordering` — os 4 campos que de fato mudam o conjunto/a
 * ordem dos artigos exibidos. Campos "avançados" do Joomla! real
 * (`layout`, `moduleclass_sfx`, `cache`/`cache_time`/`cachemode`) ficam FORA
 * do settings-schema nesta rodada (sem equivalente de layout alternativo /
 * cache próprio no Site Kernel hoje). `user_id`/`author` também ficam fora:
 * exigiriam um campo de autor no shape de domínio de `kernel/article-mapper.js`,
 * que não existe hoje — não é um gap específico deste módulo, então não é
 * resolvido aqui (ver cabeçalho de `kernel/article-mapper.js`).
 *
 * Limites conhecidos de `ordering`: o Joomla! real oferece 5 opções
 * (data de criação/modificação/publicação/toque, e aleatório). O shape de
 * domínio de artigos (`kernel/article-mapper.js`) só expõe `criadoEm`
 * (Created nativo) e `titulo` — sem data de modificação/toque nem contagem
 * de acesso — então só "mais recentes" (`criadoEm` desc, via
 * `kernel/content-services.js#sortByDate`) e "título" (alfabético) são
 * oferecidos aqui.
 */
export const ARTICLES_LATEST_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "articles-latest",
      label: "Artigos — Mais recentes",
      fields: [
        {
          id: "categoriaId",
          type: "text",
          label: "Categoria (Id, Alias ou Título)",
          help: "Deixe vazio para listar artigos de qualquer categoria."
        },
        { id: "count", type: "number", label: "Quantidade de itens", default: 5, min: 1 },
        {
          id: "showFeatured",
          type: "select",
          label: "Destacados",
          options: ["todos", "somenteDestacados", "ocultarDestacados"],
          optionLabels: { todos: "Mostrar todos", somenteDestacados: "Somente destacados", ocultarDestacados: "Ocultar destacados" },
          default: "todos"
        },
        {
          id: "ordering",
          type: "select",
          label: "Ordenar por",
          options: ["maisRecentes", "titulo"],
          optionLabels: { maisRecentes: "Mais recentes", titulo: "Título" },
          default: "maisRecentes"
        }
      ]
    }
  ]
});

export default ARTICLES_LATEST_SETTINGS_SCHEMA;
