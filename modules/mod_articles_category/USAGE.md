# Uso — Artigos — Categoria

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Cadastre a categoria desejada em `MSECategories` pelo Administrator
   (`components/com_categories`), com `Alias`/`Title` corretos.
2. Publique artigos pelo Publicador (`components/com_content`) associados a
   essa categoria.
3. O módulo é carregado automaticamente na posição `lateral` do Template
   ativo — não é necessário gerar snippet manual.
4. Ajuste `categoriaId`/`count`/`showFront`/`filterTag`/`dateFiltering`/
   `articleOrdering`/`showIntrotext` na configuração da instância
   (`MSEModules.ParamsJson`) pelo Administrator (`components/com_modules`).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). Alterações nos
artigos/categorias refletem na próxima navegação/renderização de rota — não
há cache próprio neste módulo.
