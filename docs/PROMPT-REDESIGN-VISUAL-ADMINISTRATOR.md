# Prompt — Redesenho visual do Administrator (mse-platform)

> Prompt reutilizável para encaminhar a outra IA/equipe. Não contém URLs,
> credenciais, GUIDs, nomes de tenant/site SharePoint específicos ou dados
> corporativos. Escopo é **só visual/CSS/estrutura de apresentação**; não
> altera schema de dados, rotas, convenções `controller.task` nem nenhuma
> lógica de domínio já implementada.

## Contexto

`mse-platform` é um "mini-Joomla!" implementado em JavaScript puro (sem
framework, sem build step de produção) executado dentro de uma Web Part
Modern Script Editor do SharePoint. Ele replica, deliberadamente, o
**modelo de dados e as convenções de roteamento** do Joomla! real
(listas SharePoint em vez de tabelas MySQL, Componentes/Módulos/Extensões,
rotas `#/administrator?option=com_xxx&task=yyy&id=N`, item de menu com
template próprio, etc.) — isso já está implementado e testado, não é
objeto deste prompt.

O que **nunca foi tratado** como requisito, em nenhuma rodada de trabalho
até hoje, é a **riqueza visual do painel administrativo**. O Joomla! real
usa um template de backend (`atum`) com Bootstrap, ícones, sidebar
colapsável, cards de dashboard, cores de status etc. O `mse-platform` tem
hoje um único shell de Administrator deliberadamente mínimo — ver
`components/com_cpanel/administrator-shell.js` (comentário no topo do
arquivo: "Contrato deliberadamente mínimo... este shell NÃO é um Template
de Site... é puramente a composição visual fixa do Administrator") e
`components/com_cpanel/administrator.css` (~50 linhas, sem biblioteca de
ícones, sem grid de cards, sem toolbar rica). O resultado visual atual é
funcional, mas austero — texto e tabelas simples, sem a sensação de
"produto" que o Administrator do Joomla! real transmite.

Esta tarefa é **só** sobre fechar essa lacuna visual — tornar o
Administrator do `mse-platform` mais agradável e "parecido com Joomla!"
visualmente, sem tocar em:
- schema de listas SharePoint (`kernel/schemas/*.js`);
- convenções de rota/`controller.task` (`components/com_cpanel/router.js`);
- qualquer lógica de domínio (CRUD, toggles, template-by-menu-item, etc.).

## Arquitetura relevante (o que você PODE tocar)

- `components/com_cpanel/administrator-shell.js` — shell fixo
  (cabeçalho + nav lateral + slot de conteúdo), montado uma vez por
  navegação por `components/com_cpanel/component.js#mount`. Pode ser
  redesenhado estruturalmente (adicionar elementos, classes, até um
  sistema de ícones), desde que:
  - continue exportando `createAdministratorShell({ root, activeOption })`
    → `{ contentElement: Element, dispose(): void }` (mesmo contrato
    público, consumido por `component.js`);
  - `ADMINISTRATOR_NAV_LINKS` (lista de `[option, label]`) pode ganhar um
    terceiro elemento (ex. nome de ícone) se você adicionar um sistema de
    ícones, mas sem remover as opções existentes nem mudar seus valores
    de `option` (são usados por `router.js`/testes).
- `components/com_cpanel/administrator.css` — CSS do shell e de todas as
  telas administrativas (classes `mse-administrator*`). Pode ser
  substituído/expandido livremente.
- Cada tela (`components/com_<x>/<x>-screen.js` + `<x>-editor.js`, onde
  `<x>` é `extensions`, `menus`, `modules`, `config`, `templates`,
  `installer`, `content` (publisher), `diagnostics`) desenha sua própria
  tabela/formulário usando as mesmas classes utilitárias
  (`mse-administrator__table`, `mse-administrator__form`,
  `mse-administrator__field`, `mse-administrator__actions`, etc.) — você
  pode redesenhar esses componentes visuais (tabelas, formulários,
  botões, badges de status) desde que preserve os seletores que os TESTES
  automatizados dependem (ver seção "Testes" abaixo) e o comportamento
  funcional de cada tela (CRUD, toggle de 1 clique via botão/`task`,
  etc. — **não mude nenhuma lógica JS de leitura/escrita**, só a
  apresentação).
- Cores: **já existe um sistema de design tokens** — todas as cores do
  CSS atual usam `var(--camap-<nome>, #hexFallback)`, onde os nomes
  `--camap-*` vêm de `CAMAP-AGP/theme/tokens.css` (projeto do site
  consumidor, repositório irmão). Isso é **intencional e testado**
  (`components/com_cpanel/test/administrator-css.test.js` falha se você
  usar um hex "nu" fora de `var(--camap-...)`) — o kernel não pode
  conhecer cores hardcoded de um tenant específico. Se quiser introduzir
  cores novas (ex. para badges de status), siga o MESMO padrão: declare
  `var(--camap-<algo-novo>, #fallback)` e, se o nome não existir ainda em
  `CAMAP-AGP/theme/tokens.css`, isso é aceitável (o teste (3) do arquivo
  acima só valida nomes JÁ usados — mas prefira reaproveitar os tokens
  que já existem lá: `--camap-ocean`, `--camap-white`, `--camap-line`,
  `--camap-sun`, `--camap-green`, mais algum que você confirme existir no
  arquivo de tokens, antes de inventar um novo).
- Ícones/ilustrações: **não há CDN externo configurado nem permitido**
  (SharePoint corporativo, sem bypass de TLS/proxy/DLP). Se quiser
  ícones, use SVG inline (texto literal no JS/CSS, sem request de rede
  externo) ou uma fonte de ícones já hospedada no mesmo pacote de release
  da plataforma (arquivo estático publicado junto do
  `mse-platform`/`CAMAP-AGP`, nunca um link para um CDN público).
- JavaScript puro, sem framework, sem bundler/transpiler em produção —
  tudo roda como ES module nativo no navegador (`type="module"`), testado
  com Node.js nativo (`node <arquivo>.test.js`, sem Jest/Mocha/etc.). Não
  introduza dependências de build nem pacotes npm de runtime.

## Regras invioláveis (segurança/arquitetura do workspace)

- Nunca gravar senhas, tokens, cookies, certificados, GUIDs de produção
  ou dados pessoais em código/documentação.
- Nunca desabilitar TLS, validação de certificado, proxy corporativo ou
  DLP; nunca apontar para CDN/recurso externo não aprovado.
- Nunca alterar schema de lista SharePoint, rotas, ou qualquer lógica de
  leitura/escrita de dados — escopo é 100% apresentação (HTML/CSS/DOM),
  zero mudança de comportamento funcional.
- Preservar o contrato público de cada módulo (`mount()`/`dispose()`,
  assinaturas de função exportadas) — testes automatizados dependem
  disso.
- Testar proporcionalmente ao risco: qualquer mudança estrutural de DOM
  (novas classes, novos elementos) deve manter os seletores que os
  testes existentes verificam (ver próxima seção) ou vir acompanhada da
  atualização do teste correspondente, nunca quebrando a suíte.

## Testes que já existem e NÃO podem regressar

Rode `npm test` (raiz do `mse-platform`) antes e depois — deve continuar
100% verde. Arquivos mais sensíveis a mudanças visuais:

- `components/com_cpanel/test/administrator-shell.test.js` — testa
  `createAdministratorShell` (estrutura do shell, `activeOption`,
  `dispose()`).
- `components/com_cpanel/test/administrator-css.test.js` — testa que
  NENHUMA cor no CSS é um hex "nu" fora de `var(--camap-..., #hex)`, e
  que os nomes de variável usados existem em
  `CAMAP-AGP/theme/tokens.css`.
- `components/com_<x>/test/<x>-screen.test.js` (extensions, menus,
  modules, config, templates) — cada um verifica que a tabela renderiza
  linhas, que o botão de alternância de 1 clique existe e funciona, e
  que `route.task=<x>.<ação>&id=N` dispara a mesma escrita. Essas
  asserções tipicamente procuram por `querySelector`/atributos
  específicos (ex. `data-mounted`, texto de botão) — se você mudar a
  estrutura, **ajuste os seletores no teste também**, mas NUNCA remova a
  cobertura funcional.

## O que esperamos como entrega

1. Um redesenho visual do `administrator-shell.js`/`administrator.css`
   (e, se necessário, pequenos ajustes de marcação — não de lógica — nos
   `*-screen.js`/`*-editor.js`) que aproxime a experiência visual do
   Administrator da riqueza do backend Joomla! real: hierarquia visual
   mais clara, talvez cards de resumo na tela inicial
   (`com_cpanel`/`control-panel.js`), badges de status coloridos para
   Published/Unpublished/Enabled/Disabled, melhor espaçamento/tipografia,
   sidebar com ícones (SVG inline) em vez de só texto, etc. Fique livre
   para propor a direção visual — não há mockup aprovado ainda.
2. Compatibilidade com todos os temas de cor que a plataforma suporta
   hoje (via `var(--camap-...)`) — o resultado não pode ficar acoplado a
   um tenant específico.
3. Suíte de testes atualizada e 100% verde (`npm test`), incluindo os
   arquivos listados acima, com quaisquer novos seletores cobertos por
   asserções equivalentes às que já existiam.
4. Um resumo do que mudou e por quê, para revisão humana antes de
   qualquer publicação em produção (este workspace não distingue
   DEV/homologação — toda publicação é em produção e exige confirmação
   explícita antes de ocorrer).

## O que está fora do escopo desta tarefa

- Qualquer mudança em `kernel/*`, `core/*`, schemas de lista SharePoint,
  rotas/`controller.task`, ou lógica de CRUD/toggle já implementada.
- Qualquer mudança no site PÚBLICO (CAMAP-AGP `templates/camap-tema-01`
  etc.) além do necessário para a sidebar/chrome do Administrator que já
  existe hoje em `CAMAP-AGP/templates/camap-tema-01/index.js`
  (`observeAdministratorMode`/`css/administrator.css`) — se o redesenho
  do shell do `mse-platform` exigir ajustes de CSS nesse arquivo do
  CAMAP-AGP para não quebrar a disposição lado a lado, isso é aceitável,
  mas avise explicitamente o que e por quê.
- Sistema de múltiplos templates de Administrator instaláveis/trocáveis
  — decisão já tomada (um único template formal, fixo).
- Qualquer dependência de build/bundler/framework de UI novo.
