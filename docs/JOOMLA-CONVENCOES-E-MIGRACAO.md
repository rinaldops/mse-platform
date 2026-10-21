# Auditoria e plano de alinhamento Joomla! — Mini Joomla!

**Data:** 17/10/2026
**Escopo:** `web-devs/mse-platform` e o consumidor `web-devs/CAMAP-AGP`
**Tipo:** auditoria estrutural e plano de migração; esta etapa não move nem renomeia código.

> Este documento foi produzido a partir da inspeção dos arquivos presentes no workspace, dos manifestos, testes, adaptador MSE, planos, módulos do CAMAP-AGP e da árvore local do Joomla! 6.2.0 em `CAMAP-AGP/layout/Joomla6.2.0/`. Ele não trata os planos anteriores como prova de implementação: o status abaixo distingue código realmente encontrado, código parcial e trabalho ainda inexistente.

## 1. Conclusão executiva

O `mse-platform` já possui um **Site Kernel funcional em código**, com roteamento, despacho de Componente, posições de Módulos, configuração, eventos, persistência SharePoint, instalador e um início de Administrator. O CAMAP-AGP possui módulos visuais e dados editoriais próprios, além de dois templates experimentais e uma pasta Joomla! 6.2.0 usada como referência.

Entretanto, a organização atual ainda é uma combinação de três convenções:

1. a convenção histórica do `mse-platform` (`admin/`, `modules/<produto>/`, `module.js`, `manifest.js`);
2. a convenção do Site Kernel (`kernel/`, `host-adapters/modern-script-editor/`, listas `MSE*`);
3. a convenção Joomla! que se pretende adotar (`administrator/components/com_*`, `components/com_*`, `modules/mod_*`, `plugins/<grupo>`, `templates/<nome>`).

A recomendação é **não fazer uma grande renomeação imediata**. Primeiro deve ser criado um contrato Joomla-like, depois componentes e módulos devem ser migrados gradualmente com aliases/reexports. Assim, o modo legado pode ser isolado e arquivado sem contaminar o novo contrato. O TD não é consumidor compatível desta versão: será adaptado futuramente por meio de um template próprio sobre o Mini Joomla!.

O alinhamento pretendido é de **vocabulário, localização, manifestos, ciclo de vida, rotas e responsabilidades**. Não é uma cópia do Joomla! PHP: o runtime continuará JavaScript, o MSE será o único encapsulador de publicação, o SharePoint substituirá o banco, o CSS continuará sendo a implementação visual, e Templates completos e ACL próprio permanecem fora do escopo.

## 2. Fontes efetivamente auditadas

### 2.1 Mini Joomla! / mse-platform

- `package.json` e suíte declarada em `npm test`;
- `core/` — contratos, REST, listas, configuração, editores ricos, sanitização, acessibilidade e compatibilidade histórica;
- `kernel/` — aplicação, roteador, menu, despacho, layout, posições, extensões, eventos, configuração, conteúdo, administração e seed;
- `host-adapters/modern-script-editor/` — bootstrap, runner, site runner, resolução de manifestos e snippets;
- `admin/` — painel administrativo histórico e seus serviços de instalação, catálogo, schema, transferência e snippets;
- `administrator/` — painel Joomla-like inicial criado na branch `feature/mini-joomla-administrator`;
- `modules/forum`, `modules/home`, `modules/recursos`, `modules/videoteca` e `modules/ui`;
- `themes/` — atualmente apenas a estrutura inicial do tema-base;
- `docs/`, especialmente `PLANO-SITE-KERNEL-MSE.md`, `CONTRATOS-DE-MODULO.md`, `INSTALACAO-MSE.md` e `COMPATIBILIDADE-E-VERSIONAMENTO.md`.

### 2.2 Consumidor CAMAP-AGP

- `core/`, `modules/`, `data/provisioning/`, `tests/` e `webparts/`;
- `templates/camap-tema-01`, `templates/camap-tema-02` e `templates/system`;
- `theme/` como fonte de identidade visual e tokens;
- planos e inventário em `docs/`;
- manifestos e snippets MSE de BLOG, SD, DT1, MC, DB, Footer e Breadcrumbs.

### 2.3 Joomla! 6.2.0 local

