/**
 * Esquema declarativo da lista MSEExtensoes (Site Kernel).
 *
 * Segue o formato NOVO de `defineListSchema` em `core/list-provisioning.js`
 * (mesmo padrão de `MSE_MENU_SCHEMA` / `MSE_MENU_TIPOS_SCHEMA` em
 * `kernel/schemas/mse-menu.js`, e já usado em produção por
 * `modules/forum/forum-schema.js`, `modules/recursos/recursos-schema.js` e
 * `modules/videoteca/videoteca-schema.js`): objeto normalizado/congelado com
 * `key`, `internalName`, `displayName`, `titleField` (campo Title) e
 * `fields[]` ({ internalName, displayName, type, required, indexed, choices,
 * maxLength, lines, defaultValue }) — sem `schemaXml` manual; o XML de
 * criação é gerado internamente por `fieldXml()`.
 *
 * Apenas estrutura de dados — nenhuma chamada de rede ou provisionamento real
 * é feita aqui. Um instalador (fora deste arquivo) deve consumir este
 * esquema do mesmo jeito que `provisionLists`/`inspectLists` consomem
 * qualquer `schemas[]` em `core/list-provisioning.js`.
 *
 * Referências:
 * - mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4, 4.1 e 5
 *   (MSEExtensoes substitui `data-enabled-modules`).
 */

import { defineListSchema } from "../../core/list-provisioning.js";

/**
 * MSEExtensoes ≈ Joomla! #__extensions.
 * Um registro por Componente/Módulo/Plugin conhecido pelo site: se está
 * habilitado, se é protegido (não pode ser desabilitado pelo gestor) e,
 * para Plugins, a ordem de execução de eventos.
 */
export const MSE_EXTENSOES_SCHEMA = defineListSchema({
  key: "mse-extensoes",
  internalName: "MSEExtensoes",
  displayName: "MSE Extensões",
  titleField: { displayName: "Título", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Tipo",
      displayName: "Tipo",
      type: "Choice",
      required: true,
      indexed: false,
      choices: ["Componente", "Modulo", "Plugin"]
    },
    {
      internalName: "Elemento",
      displayName: "Elemento",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 128
      // Identificador técnico (ex.: "forum", "explore-mais"), já usado hoje
      // em `data-mse-module` / manifestos; não é renomeado nesta etapa.
    },
    {
      internalName: "Versao",
      displayName: "Versão",
      type: "Text",
      required: false,
      maxLength: 32
      // Versão SemVer da extensão habilitada; comparada ao `coreCompatibility`
      // do manifesto pelo kernel/instalador, não validada aqui.
    },
    {
      internalName: "Habilitado",
      displayName: "Habilitado",
      type: "Boolean",
      required: true,
      indexed: false,
      defaultValue: true
    },
    {
      internalName: "Protegido",
      displayName: "Protegido",
      type: "Boolean",
      required: true,
      indexed: false,
      defaultValue: false
      // Extensões essenciais que o Administrator não deve permitir desabilitar;
      // esta é apenas a informação persistida — a trava fica no Administrator.
    },
    {
      internalName: "Ordem",
      displayName: "Ordem",
      type: "Number",
      required: false,
      min: 0
      // Relevante para Plugins (ordem de execução de eventos); Componentes e
      // Módulos podem deixar vazio.
    },
    {
      internalName: "ParamsJson",
      displayName: "Parâmetros (JSON)",
      type: "Note",
      required: false,
      lines: 8
      // Parâmetros serializados em JSON (string); nunca Base64.
    }
  ]
});
