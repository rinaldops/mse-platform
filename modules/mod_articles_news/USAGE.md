# Uso — Artigos — Destaques (News Flash)

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Publique artigos pelo Publicador (`components/com_content`), com
   `EstadoEditorial = "Publicado"` e, se desejar, marque `Destaque`.
2. O módulo é carregado automaticamente na posição `lateral` do Template
   ativo — não é necessário gerar snippet manual.
3. Ajuste `categoriaId`/`tag`/`count`/`showFeatured`/`excludeCurrent`/
   `showIntrotext`/`ordering`/`direction` na configuração da instância
   (`MSEModules.ParamsJson`) pelo Administrator (`components/com_modules`).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). Alterações nos
artigos refletem na próxima navegação/renderização de rota — não há cache
próprio neste módulo.
