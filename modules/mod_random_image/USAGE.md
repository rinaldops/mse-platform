# Uso — Imagem aleatória

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Envie arquivos de imagem pela tela de mídia do Administrator
   (`components/com_media`) — o módulo só considera arquivos cuja extensão
   esteja na lista configurada (`extensions`, padrão
   `jpg,jpeg,png,gif,webp`).
2. O módulo é carregado automaticamente na posição `lateral` do Template
   ativo — não é necessário gerar snippet manual na página.
3. Ajuste as settings da instância (extensões aceitas, link de destino,
   largura máxima de exibição, texto de "sem imagens") pelo Administrator
   (`components/com_modules`).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). A imagem exibida é
escolhida aleatoriamente a cada renderização — não há cache próprio neste
módulo.
