# Artigos — Lista de Categorias

Módulo de posição que lista categorias de artigos (hierárquico, com
descrição e contagem de artigos opcionais). Equivalente ao
`mod_articles_categories` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê as categorias via `services.adminClient` + `services.listIds.MSECategories`
  (`kernel/categories.js#buildCategoryTree`).
- Parâmetros: `parent` (Id/Alias/Título — restringe a árvore a partir dessa
  categoria), `showDescription`, `showChildren` (mostra subcategorias),
  `count` (limite de categorias no nível exibido) e `maxlevel` (limite de
  profundidade).
- O piloto não calcula contagem de conteúdo; essa dependência será avaliada em
  contrato separado, sem ampliar o escopo da primeira lista migrada.
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites

Diferente dos demais módulos `mod_articles_*` desta Wave, este módulo lista
CATEGORIAS, não artigos. Campos de apresentação do Joomla! real
(`item_heading`/`layout`, `moduleclass_sfx`, cache) ficam fora do escopo
desta rodada — ver o cabeçalho de `articles-categories-settings-schema.js`.

Execute `npm --prefix modules/mod_articles_categories test` a partir da
raiz.
