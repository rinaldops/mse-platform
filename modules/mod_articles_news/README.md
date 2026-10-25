# Artigos — Destaques (News Flash)

Módulo de posição que lista artigos em destaque, com resumo opcional.
Equivalente ao `mod_articles_news` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os artigos via `services.adminClient` + a lista resolvida por
  `kernel/articles-data.js#resolveArticlesList`.
- Filtra somente artigos publicados e dentro da janela de vigência.
- Parâmetros: `categoriaId`, `tag` (`kernel/content-services.js#filterByTag`),
  `count`, `showFeatured`, `excludeCurrent` (exclui o artigo da rota atual,
  via `context.route.id`), `showIntrotext` (mostra o resumo) e
  `ordering`/`direction` (data de publicação ou criação, crescente ou
  decrescente).
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites

Campos de apresentação do Joomla! real (`image`, `img_intro_full`,
`item_title`, `link_titles`, `item_heading`, `triggerevents`,
`showLastSeparator`, `readmore`/`readmore_title`, `layout`,
`moduleclass_sfx`, cache) ficam fora do escopo desta rodada — ver o
cabeçalho de `articles-news-settings-schema.js`.

Execute `npm --prefix modules/mod_articles_news test` a partir da raiz.
