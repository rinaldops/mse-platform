# Uso — Artigos — Mais acessados

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Publique artigos pelo Publicador (`components/com_content`), com
   `EstadoEditorial = "Publicado"`.
2. O módulo é carregado automaticamente na posição `lateral` do Template
   ativo — não é necessário gerar snippet manual.
3. Ajuste `categoriaId`/`count`/`showFront`/`dateFiltering` na configuração
   da instância (`MSEModules.ParamsJson`) pelo Administrator
   (`components/com_modules`).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md) — em especial a nota
sobre este módulo não refletir popularidade real (sem contador de acessos).
Alterações nos artigos refletem na próxima navegação/renderização de rota.
