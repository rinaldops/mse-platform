# Artigos — Categoria

Módulo de posição que lista os artigos de uma categoria. Equivalente ao
`mod_articles_category` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os artigos via `services.adminClient` + a lista resolvida por
  `kernel/articles-data.js#resolveArticlesList`, e as categorias via
  `services.listIds.MSECategories`.
- Filtra somente artigos publicados, por uma categoria (`categoriaId`,
  Id/Alias/Título), por tag (`filterTag`) e por destaque (`showFront`).
- Filtro de data (`dateFiltering`/`dateField`/`startDateRange`/
  `endDateRange`/`relativeDate`) via
  `kernel/content-services.js#filterByDateWindow`.
- Ordenação por título ou data (`articleOrdering`/`articleOrderingDirection`).
- Resumo opcional (`showIntrotext`).
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites

Este é o módulo com mais parâmetros no Joomla! real (~30 campos). Nesta
rodada (MVP), ficam fora: modo "dynamic" (depende de uma view de artigo
dedicada, que não existe no router do Site Kernel), múltiplas categorias
com inclusão/exclusão e subcategorias, filtro por autor/alias, agrupamento
visual e os demais campos de apresentação/cache — ver o cabeçalho de
`articles-category-settings-schema.js` para a lista completa.

Execute `npm --prefix modules/mod_articles_category test` a partir da raiz.
