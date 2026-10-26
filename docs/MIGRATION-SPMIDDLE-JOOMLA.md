# Migração de persistência para SPMIDDLE

**Branch:** `feature/migrate-spmiddle-joomla`  
**Status:** preparação; nenhuma implementação ou publicação foi alterada.

## Limites

O `mse-platform` continuará concentrando a aplicação:

- componentes `com_*`;
- módulos `mod_*`;
- plugins `plg_*` e grupos de plugins;
- templates, layouts, views e UI;
- rotas, dispatcher, estado e regras de apresentação.

O acesso a listas e bibliotecas será delegado progressivamente ao SPMIDDLE por
adaptadores de domínio, sem mover regras visuais para o middleware.

## Convenção Joomla obrigatória

A persistência nova usará o prefixo `mse` e nomes canônicos derivados do Joomla,
sem espaços, acentos ou traduções portuguesas. Os nomes de listas, campos,
componentes, módulos e plugins devem permanecer alinhados ao vocabulário Joomla
original.

Não reutilizar, renomear ou adaptar as listas SharePoint atuais. A nova fonte de
dados ficará em um subsite operacional separado; o MSE continuará sendo
executado pela página `Preview.aspx` do host principal, apontando para essa fonte
por configuração.

## Estratégia incremental

1. congelar o comportamento atual do consumidor;
2. catalogar os schemas Joomla originais;
3. definir schemas SPMIDDLE com nomes `mse*`;
4. criar adapters de domínio no componente ou módulo correspondente;
5. manter o caminho legado selecionável durante o piloto;
6. comparar resultados com fake transport;
7. provisionar listas novas somente após aprovação operacional;
8. validar pela `Preview.aspx` sem reload desnecessário;
9. migrar um fluxo pequeno antes de expandir.

O `mse-platform` público deve permanecer livre de URLs corporativas, GUIDs,
cookies, tokens e dados de produção. Configurações de ambiente pertencem ao
host autorizado e não ao contrato público.

## Primeiro entregável desta branch

O primeiro entregável é o catálogo aprovado de nomes, campos, relações, índices,
permissões e rollback. Nenhum componente deve começar a usar uma lista nova
antes desse catálogo e do contrato SPMIDDLE correspondente estarem revisados.
