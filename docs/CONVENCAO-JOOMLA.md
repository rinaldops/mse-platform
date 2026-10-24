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
| `administrator/templates/atum/` | `components/com_cpanel/administrator-shell.js` | template formal único do Administrator (cabeçalho + navegação lateral persistente + slot de conteúdo), 22/10/2026 — substitui o `<section class="mse-administrator__panel">` que cada tela desenhava isolada |
| `components/_shared/` | — | não é um componente Joomla!; infraestrutura interna comum (render de tabela, paginação) compartilhada entre `com_extensions`/`com_menus`/`com_modules` |
| `modules/mod_<nome>/` | `modules/mod_<nome>/` | `mod_forum`, `mod_home`, `mod_recursos`, `mod_videoteca` |
| `libraries/` | `libraries/ui/` | facade JS opcional (accordion/carousel compartilhados entre módulos); **não** é `mod_*` |
| `plugins/<grupo>/<nome>/` | `plugins/` | reservada, convenção pronta; nenhum plugin real ainda |
| `templates/<nome>/` | `templates/<nome>/` | agora um sistema real de Templates instaláveis (`templates/mse-default/`, `templates/system/`; sites consumidores publicam os seus próprios, ex.: `camap-tema-01`) — ver seção 4 (`MSETemplateStyles`) e `com_templates` abaixo; `themes/` (tema-base antigo) foi substituído por este mecanismo |
| — | `components/com_templates/` | análogo a `administrator/components/com_templates/`: lista os Templates instalados e define qual é o padrão (`Home=true`) por `ClientId` |
| — | `admin/` | painel administrativo histórico, pré-Site-Kernel ("um MSE por módulo"); **congelado deliberadamente**, não migra |
| — | `core/`, `kernel/`, `host-adapters/` | infraestrutura própria do Site Kernel, sem equivalente 1:1 no Joomla! PHP |

### Componentes administrativos reservados (sem implementação ainda)

`components/com_config/`, `components/com_installer/`,
`components/com_categories/`, `components/com_tags/`,
`components/com_media/` existem como pastas com `README.md`
"reservada/fora de escopo" — enumeração honesta do conjunto Joomla!-completo,
sem prometer funcionalidade. `components/com_templates/` **deixou de ser
reservado** (22/10/2026): tem implementação real (lista de templates
instalados + "Tornar padrão" por `ClientId`), ver seção 4.

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

| Joomla! (`#__*`) | Lista SharePoint (atual, inglês) | Lista PT (antiga) |
| --- | --- | --- |
| `#__modules` | `MSEModules` | `MSEModulos` (não gerida mais pelo installer; exclusão real pendente — ver nota abaixo) |
| `#__extensions` | `MSEExtensions` | `MSEExtensoes` (idem) |
| `#__modules_menu` | `MSEModulesMenu` | `MSEModulosMenu` (idem) |
| `#__menu_types` | `MSEMenuTypes` | `MSEMenuTipos` (idem; esquema removido do código, ver nota abaixo) |
| `#__menu` | `MSEMenu` (mesmo nome PT/EN) | — (os 9 campos PT foram removidos do schema na Fase 5, ver seção 5) |
| `#__template_styles` | `MSETemplateStyles` (sem lista PT; criada já em inglês, 22/10/2026) | — |
| `#__users`/ACL | — | fora de escopo; SharePoint é a autoridade de permissão |

