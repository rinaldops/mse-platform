# Busca

Módulo de posição que exibe uma caixa de busca client-side. Equivalente MVP
ao `mod_finder` do Joomla! (no Joomla! real não existe um "mod_search"
separado — `mod_finder` É a caixa de busca).
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Carrega a lista inteira de artigos UMA vez no mount, via
  `kernel/articles-data.js#resolveArticlesList` + `createArticlesReadService`
  (mesmo contrato de serviços da família `mod_articles_*`: `services.adminClient`
  + `services.listIds`).
- Ao digitar/submeter, filtra os artigos já carregados EM MEMÓRIA — sem nova
  chamada de rede por tecla — por substring case-insensitive em título,
  resumo ou alguma tag (`search-data.js#filterArticles`).
- Mostra os resultados na própria área do módulo (sem rota de resultados
  dedicada), como uma lista de títulos linkados via
  `kernel/router.js#serializeRoute`.
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).
- Configurável (`search-settings-schema.js`): texto de ajuda do campo de
  busca e número máximo de resultados exibidos.

## Limites (decisão de escopo — MVP)

Este módulo NÃO é um motor de indexação full-text (sem mapas de termos,
tokens ou ranking de relevância, ao contrário do `mod_finder`/`com_finder`
reais do Joomla!). É uma busca simples client-side, mesmo princípio de
`components/com_cpanel/administrator-toolbar.js` (busca por termo livre,
sem filtros persistentes avançados). Sem paginação de resultados — apenas
um limite (`maxResults`) do total exibido. Sem integração com
`components/com_finder` (filtros de busca salvos do Administrator) nesta
rodada.

Execute `npm --prefix modules/mod_search test` a partir da raiz.
