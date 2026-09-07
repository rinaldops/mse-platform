export const FORUM_SCHEMA_VERSION = 5;

export const FORUM_LIST_SCHEMAS = [
  {
    key: "forum-taxonomy",
    internalName: "ForumTaxonomia",
    displayName: "Fórum — Taxonomia",
    description: "Categorias e tags do fórum corporativo.",
    version: FORUM_SCHEMA_VERSION,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 4,
    titleField: { displayName: "Nome", required: true, indexed: true },
    fields: [
      {
        internalName: "Chave",
        displayName: "Chave",
        type: "Text",
        required: true,
        indexed: true,
        unique: true,
        maxLength: 128
      },
      {
        internalName: "Tipo",
        displayName: "Tipo",
        type: "Choice",
        required: true,
        indexed: true,
        choices: ["Categoria", "Tag"]
      },
      {
        internalName: "Descricao",
        displayName: "Descrição",
        type: "Note",
        lines: 4
      },
      { internalName: "Cor", displayName: "Cor", type: "Text", maxLength: 20 },
      {
        internalName: "Ordem",
        displayName: "Ordem",
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
      { internalName: "PaiId", displayName: "Item pai", type: "Number", indexed: true, min: 1 }
    ]
  },
  {
    key: "forum-topics",
    internalName: "ForumTopicos",
    displayName: "Fórum — Tópicos",
    description: "Tópicos publicados no fórum corporativo.",
    version: FORUM_SCHEMA_VERSION,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 2,
    titleField: { displayName: "Título", required: true, indexed: true },
    fields: [
      {
        internalName: "Conteudo",
        displayName: "Conteúdo",
        type: "Note",
        required: true,
        richText: true,
        lines: 15
      },
      {
        internalName: "FormatoConteudo",
        displayName: "Formato do conteúdo",
        type: "Choice",
        required: true,
        choices: ["TextoSimples", "HtmlSeguroV1"],
        defaultValue: "TextoSimples"
      },
      {
        internalName: "CategoriaId",
        displayName: "Categoria",
        type: "Number",
        required: true,
        indexed: true,
        min: 1
      },
      {
        internalName: "Status",
        displayName: "Status",
        type: "Choice",
        required: true,
        indexed: true,
        choices: ["Aberto", "Resolvido", "Fechado", "Arquivado"],
        defaultValue: "Aberto"
      },
      {
        internalName: "Fixado",
        displayName: "Fixado",
        type: "Boolean",
        required: true,
        indexed: true,
        defaultValue: false
      },
      {
        internalName: "RespostaAceitaId",
        displayName: "Resposta aceita",
        type: "Number",
        min: 1
      },
      {
        internalName: "QuantidadeRespostas",
        displayName: "Quantidade de respostas",
        type: "Number",
        required: true,
        indexed: true,
        min: 0,
        defaultValue: 0
      },
      {
        internalName: "QuantidadeVisualizacoes",
        displayName: "Quantidade de visualizações",
        type: "Number",
        required: true,
        min: 0,
        defaultValue: 0
      },
      {
        internalName: "Pontuacao",
        displayName: "Pontuação",
        type: "Number",
        required: true,
        indexed: true,
        defaultValue: 0
      },
      {
        internalName: "UltimaAtividade",
        displayName: "Última atividade",
        type: "DateTime",
        required: true,
        indexed: true
      }
    ]
  },
  {
    key: "forum-topic-tags",
    internalName: "ForumTopicoTags",
    displayName: "Fórum — Tags dos tópicos",
    description: "Relação indexada entre tópicos e tags.",
    version: FORUM_SCHEMA_VERSION,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 2,
    titleField: { displayName: "Chave", required: true, indexed: true, unique: true },
    fields: [
      {
        internalName: "TopicoId",
        displayName: "Tópico",
        type: "Number",
        required: true,
        indexed: true,
        min: 1
      },
      {
        internalName: "TagId",
        displayName: "Tag",
        type: "Number",
        required: true,
        indexed: true,
        min: 1
      }
    ]
  },
  {
    key: "forum-answers",
    internalName: "ForumRespostas",
    displayName: "Fórum — Respostas",
    description: "Respostas lineares dos tópicos do fórum.",
    version: FORUM_SCHEMA_VERSION,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 2,
    titleField: { displayName: "Resumo", required: false },
    fields: [
      {
        internalName: "TopicoId",
        displayName: "Tópico",
        type: "Number",
        required: true,
        indexed: true,
        min: 1
      },
      {
        internalName: "Conteudo",
        displayName: "Conteúdo",
        type: "Note",
        required: true,
        richText: true,
        lines: 12
      },
      {
        internalName: "FormatoConteudo",
        displayName: "Formato do conteúdo",
        type: "Choice",
        required: true,
        choices: ["TextoSimples", "HtmlSeguroV1"],
        defaultValue: "TextoSimples"
      },
      {
        internalName: "RespostaCitadaId",
        displayName: "Resposta citada",
        type: "Number",
        min: 1
      },
      {
        internalName: "Status",
        displayName: "Status",
        type: "Choice",
        required: true,
        indexed: true,
        choices: ["Publicada", "Arquivada", "Oculta"],
        defaultValue: "Publicada"
      },
      {
        internalName: "Pontuacao",
        displayName: "Pontuação",
        type: "Number",
        required: true,
        indexed: true,
        defaultValue: 0
      }
    ]
  },
  {
    key: "forum-reactions",
    internalName: "ForumReacoes",
    displayName: "Fórum — Reações",
    description: "Reações únicas por usuário e publicação.",
    version: FORUM_SCHEMA_VERSION,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 2,
    titleField: { displayName: "Chave", required: true, indexed: true, unique: true },
    fields: [
      {
        internalName: "PublicacaoTipo",
        displayName: "Tipo de publicação",
        type: "Choice",
        required: true,
        indexed: true,
        choices: ["Topico", "Resposta"]
      },
      {
        internalName: "PublicacaoId",
        displayName: "Publicação",
        type: "Number",
        required: true,
        indexed: true,
        min: 1
      },
      {
        internalName: "TipoReacao",
        displayName: "Reação",
        type: "Choice",
        required: true,
        indexed: true,
        choices: ["Gostei", "Util", "Excelente"]
      },
      {
        internalName: "UsuarioId",
        displayName: "Usuário",
        type: "Number",
        required: true,
        indexed: true,
        min: 1
      }
    ]
  },
  {
    key: "forum-preferences",
    internalName: "ForumPreferencias",
    displayName: "Fórum — Preferências",
    description: "Assinaturas, favoritos e rascunhos dos participantes.",
    version: FORUM_SCHEMA_VERSION,
    versioning: true,
    readSecurity: 2,
    writeSecurity: 2,
    titleField: { displayName: "Chave", required: true, indexed: true },
    fields: [
      {
        internalName: "Tipo",
        displayName: "Tipo",
        type: "Choice",
        required: true,
        indexed: true,
        choices: ["Assinatura", "Favorito", "Rascunho"]
      },
      {
        internalName: "UsuarioId",
        displayName: "Usuário",
        type: "Number",
        required: true,
        indexed: true,
        min: 1
      },
      {
        internalName: "TopicoId",
        displayName: "Tópico",
        type: "Number",
        indexed: true,
        min: 1
      },
      {
        internalName: "ConteudoRascunho",
        displayName: "Conteúdo do rascunho",
        type: "Note",
        lines: 12
      }
    ]
  },
  {
    key: "forum-media",
    internalName: "ForumMidia",
    displayName: "Fórum — Mídia",
    description: "Imagens e documentos vinculados às publicações do fórum.",
    version: FORUM_SCHEMA_VERSION,
    template: 101,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 1,
    titleField: { displayName: "Título", required: false },
    fields: [
      { internalName: "TopicoId", displayName: "Tópico", type: "Number", indexed: true, min: 1 },
      {
        internalName: "RespostaId",
        displayName: "Resposta",
        type: "Number",
        indexed: true,
        min: 1
      },
      {
        internalName: "TextoAlternativo",
        displayName: "Texto alternativo",
        type: "Text",
        maxLength: 255
      }
    ]
  }
];