Fonte: `web-devs/CAMAP-AGP/layout/Joomla6.2.0/`.

Foram conferidas as árvores `administrator/`, `components/`, `modules/`, `plugins/`, `templates/`, `libraries/`, `media/`, `images/`, `language/` e `layouts/`. Também foram observados os templates públicos `cassiopeia`, `cassiopeia_extended`, o fallback técnico `templates/system` e o template administrativo `administrator/templates/atum`.

## 3. Inventário real do mse-platform

### 3.1 Raiz atual

```text
mse-platform/
├── admin/                    painel histórico/legado
├── administrator/            Administrator Joomla-like inicial
├── core/                     contratos e infraestrutura histórica
├── dist/                     pacotes e releases históricas
├── docs/                     documentação e planos
├── examples/                 hosts e exemplos locais
├── host-adapters/            integração com MSE
├── kernel/                   Site Kernel do Mini Joomla!
├── modules/                  módulos/componentes atuais
├── themes/                   tema-base inicial
├── tools/                    build, release e verificação
├── package.json
└── README.md
```

`dist/`, `.tmp/` e `graphify-out/` são artefatos auxiliares/históricos; não devem ser confundidos com a fonte do runtime.

### 3.2 `core/`: funcionalidades existentes

| Arquivo/área | Responsabilidade encontrada | Correspondência Joomla! aproximada |
|---|---|---|
| `module-contract.js` | contrato de manifesto e montagem | manifesto/extension contract |
| `rest.js` | REST SharePoint, `$batch`, upload e operações de dados | camada de persistência/database adapter |
| `list-provisioning.js`, `provisioning.js` | schemas e provisionamento de listas | instalação/SQL/schema |
| `configuration-store.js`, `runtime-config.js`, `settings-migrations.js` | configuração, migrações e armazenamento | Registry/params/com_config |
| `navigation.js` | navegação e histórico | Router/application |
| `rich-text.js` | sanitização de HTML | filtro de conteúdo |
| `editor.js`, `editor-quill.js`, `editor-summernote.js` | editores ricos | campo/editor do Administrator |
| `accessibility.js` | foco e acessibilidade | comportamento transversal |
| `theme-adapter.js` | integração visual | template/theme adapter |
| `core.js`, `core.css` | runtime histórico e estilos compartilhados | camada de compatibilidade |
| `data-sources.js`, `module-diagnostics.js` | fontes e diagnósticos | services/diagnostics |
| `epub-settings.js` | configuração específica do produto legado EPUB | **legado**, não renomear sem migração |

### 3.3 `kernel/`: núcleo existente do Mini Joomla!

```text
kernel/
├── application.js          boot, rota, dispatch, render, dispose e isolamento
├── router.js               hash routing e parâmetros de rota
├── dispatcher.js           resolução de Componente/view/params
├── menu.js                 itens, tipos, hierarquia e item ativo
├── positions.js            Módulos por posição, vigência e menu
├── layout.js               esqueleto DOM, posições e área do Componente
├── extension-registry.js   extensões habilitadas e conversão de tipos
├── events.js               barramento de eventos mínimo
├── site-config.js          configurações global/extensão/instância
├── content-services.js     filtros e regras editoriais
├── publisher-data.js       dados para publicador/artigos/versionamento
├── admin-data.js           CRUD com ETag
├── admin-form.js           descritores de formulários a partir de schemas
├── installer.js             inspect/apply/verify das listas do kernel
├── seed.js                  seed genérico explícito
└── schemas/                 schemas de MSEMenu, MSEModulos e MSEExtensoes
```

O `application.js` já implementa a ideia central: uma aplicação inicializa um snapshot, resolve a rota, monta um Componente na área principal e monta Módulos independentes em posições. A falha de uma instância é isolada. O código ainda chama os entrypoints de `full` e `summary` para manter compatibilidade com manifestos antigos; essa compatibilidade deve ser formalizada, não removida abruptamente.

### 3.4 Adaptador MSE

```text
host-adapters/modern-script-editor/
├── bootstrap.js
├── runner.js                 modo legado: um MSE por módulo
├── site-boot.js              carga de listas/configuração e resolver de manifestos
├── site-runner.js            bootstrap de um site inteiro
├── site-integration.js
├── site-snippet.html         um MSE por site
├── snippet.html               snippet legado
└── layout.css
```

