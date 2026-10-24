# Uso — Artigos similares (por tags)

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Publique artigos com `tags` preenchidas pelo Publicador
   (`components/com_content`) — o módulo só considera artigos com
   `estado === "Publicado"`.
2. O módulo é carregado automaticamente na posição `lateral` do Template
   ativo — não é necessário gerar snippet manual na página.
3. Ajuste as settings da instância (quantidade máxima, ordenação, texto de
   "sem sugestões") pelo Administrator (`components/com_modules`).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). O módulo depende da
rota atual (`context.route`) para identificar o artigo ativo — em páginas
sem artigo (ex.: página inicial), ele renderiza o estado vazio
configurado, sem lançar erro.
