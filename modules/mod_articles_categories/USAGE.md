# Uso — Artigos — Lista de Categorias

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Cadastre as categorias desejadas em `MSECategories` pelo Administrator
   (`components/com_categories`), com `Alias`/`Title`/`ParentId`/`Ordering`
   corretos.
2. O módulo é carregado automaticamente na posição `lateral` do Template
   ativo — não é necessário gerar snippet manual.
3. Ajuste `parent`/`showDescription`/`numitems`/`showChildren`/`count`/
   `maxlevel` na configuração da instância (`MSEModules.ParamsJson`) pelo
   Administrator (`components/com_modules`).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). Alterações nas
categorias/artigos refletem na próxima navegação/renderização de rota — não
há cache próprio neste módulo.
