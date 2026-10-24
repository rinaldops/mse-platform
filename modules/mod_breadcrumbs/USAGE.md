# Uso — Trilha de navegação

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Cadastre a hierarquia de itens em `MSEMenu` pelo Administrator
   (`components/com_menus`), com `ParentId` e `Alias` corretos para cada
   nível.
2. O módulo é carregado automaticamente na posição `breadcrumbs` do
   Template ativo, resolvido a cada rota pelo Site Kernel — não é necessário
   gerar snippet manual.
3. Publique os itens de menu desejados (`Published = "Published"`).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). A trilha reflete a
rota ativa e a hierarquia de `MSEMenu`; não há cache próprio neste módulo.
