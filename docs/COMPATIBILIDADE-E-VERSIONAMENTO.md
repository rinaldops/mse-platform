# Compatibilidade e versionamento

Inventário do código em 2026-09-26. Plataforma: **1.0.23**, conforme
[package.json](../package.json). Este inventário não certifica uma instalação
SharePoint nem substitui os testes de uma release.

| Pacote | package.json | Manifesto de módulo |
| --- | --- | --- |
| Core | 0.8.0 | — |
| UI | 0.7.7 | — |
| Fórum | 0.5.0 | 0.5.1 |
| Explore Mais | 0.5.0 | 0.5.1 |
| Videoteca | 0.8.0 | 0.9.1 |
| Home | 0.5.0 | 0.7.0 |
| Administração | 1.0.2 | 1.0.2 |
| Adaptador MSE | 0.1.0 | — |

Os manifestos dos módulos e administração declaram `>=0.8.0 <2.0.0` e
estabilidade `preview`. Há divergências reais entre package.json e manifestos:
o build registra versões dos pacotes; o runtime e as configurações usam as dos
manifestos. Esta revisão documental não altera essas versões. Reconcilie os
metadados numa mudança técnica antes de declarar uma nova combinação homologada.

## Publicação

- Use `SiteAssets/mse-platform/releases/<versão-da-plataforma>/`.
- Preserve imports relativos e a árvore completa do empacotador.
- A versão passada ao build deve coincidir com o package.json da raiz.
- O build recusa diretório de saída existente e gera manifesto com SHA-256.
- verify-release confere tamanho e hash dos arquivos; não certifica imports,
  permissões ou funcionamento em navegador.
- Pastas publicadas não são sobrescritas; mantenha a anterior para rollback.
- dist contém cópias históricas, não a fonte de uma nova release.

## Atualização e rollback

1. Preserve o snippet e a configuração atuais.
2. Publique a nova release em pasta inédita.
3. Execute inspect, confirme apply e conclua verify das estruturas.
4. Configure uma instância piloto e publique suas configurações.
5. Gere o snippet e valide os fluxos antes de migrar outras páginas.
6. Para rollback, restaure o snippet anterior e, se necessário, a versão do item
   de MSEConfiguracoes pelo SharePoint. Não exclua listas ou campos.

Os arquivos `forum.js`, `recursos.js`, `videoteca.js`, `home.js` e seus loaders
são compatibilidade legada. Snippets antigos usam outra organização de assets;
não devem ser misturados ao [fluxo atual](INSTALACAO-MSE.md).
