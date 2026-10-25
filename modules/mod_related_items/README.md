# Artigos relacionados

Módulo de posição que renderiza artigos relacionados ao artigo/item
atualmente em exibição, a partir da rota ativa. Equivalente ao
`mod_related_items` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os artigos publicados via `services.adminClient` + a lista de artigos
  resolvida por `kernel/articles-data.js#resolveArticlesList` (mesmo
  contrato de `modules/mod_tags_popular`/`modules/mod_tags_similar`).
- Resolve o artigo ativo a partir de `context.route` (`id`/`slug`), dentro
  da lista de artigos já carregada — mesmo princípio de
  `modules/mod_tags_similar/similar-data.js#findActiveArticle`.
- Considera "relacionado" qualquer artigo publicado (exceto o próprio) que
  compartilhe ao menos 1 tag com o artigo ativo.
- Ordena por data de criação (`criadoEm`) descendente, limita a `maximum`
  artigos.
- Mostra a data de criação ao lado do título quando `showDate` está
  habilitado.
- Mostra `noResultsText` quando não há artigo ativo identificável (ex.:
  página inicial) ou quando não há nenhum artigo relacionado — nunca lança
  erro.
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites (MVP)

- O Joomla! real casa artigos pelo campo livre `metakey` (palavras-chave
  separadas por vírgula, comparação `LIKE`, permitindo correspondência
  parcial de substring). `MSEPublicacoes` não tem campo equivalente a
  `metakey` — este MVP usa o array `tags` já existente (mesmo campo lógico
  de `mod_tags_similar`) como substituto, com comparação por IGUALDADE de
  string de tag (não substring).
- `layout`, `moduleclass_sfx`, `owncache`/`cache_time` do Joomla! real ficam
  fora — sem layout alternativo nem cache próprio por módulo hoje.
- Links de artigo usam `alias: ""` (rota raiz) + `id`/`slug`: não há uma
  rota fixa de "artigo" no kernel hoje (o alias depende do item de menu que
  expõe o artigo).

Execute `npm --prefix modules/mod_related_items test` a partir da raiz.