`site-runner.js` e `site-snippet.html` são a ponte para o novo modelo. O kernel permanece neutro: não conhece SharePoint diretamente e não deve conhecer CAMAP-AGP.

### 3.5 `admin/` e `administrator/`

`admin/` é um painel anterior, reaproveitável em partes:

```text
admin/
├── admin-center.js
├── catalog.js
├── config-transfer.js
├── default-catalog.js
├── installer.js
├── manifest.js
├── module.js
├── settings-renderer.js
├── settings-schema.js
└── snippet-generator.js
```

Ele já oferece shell, formulários por schema, confirmação, import/export, catálogo, instalação `inspect/apply/verify`, ETag e geração de snippets. Porém, ainda carrega nomes e conceitos de EPUB e do modelo “um MSE por módulo”.

`administrator/` é a nova direção, mas ainda é apenas um esqueleto:

```text
administrator/
├── README.md
├── administrator.css
├── component.js
├── manifest.js
├── router.js
└── screens/
    ├── collections.js
    └── control-panel.js
```

Há rotas para `com_cpanel`, `com_config`, `com_extensions`, `com_menus`, `com_modules` e `com_installer`, mas não existem ainda componentes administrativos formais, CRUD visual completo, Publicador, Categorias, Tags, Mídia, histórico ou templates administrativos. Portanto, **Administrator não deve ser descrito como concluído**.

### 3.6 Módulos atuais da plataforma

```text
modules/
├── forum/       componente de fórum completo + resumo
├── home/        componente Home
├── recursos/    Explore Mais, completo + resumo
├── ui/          componentes visuais compartilhados
└── videoteca/   catálogo completo + resumo
```

Cada produto normalmente combina `manifest.js`, `module.js`, arquivo de dados, loader, view, schema, CSS, README/USAGE, provisionamento e `summary/module.js`. Isso funciona, mas ainda não comunica claramente a distinção física entre `com_*` e `mod_*`.

## 4. Inventário real do CAMAP-AGP

### 4.1 Código e módulos

```text
CAMAP-AGP/
├── core/            runtime/site legado e camada de compatibilidade
├── data/            provisionamento e seed SharePoint
├── docs/            planos, inventário, identidade e análise Joomla!
├── images/          mídia do site e protótipos históricos
├── layout/          mockups e Joomla! 6.2.0 de referência
├── modules/
│   ├── blog/        candidato a componente com lista, artigo e resumo
│   ├── breadcrumbs/ módulo de pathway
│   ├── db/          módulo de destaques/artigos
│   ├── dt1/         módulo de destaque textual
│   ├── footer/      módulo de rodapé
│   ├── mc/          módulo de mensagem corporativa
│   └── sd/          módulo de sessões/destaques/Hero
├── templates/       camap-tema-01, camap-tema-02 e system
├── tests/           testes de runtime, módulos e manifestos
├── theme/           documentos-base/tokens do visual do site
├── tools/           preparação de SiteAssets
└── webparts/        protótipos vanilla independentes
```

### 4.2 Mapeamento conceitual CAMAP → Joomla!

| Identificador atual | Papel correto no Mini Joomla! | Nome Joomla-like recomendado |
|---|---|---|
| BLOG | Componente de conteúdo, lista e artigo | `components/com_content` |
| DB | Módulo de artigos recentes/destaques | `modules/mod_articles_latest` ou `mod_articles_news` |
| SD | Módulo de chamadas/Hero/cards | `modules/mod_custom` ou nome específico `mod_camap_sd` |
| DT1 | Módulo de destaque textual | `modules/mod_custom`/`mod_camap_dt1` |
| MC | Módulo de mensagem corporativa | `modules/mod_custom`/`mod_camap_mc` |
| Footer | Módulo de rodapé/menu | `modules/mod_footer`/`mod_menu` |
| Breadcrumbs | Módulo de caminho | `modules/mod_breadcrumbs` |
| `CAMAPPublicacoes` | dados do conteúdo | equivalente a `#__content` |
| `CAMAPCategorias` | categorias | equivalente a `#__categories` |
| `CAMAPTags` | taxonomia | equivalente a `#__tags` |
| `CAMAPPublicacaoTags` | relacionamento N:N | equivalente a `#__contentitem_tag_map` |
| `CAMAPModulosConfiguracoes` | parâmetros de conteúdo de módulo | configuração de `#__modules`/params |

