# Uso — Rodapé

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. O módulo é carregado automaticamente na posição `rodape` do Template
   ativo — não é necessário gerar snippet manual.
2. Para personalizar o texto, ajuste `copyrightText`/`showYear` na
   configuração da instância (`MSEModules.ParamsJson`) pelo Administrator
   (`components/com_modules`).
3. Sem personalização, o módulo usa os padrões do esquema: texto "Todos os
   direitos reservados." com o ano atual.

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). Alterações de
configuração só entram no runtime quando publicadas.
