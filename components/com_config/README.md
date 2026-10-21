# com_config — Configuração global

Componente `com_config` (Configurações do site) do Administrator, seguindo a
convenção de diretórios do Joomla! (`components/com_xxx/`).

CRUD completo sobre a lista `MSEConfiguracoes` (`kernel/admin-data.js`),
cobrindo os 3 escopos suportados por `core/provisioning.js#CONFIGURATION_LIST_SCHEMA`
e `core/configuration-store.js` (`Global`, `Instancia`, `Extensao`). Os nomes
de campo permanecem em **português** deliberadamente — a normalização
Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`) marcou `MSEConfiguracoes`
como Fase 3b, fora de escopo da renomeação PT→EN já aplicada a
`MSEMenu`/`MSEModules`/`MSEExtensions`.

Sem exclusão pela UI: o registro `Global` é obrigatório para o site
funcionar (`kernel/site-config.js#loadGlobalConfig`) e os demais registros
seguem o mesmo princípio de edição/desativação (campo `Ativo`) em vez de
remoção física, evitando órfãos em `core/configuration-store.js`.

Ver `config-editor.js` para a validação (`validateConfigurationValues`) e
`test/` para a cobertura.
