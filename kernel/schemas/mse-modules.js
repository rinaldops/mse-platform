/**
 * Esquema declarativo da lista MSEModules (Site Kernel) — versão em inglês,
 * substituindo `kernel/schemas/mse-modulos.js#MSE_MODULOS_SCHEMA` (Fase 3 da
 * normalização Joomla!, `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`).
 *
 * Segue o mesmo formato de `defineListSchema` em `core/list-provisioning.js`
 * já usado por `kernel/schemas/mse-modulos.js` (mantido por ora — ainda é a
 * lista real em produção até a Fase 4 trocar os consumidores): objeto
 * normalizado/congelado com `key`, `internalName`, `displayName`,
 * `titleField` e `fields[]`.
 *
 * MSEModules ≈ Joomla! #__modules. Tradução 1:1 de campo/valor em relação a
 * `MSE_MODULOS_SCHEMA`:
 *   ModuloTipo→Module, Posicao→Position, Ordem→Ordering,
 *   Estado→Published (Publicado/Despublicado/Lixeira→Published/Unpublished/Trashed),
 *   PublicarEm→PublishUp, PublicarAte→PublishDown, MostrarTitulo→ShowTitle,
 *   Estilo→Style,
 *   AtribuicaoMenu→MenuAssignment (Todas/Nenhuma/Somente/Todas exceto→All/None/Only/AllExcept),
 *   ParamsJson→ParamsJson (mantém), SchemaVersao→SchemaVersion.
 *
 * Referências:
 * - mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4, 4.1 e 5.
 * - Plano de normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`),
 *   Fase 3.
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_MODULES_SCHEMA = defineListSchema({
  key: "mse-modules",
  internalName: "MSEModules",
  displayName: "MSE Modules",
  titleField: { displayName: "Title", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Module",
      displayName: "Module",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 128
      // ≈ ModuloTipo. Identificador técnico do Módulo (ex.: "sd", "dt1"),
      // o mesmo valor usado em MSEExtensions.Element quando Type === "Module".
    },
    {
      internalName: "Position",
      displayName: "Position",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 64
      // ≈ Posicao. kebab-case, mesma convenção de kernel/layout.js.
    },
    {
      internalName: "Ordering",
      displayName: "Ordering",
      type: "Number",
      required: true,
      min: 0,
      defaultValue: 0
      // ≈ Ordem.
    },
    {
      internalName: "Published",
      displayName: "Published",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Published", "Unpublished", "Trashed"],
      defaultValue: "Published"
      // ≈ Estado (Publicado/Despublicado/Lixeira).
    },
    {
      internalName: "PublishUp",
      displayName: "Publish up",
      type: "DateTime",
      required: false
      // ≈ PublicarEm.
    },
    {
      internalName: "PublishDown",
      displayName: "Publish down",
      type: "DateTime",
      required: false
      // ≈ PublicarAte.
    },
    {
      internalName: "ShowTitle",
      displayName: "Show title",
      type: "Boolean",
      required: true,
      defaultValue: false
      // ≈ MostrarTitulo.
    },
    {
      internalName: "Style",
      displayName: "Style",
      type: "Text",
      required: false,
      maxLength: 64
      // ≈ Estilo.
    },
    {
      internalName: "MenuAssignment",
      displayName: "Menu assignment",
      type: "Choice",
      required: true,
      choices: ["All", "None", "Only", "AllExcept"],
      defaultValue: "All"
      // ≈ AtribuicaoMenu (Todas/Nenhuma/Somente/Todas exceto).
    },
    {
      internalName: "ParamsJson",
      displayName: "Parameters (JSON)",
      type: "Note",
      required: false,
      lines: 8
    },
    {
      internalName: "SchemaVersion",
      displayName: "Parameters schema version",
      type: "Number",
      required: false,
      min: 0
      // ≈ SchemaVersao.
    }
  ]
});
