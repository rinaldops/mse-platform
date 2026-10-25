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
  pelo código; os 9 campos PT equivalentes (contagem confirmada no
  código-fonte real — não 12, como uma estimativa anterior sugeria) foram
  removidos do schema na Fase 5 (23/10/2026, ver §2.10).
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
  fora desta rodada. **Atualização (23/10/2026):** estendido para as 4
  telas restantes do Administrator — `com_extensions`
  (`extensions.enable`/`extensions.disable`), `com_menus`
  (`menus.publish`/`menus.unpublish`), `com_modules`
  (`modules.publish`/`modules.unpublish`) e `com_config`
  (`config.activate`/`config.deactivate`), cada uma com um botão de
  alternância de 1 clique por linha além do consumo de `route.task`/
  `route.id` (mesmo padrão `pendingTask` de `templates-editor.js`:
  aplicado uma única vez, no primeiro carregamento). Guards de domínio já
  existentes continuam respeitados (extensão `Protected` não pode ser
  desabilitada via task; item de menu `Default` não pode ser
  despublicado via task). O CRUD completo (criar/editar/excluir) em todas
  as 5 telas continua disparando ação só por clique direto — ver
  `docs/CONVENCAO-JOOMLA.md` §6/§7.

## 2.8 Lacunas "Baixa"/fora de escopo fechadas em 23/10/2026

