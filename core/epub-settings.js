export function epubSettingsGroups(defaultTitle) {
  return [
    {
      id: "epub-layout",
      label: "EPUB - Layout",
      fields: [
        { id: "layout.mode", type: "select", label: "Largura", options: ["contained", "fullBleed"], default: "contained" },
        { id: "layout.marginTop", type: "number", label: "Margem superior (px)", min: 0, max: 240, default: 0 },
        { id: "layout.marginRight", type: "number", label: "Margem direita (px)", min: 0, max: 240, default: 0 },
        { id: "layout.marginBottom", type: "number", label: "Margem inferior (px)", min: 0, max: 240, default: 0 },
        { id: "layout.marginLeft", type: "number", label: "Margem esquerda (px)", min: 0, max: 240, default: 0 },
        { id: "layout.gridGap", type: "number", label: "Espaço entre itens da grade (px)", min: 0, max: 120, default: 16 }
      ]
    },
    {
      id: "epub-title",
      label: "EPUB - Título",
      fields: [
        { id: "title.visible", type: "boolean", label: "Exibir título", default: false },
        { id: "title.text", type: "text", label: "Texto do título", default: defaultTitle }
      ]
    },
    {
      id: "epub-typography",
      label: "EPUB - Tipografia",
      fields: [
        { id: "typography.paragraphSpacing", type: "number", label: "Espaço entre parágrafos (px)", min: 0, max: 64, default: 6 }
      ]
    },
    {
      id: "epub-theme",
      label: "EPUB - Tema",
      fields: [
        { id: "theme.name", type: "select", label: "Tema", options: ["Standard", "Lite"], default: "Standard" }
      ]
    }
  ];
}
