const SUMMARY_MODULES = ["forum", "videoteca", "explore-mais"];
const SUMMARY_INSTANCES = ["forum-resumo", "videoteca-resumo", "explore-mais-resumo"];

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
    },
    ...[1, 2, 3].map((position) => ({
      id: `summary-${position}`,
      label: `Resumo ${position}`,
      fields: [
        { id: `home.slots.${position}.enabled`, type: "boolean", label: "Exibir resumo", default: true },
        { id: `home.slots.${position}.moduleId`, type: "select", label: "Módulo", options: SUMMARY_MODULES, default: SUMMARY_MODULES[position - 1] },
        { id: `home.slots.${position}.instanceId`, type: "text", label: "Instância do resumo", default: SUMMARY_INSTANCES[position - 1] }
      ]
    }))
  ]
});
