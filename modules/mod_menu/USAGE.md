# Uso — Menu

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Cadastre os itens de navegação em `MSEMenu` pelo Administrator
   (`components/com_menus`), com `Alias`, `ParentId`, `Ordering`, `Target` e
   `Published` corretos.
2. O módulo é carregado automaticamente na posição `menu-principal` do
   Template ativo — não é necessário gerar snippet manual na página, pois
   módulos de posição são resolvidos pelo Site Kernel a cada rota.
3. Publique o(s) item(ns) de menu desejados (`Published = "Published"`).

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). Alterações nos
itens de `MSEMenu` refletem na próxima navegação/renderização de rota —
não há cache próprio neste módulo.