Fase 5 da normalização (23/10/2026, `tools/decommission-mse-legacy-pt.js`):
o ESQUEMA `MSEMenuTipos` (PT) e os 9 campos PT de `MSEMenu`
(`TipoMenu`/`Caminho`/`Nivel`/`Ordem`/`Componente`/`Visao`/`Padrao`/
`AbrirEm`/`Estado`) foram removidos do código — `kernel/installer.js` não
os provisiona/verifica mais, `kernel/schemas/mse-menu.js` não os declara
mais. A ferramenta de exclusão real das 4 listas PT
(`MSEModulos`/`MSEExtensoes`/`MSEModulosMenu`/`MSEMenuTipos`) e dos 9
campos PT de `MSEMenu` no tenant SharePoint está implementada e testada,
mas sua EXECUÇÃO contra produção é uma ação irreversível separada,
pendente de sessão supervisionada (dump de segurança + confirmação humana
explícita — ver `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.10).

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
| `type` | `Type` (`Component`/`Module`/`Plugin`/`Template`) | `Tipo` (`Componente`/`Modulo`/`Plugin`) |
| `element` | `Element` | `Elemento` |
| `client_id` | `ClientId` (`Site`/`Administrator`) | — (campo novo, 22/10/2026, sem equivalente PT — ver `MSETemplateStyles.ClientId` abaixo, mesmo shape) |
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
ponto de uso, quando necessário. `"Template"` foi acrescentado a `Type`
(22/10/2026) só na lista em inglês — a lista PT `MSEExtensoes` está
congelada desde a Fase 4 (não recebe `choices` novas) e nenhum Template é
representado nela.

### `MSETemplateStyles` (≈ `#__template_styles`, nova 22/10/2026)

| Joomla! | Campo em inglês | Observação |
| --- | --- | --- |
| `template` | `Template` | nome do pacote (`camap-tema-01`, `mse-default`, `system`...) |
| `client_id` | `ClientId` (`Site`/`Administrator`) | Joomla! usa `0`/`1`; aqui texto, mesma convenção PascalCase do restante |
| `home` | `Home` (Boolean) | no máximo 1 `true` por `ClientId` — invariante mantida pela UI (`com_templates`), não pelo schema. Joomla! usa `char(7)` (dual: `'0'`/`'1'` OU código de idioma, para templates por idioma); aqui `Boolean` puro — sem suporte a multi-idioma no `mse-platform` hoje, ver `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §3 |
| `title` | `Title` (campo nativo do SharePoint) | — |
| `params` | `ParamsJson` | reservado, sem leitor ainda |

Sem lista PT irmã — criada depois da Fase 4, já nasce só em inglês, ao
contrário de `MSEModules`/`MSEExtensions`/etc. (que tiveram que migrar de
uma lista PT pré-existente).

### `MSEModulesMenu` (≈ `#__modules_menu`)

| Joomla! | Campo em inglês | Campo PT equivalente (lista antiga `MSEModulosMenu`) |
| --- | --- | --- |
| `moduleid` | `ModuleId` | `ModuloId` |
| `menuid` | `MenuId` | `MenuId` (já neutro) |

### `MSEMenu` (≈ `#__menu`)

`MSEMenu` nunca ganhou lista irmã (já tinha o mesmo nome em PT/EN). Os 9
campos em inglês foram acrescentados lado a lado com os 9 campos PT
originais na Fase 3; os PT foram removidos do schema na **Fase 5**
(23/10/2026, `tools/decommission-mse-legacy-pt.js`,
`kernel/schemas/mse-menu.js`) — a tabela abaixo mostra o mapeamento
histórico só como referência de equivalência Joomla!, não o estado atual
do schema (que só tem os campos EN).

| Joomla! | Campo em inglês (único lido pelo código desde a Fase 4; schema só tem este desde a Fase 5) | Campo PT (removido na Fase 5) |
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
| `template_style_id` | `TemplateStyleId` (novo, 23/10/2026) | — (sem equivalente PT; referencia `MSETemplateStyles.Id`; ausente/`0`/`null` = usa o template padrão do site, ver `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.8) |

A tela do Administrator (`components/com_menus/menus-editor.js`) exibe e
edita os 9 campos em inglês (hoje os únicos no schema).

### Atribuição de template por item de menu + overrides de view (23/10/2026)

≈ Joomla! `#__menu.template_style_id` e
`templates/<template>/html/<component>/<view>.php`. Fechado em
23/10/2026 — ver `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.8 para o
detalhamento completo (schema, `kernel/template-registry.js`, refatoração
de `kernel/application.js` para resolver o layout por rota em vez de uma
única vez no boot, 3 níveis de precedência do template requisitado em
`site-boot.js#createTemplateLayoutResolver`, e overrides de view via
`template.json#viewOverrides`). Nenhum template existente declara
`viewOverrides` nem usa `TemplateStyleId` — zero mudança de
comportamento para quem não configurar essas features novas.

### `MSEConfiguracoes` — Fase 3b, fechada em 23/10/2026

Campos com consumidor real confirmado em
`core/configuration-store.js#loadPublished`, traduzidos para inglês e
acrescentados lado a lado com os PT (que ficam `DEPRECATED`, vivos, sem
leitor novo) — mesmo padrão de `MSEMenu` nas Fases 3/4. Ver
`docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.9.

| Joomla! | Campo em inglês | Campo PT (DEPRECATED, ainda na lista) |
| --- | --- | --- |
| `(scope)` | `Scope` (`Global`/`Instance`/`Extension`) | `Escopo` (`Global`/`Instancia`/`Extensao`) |
| `(module)` | `Module` | `Modulo` |
| `(theme)` | `Theme` | `Tema` |
| `params` | `ConfigurationJson` | `ConfiguracaoJson` |
| `published` (via `enabled`) | `Active` (Boolean) | `Ativo` (Boolean) |
| `published` (via estado editorial) | `State` (`Draft`/`Published`) | `Estado` (`Rascunho`/`Publicado`) |
| `(extension element)` | `ExtensionElement` | `ExtensaoElemento` |
| `(layout)` | `Layout` (já neutro; choice nova `Inherit` ao lado de `Herdar`) | — |

Os 4 campos sem consumidor confirmado (`TipoInstancia`/
`VersaoConfiguracao`/`VersaoSettings`/`VersaoModulo`) permanecem só em PT,
fora desta rodada. `components/com_config/config-editor.js` (tela do
Administrator) lê/grava só os campos em inglês dos 8 migrados, mais os 4
que seguem em PT.

## 6. Rotas administrativas

Já seguiam o vocabulário Joomla! desde antes desta normalização —
`option=com_xxx&view=yyy&layout=zzz&task=www&id=N`
(`components/com_cpanel/router.js`). `task` segue a convenção
`controller.task`: `com_templates` (`templates.setdefault`, prova de
conceito, 22/10/2026), `com_extensions` (`extensions.enable`/
`extensions.disable`), `com_menus` (`menus.publish`/`menus.unpublish`),
`com_modules` (`modules.publish`/`modules.unpublish`) e `com_config`
(`config.activate`/`config.deactivate`) consomem `task` para disparar,
automaticamente na primeira carga, a mesma alternância rápida de 1 clique
já disponível por botão em cada tela (23/10/2026 — ver cada
`*-editor.js`). O CRUD completo (criar/editar/excluir) continua
disparando ação só por clique direto em todas as telas — ver
`docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.7/§3.

## 7. O que permanece deliberadamente fora de escopo

- **ACL próprio** — SharePoint é a autoridade de permissão.
- **`MSETemplateStyles.Home` Boolean vs. `#__template_styles.home char(7)`**
  — Joomla! real usa esse campo também para templates específicos de
  idioma; o `mse-platform` não tem conceito de multi-idioma por site hoje,
  então ficou só `Boolean` (ver nota na tabela da seção 5 e
  `kernel/schemas/mse-template-styles.js#Home`). Documentado, não corrigido.
- **`controller.task` limitado à alternância rápida** — ver seção 6. As 5
  telas (`com_templates`/`com_extensions`/`com_menus`/`com_modules`/
  `com_config`) consomem `task` só para a ação de 1 clique
  (padrão/habilitar/publicar/ativar); reescrever o CRUD completo
  (criar/editar/excluir) para `task`-orientado continua fora de escopo —
  redesenho maior.
- **`admin/`** — painel pré-Site-Kernel, congelado, sem prazo de migração.
- **`MSEConfiguracoes` (Fase 3b)** — **fechada em 23/10/2026**, ver seção 5
  (`MSEConfiguracoes — Fase 3b`) e `docs/AUDITORIA-JOOMLA-PENTE-FINO.md`
  §2.9. `MSEConfiguracoes.Theme` (equivalente em inglês de `Tema`) continua
  existindo como fallback de compatibilidade enquanto `MSETemplateStyles`
  não tiver uma linha `Home=true` para o site.
- **Decomissionamento das listas/campos PT** — o esquema `MSEMenuTipos`
  (PT) e os 9 campos PT de `MSEMenu` já foram removidos do código (Fase 5,
  23/10/2026). As 4 listas PT (`MSEModulos`/`MSEExtensoes`/
  `MSEModulosMenu`/`MSEMenuTipos`) e os 8 campos PT de `MSEConfiguracoes`
  seguem vivas em produção, não lidas pelo código — a ferramenta de
  exclusão real (`tools/decommission-mse-legacy-pt.js`) está pronta e
  testada, mas sua execução contra o tenant é uma ação irreversível
  separada, pendente de sessão supervisionada.
