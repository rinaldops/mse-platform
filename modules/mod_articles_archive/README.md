# Artigos — Arquivo

Módulo de posição que lista artigos arquivados. Equivalente ao
`mod_articles_archive` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os artigos via `services.adminClient` + a lista resolvida por
  `kernel/articles-data.js#resolveArticlesList`.
- Filtra artigos com `estado === "Arquivado"`, ordenados por data de
  criação (mais recentes primeiro), limitados a `count` (padrão 10).
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites

**Importante**: o Joomla! real agrupa o arquivo por mês/ano, linkando para
uma view de arquivo filtrada por período. O router do Site Kernel não tem
uma view dedicada de arquivo (só `#/<alias>[/<id>-<slug>]`) — este módulo
lista diretamente os artigos arquivados, sem agrupamento por período.
Campos avançados (`layout`, `moduleclass_sfx`, cache) ficam fora do escopo
desta rodada.

Execute `npm --prefix modules/mod_articles_archive test` a partir da raiz.
