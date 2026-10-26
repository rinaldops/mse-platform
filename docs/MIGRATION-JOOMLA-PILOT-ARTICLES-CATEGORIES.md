# Piloto `mod_articles_categories`

**Branch:** `feature/joomla-pilot-articles-categories`  
**Status:** implementação local com fake; não aprovado para publicação.

## Contrato do piloto

- consumidor: `mod_articles_categories`;
- operação: somente leitura;
- fonte nova: `mseCategories`;
- campos consultados: `Id`, `Title`, `Alias`, `Extension`, `Description`,
  `ParentId`, `Level`, `Ordering`, `Published`;
- ordenação: `Ordering asc`;
- transformação: filtro de publicados e árvore hierárquica;
- bridge explícito entre entidades de domínio SPMIDDLE e o shape Joomla-like
  consumido pela árvore;
- contagem de conteúdo: fora do primeiro gate para manter uma única lista;
- provisioning remoto: não executado.

## Critérios locais

1. manifest declara somente `MSECategories`;
2. adapter não contém acesso REST direto;
3. serviço recebe repository SPMIDDLE ou cliente legado explicitamente;
4. bridge converte entidades sem expor campos SharePoint ao restante do módulo;
5. testes cobrem validação, consulta, ordenação e árvore;
6. nenhum nome físico legado é necessário para executar o piloto fake.

## Próximo gate

Integrar o adapter ao contrato SPMIDDLE, validar o schema de `mseCategories` e
somente depois preparar `inspect` read-only no subsite `/db`.
