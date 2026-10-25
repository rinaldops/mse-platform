# Artigos — Mais recentes

Módulo de posição que lista os artigos publicados mais recentes. Equivalente
ao `mod_articles_latest` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os artigos via `services.adminClient` + a lista resolvida por
  `kernel/articles-data.js#resolveArticlesList` (mesmo contrato usado pelo
  Publicador, `components/com_content/publisher.js`).
- Filtra somente artigos publicados e dentro da janela de vigência
  (`kernel/content-services.js#filterPublished`).
- Parâmetros: `categoriaId` (Id/Alias/Title — ver
  `kernel/categories.js#filterArticlesByCategory`), `count` (quantidade de
  itens, padrão 5), `showFeatured` (todos/somente destacados/ocultar
  destacados) e `ordering` (mais recentes ou título).
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites

Campos avançados do Joomla! real (`layout`, `moduleclass_sfx`, `cache`/
`cache_time`/`cachemode`, filtro por autor) ficam fora do escopo desta
rodada — ver o cabeçalho de `articles-latest-settings-schema.js`. `ordering`
só cobre "mais recentes"/"título" (o shape de domínio de artigos não traz
data de modificação nem contagem de acessos).

Execute `npm --prefix modules/mod_articles_latest test` a partir da raiz.
