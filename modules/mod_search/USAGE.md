# Uso — Busca

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Garanta que a lista de artigos (ex.: `CAMAPPublicacoes`/`MSEPublicacoes`,
   ver `kernel/articles-data.js#resolveArticlesList`) já esteja provisionada
   e populada pelo Publicador (`components/com_content`).
2. O módulo é carregado automaticamente na posição `lateral` do Template
   ativo — não é necessário gerar snippet manual na página.
3. Ajuste, se desejar, o texto de ajuda do campo de busca e o número máximo
   de resultados exibidos (parâmetros do módulo).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). A lista de artigos é
carregada uma única vez por montagem do módulo — alterações no conteúdo só
aparecem na busca após a próxima renderização de rota (sem cache próprio
além disso).
