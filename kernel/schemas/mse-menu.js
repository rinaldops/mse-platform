/**
 * Esquemas declarativos das listas MSEMenuTipos e MSEMenu (Site Kernel).
 *
 * Seguem o formato NOVO de `defineListSchema` em `core/list-provisioning.js`
 * (mesmo padrão já usado em produção por `modules/forum/forum-schema.js`,
 * `modules/recursos/recursos-schema.js` e `modules/videoteca/videoteca-schema.js`):
 * objetos normalizados/congelados com `key`, `internalName`, `displayName`,
 * `titleField` (campo Title) e `fields[]`
 * ({ internalName, displayName, type, required, indexed, unique, choices,
 * maxLength, lines, decimals, min, defaultValue }) — sem `schemaXml` manual;
 * o XML de criação é gerado internamente por `fieldXml()`.
 *
 * Apenas estrutura de dados — nenhuma chamada de rede ou provisionamento real
 * é feita aqui. Um instalador (fora deste arquivo) deve consumir estes
 * esquemas do mesmo jeito que `provisionLists`/`inspectLists` consomem
 * qualquer `schemas[]` em `core/list-provisioning.js`.
 *
 * Referências:
 * - mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4 e 6.
 * - CAMAP-AGP/docs/PLANO-ARQUITETURA-MINI-JOOMLA.md, seção 3.
 * - CAMAP-AGP/docs/implementation/ARQUITETURA-MINI-JOOMLA-ALVO.html
 *   (blocos MSEMenuTipos / MSEMenu, seção "Modelo de dados").
 */

import { defineListSchema } from "../../core/list-provisioning.js";

/**
 * MSEMenuTipos ≈ Joomla! #__menu_types.
 * Um registro por "árvore de menu" (ex.: principal, rodape).
 */
export const MSE_MENU_TIPOS_SCHEMA = defineListSchema({
  key: "mse-menu-tipos",
  internalName: "MSEMenuTipos",
  displayName: "MSE Tipos de menu",
  titleField: { displayName: "Título", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Chave",
      displayName: "Chave",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 64
      // Esperado em kebab-case (ex.: "principal", "rodape"); validação de
      // formato fica a cargo do instalador/administrador, não deste esquema.
    },
    {
      internalName: "Descricao",
      displayName: "Descrição",
      type: "Note",
      required: false,
      lines: 4
    }
  ]
});

