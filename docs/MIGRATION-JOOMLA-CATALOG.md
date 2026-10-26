# Catálogo inicial Joomla-like para a migração SPMIDDLE

**Branch:** `feature/joomla-catalog`  
**Status:** inventário local inicial; não é catálogo aprovado e não executa
provisionamento.

## Escopo inventariado

Foram encontrados no `mse-platform`:

### Componentes

```text
components/com_cpanel
```

O Administrator ainda possui rotas planejadas para outros componentes Joomla-like,
mas a existência de uma rota não constitui implementação completa. Cada novo
componente precisa ser confirmado antes de entrar no catálogo de persistência.

### Módulos

```text
modules/mod_articles_archive
modules/mod_articles_categories
modules/mod_articles_category
modules/mod_articles_latest
modules/mod_articles_news
modules/mod_articles_popular
modules/mod_breadcrumbs
modules/mod_footer
modules/mod_forum
modules/mod_home
modules/mod_menu
modules/mod_random_image
modules/mod_related_items
modules/mod_recursos
modules/mod_search
modules/mod_tags_popular
modules/mod_tags_similar
modules/mod_videoteca
```

### Schemas de infraestrutura existentes

```text
kernel/schemas/mse-categories.js
kernel/schemas/mse-extensions.js
kernel/schemas/mse-menu.js
kernel/schemas/mse-menu-types.js
kernel/schemas/mse-media.js
kernel/schemas/mse-modules.js
kernel/schemas/mse-modules-menu.js
kernel/schemas/mse-search-filters.js
kernel/schemas/mse-tags.js
kernel/schemas/mse-template-styles.js
```

Esses arquivos são referência de contrato local. Seus nomes atuais não autorizam
reutilizar listas SharePoint existentes.

## Candidatos de listas novas

Os nomes abaixo são candidatos derivados do vocabulário Joomla e precisam ser
confirmados contra o schema original antes do provisioning:

| Conceito Joomla | Lista candidata nova | Situação |
|---|---|---|
| `#__content` | `mseContent` | candidato |
| `#__categories` | `mseCategories` | candidato |
| `#__tags` | `mseTags` | candidato |
| `#__contentitem_tag_map` | `mseContentitemTagMap` | candidato |
| `#__extensions` | `mseExtensions` | candidato |
| `#__modules` | `mseModules` | candidato |
| `#__modules_menu` | `mseModulesMenu` | candidato |
| `#__menu` | `mseMenu` | candidato |
| `#__menu_types` | `mseMenuTypes` | candidato |
| `#__template_styles` | `mseTemplateStyles` | candidato |
| `#__media` | `mseMedia` | candidato |

Não usar nomes legados como `MSE Publicacoes`, `MSEModulos`, `MSEMenu` ou
`RecursosLinks` para esta migração. Mesmo quando um nome coincidir parcialmente,
a lista nova deve ser criada no subsite `/db` com o contrato novo e não deve ser
tratada como continuidade física da lista anterior.

## Regras para aprovação do catálogo

Antes de mudar qualquer schema de consumidor:

1. confirmar a tabela Joomla de origem;
2. confirmar o nome físico canônico após o prefixo `mse`;
3. listar todos os campos e tipos;
4. registrar campos obrigatórios e defaults;
5. registrar índices e relações;
6. identificar operações de leitura e escrita;
7. separar campos crus SharePoint de entidades de domínio;
8. definir permissões mínimas e rollback;
9. criar teste fake no SPMIDDLE;
10. obter revisão do contrato nos dois repositórios.

## Próximo item de análise

O primeiro fluxo deve ser escolhido entre os componentes/módulos válidos para o
site CAMAP. `mod_recursos`/Explore Mais está explicitamente fora do escopo desse
site e não pode ser selecionado como piloto.
