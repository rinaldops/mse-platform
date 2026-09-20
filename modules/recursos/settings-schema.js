import { epubSettingsGroups } from "../../core/epub-settings.js";

export const RECURSOS_SETTINGS_SCHEMA = Object.freeze({
  version: 2,
  groups: [
    ...epubSettingsGroups("Explore Mais"),
    {
      id: "summary",
      label: "Resumo",
      fields: [{ id: "recursosSummary.pageHref", type: "page", label: "Página do Explore Mais" }]
    }
  ]
});
