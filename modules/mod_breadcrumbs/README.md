# Trilha de navegação

Módulo de posição que renderiza a trilha de navegação (breadcrumbs) do item
de menu ativo, a partir da lista `MSEMenu`. Equivalente ao `mod_breadcrumbs`
do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os itens publicados de `MSEMenu` via `services.adminClient` +
  `services.listIds.MSEMenu` (mesmo contrato usado por `modules/mod_menu`).
- Encontra o item ativo com `kernel/menu.js#findActiveMenuItem` (a partir de
  `context.route`) e monta a trilha raiz → item ativo com `buildPathway`.
- Último item da trilha não é um link (`aria-current="page"`); os demais
  levam ao respectivo item de menu.
- Posição padrão: `breadcrumbs` (ver `templates/mse-default/template.json`).

## Limites

Este módulo não substitui `core/navigation.js#createBreadcrumb` (usado por
outras telas com trilhas arbitrárias) — tem CSS e classes próprias,
autocontidas, sem depender de `core/core.css`.

Execute `npm --prefix modules/mod_breadcrumbs test` a partir da raiz.
