import { defineModuleManifest } from "../../../core/module-contract.js";

/**
 * Plugin de conteúdo: sanitização/transformação de HTML.
 *
 * Observação: o loader de plugins ainda não foi implementado no kernel.
 * Este manifesto existe para manter o alinhamento com a convenção Joomla-like
 * (`plugins/<grupo>/<nome>`), e para permitir validação contratual isolada.
 */

export default defineModuleManifest({
  id: "plg-content-sanitize",
  displayName: "Content — Sanitização",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 1,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: [],
  dataSources: [],
  type: "plugin",
  entrypoints: { full: "./plg-content-sanitize.js" },
  // Eventos previstos pelo Site Kernel (kernel/events.js). O loader futuro
  // deverá conectar estes nomes ao event bus.
  events: ["onBeforeRender", "onAfterRoute"]
});

