export const VIDEOTECA_SCHEMA_VERSION = 1;

const CATEGORIES = [
  "Power Platform",
  "Microsoft 365",
  "SAP",
  "Azure e APIs",
  "KNIME",
  "Automation Anywhere",
  "IA e Machine Learning",
  "Outros"
];

export const VIDEOTECA_LIST_SCHEMAS = [
  {
    key: "videoteca-videos",
    internalName: "VideotecaVideos",
    displayName: "Videoteca — Vídeos",
    description: "Catálogo de gravações dos encontros, com categoria, apresentador e destaque para o carrossel.",
    version: VIDEOTECA_SCHEMA_VERSION,
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
        choices: CATEGORIES
      },
      { internalName: "Apresentador", displayName: "Apresentador", type: "Text", maxLength: 100 },
      { internalName: "Data", displayName: "Data", type: "DateTime", indexed: true },
      { internalName: "Duracao", displayName: "Duração", type: "Text", maxLength: 20 },
      { internalName: "Miniatura", displayName: "Miniatura", type: "Text", maxLength: 255 },
      { internalName: "Descricao", displayName: "Descrição", type: "Note", lines: 3 },
      {
        internalName: "Destaque",
        displayName: "Destaque",
        type: "Boolean",
        required: true,
        indexed: true,
        defaultValue: false
      },
      {
        internalName: "OrdemCarrossel",
        displayName: "Ordem no carrossel",
        type: "Number",
        indexed: true,
        min: 0,
        defaultValue: 0
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
