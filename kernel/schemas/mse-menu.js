/**
 * Esquema declarativo da lista MSEMenu (Site Kernel).
 *
 * Segue o formato de `defineListSchema` em `core/list-provisioning.js`
 * (mesmo padrão já usado em produção por `modules/forum/forum-schema.js`,
 * `modules/recursos/recursos-schema.js` e `modules/videoteca/videoteca-schema.js`):
 * objeto normalizado/congelado com `key`, `internalName`, `displayName`,
 * `titleField` (campo Title) e `fields[]`
 * ({ internalName, displayName, type, required, indexed, unique, choices,
 * maxLength, lines, decimals, min, defaultValue }) — sem `schemaXml` manual;
 * o XML de criação é gerado internamente por `fieldXml()`.
 *
 * Apenas estrutura de dados — nenhuma chamada de rede ou provisionamento real
 * é feita aqui. Um instalador (fora deste arquivo) deve consumir este
 * esquema do mesmo jeito que `provisionLists`/`inspectLists` consomem
 * qualquer `schemas[]` em `core/list-provisioning.js`.
 *
 * `MSEMenuTipos` (PT, esquema irmão em português desta lista) e os 9 campos
 * PT que existiam aqui (`TipoMenu`/`Caminho`/`Nivel`/`Ordem`/`Componente`/
 * `Visao`/`Padrao`/`AbrirEm`/`Estado`) foram DECOMISSIONADOS (Fase 5,
 * 23/10/2026, `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`) — ver
 * `tools/decommission-mse-legacy-pt.js`. O equivalente em inglês,
 * `MSEMenuTypes` (`kernel/schemas/mse-menu-types.js`), já era o único lido
 * pelo código consumidor desde a Fase 4.
 *
 * Referências:
 * - mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4 e 6.
 * - CAMAP-AGP/docs/PLANO-ARQUITETURA-MINI-JOOMLA.md, seção 3.
 * - CAMAP-AGP/docs/implementation/ARQUITETURA-MINI-JOOMLA-ALVO.html
 *   (bloco MSEMenu, seção "Modelo de dados").
 */

import { defineListSchema } from "../../core/list-provisioning.js";

/**
 * MSEMenu ≈ Joomla! #__menu.
 * Itens de menu; hierarquia via ParentId/Level; cada item pode apontar para
 * um Componente (view: full) com View e ParamsJson, ou ser um item
 * "somente módulos" (ex.: a Home, ver plano seção 3) quando Component é vazio.
 *
 * Fase 3 da normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`):
 * ao contrário de MSEModulos/MSEExtensoes/MSEModulosMenu/MSEMenuTipos, esta
 * lista nunca ganhou uma lista irmã nova — "Menu" já era o mesmo nome em
 * português e inglês. Em vez disso, os campos equivalentes em inglês
 * (MenuType/Path/Level/Ordering/Component/View/Default/Target/Published)
 * foram acrescentados aqui, lado a lado com os campos PT originais. Os
 * campos PT foram removidos na Fase 5 (23/10/2026, decomissionamento —
 * `tools/decommission-mse-legacy-pt.js`), já sem nenhum consumidor desde a
 * Fase 4. `Alias` e `ParentId` já eram em inglês/neutros desde o início.
 */
export const MSE_MENU_SCHEMA = defineListSchema({
  key: "mse-menu",
  internalName: "MSEMenu",
  displayName: "MSE Itens de menu",
  titleField: { displayName: "Título", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Alias",
      displayName: "Alias",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 128
    },
    {
      internalName: "ParentId",
      displayName: "Item pai",
      type: "Number",
      required: false,
      min: 0,
      defaultValue: 0
      // Ausente ou 0 = item raiz. Já em inglês/neutro — sem campo irmão.
    },
    {
      internalName: "ParamsJson",
      displayName: "Parâmetros (JSON)",
      type: "Note",
      required: false,
      lines: 8
      // Já em inglês/neutro (literal JSON) — sem campo irmão.
    },
    {
      internalName: "MenuType",
      displayName: "Menu type",
      type: "Text",
      required: false,
      indexed: true,
      maxLength: 64
      // ≈ Joomla! #__menu.menutype, referenciando MSEMenuTypes.Key. Não é
      // um lookup nativo do SharePoint para manter o esquema simples e
      // evitar dependência de ordem de criação entre listas; o instalador
      // pode validar a referência em tempo de `verify`. `required: false`
      // mantido mesmo após a Fase 5 (campo já existe em produção como não
      // obrigatório — mudar para `true` aqui quebraria
      // `inspectList`/`verifyLists` contra o schema real já provisionado,
      // que teria Required=false; ver `core/list-provisioning.js#validateExistingField`).
    },
    {
      internalName: "Path",
      displayName: "Path",
      type: "Text",
      required: false,
      maxLength: 255
      // Materialização do caminho completo (ex.: "pai/filho"), recalculada
      // pelo instalador/Administrator ao mover itens; não é fonte de
      // verdade da hierarquia (isso é ParentId). ≈ Joomla! #__menu.path.
    },
    {
      internalName: "Level",
      displayName: "Level",
      type: "Number",
      required: false,
      min: 1,
      defaultValue: 1
      // ≈ Joomla! #__menu.level.
    },
    {
      internalName: "Ordering",
      displayName: "Ordering",
      type: "Number",
      required: false,
      min: 0,
      defaultValue: 0
      // ≈ Joomla! #__menu.ordering.
    },
    {
      internalName: "Component",
      displayName: "Component",
      type: "Text",
      required: false,
      maxLength: 128
      // Vazio = item "somente módulos" (ex.: Home, ver plano seção 3).
    },
    {
      internalName: "View",
      displayName: "View",
      type: "Text",
      required: false,
      maxLength: 64
    },
    {
      internalName: "Default",
      displayName: "Default item (Home)",
      type: "Boolean",
      required: false,
      indexed: true,
      defaultValue: false
      // ≈ Joomla! #__menu.home.
    },
    {
      internalName: "Target",
      displayName: "Target",
      type: "Choice",
      required: false,
      choices: ["SameTab", "NewTab"],
      defaultValue: "SameTab"
    },
    {
      internalName: "Published",
      displayName: "Published",
      type: "Choice",
      required: false,
      indexed: true,
      choices: ["Published", "Unpublished", "Trashed"],
      defaultValue: "Published"
    },
    {
      internalName: "TemplateStyleId",
      displayName: "Template style",
      type: "Number",
      required: false,
      min: 1
      // ≈ Joomla! #__menu.template_style_id (23/10/2026 — atribuição de
      // template por item de menu, ver docs/AUDITORIA-JOOMLA-PENTE-FINO.md
      // §3). Referencia MSETemplateStyles.Id. Ausente/0/null = "usa o
      // template padrão do site" (fallback já existente via
      // kernel/template-registry.js#resolveActiveTemplateName). Não é um
      // lookup nativo do SharePoint — mesmo motivo de MenuType não ser um
      // lookup: evita dependência de ordem de criação entre listas.
      // Sem defaultValue deliberadamente (mesmo princípio de ParentId): o
      // instalador não grava 0 nos itens existentes, preservando o
      // comportamento atual (sem override) até o gestor escolher um estilo.
    }
  ]
});
