# Uso — Tags populares

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Publique artigos com `tags` preenchidas pelo Publicador
   (`components/com_content`) — o módulo só conta tags de artigos com
   `estado === "Publicado"`.
2. O módulo é carregado automaticamente na posição `lateral` do Template
   ativo — não é necessário gerar snippet manual na página.
3. Ajuste as settings da instância (quantidade máxima, período, ordenação,
   exibir contagem, nuvem) pelo Administrator (`components/com_modules`).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). Alterações nas tags
dos artigos refletem na próxima navegação/renderização de rota — não há
cache próprio neste módulo.
