import { epubSettingsGroups } from "../../core/epub-settings.js";

export const VIDEOTECA_SETTINGS_SCHEMA = Object.freeze({
  version: 2,
  groups: [
    ...epubSettingsGroups("Videoteca"),
    {
      id: "content",
      label: "Conteúdo",
      fields: [{
        id: "videoteca.presenterSuffixes",
        type: "text",
        label: "Sufixos ocultos nos nomes",
        help: "Separe vários sufixos com ponto e vírgula.",
        default: ""
      }]
    },
    {
      id: "summary",
      label: "Resumo",
      fields: [{ id: "videotecaSummary.pageHref", type: "page", label: "Página da Videoteca" }]
    }
  ]
});
