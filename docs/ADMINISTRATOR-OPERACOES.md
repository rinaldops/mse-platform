# Operações estruturais do Administrator

Branch: `feature/administrator-editorial-operations`

## Escopo entregue nesta etapa

- `com_menus`: CRUD de `MSEMenu`, com validação de alias, hierarquia,
  `ParamsJson`, estado, janela padrão e proteção da rota padrão contra exclusão.
- `com_modules`: CRUD de `MSEModules`, com validação de posição, tipo técnico,
  ordem, vigência, atribuição por menu e parâmetros.
- `com_extensions`: CRUD de `MSEExtensions`, com validação de tipo/elemento e
  bloqueio de desabilitação/exclusão de extensões protegidas.
- `com_config`: CRUD de `MSEConfiguracoes` (escopos Global/Instancia/Extensao),
  com validação de chave, módulo/elemento obrigatórios por escopo e
  configuração JSON.
- `com_installer`: inspeção/verificação/aplicação do provisionamento das
  listas do kernel via `kernel/installer.js#createKernelInstaller`, com
  confirmação explícita antes de qualquer escrita.
- `com_content`: filtros locais por termo, estado, categoria, destaque e
  vigência; funções puras de transição editorial.
- `com_diagnostics`: diagnóstico read-only de rotas, extensões, módulos,
  posições e rota padrão.
- permissões nativas: adaptador REST para `EffectiveBasePermissions` e
  normalização de leitura/escrita/gerenciamento. Não há ACL própria.

## Contratos e segurança

As telas recebem `adminClient` e `listIds` por injeção. A resolução de listas
continua fora das telas. Atualização e exclusão usam `kernel/admin-data.js`, que
lê a ETag imediatamente antes da operação. Erros 403 e 412 são apresentados ao
usuário sem ocultar a falha. O conteúdo HTML do Publicador continua sanitizado.

Os nomes das listas e campos seguem o contrato do Mini Joomla!/SharePoint, já
normalizado para a convenção Joomla! (inglês — ver
`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`): `MSEMenu`, `MSEModules`,
`MSEExtensions` e campos declarados em `kernel/schemas/`. `MSEMenu` ainda
mantém, lado a lado, os 12 campos em português (DEPRECATED, decomissionamento
pendente) e os 9 campos em inglês — só os últimos são lidos pelo código atual.
`MSEConfiguracoes` permanece inteiramente em português (Fase 3b, fora de
escopo da normalização — ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`). A
consulta de permissões usa somente o mecanismo nativo do SharePoint; não
substitui nem simula ACL.

## Testes

Foram adicionados testes para validação e CRUD de menus, módulos, extensões e
configurações, para inspeção/aplicação do instalador, filtros e transições do
Publicador, diagnóstico e permissões. O `npm test` completo foi executado com
sucesso, incluindo os testes existentes do core, kernel, host-adapter,
migrações e Administrator.

## Pendências conscientes

- A consulta de permissões depende de o host-adapter injetar o client REST
  configurado; nenhum acesso ao tenant é executado automaticamente.
- A integração visual permanece separada desta branch e sob responsabilidade
  da equipe de layout.
- Publicação no tenant, migração com `--apply`, merge para `main` e validação
  visual autenticada continuam fora desta alteração local.

## Próximo passo

Integrar o host-adapter com os serviços já existentes, validar a montagem da
rota `#/administrator` em ambiente local e então executar uma revisão de
contratos antes de qualquer publicação.
