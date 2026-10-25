/**
 * Esquema declarativo da lista MSESearchFilters (Site Kernel) — sustenta o
 * componente `components/com_finder` do Administrator.
 *
 * Segue o mesmo formato de `defineListSchema` em `core/list-provisioning.js`
 * já usado por `kernel/schemas/mse-categories.js`/`kernel/schemas/mse-tags.js`:
 * objeto normalizado/congelado com `key`, `internalName`, `displayName`,
 * `titleField` e `fields[]`.
 *
 * MSESearchFilters ≈ Joomla! #__finder_filters (campos reais lidos de
 * `web-devs/JOOMLA/administrator/components/com_finder/forms/filter.xml`).
 * O `com_finder` real do Joomla! é um motor de indexação full-text completo
 * (mapas de termos, tokens, `#__finder_tokens`/`#__finder_links`/etc.) — fora
 * de escopo aqui. Este schema cobre só a tabela de "filtros de busca
 * salvos" (`#__finder_filters`), reimplementada como CRUD-lite, mesmo
 * princípio de `MSECategories`/`MSETags` sobre `#__categories`/`#__tags`.
 *
 * `filter_id`/`title` do form real já são cobertos pelos campos nativos
 * `Id`/`Title` do SharePoint — não redeclarados aqui, mesmo princípio de
 * `kernel/schemas/mse-media.js` (campos nativos `FileLeafRef`/etc.).
 *
 * Decisão de escopo — `CheckedOut`/`CheckedOutTime`: nenhum schema do
 * kernel hoje tem precedente de campos de check-out (lock de edição
 * concorrente). Este schema os declara pela PRIMEIRA VEZ, fiéis ao form
 * real (`checked_out`/`checked_out_time`, ambos `hidden`/`filter="unset"`),
 * mas SEM implementar o comportamento de check-out em si nesta rodada — a
 * UI de `components/com_finder/finder-editor.js` não exibe nem gerencia
 * esses 2 campos, eles existem só por fidelidade de schema. Implementar o
 * lock de edição concorrente de verdade fica para uma rodada futura.
 *
 * `State`: diferente de `MSECategories.Published`/`MSETags.Published`
 * (3 estados, incluindo "Trashed"), o form real de `com_finder` só declara
 * 2 opções (`1`=`JPUBLISHED`, `0`=`JUNPUBLISHED`) — por isso este campo
 * tem apenas `["Published", "Unpublished"]`, sem "Trashed".
 *
 * Os campos `params` (`w1`/`d1`/`w2`/`d2`, janela de datas) do form real
 * não são representados aqui: pertencem ao MOTOR de indexação (filtram o
 * mapa de termos por intervalo de datas), sem sentido numa tela de
 * "filtros salvos" que não indexa nada de verdade — fora de escopo do MVP.
 *
 * Referências:
 * - mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4 e 6.
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_SEARCH_FILTERS_SCHEMA = defineListSchema({
  key: "mse-search-filters",
  internalName: "MSESearchFilters",
  displayName: "MSE Search Filters",
  titleField: { displayName: "Title", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Alias",
      displayName: "Alias",
      type: "Text",
      required: true,
      indexed: true,
      unique: true,
      maxLength: 128
      // ≈ Joomla! #__finder_filters.alias.
    },
    {
      internalName: "Created",
      displayName: "Created",
      type: "DateTime",
      required: false
      // ≈ Joomla! #__finder_filters.created.
    },
    {
      internalName: "Modified",
      displayName: "Modified",
      type: "DateTime",
      required: false
      // ≈ Joomla! #__finder_filters.modified. Readonly na UI de
      // components/com_finder/finder-editor.js (mesmo princípio do form
      // real: class="readonly" readonly="true").
    },
    {
      internalName: "CreatedBy",
      displayName: "Created by",
      type: "Text",
      required: false,
      maxLength: 255
      // ≈ Joomla! #__finder_filters.created_by. No Joomla! real é um
      // lookup de usuário (`type="user"`); aqui só o nome do usuário em
      // texto livre, mesma convenção simplificada já usada em outros
      // campos "texto-id" deste kernel — não é um lookup de pessoa real.
    },
    {
      internalName: "CreatedByAlias",
      displayName: "Created by alias",
      type: "Text",
      required: false,
      maxLength: 255
      // ≈ Joomla! #__finder_filters.created_by_alias.
    },
    {
      internalName: "ModifiedBy",
      displayName: "Modified by",
      type: "Text",
      required: false,
      maxLength: 255
      // ≈ Joomla! #__finder_filters.modified_by. Readonly na UI, mesmo
      // princípio de CreatedBy acima (texto livre, não lookup real).
    },
    {
      internalName: "CheckedOut",
      displayName: "Checked out",
      type: "Text",
      required: false,
      maxLength: 255
      // ≈ Joomla! #__finder_filters.checked_out. Vazio/"" = não travado —
      // ver decisão de escopo no cabeçalho do arquivo (nenhum
      // comportamento de check-out é implementado nesta rodada; a UI não
      // exibe/gerencia este campo).
    },
    {
      internalName: "CheckedOutTime",
      displayName: "Checked out time",
      type: "DateTime",
      required: false
      // ≈ Joomla! #__finder_filters.checked_out_time. Mesma decisão de
      // escopo de CheckedOut acima.
    },
    {
      internalName: "State",
      displayName: "State",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Published", "Unpublished"],
      defaultValue: "Published"
      // ≈ Joomla! #__finder_filters.state. Só 2 estados (sem "Trashed")
      // — ver decisão de escopo no cabeçalho do arquivo.
    },
    {
      internalName: "MapCount",
      displayName: "Map count",
      type: "Number",
      required: false,
      min: 0,
      defaultValue: 0
      // ≈ Joomla! #__finder_filters.map_count. Readonly na UI — neste
      // MVP sem motor de indexação real, nunca é incrementado de fato,
      // sempre fica 0.
    }
  ]
});
