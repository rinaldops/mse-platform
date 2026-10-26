/**
 * Manifesto do Componente PÚBLICO `com_content` — primeiro Componente
 * roteável do site (lista/artigo/categoria/destaques), confirmado como
 * lacuna em `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md` ("com_content | parcial
 * | componente público e administrativo de conteúdo"). Distinto de
 * `publisher.js`/`categories-editor.js` (telas do Administrator, montadas
 * dentro de `com_cpanel`, sem manifesto próprio).
 *
 * `routeParams: ["id", "slug"]`: a visão "article" identifica o artigo pelo
 * segmento de rota `#/<alias>/<id>-<slug>` (mesmo contrato de
 * `kernel/application.js#namedRouteParams`); as demais visões (list/
 * featured/category) não usam `id`/`slug`.
 */

export const COM_CONTENT_MANIFEST = Object.freeze({
  id: "content",
  displayName: "Conteúdo — Artigos e categorias",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./com-content.css"],
  type: "component",
  views: { list: true, article: true, category: true, featured: true },
  routeParams: ["id", "slug"],
  capabilities: { full: true, summary: false, settings: false, provisioning: false },
  entrypoints: { full: "./component.js" }
});

export default COM_CONTENT_MANIFEST;
