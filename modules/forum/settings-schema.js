export const FORUM_SETTINGS_SCHEMA = Object.freeze({
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