A nomenclatura física atual não precisa ser apagada imediatamente. O caminho de migração deve permitir que `modules/blog` seja um alias compatível enquanto o componente formal `components/com_content` é introduzido.

### 4.3 Templates CAMAP

O CAMAP já possui estruturas próximas às esperadas:

```text
templates/camap-tema-01/
├── template.json
├── index.js
├── component.js
├── error.js
├── css/
├── js/
├── html/
├── language/
└── images/
```

`camap-tema-02` possui o mesmo desenho e `templates/system` é um fallback técnico simplificado. Como Templates completos estão fora do escopo do kernel nesta fase, essas pastas devem permanecer como **artefatos compatíveis e futuros**, sem serem tratadas como mecanismo já integrado de override.

## 5. O que o Joomla! 6.2.0 estabelece como convenção

A árvore local confirma as seguintes convenções:

```text
site/
├── components/com_<nome>/
├── modules/mod_<nome>/
├── plugins/<grupo>/<nome>/
├── templates/<nome>/
├── templates/system/
├── media/
├── images/
├── language/<locale>/
└── libraries/

administrator/
├── components/com_<nome>/
├── modules/mod_<nome>/
├── templates/atum/
├── language/<locale>/
└── ...
```

Dentro de componentes administrativos, a separação recorrente é:

```text
com_exemplo/
├── com_exemplo.xml
├── access.xml / config.xml / forms/
├── services/
├── src/
│   ├── Controller/
│   ├── Dispatcher/
│   ├── Model/
│   ├── Table/
│   ├── View/
│   └── Field/
├── tmpl/
└── language/
```

No Mini Joomla!, as equivalências serão JavaScript:

```text
com_exemplo/
├── extension.json       manifesto declarativo
├── manifest.js          contrato executável/compatibilidade
├── component.js         montagem e ciclo de vida
├── views/               visões nomeadas
├── models/              acesso/normalização de dados
├── services/            regras e APIs
├── forms/               schemas de formulário
├── html/                pontos de override
└── language/            chaves de idioma
```

`src/Controller`, `Model`, `View` e `tmpl` não devem ser copiados literalmente como PHP; os nomes devem ser mantidos apenas quando acrescentarem familiaridade sem criar camadas artificiais.

## 6. Matriz de conformidade atual

| Convenção Joomla! | Situação encontrada | Classificação | Adaptação necessária |
|---|---|---:|---|
| `administrator/` | existe, mas sem `components/` | parcial | criar componentes administrativos formais |
| `administrator/components/com_*` | inexistente | ausente | separar `com_cpanel`, `com_config`, `com_menus`, `com_modules`, `com_installer`, `com_content` |
| `components/com_*` | inexistente no mse-platform | ausente | criar componentes públicos; manter `modules/` como alias durante migração |
| `modules/mod_*` | existe `modules/<produto>` sem prefixo | parcial | adicionar metadado `type: module` e, depois, aliases/pastas `mod_*` |
| `plugins/<grupo>` | inexistente | ausente | criar loader e grupos mínimos `system`, `content`, `extension`, `installer` |
| `templates/<nome>` | existe no CAMAP, não no kernel | parcial | consolidar contrato de template; não implementar mecanismo agora |
| `templates/system` | existe no CAMAP | parcial | documentar fallback e loader futuro |
| `libraries/` | responsabilidades em `core/`, `kernel/`, `host-adapters/` | válido, não familiar | criar facade opcional, sem duplicação |
| `media/` | sem convenção geral do kernel | ausente | padronizar assets compartilhados; mídia do site continua no site |
| `images/` | existente no CAMAP | existente | manter como mídia do consumidor |
| `language/<locale>` | JSON simples espalhado | parcial | separar idioma público, administrativo e extensão |
| manifesto XML | `manifest.js` e schemas JS | adaptação válida | adicionar manifesto declarativo JSON e manter JS como contrato |
| `index.php/component.php/error.php` | `index.js/component.js/error.js` | adaptação válida | fixar nomes JS no contrato |
| `option/view/task/id` | rota administrativa já usa query/hash; público ainda é mais simples | parcial | formalizar contrato de rota |
| `com_content` | `publisher-data.js` e BLOG parcial | parcial | componente público e administrativo de conteúdo |
| `com_config` | `site-config.js` e tela placeholder | parcial | CRUD de configuração e escopos |
| `com_menus` | `menu.js` e tela placeholder | parcial | administração de tipos/itens/hierarquia |
| `com_modules` | `positions.js`/schemas e tela placeholder | parcial | UI de posição, ordem, vigência e atribuição |
| `com_installer` | installer kernel + admin legado | parcial | tela e fluxo Joomla-like, sem duplicar instaladores |
| `com_media` | REST/upload existe, UI não | ausente | biblioteca/seleção de mídia |
| plugins/eventos | `events.js` mínimo | parcial | loader, grupos, habilitação e isolamento |
| overrides `templates/<t>/html` | pastas existem no CAMAP, loader ausente | parcial | resolver template → componente → system |
| ACL próprio | deliberadamente não implementado | fora de escopo | usar SharePoint |
| Templates completos | deliberadamente não implementado | fora de escopo | preservar artefatos e adiar runtime |

