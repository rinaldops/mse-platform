export const RECURSOS_SCHEMA_VERSION = 1;

export const RECURSOS_LIST_SCHEMAS = [
  {
    key: "recursos-links",
    internalName: "RecursosLinks",
    displayName: "Recursos — Links",
    description: "Links e dicas curados exibidos no módulo Recursos.",
    version: RECURSOS_SCHEMA_VERSION,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 4,
    titleField: { displayName: "Título", required: true, indexed: true },
    fields: [
      { internalName: "URL", displayName: "URL", type: "Text", required: true, maxLength: 255 },
      {
        internalName: "Categoria",
        displayName: "Categoria",
        type: "Choice",
        required: true,
        indexed: true,
        choices: ["Power Platform", "Microsoft 365", "SAP", "Azure e APIs", "Governança", "Dicas rápidas"]
      },
      { internalName: "Descricao", displayName: "Descrição", type: "Note", lines: 3 },
      { internalName: "IconeChave", displayName: "Ícone", type: "Text", maxLength: 60 },
      {
        internalName: "Ordem",
        displayName: "Ordem",
        type: "Number",
        indexed: true,
        min: 0,
        defaultValue: 0
      },
      {
        internalName: "AbrirNovaJanela",
        displayName: "Abrir em nova janela",
        type: "Boolean",
        required: true,
        defaultValue: true
      },
      {
        internalName: "Ativo",
        displayName: "Ativo",
        type: "Boolean",
        required: true,
        indexed: true,
        defaultValue: true
      }
    ]
  }
];