/**
 * MSEMenu ≈ Joomla! #__menu.
 * Itens de menu; hierarquia via ParentId/Nivel; cada item pode apontar para
 * um Componente (view: full) com Visao e ParamsJson, ou ser um item
 * "somente módulos" (ex.: a Home, ver plano seção 3) quando Componente é vazio.
 *
 * Fase 3 da normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`):
 * ao contrário de MSEModulos/MSEExtensoes/MSEModulosMenu/MSEMenuTipos, esta
 * lista NÃO ganha uma lista irmã nova — "Menu" já é o mesmo nome em
 * português e inglês. Em vez disso, os campos equivalentes em inglês
 * (MenuType/Path/Level/Ordering/Component/View/Default/Target/Published)
 * foram ACRESCENTADOS aqui, lado a lado com os campos PT originais
 * (TipoMenu/Caminho/Nivel/Ordem/Componente/Visao/Padrao/AbrirEm/Estado).
 * Os campos PT não são removidos nesta fase — o código consumidor ainda os
 * lê até a Fase 4 migrar para os campos em inglês; a remoção dos campos PT
 * é decisão de limpeza posterior (Fase 5), fora desta fase. `Alias` e
 * `ParentId` já eram em inglês/neutros e não precisam de campo irmão.
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
      internalName: "TipoMenu",
      displayName: "Tipo de menu",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 64
      // Referencia MSEMenuTipos.Chave. Não é um lookup nativo do SharePoint
      // nesta fase para manter o esquema simples e evitar dependência de
      // ordem de criação entre listas; o instalador pode validar a
      // referência em tempo de `verify`.
      // DEPRECATED (Fase 3): equivalente em inglês é `MenuType` (abaixo),
      // já referenciando MSEMenuTypes.Key. Mantido até a Fase 4 migrar os
      // consumidores; remoção fica para a Fase 5/limpeza.
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
      internalName: "Caminho",
      displayName: "Caminho",
      type: "Text",
      required: false,
      maxLength: 255
      // Materialização do caminho completo (ex.: "pai/filho"), recalculada
      // pelo instalador/Administrator ao mover itens; não é fonte de
      // verdade da hierarquia (isso é ParentId).
      // DEPRECATED (Fase 3): equivalente em inglês é `Path` (abaixo).
    },
    {
      internalName: "Nivel",
      displayName: "Nível",
      type: "Number",
      required: true,
      min: 1,
      defaultValue: 1
      // DEPRECATED (Fase 3): equivalente em inglês é `Level` (abaixo).
    },
    {
      internalName: "Ordem",
      displayName: "Ordem",
      type: "Number",
      required: true,
      min: 0,
      defaultValue: 0
      // DEPRECATED (Fase 3): equivalente em inglês é `Ordering` (abaixo).
    },
    {
      internalName: "Componente",
      displayName: "Componente",
      type: "Text",
      required: false,
      maxLength: 128
      // Vazio = item "somente módulos" (ex.: Home, ver plano seção 3).
      // DEPRECATED (Fase 3): equivalente em inglês é `Component` (abaixo).
    },
    {
      internalName: "Visao",
      displayName: "Visão",
      type: "Text",
      required: false,
      maxLength: 64
      // DEPRECATED (Fase 3): equivalente em inglês é `View` (abaixo).
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
      internalName: "Padrao",
      displayName: "Item padrão (Início)",
      type: "Boolean",
      required: true,
      indexed: true,
      defaultValue: false
      // DEPRECATED (Fase 3): equivalente em inglês é `Default` (abaixo).
    },
    {
      internalName: "AbrirEm",
      displayName: "Abrir em",
      type: "Choice",
      required: true,
      choices: ["MesmaAba", "NovaAba"],
      defaultValue: "MesmaAba"
      // DEPRECATED (Fase 3): equivalente em inglês é `Target` (abaixo).
    },
    {
      internalName: "Estado",
      displayName: "Estado",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Publicado", "Despublicado", "Lixeira"],
      defaultValue: "Publicado"
      // DEPRECATED (Fase 3): equivalente em inglês é `Published` (abaixo).
    },
    {
      internalName: "MenuType",
      displayName: "Menu type",
      type: "Text",
      required: false,
      indexed: true,
      maxLength: 64
      // ≈ TipoMenu (inglês). Opcional nesta fase (campo novo, preenchido
      // via UPDATE nos itens reais já existentes) — passa a `required: true`
      // só quando TipoMenu for removido (Fase 5/limpeza).
    },
    {
      internalName: "Path",
      displayName: "Path",
      type: "Text",
      required: false,
      maxLength: 255
      // ≈ Caminho (inglês).
    },
    {
      internalName: "Level",
      displayName: "Level",
      type: "Number",
      required: false,
      min: 1,
      defaultValue: 1
      // ≈ Nivel (inglês).
    },
    {
      internalName: "Ordering",
      displayName: "Ordering",
      type: "Number",
      required: false,
      min: 0,
      defaultValue: 0
      // ≈ Ordem (inglês).
    },
    {
      internalName: "Component",
      displayName: "Component",
      type: "Text",
      required: false,
      maxLength: 128
      // ≈ Componente (inglês). Vazio = item "somente módulos".
    },
    {
      internalName: "View",
      displayName: "View",
      type: "Text",
      required: false,
      maxLength: 64
      // ≈ Visao (inglês).
    },
    {
      internalName: "Default",
      displayName: "Default item (Home)",
      type: "Boolean",
      required: false,
      indexed: true,
      defaultValue: false
      // ≈ Padrao (inglês).
    },
    {
      internalName: "Target",
      displayName: "Target",
      type: "Choice",
      required: false,
      choices: ["SameTab", "NewTab"],
      defaultValue: "SameTab"
      // ≈ AbrirEm (inglês; MesmaAba/NovaAba→SameTab/NewTab).
    },
    {
      internalName: "Published",
      displayName: "Published",
      type: "Choice",
      required: false,
      indexed: true,
      choices: ["Published", "Unpublished", "Trashed"],
      defaultValue: "Published"
      // ≈ Estado (inglês; Publicado/Despublicado/Lixeira→Published/Unpublished/Trashed).
    }
  ]
});