## 7. Estrutura-alvo recomendada

A estrutura abaixo é o alvo de compatibilidade, não uma instrução para mover tudo em um único commit:

```text
mse-platform/
├── administrator/
│   ├── components/
│   │   ├── com_cpanel/
│   │   ├── com_config/
│   │   ├── com_content/
│   │   ├── com_extensions/
│   │   ├── com_installer/
│   │   ├── com_menus/
│   │   ├── com_modules/
│   │   ├── com_categories/
│   │   ├── com_tags/
│   │   └── com_media/
│   ├── modules/
│   ├── templates/system/
│   ├── language/
│   └── media/
├── components/
│   ├── com_content/
│   ├── com_categories/
│   ├── com_tags/
│   └── com_media/
├── modules/
│   ├── mod_articles_latest/
│   ├── mod_articles_news/
│   ├── mod_breadcrumbs/
│   ├── mod_custom/
│   ├── mod_footer/
│   └── mod_menu/
├── plugins/
│   ├── system/
│   ├── content/
│   ├── extension/
│   └── installer/
├── templates/
│   └── system/
├── media/
├── images/
├── language/
├── libraries/                 facade JS opcional
├── core/                      compatibilidade e infraestrutura existente
├── kernel/                    Site Kernel
├── host-adapters/
└── admin/                     legado, congelado até migração
```

### 7.1 Regra de manifesto

Cada extensão nova deve declarar, no mínimo:

```js
{
  id: "com_content",
  type: "component",                 // component | module | plugin
  name: "COM_CONTENT",
  version: "0.1.0",
  entrypoints: { full: "./component.js", summary: "./summary/module.js" },
  views: { list: {}, article: {}, featured: {} },
  routeParams: ["id", "slug"],
  params: "./settings-schema.js",
  dataSources: [],
  install: { lists: [], fields: [] },
  language: ["pt-BR"]
}
```

O `manifest.js` continua sendo JavaScript para permitir `defineModuleManifest`; `extension.json` será o formato declarativo/exportável para catálogo, diagnóstico e instalação. Não usar `package.json` como substituto do manifesto da extensão.

### 7.2 Regra de entrypoints

- **Componente:** `component.js` monta a área principal; views são selecionadas por `context.view` (`list`, `article`, `featured` etc.).
- **Módulo:** `module.js` monta uma posição; `summary/module.js` permanece como alias de compatibilidade até o contrato ser simplificado.
- **Plugin:** não monta DOM; registra handlers em eventos declarados.
- **Administrador:** é uma aplicação/componentes sob `administrator/`, não um módulo visual comum.

## 8. Plano de migração em fases

### Fase A — contrato e inventário (primeiro passo)

1. Adotar este documento como referência de convenções.
2. Congelar nomes atuais e registrar aliases.
3. Classificar todos os manifestos como `component`, `module` ou `plugin`.
4. Formalizar `option`, `view`, `task`, `id`, `slug` no roteador.
5. Introduzir validação de `extension.json` sem alterar montagem.

