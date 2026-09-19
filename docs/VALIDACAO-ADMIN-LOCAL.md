# Validação local do Centro de Administração

## Execução

Sirva a raiz do projeto por HTTP e abra:

```text
http://127.0.0.1:4173/examples/admin-host/
```

O host usa o Centro de Administração real com armazenamento em memória. Ele não
faz chamadas ao SharePoint nem persiste dados após recarregar a página.

## Cenários validados

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
