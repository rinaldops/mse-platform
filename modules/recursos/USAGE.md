# Uso — Explore Mais

Este guia utiliza o contrato atual da plataforma. Siga primeiro a
[instalação comum](../../docs/INSTALACAO-MSE.md), com uma release completa,
Modern Script Editor habilitado e permissões adequadas no site de destino.

## Configurar

1. Abra o Centro de Administração e prepare MSEConfiguracoes.
2. Selecione `explore-mais` e instale suas estruturas quando houver essa opção.
3. Cadastre itens ativos em RecursosLinks com título, URL, categoria e ordem. Confira grupos abertos, busca, filtros, alternância de visualização e abertura de destinos.
4. Crie uma instância Full com identificador único, como `recursos-principal`.
5. Ajuste o formulário, salve e publique a configuração.
6. Gere o snippet, copie-o para o MSE e publique a página.
7. Teste com os perfis de leitura, contribuição e administração previstos.

Para um painel resumido, crie outra instância Summary, configure o destino da
página completa e gere outro snippet.

## Manutenção e validação

Consulte as [funcionalidades e limitações](README.md). Não trate botões sem
fluxo implementado como recursos disponíveis. Alterações de configuração só
entram no runtime quando publicadas; conteúdo é mantido nas estruturas SharePoint.

Use IDs de instância distintos na mesma página. Desativar uma instância
preserva sua configuração. Para atualizar arquivos ou voltar a uma versão,
siga a [política de releases](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

Os arquivos em `snippets/` e os loaders antigos são exemplos legados, com
versões fixas históricas. Não copie suas árvores de publicação para uma nova
instalação. O Centro de Administração gera o snippet do contrato atual.
