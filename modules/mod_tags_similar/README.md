# Artigos similares (por tags)

Módulo de posição que renderiza artigos que compartilham tags com o
artigo/item atualmente em exibição, a partir da rota ativa. Equivalente ao
`mod_tags_similar` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os artigos publicados via `services.adminClient` + a lista de artigos
  resolvida por `kernel/articles-data.js#resolveArticlesList` (mesmo
  contrato de `modules/mod_tags_popular`).
- Resolve o artigo ativo a partir de `context.route` (`id`/`slug`), dentro
  da lista de artigos já carregada — mesmo princípio de
  `modules/mod_breadcrumbs/module.js` (que resolve o item de MENU ativo via
  `kernel/menu.js#findActiveMenuItem`), mas aqui para o ARTIGO.
- Considera "similar" qualquer artigo publicado (exceto o próprio) que
  compartilhe ao menos 1 tag com o artigo ativo (`matchType: "any"`, único
  critério do MVP).
- Ordena por `title` ou `date` (`criadoEm`), limita a `maximum` artigos.
- Mostra `noResultsText` quando não há artigo ativo identificável (ex.:
  página inicial) ou quando não há nenhum artigo similar — nunca lança erro.
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites (MVP)

- `matchtype` do Joomla! real só implementa `"any"` — `"all"`/`"half"` ficam
  fora.
- `layout`, `moduleclass_sfx`, `owncache`/`cache_time` do Joomla! real ficam
  fora — sem layout alternativo nem cache próprio por módulo hoje.
- Links de artigo usam `alias: ""` (rota raiz) + `id`/`slug`: não há uma
  rota fixa de "artigo" no kernel hoje (o alias depende do item de menu que
  expõe o artigo).

Execute `npm --prefix modules/mod_tags_similar test` a partir da raiz.
