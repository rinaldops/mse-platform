import { epubSettingsGroups } from "../../core/epub-settings.js";

export const FORUM_SETTINGS_SCHEMA = Object.freeze({
  version: 2,
  groups: [
    ...epubSettingsGroups("Fórum"),
    {
      id: "content",
      label: "Conteúdo",
      fields: [
        { id: "forum.pageSize", type: "number", label: "Tópicos por página", min: 12, max: 100, default: 20 },
        { id: "forum.editor", type: "select", label: "Editor de texto", options: ["default", "Quill", "Summernote"], default: "default" },
        { id: "forumSummary.pageHref", type: "page", label: "Página do Fórum" }
      ]
    }
  ]
});