**Aceite:** nenhum módulo atual quebra; cada extensão tem um tipo, entrypoint e fonte de dados identificados.

### Fase B — fachadas e estrutura física compatível

1. Criar `components/`, `plugins/`, `media/`, `language/` e `templates/system/` no `mse-platform`.
2. Criar reexports/aliases para os módulos atuais, sem duplicar lógica.
3. Criar `libraries/` somente se houver facade útil; não copiar `core/` ou `kernel/`.
4. Manter `admin/` intacto e indicar `administrator/` como caminho oficial novo.

**Aceite:** imports antigos continuam verdes e um resolver consegue encontrar uma extensão tanto pelo identificador atual quanto pelo caminho Joomla-like.

### Fase C — componentes públicos

1. Extrair BLOG/CAMAP para `components/com_content` genérico.
2. Transformar Fórum, Videoteca e Explore Mais em componentes formais, preservando seus IDs de dados.
3. Criar `views/`, `models/`, `services/` e `forms/` apenas para responsabilidades reais.
4. Manter o entrypoint antigo por alias até o CAMAP concluir o cutover.

**Aceite:** lista, artigo, resumo, filtros, paginação e links internos funcionam sem URL externa; `component.js` é o único ponto de montagem público.

### Fase D — módulos

1. Mapear `DB` para `mod_articles_latest`/`mod_articles_news` conforme o comportamento final.
2. Mapear `SD`, `DT1`, `MC`, Footer e Breadcrumbs para `mod_*`.
3. Preservar identidade visual no tema do consumidor, não no kernel genérico.
4. Declarar posições e parâmetros no manifesto e no Administrator.

**Aceite:** o Site Kernel monta módulos por posição, ordem, vigência e menu; configurações vêm das listas e não do snippet.

### Fase E — Administrator Joomla-like

Criar, em ordem:

```text
administrator/components/
├── com_cpanel/
├── com_config/
├── com_extensions/
├── com_menus/
├── com_modules/
├── com_installer/
├── com_content/
├── com_categories/
├── com_tags/
└── com_media/
```

Reaproveitar `admin-data.js`, `admin-form.js`, `kernel/installer.js`, editor rico e ETag. O SharePoint continua autorizando gravações; não criar ACL paralelo.

**Aceite:** administrador/proprietário configura extensões, menu, módulos e parâmetros; conteudista mantém publicações; nenhum usuário não autorizado grava listas.

### Fase F — plugins, idioma e overrides

1. Implementar loader de `plugins/<grupo>` sobre `events.js`.
2. Criar `language/pt-BR/` com escopo público/administrativo/extensão.
3. Criar resolver de overrides `templates/<template>/html/<component>/<view>` com fallback em `templates/system`.
4. Não transformar isso em um sistema completo de Templates ou ACL nesta fase.

**Aceite:** plugins declarados têm ordem, habilitação e isolamento; traduções e overrides são determinísticos.

### Fase G — migração do CAMAP e limpeza controlada

1. Fazer o CAMAP consumir os componentes/módulos do `mse-platform`.
2. Retirar gradualmente código genérico de `CAMAP-AGP/core`, `modules`, `tests` e `data/provisioning`, preservando backups/documentação.
3. Manter no CAMAP apenas mídia, `theme/` e documentação conforme o plano aprovado.
4. Validar `Default.aspx` (canônico) com um único MSE antes do cutover.
5. Só depois arquivar aliases e caminhos históricos.

**Aceite:** Home e páginas internas são rotas do mesmo Site Kernel; nenhuma página depende de fallback monolítico ou de conteúdo externo para o corpo da publicação.

## 9. O que não deve ser feito

- Não renomear em lote `modules/` antes de criar resolver e aliases.
- Não apagar `admin/`, `core/` ou `kernel/` sem uma decisão de limpeza própria; a preservação é histórica/operacional, não uma promessa de compatibilidade com o TD.
- Não duplicar a mesma implementação em `modules/`, `components/` e `administrator/components/`.
- Não usar `package.json` como manifesto Joomla-like de extensão.
- Não acoplar o kernel a nomes do CAMAP (`CAMAP*`, Hero, SD etc.).
- Não implementar ACL próprio; SharePoint é a autoridade.
- Não implementar Templates completos agora; manter contrato e fallback para uso futuro.
- Não declarar uma funcionalidade como pronta apenas porque existe um placeholder visual no Administrator.

