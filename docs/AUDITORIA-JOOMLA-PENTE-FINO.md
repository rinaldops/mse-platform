# Auditoria pente-fino — mse-platform × convenções Joomla! (22/10/2026)

Rodada de auditoria solicitada para, além de revisar o alinhamento com as
convenções reais do Joomla! (nomes/colunas/estrutura), evoluir o mecanismo
de Templates de "1 template fixo por site" para um modelo de múltiplos
templates instaláveis, com fallback real e template formal de
Administrator — tornando o `mse-platform` reutilizável por qualquer site,
não só o CAMAP-AGP. Este documento registra o que já estava alinhado, o
que foi corrigido por esta entrega, e o que permanece deliberadamente fora
de escopo (com a razão).

Para a tabela de equivalência prática (pastas, listas, campos), ver
[`CONVENCAO-JOOMLA.md`](CONVENCAO-JOOMLA.md). Para o plano de implementação
completo (decisões, arquivos, testes), ver
[`PLANO-SITE-KERNEL-MSE.md`](PLANO-SITE-KERNEL-MSE.md) seção 3 e o
histórico de Fases. Este documento é o relatório de auditoria em si — "o
que foi comparado contra o quê, e o que ficou decidido".

## 1. Já alinhado antes desta rodada (Fases 1–4 da normalização anterior)

Confirmado por leitura direta do código, sem necessidade de correção:

- `components/com_*` / `modules/mod_*` — convenção de pastas já seguida.
- Listas SharePoint em inglês: `MSEModules`, `MSEExtensions`,
  `MSEModulesMenu`, `MSEMenuTypes` (as listas PT antigas
  `MSEModulos`/`MSEExtensoes`/`MSEModulosMenu`/`MSEMenuTipos` continuam
  vivas em produção, mas não são mais lidas pelo código).
- `MSEMenu` com os 9 campos em inglês (`MenuType`, `Path`, `Level`,
  `Ordering`, `Component`, `View`, `Default`, `Target`, `Published`) lidos
  pelo código; os 12 campos PT equivalentes continuam na lista, marcados
  `DEPRECATED` nos comentários do schema, sem remoção.
- Vocabulário de eventos `on<Área><Momento>` (`onAfterRoute`,
  `onBeforeRender`, `onAfterRender`) em `kernel/events.js`.
- Rotas administrativas `option=com_xxx&view=yyy&task=www&id=N`
  (`components/com_cpanel/router.js`).

## 2. Corrigidas por esta entrega (22/10/2026)

### 2.1 `MSEExtensions.Type` sem o valor `"Template"`

No Joomla! real, `#__extensions.type` sempre inclui `template` (templates
são extensões como qualquer componente/módulo/plugin). Na lista
`MSEExtensions`, `Type` só aceitava `Component`/`Module`/`Plugin`.
Corrigido: `kernel/schemas/mse-extensions.js#choices` ganhou `"Template"`;
`components/com_extensions/extensions-editor.js` reflete a nova opção na
UI. A lista PT `MSEExtensoes` (congelada desde a Fase 4) não foi tocada —
nenhum Template é representado nela.

### 2.2 Ausência de `#__template_styles`

O Joomla! real guarda qual template está ativo, por `client_id`
(Site/Administrator), em `#__template_styles` — não existia equivalente no
`mse-platform` (a única fonte de verdade era o campo texto solto
`MSEConfiguracoes.Tema`, sem registro de quais templates existem nem
suporte a múltiplos `ClientId`). Corrigido: nova lista `MSETemplateStyles`
(`kernel/schemas/mse-template-styles.js`), nova função pura
`kernel/template-registry.js#resolveActiveTemplateName(styles, {clientId})`.
`MSEConfiguracoes.Tema` continua existindo como fallback de
compatibilidade enquanto um site não tiver migrado para a lista nova (ver
`tools/migrate-create-template-styles.js`).

### 2.3 Ausência de `com_templates`

O Joomla! real tem uma tela de Administrator dedicada a templates
instalados (`administrator/components/com_templates/`). O `mse-platform`
não tinha nenhuma — a troca de template só era possível editando o texto
cru de `MSEConfiguracoes.Tema`. Corrigido: `components/com_templates/`
(`templates-screen.js` + `templates-editor.js`), listado no roteador do
Administrator e no link de navegação do shell.

### 2.4 Ausência de template de Administrator

