# Menu

Módulo de posição que renderiza o menu de navegação do site a partir da
lista `MSEMenu`. Equivalente ao `mod_menu` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os itens publicados de `MSEMenu` via `services.adminClient` +
  `services.listIds.MSEMenu` (mesmo contrato usado por
  `components/com_menus`).
- Monta a árvore hierárquica com `kernel/menu.js#buildMenuTree` e marca o
  item ativo (`aria-current="page"`) com `findActiveMenuItem`, a partir de
  `context.route`.
- Suporta qualquer profundidade de submenu; itens com `Target: "NewTab"`
  abrem em nova janela.
- Posição padrão: `menu-principal` (ver `templates/mse-default/template.json`).

## Limites

Este módulo não edita itens de menu — isso é feito pelo Administrator
(`components/com_menus`). Sem busca nem destaques visuais além do item
ativo.

Execute `npm --prefix modules/mod_menu test` a partir da raiz.