## 10. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Acoplar o Mini Joomla! ao TD ao reorganizar `core/`/`modules/` | separar caminhos e contratos; validar o Mini Joomla! sem imports, releases, listas ou templates do TD |
| Duas fontes para o mesmo componente | uma implementação canônica + reexports |
| Divergência entre nome técnico e título SharePoint | resolver por `RootFolder.Name`; título é apresentação |
| Manifestos v1 e v2 incompatíveis | normalizador único em `module-contract.js` |
| Administrator parecer pronto sem CRUD | critérios de aceite por componente, não por tela |
| Dados CAMAP ficarem acoplados ao kernel | adapters e `dataSources` declaradas |
| Renomeação causar links quebrados | manter IDs e aliases; migrar rotas com testes |
| Conteúdo HTML inseguro | `rich-text.js` e sanitização obrigatória |
| Falha de um Módulo derrubar o site | isolamento já existente em `application.js` |

## 11. Critérios de aceite do alinhamento

1. Um desenvolvedor familiarizado com Joomla! localiza componentes, módulos, plugins, templates, media, language e administrator por nomes previsíveis.
2. Todo código novo usa `com_*`, `mod_*`, `plg_*` e grupos de plugins quando aplicável.
3. Cada extensão tem manifesto, versão, tipo, entrypoints, parâmetros e fontes de dados.
4. Rotas públicas e administrativas respeitam `option/view/task/id/slug`.
5. O antigo modo de publicação continua funcionando durante a transição.
6. O Site Kernel continua neutro em relação ao CAMAP.
7. O Administrator usa CRUD/ETag e schemas, não JSON cru nem acesso direto espalhado.
8. O Publicador possui lista, filtro, editor, publicação/despublicação, vigência, categorias, tags, mídia e versões.
9. Componentes e Módulos do CAMAP são reutilizáveis por outros sites sem copiar código específico da Petrobras.
10. Templates e ACL permanecem explicitamente fora do escopo funcional, sem impedir a existência de seus diretórios e contratos futuros.
11. `npm test`, testes de manifesto, `git diff --check` e validação de build permanecem verdes a cada migração.

## 12. Próxima alteração recomendada

A próxima implementação deve ser pequena e reversível:

1. criar um `extension.json`/validador de contrato para uma extensão de exemplo;
2. adicionar `type` e `extensionPath` normalizados aos manifestos existentes;
3. criar um resolver que aceite simultaneamente `modules/forum` e `components/com_forum`;
4. acrescentar testes desse resolver;
5. só então criar `administrator/components/com_cpanel` como primeiro componente formal.

Essa sequência atende ao pedido de “dar um passo atrás”: primeiro se fixa a nomenclatura e a ponte de compatibilidade; depois o código é adaptado. Não há necessidade de decisão arquitetural adicional para começar essa etapa.

## 13. Registro de estado desta auditoria

- Auditoria realizada localmente em 17/10/2026.
- Nenhum arquivo funcional foi movido, renomeado ou apagado nesta etapa.
- Nenhum acesso ao SharePoint ou navegador foi necessário.
- A branch do `mse-platform` permanece `feature/mini-joomla-administrator`.
- A branch do CAMAP permanece `feature/template-camap-tema-02`; alterações preexistentes no plano do CAMAP foram preservadas.
- O TD foi tratado nesta auditoria como consumidor futuro separado: nenhuma exigência de retrocompatibilidade com ele foi incluída no alvo do Mini Joomla!.
- O push da branch do CAMAP continua uma pendência operacional já conhecida (`HTTP 403`); não é parte desta auditoria.

## 14. Mudança de estratégia: reestruturação completa e imediata, não gradual (20–21/10/2026)

