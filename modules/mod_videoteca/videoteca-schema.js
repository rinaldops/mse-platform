export const VIDEOTECA_SCHEMA_VERSION = 7;

export const VIDEOTECA_LIST_SCHEMAS = [
  {
    key: "videoteca-taxonomy",
    internalName: "VideotecaTaxonomia",
    displayName: "Videoteca — Taxonomia",
    description: "Categorias e tags da videoteca.",
    version: VIDEOTECA_SCHEMA_VERSION,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 4,
    titleField: { displayName: "Nome", required: true, indexed: true },
    fields: [
      { internalName: "Chave", displayName: "Chave", type: "Text", required: true, indexed: true, unique: true, maxLength: 128 },
      { internalName: "Tipo", displayName: "Tipo", type: "Choice", required: true, indexed: true, choices: ["Categoria", "Tag"] },
      { internalName: "Descricao", displayName: "Descrição", type: "Note", lines: 4 },
      { internalName: "Cor", displayName: "Cor", type: "Text", maxLength: 20 },
      { internalName: "Ordem", displayName: "Ordem", type: "Number", indexed: true, min: 0, defaultValue: 0 },
      { internalName: "Ativo", displayName: "Ativo", type: "Boolean", required: true, indexed: true, defaultValue: true },
      { internalName: "PaiId", displayName: "Item pai", type: "Number", indexed: true, min: 1 }
    ]
  },
  {
    key: "videoteca-videos",
    internalName: "VideotecaVideos",
    displayName: "Videoteca — Vídeos",
    description: "Catálogo de gravações dos encontros, com categoria, apresentador e destaque para o carrossel.",
    version: VIDEOTECA_SCHEMA_VERSION,
    template: 101,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 1,
    titleField: { displayName: "Título", required: false, indexed: true },
    fields: [
      { internalName: "URL", displayName: "URL externa", type: "Text", maxLength: 255 },
      { internalName: "CategoriaId", displayName: "Categoria", type: "Number", required: true, indexed: true, min: 1 },
      { internalName: "Apresentadores", displayName: "Apresentadores", type: "UserMulti" },
      { internalName: "Data", displayName: "Data", type: "DateTime", indexed: true },
      { internalName: "Duracao", displayName: "Duração", type: "Text", maxLength: 20 },
      { internalName: "DuracaoSegundos", displayName: "Duração em segundos", type: "Number", min: 0 },
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
        internalName: "Visualizacoes",
        displayName: "Visualizações",
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
      },
      { internalName: "Evento", displayName: "Evento", type: "Text", maxLength: 255 },
      { internalName: "Edicao", displayName: "Edição", type: "Text", maxLength: 100 },
      { internalName: "OrdemSessao", displayName: "Ordem da sessão", type: "Number", min: 0 },
      {
        internalName: "LegacyMigrationId",
        displayName: "Identificador da migração legada",
        type: "Text",
        maxLength: 255,
        indexed: true,
        unique: true
      },
      { internalName: "LegacyItemId", displayName: "ID legado", type: "Number", indexed: true, min: 1 },
      { internalName: "LegacySourceFileUrl", displayName: "URL do arquivo legado", type: "Text", maxLength: 255 },
      { internalName: "LegacyRelativePath", displayName: "Caminho relativo legado", type: "Note", lines: 3 },
      { internalName: "LegacyCreated", displayName: "Criação legada", type: "DateTime" },
      { internalName: "LegacyAuthor", displayName: "Autor legado", type: "Text", maxLength: 255 }
    ]
  },
  {
    key: "videoteca-video-tags",
    internalName: "VideotecaVideoTags",
    displayName: "Videoteca — Tags dos vídeos",
    description: "Relação entre vídeos e tags da taxonomia.",
    version: VIDEOTECA_SCHEMA_VERSION,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 4,
    titleField: { displayName: "Chave", required: true, indexed: true, unique: true },
    fields: [
      { internalName: "VideoId", displayName: "Vídeo", type: "Number", required: true, indexed: true, min: 1 },
      { internalName: "TagId", displayName: "Tag", type: "Number", required: true, indexed: true, min: 1 }
    ]
  }
];
