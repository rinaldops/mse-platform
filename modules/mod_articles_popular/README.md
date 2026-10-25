# Artigos — Mais acessados

Módulo de posição que lista artigos. Equivalente ao `mod_articles_popular`
do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os artigos via `services.adminClient` + a lista resolvida por
  `kernel/articles-data.js#resolveArticlesList`.
- Filtra somente artigos publicados, por categoria (`categoriaId`) e por
  janela de data (`dateFiltering`/`dateField`/`startDateRange`/
  `endDateRange`/`relativeDate`, via
  `kernel/content-services.js#filterByDateWindow`).
- `showFront` controla se artigos destacados entram na lista.
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites

**Importante**: o Joomla! real ordena este módulo por `hits` (contador de
acessos por artigo). Esta plataforma não possui telemetria de acessos por
artigo hoje — este módulo ordena por data de criação (mais recentes
primeiro), como aproximação, e por isso NÃO reflete popularidade real.
Campos avançados (`layout`, `moduleclass_sfx`, cache) ficam fora do escopo
desta rodada.

Execute `npm --prefix modules/mod_articles_popular test` a partir da raiz.
