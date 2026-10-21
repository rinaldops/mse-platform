/**
 * Esquemas declarativos das listas MSEModulos e MSEModulosMenu (Site Kernel).
 *
 * Seguem o formato NOVO de `defineListSchema` em `core/list-provisioning.js`
 * (mesmo padrão de `MSE_MENU_SCHEMA`/`MSE_MENU_TIPOS_SCHEMA`
 * (`kernel/schemas/mse-menu.js`) e `MSE_EXTENSOES_SCHEMA`
 * (`kernel/schemas/mse-extensoes.js`), e já usado em produção por
 * `modules/forum/forum-schema.js`, `modules/recursos/recursos-schema.js` e
 * `modules/videoteca/videoteca-schema.js`): objetos normalizados/congelados
 * com `key`, `internalName`, `displayName`, `titleField` (campo Title) e
 * `fields[]` ({ internalName, displayName, type, required, indexed, choices,
 * maxLength, decimals, min, defaultValue }) — sem `schemaXml` manual; o XML
 * de criação é gerado internamente por `fieldXml()`.
 *
 * Apenas estrutura de dados — nenhuma chamada de rede ou provisionamento real
 * é feita aqui. Um instalador (fora deste arquivo) deve consumir estes
 * esquemas do mesmo jeito que `provisionLists`/`inspectLists` consomem
 * qualquer `schemas[]` em `core/list-provisioning.js`.
 *
 * Referências:
 * - mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4, 4.1 e 5
 *   (linha "Módulos, posições, atribuição por menu" → `positions.js` + `MSEModulos*`).
 * - CAMAP-AGP/docs/implementation/ARQUITETURA-MINI-JOOMLA-ALVO.html
 *   (blocos MSEModulos / MSEModulosMenu, seção "Modelo de dados").
 */

import { defineListSchema } from "../../core/list-provisioning.js";

/**
 * MSEModulos ≈ Joomla! #__modules.
 * Um registro por Módulo instanciado no site (ex.: "SD na posição topo-a"),
 * referenciando o tipo técnico do módulo (`ModuloTipo`, análogo a
 * `MSEExtensoes.Elemento` para `Tipo === "Modulo"`), a posição onde é
 * renderizado (`Posicao`, mesma convenção kebab-case das posições declaradas
 * em `kernel/layout.js`) e a atribuição a itens de menu (`AtribuicaoMenu`),
 * resolvidos em tempo de execução por `kernel/positions.js`.
 */
