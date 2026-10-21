# Convenção Joomla! — mse-platform / CAMAP-AGP

Tabela de referência definitiva, pós-normalização (Fases 1–4, branch
`feature/normalizacao-joomla`, 20–21/10/2026). Para o raciocínio completo —
auditoria original, matriz de conformidade, decisão de estratégia — ver
[`JOOMLA-CONVENCOES-E-MIGRACAO.md`](JOOMLA-CONVENCOES-E-MIGRACAO.md). Este
documento é só a tabela de equivalência prática, para onboarding rápido de
um desenvolvedor familiarizado com Joomla!.

## 1. Estrutura de pastas (mse-platform)

| Joomla! | mse-platform | Observação |
| --- | --- | --- |
| `administrator/components/com_<nome>/` | `components/com_<nome>/` | um componente físico por `option=com_xxx`; `com_cpanel` acumula o painel inicial + o roteador comum do Administrator |
| `components/_shared/` | — | não é um componente Joomla!; infraestrutura interna comum (render de tabela, paginação) compartilhada entre `com_extensions`/`com_menus`/`com_modules` |
| `modules/mod_<nome>/` | `modules/mod_<nome>/` | `mod_forum`, `mod_home`, `mod_recursos`, `mod_videoteca` |
| `libraries/` | `libraries/ui/` | facade JS opcional (accordion/carousel compartilhados entre módulos); **não** é `mod_*` |
| `plugins/<grupo>/<nome>/` | `plugins/` | reservada, convenção pronta; nenhum plugin real ainda |
| `templates/<nome>/` | `themes/` | tema-base inicial; Templates completos (override por view) fora de escopo |
| — | `admin/` | painel administrativo histórico, pré-Site-Kernel ("um MSE por módulo"); **congelado deliberadamente**, não migra |
| — | `core/`, `kernel/`, `host-adapters/` | infraestrutura própria do Site Kernel, sem equivalente 1:1 no Joomla! PHP |

### Componentes administrativos reservados (sem implementação ainda)

`components/com_config/`, `components/com_installer/`,
`components/com_categories/`, `components/com_tags/`,
`components/com_media/` existem como pastas com `README.md`
"reservada/fora de escopo" — enumeração honesta do conjunto Joomla!-completo,
sem prometer funcionalidade.

## 2. Estrutura de pastas (CAMAP-AGP, site consumidor)

| Identificador CAMAP | Pasta atual | Papel Joomla! |
| --- | --- | --- |
| SD | `modules/mod_sd/` | Módulo (Hero/cards/sessões de destaque) |
| DT1 | `modules/mod_dt1/` | Módulo (destaque textual) |
| MC | `modules/mod_mc/` | Módulo (mensagem corporativa) |
| DB | `modules/mod_db/` | Módulo (artigos recentes/destaque, ≈ `mod_articles_latest`) |
| Footer | `modules/mod_footer/` | Módulo (rodapé) |
| Breadcrumbs | `modules/mod_breadcrumbs/` | Módulo (caminho/pathway) |
| BLOG | `components/com_content/` | Componente de conteúdo (lista, artigo, destaques) — unificado por **nome/conceito** com o `com_content` do Administrator do mse-platform; pastas físicas distintas, projetos distintos |

O id interno do manifesto do BLOG (`BLOG_MANIFEST.id`) permanece `"blog"`
(identificador histórico do Site Kernel) — a unificação é de nome de pasta e
vocabulário, não de identificador de dado.

## 3. Vocabulário de eventos (`kernel/events.js`)

| Joomla! (`on<Área><Momento>`) | mse-platform (`KERNEL_EVENTS`) |
| --- | --- |
| `onAfterRoute` | `onAfterRoute` |
| `onBeforeRender` | `onBeforeRender` |
| `onAfterRender` | `onAfterRender` |

Antes da Fase 2 estes eram `"afterRoute"`/`"beforeRender"`/`"afterRender"`
(sem o prefixo `on`).

## 4. Listas SharePoint ≈ tabelas Joomla!

| Joomla! (`#__*`) | Lista SharePoint (atual, inglês) | Lista PT (antiga, ainda viva em produção) |
| --- | --- | --- |
| `#__modules` | `MSEModules` | `MSEModulos` (não gerida mais pelo installer; dados não apagados) |
| `#__extensions` | `MSEExtensions` | `MSEExtensoes` (idem) |
| `#__modules_menu` | `MSEModulesMenu` | `MSEModulosMenu` (idem) |
| `#__menu_types` | `MSEMenuTypes` | `MSEMenuTipos` (idem) |
| `#__menu` | `MSEMenu` (mesmo nome PT/EN) | — (campos PT e EN coexistem na mesma lista, ver seção 5) |
| `#__users`/ACL | — | fora de escopo; SharePoint é a autoridade de permissão |

As listas PT (`MSEModulos`/`MSEExtensoes`/`MSEModulosMenu`/`MSEMenuTipos`)
**continuam existindo em produção** — não foram apagadas nem alteradas,
apenas deixaram de ser lidas pelo código a partir da Fase 4. O
decomissionamento delas é uma limpeza futura, fora desta normalização.

## 5. Campos (SharePoint PascalCase) ≈ colunas Joomla!

