export const RECURSOS_SETTINGS_SCHEMA = Object.freeze({
  version: 1,
  groups: [
    {
      id: "layout",
      label: "Layout",
      fields: [{
        id: "layout.mode",
        type: "select",
        label: "Largura do módulo",
        options: ["contained", "fullBleed"],
        default: "contained"
      }]
    },
    {
      id: "summary",
      label: "Resumo",
      fields: [{ id: "recursosSummary.pageHref", type: "page", label: "Página do Explore Mais" }]
    }
  ]
});
