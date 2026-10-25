import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Settings do módulo de posição `mod_articles_news` ("Destaques"/"News
 * Flash" — equivalente ao `mod_articles_news` real do Joomla!, ver
 * `web-devs\JOOMLA\modules\mod_articles_news\mod_articles_news.xml`).
 *
 * MVP aceitável desta rodada (Wave 2): cobre `catid`/`tag`/`count`/
 * `show_featured`/`exclude_current`/`show_introtext`/`ordering`+`direction`
 * — os campos que mudam o CONJUNTO/ORDEM/CONTEÚDO exibido. Campos
 * "avançados" ou puramente de apresentação do Joomla! real (`image`,
 * `img_intro_full`, `item_title`, `link_titles`, `item_heading`,
 * `triggerevents`, `showLastSeparator`, `readmore`, `readmore_title`,
 * `layout`, `moduleclass_sfx`, `cache`/`cache_time`/`cachemode`) ficam FORA
 * do settings-schema nesta rodada — sem equivalente de imagem de capa em
 * miniatura, layout alternativo ou cache próprio no Site Kernel hoje (a
 * view sempre mostra o título como link; `showIntrotext` já cobre a
 * necessidade central de "mostrar/ocultar resumo").
 *
 * `ordering`/`direction`: o shape de domínio de artigos
 * (`kernel/article-mapper.js`) só expõe `criadoEm` (Created nativo) e
 * `publicarDe` — sem data de modificação, `ordering`/hits nem aleatório do
 * Joomla! real — então só essas duas datas são oferecidas aqui.
 */
export const ARTICLES_NEWS_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "articles-news",
      label: "Artigos — Destaques (News Flash)",
      fields: [
        {
          id: "categoriaId",
          type: "text",
          label: "Categoria (Id, Alias ou Título)",
          help: "Deixe vazio para listar artigos de qualquer categoria."
        },
        { id: "tag", type: "text", label: "Tag", help: "Deixe vazio para não filtrar por tag." },
        { id: "count", type: "number", label: "Quantidade de itens", default: 5, min: 1 },
        {
          id: "showFeatured",
          type: "select",
          label: "Destacados",
          options: ["todos", "somenteDestacados", "ocultarDestacados"],
          optionLabels: { todos: "Mostrar todos", somenteDestacados: "Somente destacados", ocultarDestacados: "Ocultar destacados" },
          default: "todos"
        },
        { id: "excludeCurrent", type: "boolean", label: "Excluir o artigo da página atual", default: true },
        { id: "showIntrotext", type: "boolean", label: "Mostrar resumo", default: true },
        {
          id: "ordering",
          type: "select",
          label: "Ordenar por",
          options: ["dataPublicacao", "dataCriacao"],
          optionLabels: { dataPublicacao: "Data de publicação", dataCriacao: "Data de criação" },
          default: "dataPublicacao"
        },
        {
          id: "direction",
          type: "select",
          label: "Direção",
          options: ["desc", "asc"],
          optionLabels: { desc: "Decrescente", asc: "Crescente" },
          default: "desc"
        }
      ]
    }
  ]
});

export default ARTICLES_NEWS_SETTINGS_SCHEMA;
