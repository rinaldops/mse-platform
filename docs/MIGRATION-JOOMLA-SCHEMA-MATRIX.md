# Matriz de schemas Joomla → listas novas SPMIDDLE

**Status:** matriz preliminar para revisão; não autoriza provisioning.  
**Regra:** os schemas atuais são referências de contrato, não listas destino.

## Convenção de destino

Cada linha abaixo representa uma lista nova no subsite `/db`, com nome físico
derivado da tabela Joomla e prefixo `mse`. Nenhum `internalName` existente em
produção deve ser reutilizado como identidade física da nova lista.

## Infraestrutura Joomla-like

| Tabela Joomla | Lista nova | Schema de referência | Situação |
|---|---|---|---|
| `#__extensions` | `mseExtensions` | `kernel/schemas/mse-extensions.js` | mapear campos e revisar `ClientId` |
| `#__menu` | `mseMenu` | `kernel/schemas/mse-menu.js` | mapear campos e hierarquia |
| `#__menu_types` | `mseMenuTypes` | `kernel/schemas/mse-menu-types.js` | confirmar relação `MenuType` |
| `#__modules` | `mseModules` | `kernel/schemas/mse-modules.js` | mapear publicação e parâmetros |
| `#__modules_menu` | `mseModulesMenu` | `kernel/schemas/mse-modules-menu.js` | confirmar cardinalidade |
| `#__template_styles` | `mseTemplateStyles` | `kernel/schemas/mse-template-styles.js` | mapear template e cliente |
| `#__categories` | `mseCategories` | `kernel/schemas/mse-categories.js` | confirmar escopo de extensão |
| `#__tags` | `mseTags` | `kernel/schemas/mse-tags.js` | confirmar publicação e ordenação |
| `#__media` | `mseMedia` | `kernel/schemas/mse-media.js` | depende do contrato de biblioteca |

## Conteúdo

| Tabela Joomla | Lista nova | Schema de referência | Situação |
|---|---|---|---|
| `#__content` | `mseContent` | Publicador/kernel, a consolidar | não iniciar sem schema fechado |
| `#__contentitem_tag_map` | `mseContentitemTagMap` | a definir | relação N:N, não é lookup simples |
| `#__search_filters` | `mseSearchFilters` | `kernel/schemas/mse-search-filters.js` | confirmar se pertence ao primeiro piloto |

## Convenções de campos

- campos SharePoint novos devem usar nomes internos Joomla-like em inglês;
- labels visíveis podem ser definidos pelo componente, mas não alteram o nome
  interno;
- `Title` só será usado quando representar o campo Joomla correspondente;
- relações devem registrar origem, destino e cardinalidade;
- índices devem ser derivados das consultas efetivas, não copiados sem análise;
- JSON em `ParamsJson` deve permanecer dado de configuração, não markup de UI;
- tipos SharePoint devem ser justificados quando divergirem do tipo Joomla.

## Divergências a resolver antes do provisioning

1. `#__content` ainda não possui schema SPMIDDLE final neste catálogo.
2. `#__contentitem_tag_map` precisa de contrato relacional e estratégia de IDs.
3. `#__media` pode exigir biblioteca SharePoint em vez de lista.
4. `ClientId`, `Published` e `Type` precisam de convenção única de tipos e
   valores para todos os adapters.
5. O primeiro consumidor ainda não foi escolhido; portanto, esta matriz não
   deve provisionar todas as listas.

## Critério de aprovação

Uma linha só pode passar a `approved` quando possuir:

- schema SPMIDDLE versionado;
- campos, defaults, índices e relações definidos;
- adapter de domínio e operações permitidas;
- teste fake verde;
- permissões e rollback documentados;
- consumidor piloto identificado.