export const MSE_MODULOS_SCHEMA = defineListSchema({
  key: "mse-modulos",
  internalName: "MSEModulos",
  displayName: "MSE Módulos",
  titleField: { displayName: "Título", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "ModuloTipo",
      displayName: "Tipo de módulo",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 128
      // Referencia o identificador técnico do Módulo (ex.: "sd", "dt1", "mc"),
      // o mesmo valor usado em `MSEExtensoes.Elemento` quando `Tipo === "Modulo"`.
      // Não é um lookup nativo do SharePoint nesta fase, pelo mesmo motivo de
      // `MSEMenu.TipoMenu` (evitar dependência de ordem de criação entre
      // listas); o instalador pode validar a referência em tempo de `verify`.
    },
    {
      internalName: "Posicao",
      displayName: "Posição",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 64
      // Esperado em kebab-case (mesma convenção validada por
      // `KEBAB_CASE_PATTERN` em `kernel/layout.js`), ex.: "topo-a",
      // "rodape-1"; validação de formato fica a cargo do
      // instalador/Administrator, não deste esquema.
    },
    {
      internalName: "Ordem",
      displayName: "Ordem",
      type: "Number",
      required: true,
      min: 0,
      defaultValue: 0
      // Ordem relativa entre módulos de uma mesma posição; ascendente.
    },
    {
      internalName: "Estado",
      displayName: "Estado",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Publicado", "Despublicado", "Lixeira"],
      defaultValue: "Publicado"
      // Mesmos 3 valores de `MSE_MENU_SCHEMA.Estado`, por consistência entre
      // as listas MSE*.
    },
    {
      internalName: "PublicarEm",
      displayName: "Publicar em",
      type: "DateTime",
      required: false
      // Limite inferior da janela de vigência; ausente = sem restrição
      // inferior. Mesmo padrão de `isWithinWindow` em `kernel/content-services.js`.
    },
    {
      internalName: "PublicarAte",
      displayName: "Publicar até",
      type: "DateTime",
      required: false
      // Limite superior da janela de vigência; ausente = sem restrição
      // superior.
    },
    {
      internalName: "MostrarTitulo",
      displayName: "Mostrar título",
      type: "Boolean",
      required: true,
      defaultValue: false
      // ≈ Joomla! "showtitle": se o Title do módulo deve ser exibido no
      // front pelo Módulo/tema; interpretação fica a cargo do renderizador
      // (fora deste esquema).
    },
    {
      internalName: "Estilo",
      displayName: "Estilo",
      type: "Text",
      required: false,
      maxLength: 64
      // ≈ Joomla! "chrome style": variação visual livre (ex.: "card",
      // "lista", "destaque"), inteiramente interpretada pelo CSS/tema do
      // site (`theme/`, decisão D9) — o kernel não impõe nem conhece valores.
    },
    {
      internalName: "AtribuicaoMenu",
      displayName: "Atribuição de menu",
      type: "Choice",
      required: true,
      choices: ["Todas", "Nenhuma", "Somente", "Todas exceto"],
      defaultValue: "Todas"
      // "Todas" = aparece em qualquer item de menu; "Nenhuma" = não aparece
      // em nenhum item de menu; "Somente" = aparece só nos itens listados em
      // MSEModulosMenu para este módulo; "Todas exceto" = aparece em
      // qualquer item EXCETO os listados em MSEModulosMenu para este módulo.
      // Resolvido por `kernel/positions.js`, nunca reimplementado em outro
      // consumidor (mesmo princípio do mapeamento único de
      // `kernel/extension-registry.js`, ver seção 4.1 do plano).
    },
    {
      internalName: "ParamsJson",
      displayName: "Parâmetros (JSON)",
      type: "Note",
      required: false,
      lines: 8
      // Parâmetros serializados em JSON (string); nunca Base64. Mesmo padrão
      // de `MSE_MENU_SCHEMA.ParamsJson` / `MSE_EXTENSOES_SCHEMA.ParamsJson`.
    },
    {
      internalName: "SchemaVersao",
      displayName: "Versão do schema de parâmetros",
      type: "Number",
      required: false,
      min: 0
      // Versiona o formato de `ParamsJson` deste Módulo específico, para o
      // Administrator saber qual formulário (settings-schema) renderizar ao
      // editar os parâmetros. Não é o SemVer do manifesto JS (esse já é
      // comparado via `coreCompatibility`/`Versao` em `MSEExtensoes`) — são
      // camadas distintas, mesmo princípio de "altura de abstração dos
      // dados" descrito na seção 4.1 do plano.
    }
  ]
});

/**
 * MSEModulosMenu ≈ Joomla! #__modules_menu.
 * Tabela de junção N:N entre MSEModulos e MSEMenu: cada registro associa um
 * Módulo (`ModuloId`, referência ao `Id` nativo de um item de MSEModulos) a
 * um item de menu (`MenuId`, referência ao `Id` nativo de um item de
 * MSEMenu). Só é relevante para Módulos com `AtribuicaoMenu` igual a
 * "Somente" ou "Todas exceto"; para "Todas"/"Nenhuma" nenhum par é
 * consultado por `kernel/positions.js`.
 */
export const MSE_MODULOS_MENU_SCHEMA = defineListSchema({
  key: "mse-modulos-menu",
  internalName: "MSEModulosMenu",
  displayName: "MSE Módulos por item de menu",
  titleField: { displayName: "Título", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "ModuloId",
      displayName: "Módulo",
      type: "Number",
      required: true,
      indexed: true,
      min: 0
      // Não é um lookup nativo do SharePoint nesta fase (mesmo motivo de
      // `MSEMenu.ParentId`/`TipoMenu`): referencia o `Id` nativo de um item
      // de MSEModulos. O instalador pode validar a referência em `verify`.
    },
    {
      internalName: "MenuId",
      displayName: "Item de menu",
      type: "Number",
      required: true,
      indexed: true,
      min: 0
      // Referencia o `Id` nativo de um item de MSEMenu.
    }
  ]
});
