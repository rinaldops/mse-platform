# com_config — Configuração global

Componente `com_config` (Configurações do site) do Administrator, seguindo a
convenção de diretórios do Joomla! (`components/com_xxx/`).

CRUD completo sobre a lista `MSEConfiguracoes` (`kernel/admin-data.js`),
cobrindo os 3 escopos suportados por `core/provisioning.js#CONFIGURATION_LIST_SCHEMA`
e `core/configuration-store.js` (`Global`, `Instance`, `Extension`).

Fase 3b da normalização Joomla! (23/10/2026,
`docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.8): os 8 campos com consumidor real
confirmado em `core/configuration-store.js#loadPublished` (`Scope`/`Module`/
`Theme`/`ConfigurationJson`/`State`/`Active`/`ExtensionElement`/`Layout`)
foram traduzidos para inglês e são os nomes que este editor lê/grava. Os 4
campos restantes (`TipoInstancia`/`VersaoConfiguracao`/`VersaoSettings`/
`VersaoModulo`) continuam em português — sem consumidor confirmado nesta
rodada. Os equivalentes PT dos 8 campos migrados (`Escopo`/`Modulo`/`Tema`/
`ConfiguracaoJson`/`Estado`/`Ativo`/`ExtensaoElemento`) continuam vivos no
schema real (gravados lado a lado por `core/provisioning.js`), marcados
`DEPRECATED`, sem leitor novo.

Sem exclusão pela UI: o registro `Global` é obrigatório para o site
funcionar (`kernel/site-config.js#loadGlobalConfig`) e os demais registros
seguem o mesmo princípio de edição/desativação (campo `Active`) em vez de
remoção física, evitando órfãos em `core/configuration-store.js`.

Ver `config-editor.js` para a validação (`validateConfigurationValues`) e
`test/` para a cobertura.
