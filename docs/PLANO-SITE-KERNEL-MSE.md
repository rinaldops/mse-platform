# Plano — Site Kernel: um MSE, um site inteiro (modelo mini-Joomla!)

**Status:** plano e decisões D1–D8 **aprovados** em 15/10/2026 (D6 revista; D9 resolvida). Nada foi implementado nem publicado.
**Primeiro consumidor:** CAMAP-AGP (ver `../../CAMAP-AGP/docs/PLANO-ARQUITETURA-MINI-JOOMLA.md`).
**Diagrama:** `../../CAMAP-AGP/docs/implementation/ARQUITETURA-MINI-JOOMLA-ALVO.html`.

## 1. Por que mudar

Hoje o mse-platform publica **um MSE por módulo ou resumo** (`data-mse-module`
+ `runner.js`) e a Home “não monta summaries automaticamente”. Cada página
`.aspx` é composta à mão. A nova diretriz inverte isso: **um único MSE**
em `Default.aspx` carrega um *kernel* que roteia, monta o Componente da página
e distribui Módulos por posições — como o Joomla!, mas em JavaScript, com listas
SharePoint no lugar do banco.

## 2. Vocabulário (adotado a partir daqui)

| Termo novo | Termo antigo no mse-platform | Joomla! | Exemplos |
| --- | --- | --- | --- |
| **Componente** | módulo (`view: full`) | `com_*` | BLOG, Fórum, Videoteca, Explore Mais |
| **Módulo** | submódulo/resumo (`view: summary`) | `mod_*` | SD, DT1, MC, DB, Footer, Menu, Breadcrumbs |
| **Plugin** | — | `plg_*` | eventos do kernel (fase posterior) |
| **Site Kernel** | `host-adapters/modern-script-editor` + `runner.js` | `SiteApplication` | novo |
| **Administrator** | Centro de Administração (`admin/`) | `/administrator` | evoluído |

Os identificadores técnicos existentes (`forum`, `explore-mais`, `view: "summary"`)
**não são renomeados** nesta etapa; o manifesto v2 apenas acrescenta `type`.

## 3. Restrições e compatibilidade

- **Escopo imposto:** sem Templates e sem ACL. Posições são declaradas pelo site;
  o visual é CSS do site. Permissões continuam nativas do SharePoint.
- **TD intocado.** O projeto TD consome releases já publicadas do
  mse-platform em `SiteAssets/mse-platform/releases/<versão>/`; essas pastas
  nunca são alteradas ou sobrescritas por este trabalho. Toda mudança é **aditiva**: o caminho atual (1 MSE por
  módulo, `runner.js`, `mountMseModule`, `MSEConfiguracoes` v2) permanece
  funcionando e testado. Nenhuma pasta de release já publicada é alterada.
- **Neutralidade:** o kernel não conhece CAMAP-AGP. Nomes, posições e itens de
  menu vêm de dados/configuração do site.
- **Produção:** não há DEV/homologação declarados. Qualquer publicação exige
  confirmar o destino e obter autorização (regra do workspace).

## 4. Anatomia do kernel

```text
mse-platform/
  kernel/                         NOVO
    application.js                boot, ciclo da requisição, unmount
    router.js                     hash SEF  #/rota/id-slug  (base: core/navigation.js)
    menu.js                       itens, tipos, hierarquia, item ativo, pathway
    dispatcher.js                 resolve Componente + visão + parâmetros; import lazy
    positions.js                  módulos por posição/vigência/atribuição ao menu
    layout.js                     esqueleto DOM + posições declaradas (sem template)
    events.js                     eventos mínimos: afterRoute, beforeRender, afterRender
    extension-registry.js         extensões habilitadas; manifesto v2
    content-services.js           artigos, categorias, tags, filtros compostos, estados
    site-config.js                configuração global (escopo global/extensão)
  host-adapters/modern-script-editor/
    site-runner.js                NOVO: único script do snippet de site
    site-snippet.html             NOVO: <div data-mse-site> + site-runner.js
    runner.js, bootstrap.js       mantidos (legado e TD)
  admin/                          EVOLUÍDO — vira o Administrator (carregado lazy)
```

### 4.1 Contratos novos (todos aditivos)

- **Manifesto v2** (`defineModuleManifest` aceita `type`): `"component" | "module" | "plugin"`.
  Componente declara `views` (ex.: `list`, `article`, `featured`) e `routeParams`;
  Módulo declara `positions` aceitas e `params` (settings schema); Plugin declara eventos.
  Manifestos v1 continuam válidos (tratados como `component` com `views: full/summary`).
- **Entrypoints:** `mount({ root, config, services, context })` / `dispose()` — **inalterado**.
  `context` ganha `route`, `menuItem`, `position` e `navigate(route)`.
- **Roteamento:** hash `#/<alias>[/<id>-<slug>][?k=v]`. Não recarrega a página, sobrevive
  ao MSE, permite voltar/avançar, links copiáveis e foco/anúncio por leitor de tela.
