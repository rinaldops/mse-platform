# Validação local do Centro de Administração

## Execução

Sirva a raiz do projeto por HTTP e abra:

```text
http://127.0.0.1:4173/examples/admin-host/
```

O host usa o Centro de Administração real com armazenamento em memória. Ele não
faz chamadas ao SharePoint nem persiste dados após recarregar a página.

## Cenários com registro histórico de validação

- renderização em 1366 x 768 e 320 x 900;
- criação de instância completa;
- geração do formulário pelo settings schema;
- publicação da configuração;
- desativação e reativação da instância;
- consulta do histórico nativo simulado;
- geração de snippet MSE para uma árvore de release imutável;
- quebra responsiva da barra de comandos sem sobreposição.

Exportação e importação são cobertas pelos testes unitários. A seleção de
arquivo e o download dependem das permissões do navegador hospedeiro.

## Escopo do registro

Esta revisão documental não reexecutou testes visuais. O host local não valida
permissões, envio de e-mail, cache ou gravações reais no SharePoint. A prévia
visual depende do callback fornecido pelo host; não deve ser inferida da
existência do botão no formulário. Use o [guia atual](INSTALACAO-MSE.md) para
instalação e execute os cenários novamente na release candidata.
