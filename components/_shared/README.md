# components/_shared — infraestrutura interna (não é um componente Joomla!)

Prefixo `_` por não ser um componente Joomla! de fato (não tem
`option=com_xxx` próprio) — é infraestrutura interna compartilhada entre
componentes do Administrator, mesma convenção de pastas do workspace para
esse tipo de conteúdo (ver `AGENTS.md` da raiz VSTO: `_docs/`, `_scripts/`,
`_skills/` nos agregadores `app-devs/`/`web-devs/`).

Conteúdo atual:

- `collection-view.js#renderPlaceholderScreen` — tela placeholder comum
  usada por `com_config`/`com_installer` enquanto essas duas telas
  permanecem fora de escopo de implementação (título + parágrafo
  informativo, sem fonte de dados real).

Histórico: esta pasta nasceu durante a Fase 1 da normalização Joomla!
(ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`), quando o antigo
`administrator/screens/collections.js` foi dividido em um arquivo por
componente (`com_extensions`, `com_menus`, `com_modules`, `com_config`,
`com_installer`). O arquivo original também continha um caminho
`LIST_BINDINGS`/`renderListPanel` (tabela somente-leitura genérica) que se
mostrou código morto em tempo de execução — `renderCollectionScreen`
sempre interceptava `com_extensions`/`com_menus`/`com_modules` mais acima
na mesma cadeia if/else, delegando para o editor CRUD de cada um antes de
chegar a esse caminho — por isso não foi migrado para cá.
