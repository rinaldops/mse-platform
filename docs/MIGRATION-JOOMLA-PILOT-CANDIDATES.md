# Candidatos de piloto Joomla-like

**Status:** triagem local; nenhum candidato está aprovado.  
**Limite:** somente aplicação e contratos locais; sem provisioning ou publicação.

## Candidatos permitidos

| Candidato | Tipo | Persistência provável | Escopo inicial | Risco |
|---|---|---|---|---|
| `mod_menu` | módulo | `mseMenu`, `mseMenuTypes` | leitura de itens publicados | baixo |
| `mod_breadcrumbs` | módulo | `mseMenu` | leitura da hierarquia ativa | baixo |
| `mod_articles_latest` | módulo | `mseContent`, `mseCategories` | leitura paginada de conteúdo | médio |
| `mod_articles_news` | módulo | `mseContent`, `mseCategories` | leitura de seleção de conteúdo | médio |
| `mod_articles_popular` | módulo | `mseContent`, `mseCategories` | leitura ordenada por acesso | médio |
| `mod_articles_category` | módulo | `mseContent`, `mseCategories` | leitura filtrada por categoria | médio |
| `mod_articles_categories` | módulo | `mseCategories` | leitura de árvore de categorias | baixo |
| `mod_articles_archive` | módulo | `mseContent` | leitura filtrada por data | médio |
| `mod_search` | módulo | `mseSearchFilters`, `mseContent` | consulta controlada | médio |
| `mod_tags_popular` | módulo | `mseTags`, `mseContentitemTagMap` | leitura agregada de tags | médio |
| `mod_tags_similar` | módulo | `mseTags`, `mseContentitemTagMap` | leitura de relações de tags | alto |
| `mod_footer` | módulo | configuração do módulo | leitura de configuração | baixo |
| `mod_home` | módulo | infraestrutura de menu e conteúdo | composição de página | médio |
| `mod_random_image` | módulo | `mseMedia` | leitura de mídia elegível | médio |
| `mod_related_items` | módulo | `mseContent`, `mseTags`, `mseContentitemTagMap` | leitura de itens relacionados | alto |
| `com_cpanel` | componente | múltiplas listas administrativas | administração Joomla-like | alto |

## Critérios de seleção

O piloto deverá ser escolhido pela seguinte ordem:

1. leitura somente, sem escrita administrativa;
2. uma ou duas listas novas no máximo;
3. contrato de campos já existente ou pequeno o suficiente para fechar;
4. paginação, ordenação e filtros testáveis com fake transport;
5. caminho legado preservável e comparável;
6. rollback limitado à troca do adapter;
7. ausência de dependência de biblioteca ou arquivo binário;
8. validação possível pela `Preview.aspx` sem alterar a página.

## Recomendação técnica preliminar

`mod_articles_categories` é o candidato de menor risco entre os fluxos de
conteúdo: é somente leitura, depende de uma lista, permite validar hierarquia e
não exige escrita, relação N:N ou parâmetros administrativos complexos.

Essa recomendação não constitui aprovação do piloto. Antes da implementação,
devem ser confirmados o schema de `mseCategories`, o contrato do adapter, a
fonte allowlisted no subsite `/db`, o fallback legado e os testes de paridade.

## Gate seguinte

Após a aprovação do candidato, criar uma worktree exclusiva do consumidor e
implementar somente o adapter local com fake transport. O inspect remoto
read-only e qualquer provisioning permanecem posteriores à aprovação do
catálogo e do plano operacional.
