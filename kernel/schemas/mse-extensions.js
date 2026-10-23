/**
 * Esquema declarativo da lista MSEExtensions (Site Kernel) — versão em
 * inglês, substituindo `kernel/schemas/mse-extensoes.js#MSE_EXTENSOES_SCHEMA`
 * (Fase 3 da normalização Joomla!, `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`).
 *
 * MSEExtensions ≈ Joomla! #__extensions. Tradução 1:1 de campo/valor:
 *   Tipo→Type (Componente/Modulo/Plugin→Component/Module/Plugin),
 *   Elemento→Element, Versao→Version, Habilitado→Enabled,
 *   Protegido→Protected, Ordem→Ordering, ParamsJson→ParamsJson (mantém).
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_EXTENSIONS_SCHEMA = defineListSchema({
  key: "mse-extensions",
  internalName: "MSEExtensions",
  displayName: "MSE Extensions",
  titleField: { displayName: "Title", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Type",
      displayName: "Type",
      type: "Choice",
      required: true,
      indexed: false,
      choices: ["Component", "Module", "Plugin", "Template"]
      // ≈ Tipo (Componente/Modulo/Plugin/Template). "Template" adicionado
      // junto com o mecanismo de Templates instaláveis/fallback (ver
      // kernel/schemas/mse-template-styles.js) — no Joomla! real,
      // #__extensions.type já inclui "template" desde sempre; esta lista
      // só alinhava com Component/Module/Plugin porque Templates nunca
      // tinham sido tratados como uma extensão registrada.
    },
    {
      internalName: "Element",
      displayName: "Element",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 128
      // ≈ Elemento. Identificador técnico (ex.: "forum", "blog").
    },
    {
      internalName: "ClientId",
      displayName: "Client",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Site", "Administrator"],
      defaultValue: "Site"
      // ≈ #__extensions.client_id (0=site/1=administrator). Mesmo shape de
      // kernel/schemas/mse-template-styles.js#ClientId (texto em vez do
      // inteiro 0/1 original, mesma convenção de Choice field legível pelo
      // gestor). Acrescentado junto com a auditoria de 22/10/2026
      // (docs/AUDITORIA-JOOMLA-PENTE-FINO.md) — antes, toda extensão era
      // implicitamente "Site", mesmo a única hoje claramente de
      // Administrator (Element: "administrator", ver
      // tools/migrate-mse-administrator-route.js). Backfill de produção em
      // tools/migrate-extensions-client-id.js.
    },
    {
      internalName: "Version",
      displayName: "Version",
      type: "Text",
      required: false,
      maxLength: 32
      // ≈ Versao.
    },
    {
      internalName: "Enabled",
      displayName: "Enabled",
      type: "Boolean",
      required: true,
      indexed: false,
      defaultValue: true
      // ≈ Habilitado.
    },
    {
      internalName: "Protected",
      displayName: "Protected",
      type: "Boolean",
      required: true,
      indexed: false,
      defaultValue: false
      // ≈ Protegido.
    },
    {
      internalName: "Ordering",
      displayName: "Ordering",
      type: "Number",
      required: false,
      min: 0
      // ≈ Ordem.
    },
    {
      internalName: "ParamsJson",
      displayName: "Parameters (JSON)",
      type: "Note",
      required: false,
      lines: 8
    }
  ]
});