### `MSEModules` (≈ `#__modules`)

| Joomla! | Campo em inglês | Campo PT equivalente (lista antiga `MSEModulos`) |
| --- | --- | --- |
| `module` | `Module` | `ModuloTipo` |
| `position` | `Position` | `Posicao` |
| `ordering` | `Ordering` | `Ordem` |
| `published` | `Published` (`Published`/`Unpublished`/`Trashed`) | `Estado` (`Publicado`/`Despublicado`/`Lixeira`) |
| `publish_up` | `PublishUp` | `PublicarEm` |
| `publish_down` | `PublishDown` | `PublicarAte` |
| `showtitle` | `ShowTitle` | `MostrarTitulo` |
| — | `Style` | `Estilo` |
| `(assignment)` | `MenuAssignment` (`All`/`None`/`Only`/`AllExcept`) | `AtribuicaoMenu` (`Todas`/`Nenhuma`/`Somente`/`Todas exceto`) |
| `params` | `ParamsJson` | `ParamsJson` (já neutro) |
| — | `SchemaVersion` | `SchemaVersao` |

### `MSEExtensions` (≈ `#__extensions`)

| Joomla! | Campo em inglês | Campo PT equivalente (lista antiga `MSEExtensoes`) |
| --- | --- | --- |
| `type` | `Type` (`Component`/`Module`/`Plugin`) | `Tipo` (`Componente`/`Modulo`/`Plugin`) |
| `element` | `Element` | `Elemento` |
| — | `Version` | `Versao` |
| `enabled` | `Enabled` | `Habilitado` |
| `protected` | `Protected` | `Protegido` |
| `ordering` | `Ordering` | `Ordem` |
| `params` | `ParamsJson` | `ParamsJson` (já neutro) |

No Joomla! original, `#__extensions.type` já é o identificador interno —
não existe lá uma camada de tradução dedicada entre "tipo do manifesto" e
"tipo da lista". Por isso `kernel/extension-registry.js` **não tem** (desde
a Fase 4) nenhuma função de mapeamento `type`↔`Tipo`; a única diferença
real entre o `type` do manifesto JS (`"component"`, minúsculo) e `Type` da
lista (`"Component"`, capitalizado) é cosmética e resolvida inline, no
ponto de uso, quando necessário.

### `MSEModulesMenu` (≈ `#__modules_menu`)

| Joomla! | Campo em inglês | Campo PT equivalente (lista antiga `MSEModulosMenu`) |
| --- | --- | --- |
| `moduleid` | `ModuleId` | `ModuloId` |
| `menuid` | `MenuId` | `MenuId` (já neutro) |

### `MSEMenu` (≈ `#__menu`) — campos PT e EN coexistem na mesma lista

`MSEMenu` não ganhou lista irmã (já tinha o mesmo nome em PT/EN). Em vez
disso, os 9 campos em inglês foram **acrescentados** lado a lado com os 12
campos PT originais — os PT ficam `DEPRECATED` nos comentários do schema
(`kernel/schemas/mse-menu.js`), mas não são removidos nesta fase.

| Joomla! | Campo em inglês (lido pelo código desde a Fase 4) | Campo PT (DEPRECATED, ainda na lista) |
| --- | --- | --- |
| `menutype` | `MenuType` | `TipoMenu` |
| `path` | `Path` | `Caminho` |
| `level` | `Level` | `Nivel` |
| `ordering` | `Ordering` | `Ordem` |
| `component_id`/view | `Component` | `Componente` |
| `(view)` | `View` | `Visao` |
| `home` | `Default` | `Padrao` |
| `(target)` | `Target` (`SameTab`/`NewTab`) | `AbrirEm` (`MesmaAba`/`NovaAba`) |
| `published` | `Published` (`Published`/`Unpublished`/`Trashed`) | `Estado` (`Publicado`/`Despublicado`/`Lixeira`) |
| `alias` | `Alias` | — (já era neutro) |
| `parent_id` | `ParentId` | — (já era neutro) |
| `params` | `ParamsJson` | — (já era neutro) |

A tela do Administrator (`components/com_menus/menus-editor.js`) exibe e
edita só os 9 campos em inglês — filtra `MSE_MENU_SCHEMA` pelos nomes EN em
vez de expor os 21 campos (12 PT + 9 EN) ao gestor.

## 6. Rotas administrativas

Já seguiam o vocabulário Joomla! desde antes desta normalização —
`option=com_xxx&view=yyy&layout=zzz&task=www&id=N`
(`components/com_cpanel/router.js`); sem mudança nesta rodada.

## 7. O que permanece deliberadamente fora de escopo

- **ACL próprio** — SharePoint é a autoridade de permissão.
- **Templates completos** (override por view/componente) — mecanismo
  mínimo (1 template ativo por site, trocável) já existe; overrides por
  item de menu não.
- **`admin/`** — painel pré-Site-Kernel, congelado, sem prazo de migração.
- **`MSEConfiguracoes`** — fora desta rodada de normalização de campos;
  fica para uma Fase 3b dedicada futura.
- **Decomissionamento das listas/campos PT** — vivos em produção, não lidos
  pelo código desde a Fase 4; remoção real é limpeza futura.
