# Fórum

Discussões e compartilhamento de conhecimento no SharePoint. Consulte a
[matriz de versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md) e o [guia de uso](USAGE.md).

## Funcionalidades

- Categorias e tags; busca por título, filtros e ordenação.
- Tópicos recentes, populares, sem resposta, resolvidos e fixados.
- Paginação de tópicos (20, 50 ou 100) e respostas.
- Criação, edição, rascunhos, fechamento e fixação de tópicos.
- Respostas, edição, citação e marcação/desmarcação de solução aceita.
- Reações Gostei, Útil e Excelente; atividade própria e tópicos relacionados.
- Links diretos e estado de filtros persistido na URL.
- Ranking amostral de participantes, não uma apuração histórica integral.
- Editor nativo, Quill ou Summernote; até dez imagens de 1 MiB por mensagem.
- Notificação ao autor quando outra pessoa responde, via SharePoint SendEmail.

Falha de e-mail não desfaz a resposta publicada; a interface informa falha
parcial e oferece o link da resposta para evitar envio duplicado.

## Dados e permissões

Estruturas: `ForumTaxonomia`, `ForumTopicos`, `ForumTopicoTags`,
`ForumRespostas`, `ForumReacoes`, `ForumPreferencias` e biblioteca `ForumMidia`.
Uma categoria ativa é necessária para publicar tópicos. Autoria e permissões
são verificadas pelo serviço e pelo SharePoint; fixação é restrita a gestores.

Campos `Legacy*` preservam metadados de importações. A exibição prefere autoria
e data legadas quando presentes; permissões continuam baseadas na autoria
nativa. Esses campos não constituem um assistente de migração.

## Resumo e configuração

A visualização `summary` exibe tópicos recentes com trechos, categorias e links
para a página completa (`?forumTopic=<id>`). Configure `forumSummary.pageHref`.

Settings específicos: `forum.pageSize` (12 a 100 no formulário) e
`forum.editor` (`default`, `Quill`, `Summernote`). A interface completa oferece
as opções de paginação acima. Os ajustes comuns de título, tema e layout são
aplicados pelo host. Na integração atual, configure pelo Centro de Administração;
`data-editor` pertence aos loaders legados.

`npm --prefix modules/forum test` executa os testes locais a partir da raiz.
