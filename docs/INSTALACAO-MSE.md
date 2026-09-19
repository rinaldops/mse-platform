# Instalação pelo Modern Script Editor

## Pré-requisitos

- página SharePoint com Modern Script Editor habilitado;
- permissão para administrar listas e a biblioteca `SiteAssets`;
- release validada do `mse-platform`;
- nenhuma credencial, cookie ou token incorporado aos arquivos.

## Publicar os arquivos

1. Execute `npm test`.
2. Gere a release com `node tools/build-release.js 0.8.1 <destino-local>`.
3. Verifique-a com `node tools/verify-release.js <destino-local>`.
4. Envie a árvore completa para:

```text
SiteAssets/mse-platform/releases/0.8.1/
```

Não sobrescreva uma pasta existente. Para rollback, mantenha a release anterior.

## Abrir o Centro de Administração

Insira em uma página administrativa um snippet gerado para:

```text
Módulo: mse-admin
Instância: mse-admin
Visualização: full
Manifesto: admin/manifest.js
```

Na primeira abertura:

1. selecione **Preparar configuração**;
2. revise a quantidade de estruturas apresentadas;
3. confirme a criação ou atualização de `MSEConfiguracoes`;
4. selecione um módulo;
5. selecione **Instalar/atualizar estruturas** quando a ação estiver disponível;
6. revise o plano apresentado e confirme a operação.

O carregamento comum nunca cria listas ou campos.

## Configurar uma instância

1. Selecione o módulo.
2. Crie uma instância usando um identificador simples, como
   `videoteca-principal`.
3. Escolha entre módulo completo e resumo, quando o módulo oferecer summary.
4. Ajuste os campos do formulário.
5. Salve para manter um rascunho.
6. Valide a pré-visualização.
7. Publique a configuração.
8. Gere o snippet MSE no campo somente leitura.

Uma instância pode ser desativada sem excluir sua configuração ou seu snippet.
O runtime ignora instâncias desativadas; a reativação preserva o estado e os
settings anteriormente salvos.

As ações de exportação e importação usam um JSON sem autoria ou dados da lista.
A importação aceita até 64 KB, descarta chaves não declaradas pelo módulo e
permanece como edição não salva até confirmação do gestor.

O histórico consulta as versões nativas de `MSEConfiguracoes` e apresenta as
20 alterações mais recentes com data e autoria, respeitando as permissões da
sessão atual.

O runtime consulta apenas configurações com estado `Publicado`.

## Instalar estruturas de conteúdo

O fluxo administrativo é sempre:

1. `inspect`: produz o plano sem gravar;
2. `apply`: exige confirmação explícita;
3. `verify`: relê e recusa qualquer pendência.

O botão **Instalar/atualizar estruturas** executa esse fluxo completo. Ele fica
desabilitado para módulos que não possuem estruturas próprias, como a Home. O
plano informa as listas e a quantidade de campos antes de qualquer gravação.

Erros de permissão, conflitos de campo ou tipos incompatíveis devem ser
corrigidos antes da publicação da instância.

## Rollback

1. Restaure no MSE o snippet da release anterior.
2. Não exclua listas nem campos.
3. Restaure uma versão anterior do item em `MSEConfiguracoes`, se necessário.
4. Execute o diagnóstico com a combinação anterior.

Assets publicados são imutáveis; rollback nunca depende de substituir arquivos
em cache.
