export const HOME_SETTINGS_SCHEMA = Object.freeze({
  version: 1,
  groups: [
    {
      id: "layout",
      label: "Layout",
      fields: [{ id: "layout.mode", type: "select", label: "Largura do módulo", options: ["contained", "fullBleed"], default: "contained" }]
    },
    {
      id: "hero",
      label: "Destaque principal",
      fields: [
        { id: "home.content.eyebrow", type: "text", label: "Chamada", default: "Digital workspace" },
        { id: "home.content.title", type: "text", label: "Título", default: "Connect people, knowledge and technology." },
        { id: "home.content.description", type: "text", label: "Descrição", default: "A shared space for useful content, discussions and learning." },
        { id: "home.content.primaryAction.label", type: "text", label: "Botão principal", default: "Open discussions" },
        { id: "home.content.primaryAction.href", type: "page", label: "Destino principal", default: "#discussions" },
        { id: "home.content.secondaryAction.label", type: "text", label: "Botão secundário", default: "Browse videos" },
        { id: "home.content.secondaryAction.href", type: "page", label: "Destino secundário", default: "#videos" }
      ]
    }
  ]
});
