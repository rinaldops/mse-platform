# com_config — Configuração global (reservado)

Pasta reservada para o componente `com_config` (Configuração global) do
Administrator, seguindo a convenção de diretórios do Joomla!
(`components/com_xxx/`).

**Fora de escopo de implementação** nesta rodada — decisão já tomada antes
da normalização Joomla! (ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`). A
rota `option=com_config` renderiza apenas uma tela placeholder
(`config-screen.js`, via `components/_shared/collection-view.js#renderPlaceholderScreen`),
sem nenhuma fonte de dados real conectada.
