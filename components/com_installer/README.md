# com_installer — Instalador (reservado)

Pasta reservada para o componente `com_installer` (Instalador de
extensões) do Administrator, seguindo a convenção de diretórios do
Joomla! (`components/com_xxx/`).

**Fora de escopo de implementação** nesta rodada — decisão já tomada antes
da normalização Joomla! (ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`). A
rota `option=com_installer` renderiza apenas uma tela placeholder
(`installer-screen.js`, via `components/_shared/collection-view.js#renderPlaceholderScreen`),
sem nenhuma fonte de dados real conectada.