- **Persistência:** listas `MSEExtensoes`, `MSEMenuTipos`, `MSEMenu`, `MSEModulos`,
  `MSEModulosMenu`; `MSEConfiguracoes` v3 (acrescenta escopos global e por extensão).
  Provisionamento **somente** via `inspect/apply/verify` administrativo (já existente);
  o runtime apenas lê.
- **Carga:** um `$batch` REST no boot (extensões + menu + módulos + config), cache em
  memória por sessão, fallback para último estado válido se uma lista falhar.
- **Isolamento:** falha de um Módulo mostra estado de erro local sem derrubar a página
  (já é princípio do plano de plataformização; passa a ser testado).

## 5. Joomla! → kernel (escopo)

| Joomla! | Kernel | Situação |
| --- | --- | --- |
| Front controller, SiteApplication | `application.js` + `site-runner.js` | criar |
| Router SEF | `router.js` (hash) | melhorar `core/navigation.js` |
| Menu, tipos de menu, pathway | `menu.js` + `MSEMenu*` | criar |
| Componentes (MVC, views) | manifesto v2 + `dispatcher.js` | criar / adaptar módulos existentes |
| Módulos, posições, atribuição por menu | `positions.js` + `MSEModulos*` | criar |
| Extensões (habilitar/desabilitar) | `MSEExtensoes` + `extension-registry.js` | criar (substitui `data-enabled-modules`) |
| com_config / params | `site-config.js` + `MSEConfiguracoes` v3 + settings-renderer | melhorar |
| com_content, categorias, tags, estados, destaque | `content-services.js` + Publicador | criar sobre o que o CAMAP já tem |
| com_media | upload para biblioteca (core/rest.js já tem upload) | criar UI |
| com_installer | `admin/installer.js` (inspect/apply/verify) | melhorar |
| Plugins/eventos | `events.js` mínimo agora; plugins depois | criar (mínimo) |
| Histórico de versões | versionamento nativo da lista + restaurar | melhorar |
| **Templates** | — | **fora de escopo** |
| **ACL** | — | **fora de escopo** |
| Campos personalizados, workflow, multilíngue, busca, banners, redirecionamentos | — | adiado (não descartado) |

## 6. Administrator

Carregado por rota lazy (`#/administrator/...`) para não pesar a navegação pública.
Telas: **Configuração global**, **Extensões** (habilitar/desabilitar, parâmetros),
**Menus**, **Módulos** (posição, ordem, vigência, atribuição, parâmetros),
**Artigos / Categorias / Tags / Mídia** (Publicador), **Diagnóstico e histórico**.
Formulários gerados por `settings-schema` (nunca JSON cru para o gestor).
Sem ACL: o link de acesso aparece conforme a permissão efetiva do SharePoint
(ex.: `EffectiveBasePermissions` da lista), e o SharePoint continua sendo quem
autoriza a gravação; isso **não** é um sistema próprio de permissões.

## 7. Publicador

Lista de artigos com filtros e ações em lote; editor (Quill, já na plataforma);
estados **Publicado / Despublicado / Arquivado / Lixeira**; publicar de/até;
destaque com ordem (e janela opcional); categoria (lookup) e tags; imagem de capa
via biblioteca; versões nativas com restauração; ETag para evitar sobrescrita
(já existe no `configuration-store`). Conteúdo HTML sempre sanitizado
(`core/rich-text.js`); nunca Base64.

## 8. Fases

| Fase | Entrega | Critério de aceite |
| --- | --- | --- |
| 0 | Reorientação, planos atualizados, agentes interrompidos | este documento aprovado |
| 1 | Contratos: manifesto v2, rotas, schema v3, listas MSE*; **spike**: 1 MSE com hash-routing no tenant | rota troca de visão sem recarregar; foco correto |
| 2 | Kernel mínimo + host local | exemplo com 2 Componentes e 3 Módulos em posições; testes unitários |
| 3 | Persistência e instalador | `inspect/apply/verify` das listas MSE*; carga em 1 `$batch`; runtime só lê |
| 4 | Adaptação do 1º consumidor (CAMAP-AGP) | paridade visual com a Home atual; ver plano do CAMAP |
| 5 | Administrator | gestor liga/desliga extensão e move módulo de posição sem tocar em código |
| 6 | Publicador | conteudista cria, edita, publica e despublica artigo |
| 7 | Hardening e cutover | a11y, desempenho, rollback; troca controlada de `Default.aspx` |

Cada fase fecha com `npm test` (suíte atual **inalterada e verde**) mais testes novos
do kernel. A fase 1 só avança se o spike provar que o MSE aceita o ciclo
(carregamento do script, hashchange, desmontagem) sem recarregar a página.

## 9. Riscos