- **Atribuição de template por item de menu + overrides de view
  (`templates/<t>/html/<view>`).** No Joomla! real,
  `#__menu.template_style_id` permite que um item de menu específico use
  um template diferente do `Home` do site, e
  `templates/<template>/html/<component>/<view>.php` permite sobrescrever
  a view de um Componente só para quem usa aquele template. Corrigido:
  - `kernel/schemas/mse-menu.js` — novo campo `TemplateStyleId` (`Number`,
    opcional, `min:1`, sem `defaultValue`; ausente/`0`/`null` = "usa o
    template padrão do site"), referenciando `MSETemplateStyles.Id`.
  - `kernel/template-registry.js#resolveTemplateNameForMenuItem(styles,
    menuItem, {clientId})` — nova função pura; devolve o `Template` do
    estilo referenciado (mesmo `ClientId`) ou `null` (sem override; cai
    no fallback de `resolveActiveTemplateName`/`theme?.name` já
    existente). Nunca lança por dado de conteúdo malformado.
  - `kernel/application.js` — a resolução de layout deixou de ser feita
    uma única vez em `refreshSnapshot()` (antes de qualquer rota existir)
    e passou a ser feita por `ensureLayout(menuItem)`, chamada no início
    de toda `renderRoute`, com uma chave de cache (`layoutKey`) para que
    a troca de item de menu com o MESMO template (ou nenhum dos dois com
    `TemplateStyleId`) continue reaproveitando o layout montado, sem
    dispose/remount — só uma troca real de chave aciona
    `clearComponent()` + `clearModulesForPosition()` de cada posição do
    layout atual + `layout.dispose()` + montagem do novo layout. Uma
    falha de `resolveLayout` durante uma troca (não só no boot) cai no
    mesmo fallback neutro (`createSiteLayout`) já usado no boot, sem
    quebrar a navegação.
  - `host-adapters/modern-script-editor/site-boot.js#createTemplateLayoutResolver`
    — `resolveLayout` recebe agora também `menuItem`; `requestedName` é
    resolvido em 3 níveis de precedência: (1)
    `resolveTemplateNameForMenuItem` (override do item de menu ativo),
    (2) `resolveActiveTemplateName` (Home do site), (3) `theme?.name`
    (fallback de compatibilidade) — candidatos finais seguem o mesmo
    fallback de 3 níveis já existente (`[requestedName, "mse-default",
    "system"]`).
  - Overrides de view: `template.json#viewOverrides` (mapa opcional
    `{ "<componente>": { "<view>": "<caminho>" } }`) é repassado por
    `adaptTemplateToLayout` ao `LayoutLike` (`layout.viewOverrides`);
    `kernel/application.js#renderComponent` verifica
    `layout.viewOverrides?.[dispatch.componente]?.[dispatch.view]` antes
    de montar `entrypoints.full` do manifesto — se presente, monta esse
    módulo no lugar (mesmo contrato `mount()/dispose()`, nenhum contrato
    novo); ausente/`undefined`, comportamento idêntico a hoje. Nenhum
    template existente (`mse-default`, `system`, `camap-tema-01/02`)
    declara `viewOverrides` — zero mudança visual/comportamental para
    quem não configurar essas features novas.
  - Testes: `kernel/test/template-registry.test.js`
    (`resolveTemplateNameForMenuItem`), `kernel/test/application.test.js`
    (troca de layout por `TemplateStyleId` diferente; reaproveitamento
    quando igual/ambos ausentes; fallback ao `resolveLayout` lançar numa
    troca; `layout.viewOverrides` substituindo `entrypoints.full`),
    `host-adapters/.../test/site-boot.test.js` (`menuItem.TemplateStyleId`
    tem precedência sobre o Home; `adaptTemplateToLayout` repassa
    `viewOverrides`).

## 2.9 MSEConfiguracoes — Fase 3b, fechada em 23/10/2026

- **Alta/Média — `MSEConfiguracoes` 100% em PT, sem consumidor em
  inglês.** No Joomla! real, os campos de configuração de um componente
  seguem o mesmo vocabulário em inglês do resto do schema. `MSEConfiguracoes`
  era a única lista real do `mse-platform` 100% em português, inclusive nos
  campos lidos pelo único consumidor real identificado
  (`core/configuration-store.js#loadPublished`, usado por
  `kernel/site-config.js`/`kernel/application.js` para resolver configuração
  global/por instância/por extensão, incluindo o tema ativo do site via o
  campo `Tema`/`Theme`). Corrigido — mesmo padrão já usado para `MSEMenu`
  nas Fases 3/4 (campos EN acrescentados lado a lado com os PT, que ficam
  `DEPRECATED`, vivos, sem leitor novo):
  - `core/provisioning.js#CONFIGURATION_LIST_SCHEMA` — versão 3→4; 7 novos
    campos (`Scope`/`Module`/`Theme`/`ConfigurationJson`/`Active`/`State`/
    `ExtensionElement`), cada um com `schemaXml` próprio; a choice `Inherit`
    acrescentada ao campo `Layout` (já neutro em nome, só a choice PT
    `Herdar` fica obsoleta). Os 4 campos sem consumidor confirmado
    (`TipoInstancia`/`VersaoConfiguracao`/`VersaoSettings`/`VersaoModulo`)
    permanecem só em PT, fora desta rodada.
  - `readConfigurationItem`/`listConfigurationItems` (leitura) passam a
    mapear a partir dos campos EN; `createConfigurationItem`/
    `updateConfigurationItem`/`insertGlobal` (escrita) gravam PT e EN lado a
    lado — os 2 helpers puros `scopePt`/`statePt` convertem o vocabulário EN
    (usado internamente por `validateEditableItem`) de volta para PT só para
    a gravação do campo legado, já que o schema real ainda exige `Escopo`/
    `Estado` (PT, `Required=TRUE`) com suas choices originais.
  - `core/configuration-store.js#loadPublished` — único leitor real — migra
    o `$select`/`$filter`/comparações de vocabulário inteiramente para EN
    (`Scope`/`Module`/`Theme`/`ConfigurationJson`/`Active eq 1`/`State`/
    `ExtensionElement`); `createSharePointConfigurationStore#create()` troca
    os defaults `scope: "Instancia"`/`state: "Rascunho"` para `"Instance"`/
    `"Draft"`.
  - `components/com_config/config-editor.js` — editor do Administrator
    migrado para ler/gravar só os campos EN (`validateConfigurationValues`,
    formulário, tabela, `route.task`/`pendingTask` de `config.activate`/
    `config.deactivate` já existente — preservado, só o campo-alvo da
    escrita mudou de `Ativo` para `Active`).
  - `tools/migrate-mse-configuracoes-to-english.js` (novo) — migração
    IN-PLACE (MERGE com ETag, nunca cria item novo) dos itens reais já
    existentes: traduz `Escopo`/`Estado` (Choice) e copia `Modulo`/`Tema`/
    `ConfiguracaoJson`/`Ativo`/`ExtensaoElemento` para os campos EN
    correspondentes. Idempotente — só grava itens cujos valores EN ainda não
    batem com os PT de origem.
  - `tools/migrate-camap-activate-tema-01.js` — **risco identificado e
    corrigido**: a ferramenta de ativação do Tema 1 gravava só o campo PT
    `Tema`; como `loadPublished` passou a ler só `Theme` (EN), rodar essa
    migração sem o ajuste deixaria o tema ativo desatualizado para o leitor
    real, mesmo com a gravação "bem-sucedida". Corrigida para gravar `Tema`
    e `Theme` juntos, com idempotência que exige os DOIS campos já corretos
    antes de pular a escrita.
  - Testes: `core/test/provisioning.test.js` (schema v4/19 campos, leitura/
    escrita EN), `core/test/configuration-store.test.js` (fixtures EN,
    `$filter=Active eq 1`), `components/com_config/test/
    editor-validation.test.js`/`config-screen.test.js` (vocabulário EN),
    `tools/test/migrate-mse-configuracoes-to-english.test.js` (novo),
    `tools/test/migrate-camap-activate-tema-01.test.js` (dual-write Tema/
    Theme), `core/test/site-boot.test.js` (`$filter=Active eq 1`).

## 2.10 Decomissionamento das listas/campos PT legados — Fase 5, 23/10/2026

- **Baixa — listas/campos PT legados vivos em produção, sem nenhum leitor
  desde a Fase 4.** O Joomla! real não carrega duas gerações de schema
  lado a lado indefinidamente; a normalização anterior (Fases 3/4)
  deliberadamente preservou os dados PT como salvaguarda, mas nunca definiu
  quando removê-los. Autorizado pelo usuário como ação irreversível nesta
  rodada.
  - **Código (feito, testado, em vigor):**
    `kernel/schemas/mse-menu.js` — removidos os 9 campos PT de `MSEMenu`
    (`TipoMenu`/`Caminho`/`Nivel`/`Ordem`/`Componente`/`Visao`/`Padrao`/
    `AbrirEm`/`Estado` — contagem confirmada no código-fonte real; a
    estimativa inicial de "12" do planejamento estava incorreta) e o
    esquema `MSEMenuTipos` (PT) inteiro. `kernel/installer.js` nunca
    provisionava `MSEMenuTipos` (PT) — já era código morto, confirmado via
    `KERNEL_LIST_SCHEMAS` (6 entradas, todas EN). `kernel/menu.js` e
    `components/com_menus/menus-editor.js#MENU_FIELD_NAMES` não dependiam
    dos campos PT — o filtro de nomes em `menus-editor.js` foi simplificado
    (schema agora só tem os campos EN relevantes).
  - **Ferramenta nova (código pronto, testado; EXECUÇÃO contra produção
    pendente):** `tools/decommission-mse-legacy-pt.js` —
    `decommissionMseLegacyPt({installer, legacyListIds, client, confirm,
    exportPath})`, com 3 salvaguardas obrigatórias, nesta ordem:
    (1) chama `verifyMseSchemaMigration` (reaproveitado de
    `tools/verify-mse-schema-migration.js`, não duplicado) e lança se
    `ok !== true`, antes de qualquer escrita; (2) exporta um dump JSON de
    segurança (todos os itens das 4 listas PT + os 9 campos PT de cada
    item de `MSEMenu`) para um caminho local fora do controle de versão
    (`tmp/`, já em `.gitignore`), SEMPRE, mesmo se a confirmação seguinte
    for negada; (3) só então chama `confirm(plan)` — se negado, nada é
    apagado. Confirmado, apaga as 4 listas PT
    (`MSEModulos`/`MSEExtensoes`/`MSEModulosMenu`/`MSEMenuTipos`) e os 9
    campos PT de `MSEMenu`, via `client.request(path, {method:"DELETE",
    etag:"*", allowWildcardEtag:true})` (mesmo mecanismo de baixo nível já
    usado por `core/list-provisioning.js` para MERGE de campo — não existe
    helper de alto nível para apagar lista/campo). Idempotente: lista ou
    campo já ausente (`error.code === "not-found"`) é tratado como no-op,
    nunca como erro.
  - **Execução real pendente, por decisão deliberada:** este documento e o
    código confirmam que a ferramenta existe e está testada, mas RODAR
    `decommissionMseLegacyPt` contra o tenant de produção (apagando dados
    reais) não foi feito nesta sessão — é uma ação irreversível que exige
    sua própria sessão supervisionada: rodar `verify-mse-schema-migration.js`
    isoladamente primeiro, revisar `ok:true` manualmente, só então rodar o
    decomissionamento com `confirm` explícito, revisar o dump de segurança
    gerado antes de autorizar, e confirmar via REST real que as 4 listas e
    os 9 campos deixaram de existir.
  - Testes: `tools/test/decommission-mse-legacy-pt.test.js` (novo) —
    `buildDecommissionPlan`/`readLegacyMenuTipos` puros; validação de
    entrada; `verifyMseSchemaMigration` com `ok:false` aborta sem escrever
    nada (nem o dump); `confirm:false` ainda escreve o dump de segurança
    mas não apaga nada; caminho completo apaga as 4 listas + 9 campos;
    idempotência (2ª chamada sobre tudo já apagado não lança, não reporta
    nada como apagado "de novo"). `kernel/test/menu.test.js` (lista de
    nomes de campo atualizada, só os EN + `TemplateStyleId`),
    `kernel/test/admin-form.test.js`/`kernel/test/installer.test.js`
    (confirmados sem necessidade de alteração — não afirmavam os campos
    PT).

## 2.11 Lacunas de tipos de extensão Joomla! fechadas em 24–25/10/2026

Além das lacunas estruturais acima (templates, `controller.task`,
`MSEConfiguracoes`, decomissionamento PT), esta auditoria também apontou
que o `mse-platform` cobria só um subconjunto pequeno dos tipos de
extensão REAIS do Joomla! (`com_categories`/`com_tags`/`com_media`/
`com_finder` entre os Componentes; só `mod_forum`/`mod_home`/
`mod_recursos`/`mod_videoteca` entre os Módulos de posição). O usuário
selecionou uma lista fechada de 4 Componentes + 8 Módulos para fechamento,
implementada em 3 ondas dependentes (Wave 1 → Wave 2 → Wave 3), cada módulo
com seu próprio `README.md`/`USAGE.md` documentando decisões de escopo —
este parágrafo só consolida a lista e aponta para cada fonte. Todas as
ondas: `npm test` 100% verde, mesclado em `main`, publicado em
`origin/main`.

- **Wave 1 (24/10/2026, sem dependências):**
  `components/com_categories/` (CRUD-lite sobre `MSECategories`, ≈
  `#__categories`), `components/com_tags/` (CRUD-lite completo sobre
  `MSETags`, ≈ `#__tags`), `components/com_media/` (gerenciador de mídia
  sobre a biblioteca `MSEMedia`, ≈ `images/`/gerenciador de mídia real) +
  `modules/mod_menu/`, `modules/mod_breadcrumbs/`, `modules/mod_footer/`
  (módulos de posição do site, consumindo `MSEMenu`/`kernel/menu.js`).
- **Wave 2 (24/10/2026, depende de categorias/tags da Wave 1):**
  `modules/mod_articles_latest/news/category/popular/archive/categories/`
  (família completa, sobre `kernel/articles-data.js`/
  `kernel/content-services.js`, novos nesta onda), `components/com_finder/`
  e `modules/mod_search/`, `modules/mod_tags_popular/` e
  `modules/mod_tags_similar/`.
  - **Decisão de escopo — `com_finder`/`mod_search` (MVP, não documentada
    antes desta entrada):** o `com_finder` real do Joomla! é um motor de
    indexação full-text completo, com tokenização e tabelas de mapa de
    termos (`#__finder_tokens`/`#__finder_links`/etc.). Reimplementar esse
    motor sobre SharePoint REST está fora de escopo desta rodada — o que
    foi entregue é um CRUD-lite de "filtros de busca salvos"
    (`MSESearchFilters`, ≈ `#__finder_filters`), no mesmo espírito CRUD-lite
    já usado em `com_categories`/`com_tags` (ver
    `components/com_finder/README.md`). A busca de fato no site é feita
    por `modules/mod_search/` (≈ `mod_finder` real), que filtra EM
    MEMÓRIA os artigos já carregados via `kernel/articles-data.js` — não
    consulta índice algum, nem os filtros salvos de `com_finder` (ver
    `modules/mod_search/README.md`). Esta é uma limitação deliberada, não
    um defeito: não há, hoje, nenhum mecanismo de indexação server-side no
    Site Kernel para um `mod_search` real consultar.
  - Demais decisões de escopo de cada módulo (`mod_articles_popular`
    aproxima por data de criação; `mod_articles_archive` sem agrupamento
    mês/ano; `mod_tags_similar` só `matchType: "any"`) documentadas nos
    respectivos `README.md`.
- **Wave 3 (25/10/2026, depende de finder/tags/media da Wave 2):**
  `modules/mod_related_items/` e `modules/mod_random_image/`.
  - **Decisão de escopo — `mod_related_items`:** o Joomla! real casa
    artigos pelo campo livre `metakey` (comparação `LIKE`/substring,
    palavras-chave separadas por vírgula). `MSEPublicacoes` não tem campo
    equivalente a `metakey` — este MVP reusa o array `tags` (mesmo campo já
    consumido por `mod_tags_similar`) como substituto, com comparação por
    IGUALDADE de string (não substring), critério "qualquer tag em comum"
    (`any`). Ver `modules/mod_related_items/README.md`.
  - **Decisão de escopo — `mod_random_image`:** o Joomla! real varre uma
    pasta do sistema de arquivos (`folder`) e calcula largura/altura reais
    via `getimagesize`. Este MVP usa a biblioteca `MSEMedia` (já existente,
    Wave 1) como fonte de imagens em vez de uma pasta — sem conceito de
    subpastas — e não calcula proporção real (`MSEMedia` não declara
    dimensões de imagem); expõe só `maxWidth` como limite de exibição via
    CSS. Ver `modules/mod_random_image/README.md`.
- Inventário de versões por pacote: `docs/COMPATIBILIDADE-E-VERSIONAMENTO.md`.
  Equivalência de pastas por módulo/componente: `docs/CONVENCAO-JOOMLA.md`
  §1.

## 3. Permanecem fora de escopo — só documentadas para tratamento futuro

Nenhuma destas foi corrigida nesta rodada; cada uma tem uma razão
explícita para ficar de fora agora.

- **`MSEConfiguracoes` 100% em PT.** **Fechada em 23/10/2026**, ver §2.9.
- **Listas/campos PT legados** — o esquema `MSEMenuTipos` (PT) e os 9
  campos PT de `MSEMenu` já foram removidos do CÓDIGO (Fase 5, §2.10). As
  4 listas PT (`MSEModulos`/`MSEExtensoes`/`MSEModulosMenu`/
  `MSEMenuTipos`) e os 8 campos PT de `MSEConfiguracoes` (§2.9) ainda vivem
  em produção — a ferramenta de exclusão real está pronta (§2.10), mas sua
  EXECUÇÃO contra o tenant é uma ação irreversível separada, pendente de
  sessão supervisionada — apagar dados de produção sem a dupla
  verificação ao vivo (gate + dump + confirmação humana) não é uma decisão
  a tomar de passagem.
- **Atribuição de template por item de menu** e **overrides**
  `templates/<t>/html/<view>` — **fechado em 23/10/2026**, ver §2.8.
- **`controller.task` nas demais telas** (`com_extensions`, `com_menus`,
  `com_modules`, `com_config`) — **fechado em 23/10/2026**, ver §2.7. O
  CRUD completo (criar/editar/excluir) continua só por clique direto em
  todas as telas; só a alternância rápida de 1 clique ganhou `task`.
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
- **`MSEConfiguracoes` (§2.9, Fase 3b): nenhum dado real é apagado.** Os 8
  campos PT migrados continuam gravados em cada item (dual-write), só
  deixam de ser lidos por código novo. `tools/
  migrate-mse-configuracoes-to-english.js` nunca é aplicado automaticamente
  contra produção — exige `confirm(plan)` explícito, mesmo padrão do resto
  de `tools/`.

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