Esta seção **não descarta** a auditoria e o plano acima — o inventário, a
matriz de conformidade e a estrutura-alvo recomendada (seções 1–11) seguem
válidos como registro histórico e continuam descrevendo corretamente o
estado em 17/10/2026 e o raciocínio que levou à convenção-alvo. O que muda é
a **estratégia de migração** descrita na seção 8 ("Plano de migração em
fases", Fase A–G): aquele roteiro recomendava explicitamente **não fazer
uma grande renomeação imediata**, preferindo aliases/reexports e migração
gradual de componentes e módulos, com o modo legado isolado e arquivado
depois.

Em sessão posterior (20–21/10/2026), o usuário confirmou explicitamente a
decisão de **reestruturação completa e imediata**, por fase testável e
revertível isoladamente (sem aliases permanentes), em vez do caminho
gradual Fase A–G. Esta seção registra a decisão e o resultado efetivamente
entregue; o plano de execução detalhado foi um artefato de sessão, fora do
versionamento deste repositório.

Motivos da mudança, tal como discutidos com o usuário:

- O `mse-platform` é maior, mas o número de consumidores reais (CAMAP-AGP)
  é pequeno e controlado — o custo de coordenar aliases temporários superava
  o custo de uma quebra controlada, fase a fase, com `npm test` verde a cada
  checkpoint.
- Aliases/reexports permanentes tendem a nunca ser removidos na prática
  (a "limpeza controlada" da Fase G do plano original ficaria
  indefinidamente pendente); a reestruturação imediata elimina esse risco
  ao preço de uma janela de republicação manual mais abrupta.
- O volume de mudança (estrutura de pastas inteira, mais tarde listas e
  campos SharePoint) é grande demais para uma única sessão, mas cabe em
  fases sequenciais, cada uma testável e revertível via Git — o mesmo
  benefício de segurança que a estratégia gradual buscava, sem o custo de
  manter dois vocabulários vivos ao mesmo tempo.

Execução realizada (branch `feature/normalizacao-joomla`, worktree
dedicado):

- **Fase 1** (`1fb4954`): reestruturação completa de pastas —
  `administrator/` → `components/com_cpanel/` + demais `components/com_xxx/`
  (um por `option`), `modules/<nome>` → `modules/mod_<nome>`, `modules/ui/`
  → `libraries/ui/`, `plugins/` reservada criada vazia. `admin/` (painel
  histórico pré-Site-Kernel) permanece intocado, fora de escopo.
- **Fase 2** (`285bbfd`): `kernel/events.js#KERNEL_EVENTS` normalizado para
  `onAfterRoute`/`onBeforeRender`/`onAfterRender` (convenção Joomla!
  `on<Área><Momento>`).
- **Fase 3** (`a5b6ad1`): criadas as listas SharePoint em inglês
  (`MSEModules`, `MSEExtensions`, `MSEModulesMenu`, `MSEMenuTypes`) e os
  campos em inglês acrescentados a `MSEMenu` (lado a lado com os 12 campos
  PT, que ficam `DEPRECATED`); dados reais de produção copiados para as
  listas novas via script idempotente, com script de verificação
  campo a campo.
- **Fase 4** (`8aca410`): todo o código consumidor (kernel, `site-boot.js`,
  os 3 editores do Administrator, diagnóstico) migrado para ler/escrever os
  campos/listas em inglês; removida de `extension-registry.js` a camada de
  tradução `type`↔`Tipo`, que não tem equivalente real no Joomla! original.
- **Fase 5** (esta edição): documentação — `README.md` de cada pasta
  renomeada, esta seção, e `docs/CONVENCAO-JOOMLA.md` (tabela de
  equivalência Joomla! ↔ mse-platform definitiva, pós-normalização).

Pendências explícitas, fora desta rodada (registradas para não serem
confundidas com trabalho esquecido):

- **Fase 3b** (`MSEConfiguracoes`): fora de escopo desta normalização;
  fica para uma rodada dedicada futura.
- **Decomissionamento das listas/campos PT**: `MSEModulos`/`MSEExtensoes`/
  `MSEModulosMenu`/`MSEMenuTipos` (listas antigas) e os 12 campos PT de
  `MSEMenu` continuam vivos em produção — nenhum código novo os lê, mas a
  remoção/decomissionamento real é uma limpeza futura, não feita nesta
  normalização.
- `admin/` (painel pré-Site-Kernel) continua congelado, sem prazo de
  migração definido.
