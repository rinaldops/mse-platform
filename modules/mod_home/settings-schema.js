import { epubSettingsGroups } from "../../core/epub-settings.js";

const COLOR_ROLES = ["accentPrimary", "accentSecondary", "custom"];
const COLOR_ROLE_LABELS = {
  accentPrimary: "Amarelo do tema",
  accentSecondary: "Laranja do tema",
  custom: "Personalizada"
};

export const HOME_SETTINGS_SCHEMA = Object.freeze({
  version: 4,
  groups: [
    ...epubSettingsGroups("Destaque"),
    {
      id: "hero",
      label: "Destaque principal",
      fields: [
        { id: "home.content.eyebrow", type: "text", label: "Chamada", default: "Digital workspace" },
        { id: "home.content.eyebrowColorRole", type: "select", label: "Cor da chamada", options: COLOR_ROLES, optionLabels: COLOR_ROLE_LABELS, default: "accentPrimary" },
        { id: "home.content.eyebrowCustomColor", type: "color", label: "Cor personalizada da chamada", default: "#FDC82F", help: "Selecione Personalizada no campo anterior para usar esta cor." },
        { id: "home.content.title", type: "text", label: "Título", default: "Tecnologia que conecta. Pessoas que transformam." },
        { id: "home.content.highlights.primary.text", type: "text", label: "Texto do destaque 1", default: "conecta" },
        { id: "home.content.highlights.primary.colorRole", type: "select", label: "Cor do destaque 1", options: COLOR_ROLES, optionLabels: COLOR_ROLE_LABELS, default: "accentPrimary" },
        { id: "home.content.highlights.primary.customColor", type: "color", label: "Cor personalizada do destaque 1", default: "#FDC82F", help: "Selecione Personalizada no campo anterior para usar esta cor." },
        { id: "home.content.highlights.secondary.text", type: "text", label: "Texto do destaque 2", default: "transformam" },
        { id: "home.content.highlights.secondary.colorRole", type: "select", label: "Cor do destaque 2", options: COLOR_ROLES, optionLabels: COLOR_ROLE_LABELS, default: "accentSecondary" },
        { id: "home.content.highlights.secondary.customColor", type: "color", label: "Cor personalizada do destaque 2", default: "#ED8B00", help: "Selecione Personalizada no campo anterior para usar esta cor." },
        { id: "home.content.description", type: "text", label: "Descrição", default: "A shared space for useful content, discussions and learning." },
        { id: "home.content.primaryAction.label", type: "text", label: "Botão principal", default: "Open discussions" },
        { id: "home.content.primaryAction.href", type: "page", label: "Destino principal", default: "#discussions" },
        { id: "home.content.secondaryAction.label", type: "text", label: "Botão secundário", default: "Browse videos" },
        { id: "home.content.secondaryAction.href", type: "page", label: "Destino secundário", default: "#videos" }
      ]
    }
  ]
});