O Joomla! real tem um template de backend formal (`atum`) com
cabeçalho+navegação persistentes em toda tela administrativa. No
`mse-platform`, cada `*-screen.js` (`com_config`, `com_content` publisher,
`com_diagnostics`, `com_extensions`, `com_installer`, `com_menus`,
`com_modules`) desenhava seu próprio `<section class="mse-administrator__panel">`
isolado — só a tela inicial (`control-panel.js`) tinha um `<nav>` próprio,
então ao entrar em qualquer outra tela não havia como voltar/trocar de
seção sem editar a URL manualmente. Corrigido:
`components/com_cpanel/administrator-shell.js` — shell único, montado uma
vez por navegação por `component.js#mount`, injetando a tela ativa em
`shell.contentElement`.

### 2.5 `mse-platform` sem template visual próprio publicável

O `mse-platform` nunca publicou um template de SITE com design real — só
o fallback técnico `templates/system` (sem grade de posições nem
identidade visual), equivalente ao Joomla! nunca ter tido um `cassiopeia`.
Isso impedia que um novo site consumidor (sem criar seu próprio template
do zero) tivesse qualquer fallback visual coerente. Corrigido: novo pacote
`templates/mse-default/`, layout genérico inspirado no template padrão do
Joomla! (header/nav, breadcrumbs, grade de posições, rodapé — sem
identidade visual de nenhum consumidor), publicado pela PLATAFORMA (não
por um site), usado como 2º nível do fallback de 3 níveis.

### 2.6 Fallback de template de 1 nível só

Antes: `[requestedName, "system"]` — se o template do site falhasse, caía
direto no fallback técnico (sem grade de posições/identidade visual).
Corrigido: fallback de 3 níveis
(`host-adapters/modern-script-editor/site-boot.js#createTemplateLayoutResolver`):
template do site (se configurado) → `mse-default` (fallback visual
genérico da plataforma) → `system` (fallback técnico mínimo, última
rede de segurança antes do layout neutro de `kernel/application.js`).

## 2.7 Lacunas Alta/Média fechadas nesta rodada (planejamento pós-auditoria)

A rodada de auditoria acima identificou 4 lacunas Alta/Média ainda abertas
depois das correções de 2.1–2.6; esta entrega fecha ou formaliza cada uma:

- **Alta — `MSEExtensions` sem `ClientId`.** No Joomla! real,
  `#__extensions.client_id` existe desde sempre; `MSEExtensions` não tinha
  equivalente — toda extensão era implicitamente "Site", mesmo
  `Element: "administrator"` (claramente de Administrator). Corrigido:
  campo `ClientId` (`Choice` `["Site","Administrator"]`, default `"Site"`,
  mesmo shape de `MSETemplateStyles.ClientId`) em
  `kernel/schemas/mse-extensions.js`; nova função pura
  `kernel/extension-registry.js#listByClientId`; UI em
  `components/com_extensions/extensions-editor.js`; backfill de produção em
  `tools/migrate-extensions-client-id.js` (idempotente por `Element`, nunca
  sobrescreve uma classificação manual já existente).
- **Média — `MSETemplateStyles.Home` Boolean vs. `home char(7)`.** Decisão:
  documentar, não implementar código — o `mse-platform` não tem conceito
  de multi-idioma por site hoje (sem campo `language` em nenhuma lista),
  então o uso dual de `home` no Joomla! (idioma vs. `'0'`/`'1'`) não se
  aplica; `Boolean` puro é mais seguro. Ver `CONVENCAO-JOOMLA.md` §5 e
  `kernel/schemas/mse-template-styles.js#Home`.
- **Média — `template.json#componentShell`/`errorView` removido do
  contrato.** Decisão do usuário (`AskUserQuestion`): remover em vez de
  acoplar de verdade no kernel — acoplar exigiria mudar o caminho crítico
  de renderização (`kernel/application.js#renderComponent`, usado pela Home
  real em produção) por um contrato que `mse-default`/`system` nem
  implementam. Removidas as chaves de
  `CAMAP-AGP/templates/camap-tema-01/template.json` e
  `camap-tema-02/template.json`; `component.js`/`error.js` mantidos como
  arquivos (não excluídos), só deixaram de ser publicados por
  `tools/prepare-siteassets.py`.
- **Média — convenção `controller.task`.** Prova de conceito isolada em
  `com_templates` (única tela cuja ação única "Tornar padrão" mapeia 1:1
  para `task=templates.setdefault`) — `components/com_templates/
  templates-editor.js` passa a ler `route.task`/`route.id` e disparar a
  mesma ação do botão. Demais telas continuam disparando ação só por
  clique direto; reescrever todas para `task`-orientado é redesenho maior,
  fora desta rodada.

## 3. Permanecem fora de escopo — só documentadas para tratamento futuro

Nenhuma destas foi corrigida nesta rodada; cada uma tem uma razão
explícita para ficar de fora agora.