| Risco | Mitigação |
| --- | --- |
| Todo o site depende de **um** MSE/script: falha = site fora | Cache do último estado válido; `Default.aspx` mantém conteúdo mínimo estático (`noscript`/aviso); rollback trocando só a URL do snippet |
| Peso do boot (muitas chamadas REST) | `$batch`, cache, import lazy do Componente e do Administrator |
| Renderização só no cliente (SEO/busca do SharePoint) | Aceito: intranet; registrar como limitação |
| Quebrar o TD | Mudanças aditivas; o caminho de publicação novo é distinto de `releases/<versão>/` e nunca o sobrescreve; testes de regressão do caminho legado |
| Sem pastas versionadas, não há rollback por pasta | Rollback por Git (tag + manifesto de SHA-256) e reenvio; ver seção 11 |
| Hash-routing e MSE/SharePoint modernos (navegação, `_spPageContextInfo`) | Spike da Fase 1 antes de qualquer outra coisa |

## 10. Decisões a confirmar

| # | Decisão | Recomendação |
| --- | --- | --- |
| D1 | Roteamento por hash (`#/`) em vez de query string | Hash: não recarrega o aspx e preserva o MSE |
| D2 | Pasta `kernel/` nova, sem mover `core/` | Sim; evita risco ao TD |
| D3 | Listas novas `MSE*` em vez de reaproveitar `CAMAPModulosConfiguracoes` | Novas, com migração das 9 instâncias e `verify`; lista antiga mantida até o aceite |
| D4 | Páginas institucionais (Quem somos, Estrutura, Serviços, Docs, Contatos): artigos do BLOG, ou Componente próprio | Artigos/categorias do BLOG (como no Joomla!); Contatos como visão do BLOG até haver necessidade de `com_contact` |
| D5 | Detecção de permissão para exibir o Administrator | `EffectiveBasePermissions` das listas; sem tabela de permissões |
| D6 (revista) | **Sem versionamento por pastas**, no mse-platform e nos sites, nesta fase | Aprovado: pasta fixa única; ver seção 11 |
| D9 | Onde fica o CSS/tema específico de um site | **Aprovado (15/10/2026):** subpasta `theme/` (somente CSS e tokens) dentro da pasta do site, carregada pelo kernel; o mse-platform só fornece o tema-base neutro |
| D7 | Ordem dos recursos Joomla! adiados | Plugins → campos personalizados → busca → redirecionamentos → multilíngue |
| D8 | As 8 `.aspx` internas viram redirecionadores para `Default.aspx#/rota` | Sim, até o cutover estar estável |

## 11. Publicação sem pastas versionadas (decisão 15/10/2026)

- **Uma pasta fixa** para o produto, nova e distinta do legado: `SiteAssets/mse-platform/current/`
  (nome a confirmar na Fase 1). Arquivos são substituídos no lugar. O padrão
  `releases/<versão>/` deixa de ser usado para trabalho novo, mas as pastas já publicadas
  (TD) permanecem intactas.
- **Versão continua existindo dentro dos arquivos**: SemVer nos manifestos
  (`version`, `coreCompatibility`) e `package.json`. O kernel continua recusando combinações
  incompatíveis; apenas deixa de haver uma pasta por versão.
- **Cache:** o kernel anexa ao carregar scripts e CSS um parâmetro derivado do
  `MANIFEST-SHA256.json`, como o core do CAMAP já faz hoje. Sem editar snippet a cada publicação.
- **Rollback:** tag Git no mse-platform por entrega + `MANIFEST-SHA256.json`; reverter =
  reenviar a tag anterior para a pasta fixa. O `verify` confere hashes remotos após o envio.
- **Contrapartida aceita:** substituir arquivos em uso afeta o site imediatamente; por isso
  qualquer envio exige confirmar o destino de produção e a autorização aplicável, e o primeiro
  teste usa uma página paralela (`Preview.aspx`) antes do cutover.
- **Implicação para docs e ferramentas:** `INSTALACAO-MSE.md`, `COMPATIBILIDADE-E-VERSIONAMENTO.md`,
  `core/README.md` e `tools/build-release.js` / `verify-release.js` serão adaptados na Fase 1
  (modo “pasta fixa”), sem remover o modo antigo enquanto o TD depender dele.

## 12. Divisão de responsabilidades: produto × site (decisão 15/10/2026)

| Fica no **mse-platform** (produto) | Fica na pasta do **site** (ex.: CAMAP-AGP) |
| --- | --- |
| Kernel, Componentes, Módulos, Administrator, Publicador | Imagens, vídeos e demais mídias do site |
| Instalador `inspect/apply/verify` e migrações | Documentação do site (planos, identidade, decisões) |
| Tema-base neutro, testes, exemplos | Cópia/backup da configuração exportada (`config-transfer`), como documentação |
| Código hoje em `CAMAP-AGP/core`, `modules`, `tests`, `data/provisioning`: **migra para o mse-platform** de forma genérica | CSS específico do site: subpasta `theme/` (D9) |

Configuração do site (menu, módulos, posições, parâmetros) vive nas listas SharePoint, editada
pelo Administrator — não em arquivos de código do site. O CAMAP-AGP continua **sem repositório Git**;
o histórico de código passa a ser o do mse-platform.
