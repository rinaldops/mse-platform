# Tags populares

Módulo de posição que renderiza as tags mais usadas entre os artigos
publicados, em lista ou nuvem (tamanho de fonte proporcional à contagem).
Equivalente ao `mod_tags_popular` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os artigos publicados via `services.adminClient` + a lista de artigos
  resolvida por `kernel/articles-data.js#resolveArticlesList` (mesmo
  contrato de `modules/mod_menu`/`modules/mod_breadcrumbs`, adaptado para a
  lista de artigos).
- Agrega a contagem de uso de cada tag com `kernel/content-services.js#aggregateTagCounts`
  (novo nesta Wave) após `filterPublished` e o recorte opcional de
  `timeframe` (`all`/`year`/`month`/`week`, por `criadoEm`).
- Ordena por `title` ou `count`, ascendente ou descendente (`orderValue`/
  `orderDirection`), limita a `maximum` tags.
- Exibe contagem numérica ao lado de cada tag quando `displayCount` está
  habilitado; mostra `noResultsText` quando não há tags.
- Nuvem (`cloud`, padrão habilitada): tamanho de fonte aproximado por 5
  classes CSS (`mse-module-tags-popular__tag--size-1` a `--size-5`),
  proporcional à contagem dentro do conjunto exibido.
- Link de cada tag aponta para a rota raiz com a tag na query string
  (`#/?tag=<nome>`), via `kernel/router.js#serializeRoute` — não há rota
  dedicada por tag no kernel hoje.
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites (MVP)

- `parentTag` do Joomla! real fica fora: `MSETags` não é hierárquico (ver
  `kernel/schemas/mse-tags.js`), não há "tag-pai" para filtrar.
- `minsize`/`maxsize` (pixels exatos), `layout`, `moduleclass_sfx`,
  `owncache`/`cache_time` do Joomla! real ficam fora — sem layout
  alternativo nem cache próprio por módulo hoje; a nuvem usa 5 níveis de
  classe CSS em vez de tamanho de fonte calculado em pixels.

Execute `npm --prefix modules/mod_tags_popular test` a partir da raiz.