- **`MSEConfiguracoes` 100% em PT.** Fase 3b, já conhecida desde a
  normalização anterior, continua adiada — fora do pedido desta rodada
  (que era sobre Templates/Administrator, não sobre configuração global).
- **Listas/campos PT legados** (`MSEModulos`/`MSEExtensoes`/`MSEModulosMenu`/
  `MSEMenuTipos`, campos PT de `MSEMenu`) ainda vivos em produção, não lidos
  pelo código. Decomissionamento é limpeza futura (Fase 5), não desta
  rodada — apagar dados de produção sem necessidade funcional não é uma
  decisão a tomar de passagem.
- **Atribuição de template por item de menu** e **overrides**
  `templates/<t>/html/<view>` continuam fora de escopo — decisão histórica
  já registrada em `PLANO-SITE-KERNEL-MSE.md`/`CONVENCAO-JOOMLA.md`; o
  usuário não pediu isso nesta rodada, só o mecanismo de
  instalação/fallback/admin template.
- **`controller.task` nas demais telas** (`com_extensions`, `com_menus`,
  `com_modules`, `com_config`) — ver 2.7; só `com_templates` consome
  `route.task` hoje.
- **ACL próprio** continua fora de escopo; SharePoint é a autoridade.

## 4. O que NÃO mudou (para ficar explícito)

- O Tema 1 (`camap-tema-01`) continua o template ativo em produção do
  CAMAP-AGP — nenhuma mudança de código nem de layout foi feita nele. A
  "demoção" a `MSEExtensions.Type=Template` é só classificação no registro
  novo, não uma mudança funcional: `tools/migrate-create-template-styles.js`
  semeia a linha dele com `Home=true`, preservando-o como padrão real.
- `mse-default` tem o layout do **template padrão do Joomla!** (genérico,
  neutro) — deliberadamente **não** o mesmo layout do Tema 1. Ele só entra
  como 2º nível de fallback, nunca como substituto visual do Tema 1
  enquanto este continuar ativo e saudável.
- Não existe sistema de múltiplos templates de Administrator instaláveis —
  só um único template formal (`administrator-shell.js`), por decisão
  explícita do usuário.
- `component.js`/`error.js` de cada tema não foram excluídos (ver 2.7) —
  só deixaram de ser referenciados por `template.json`/publicados.

## 5. Verificação

- `npm test` completo (inclui `kernel/test/template-registry.test.js`,
  `templates/mse-default/test/mse-default.test.js`,
  `components/com_templates/test/templates-screen.test.js`,
  `components/com_cpanel/test/administrator-shell.test.js`,
  `tools/test/migrate-create-template-styles.test.js`, e os ajustes de
  fallback de 3 níveis em `host-adapters/modern-script-editor/test/
  site-boot.test.js`/`site-runner.test.js`) — 100% verde.
- `git diff --check` limpo.
- Publicação real em tenant (petrobrasbr) via FIORI-AUTO e verificação
  visual **realizadas em 23/10/2026**: `com_extensions` mostra a coluna
  `ClientId` sem quebrar o CRUD existente; `#/administrator?option=
  com_templates&task=templates.setdefault&id=N` aplica "Tornar padrão"
  automaticamente (testado e revertido ao estado original —
  `camap-tema-01` continua o `Home=true` real); Home do site
  (`camap-tema-01`) renderiza sem mudança visual.
- **Lição da verificação em tenant**: os testes locais (DOM fake) de
  `com_extensions`/`extension-registry` ficaram 100% verdes o tempo todo,
  mas o campo `ClientId` nunca tinha sido provisionado no **schema real**
  de `MSEExtensions` em produção — só existia no código
  (`kernel/schemas/mse-extensions.js`) e nos testes. O `$batch` de
  `loadExtensions` falhava (HTTP 400, "The field or property 'ClientId'
  does not exist.") silenciosamente, o que por sua vez fazia
  `isEnabled(extensions, "administrator")` retornar `false` e TODA rota
  `#/administrator?...` (não só `com_extensions`) resolver como
  `dispatchReason: "disabled"` — confirmado só ao navegar de fato no
  tenant via FIORI-AUTO, nunca pelos testes unitários (que usam client
  fake, sem schema real). Corrigido ad-hoc com um script de provisionamento
  + backfill (fora deste repositório — ver `dev-probe/
  _migrate_extensions_client_id_real.py` no projeto FIORI-AUTO). Reforça
  que `kernel/installer.js#inspect()`/`verify()` contra o tenant real deve
  rodar (e ser confirmado) antes de considerar um campo novo "pronto",
  mesmo com testes locais verdes e o código já publicado.
