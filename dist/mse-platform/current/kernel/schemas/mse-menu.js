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
    },
    {
      internalName: "ParentId",
      displayName: "Item pai",
      type: "Number",
      required: false,
      min: 0,
      defaultValue: 0
      // Ausente ou 0 = item raiz.
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
    },
    {
      internalName: "Nivel",
      displayName: "Nível",
      type: "Number",
      required: true,
      min: 1,
      defaultValue: 1
    },
    {
      internalName: "Ordem",
      displayName: "Ordem",
      type: "Number",
      required: true,
      min: 0,
      defaultValue: 0
    },
    {
      internalName: "Componente",
      displayName: "Componente",
      type: "Text",
      required: false,
      maxLength: 128
      // Vazio = item "somente módulos" (ex.: Home, ver plano seção 3).
    },
    {
      internalName: "Visao",
      displayName: "Visão",
      type: "Text",
      required: false,
      maxLength: 64
    },
    {
      internalName: "ParamsJson",
      displayName: "Parâmetros (JSON)",
      type: "Note",
      required: false,
      lines: 8
    },
    {
      internalName: "Padrao",
      displayName: "Item padrão (Início)",
      type: "Boolean",
      required: true,
      indexed: true,
      defaultValue: false
    },
    {
      internalName: "AbrirEm",
      displayName: "Abrir em",
      type: "Choice",
      required: true,
      choices: ["MesmaAba", "NovaAba"],
      defaultValue: "MesmaAba"
    },
    {
      internalName: "Estado",
      displayName: "Estado",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Publicado", "Despublicado", "Lixeira"],
      defaultValue: "Publicado"
    }
  ]
});
