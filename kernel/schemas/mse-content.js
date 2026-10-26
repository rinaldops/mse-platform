/**
 * Esquema declarativo da lista MSEContent (Site Kernel).
 *
 * Segue o mesmo formato de `defineListSchema` em `core/list-provisioning.js`
 * já usado por `kernel/schemas/mse-categories.js`/`mse-tags.js`: objeto
 * normalizado/congelado com `key`, `internalName`, `displayName`,
 * `titleField` e `fields[]`.
 *
 * MSEContent ≈ Joomla! #__content — fecha a lacuna apontada em
 * `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md` §4.2 (`CAMAPPublicacoes`/
 * `MSEPublicacoes` → `#__content`, pendente até aqui): ao contrário das
 * outras 9 listas do kernel (já migradas, ver `mse-categories.js`,
 * `mse-tags.js`, `mse-menu.js` etc.), esta é a PRIMEIRA versão em inglês
 * desta lista — não substitui nenhum esquema PT existente (não há
 * `kernel/schemas/mse-publicacoes.js`; `CAMAPPublicacoes`/`MSEPublicacoes`
 * nunca tiveram um `defineListSchema` formal, só a leitura ad-hoc de
 * `kernel/publisher-data.js#DEFAULT_FIELD_MAP`). Essa lista legada
 * continua intacta (ver `kernel/articles-data.js#resolveArticlesList`,
 * que aceita `MSEContent` OU os nomes antigos) — nenhum site existente
 * precisa migrar para usar o Site Kernel.
 *
 * MVP magro, mesmo princípio das outras listas (campos reais mínimos, sem
 * `Language`/multi-idioma — nenhuma outra lista do kernel tem esse campo
 * hoje — e sem uma janela de destaque separada — o Joomla! real não tem
 * campo dedicado para isso; `Featured`+`Ordering` já cobre "destaque com
 * ordem", ver `docs/PLANO-SITE-KERNEL-MSE.md` §7).
 *
 * Referências:
 * - mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seções 4 e 7.
 * - docs/JOOMLA-CONVENCOES-E-MIGRACAO.md, seção 4.2.
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_CONTENT_SCHEMA = defineListSchema({
  key: "mse-content",
  internalName: "MSEContent",
  displayName: "MSE Content",
  titleField: { displayName: "Title", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Alias",
      displayName: "Alias",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 128
      // ≈ Joomla! #__content.alias.
    },
    {
      internalName: "Introtext",
      displayName: "Intro text",
      type: "Note",
      required: false,
      lines: 8
      // ≈ Joomla! #__content.introtext.
    },
    {
      internalName: "Fulltext",
      displayName: "Full text",
      type: "Note",
      required: false,
      lines: 20
      // ≈ Joomla! #__content.fulltext (continuação opcional do "leia mais").
    },
    {
      internalName: "CatId",
      displayName: "Category",
      type: "Number",
      required: false,
      min: 1
      // ≈ Joomla! #__content.catid, referenciando MSECategories.Id. Não é
      // um lookup nativo do SharePoint — mesmo motivo de MenuType/
      // TemplateStyleId não serem lookups: evita dependência de ordem de
      // criação entre listas. kernel/categories.js#resolveArticleCategory
      // já resolve este valor contra MSECategories.
    },
    {
      internalName: "State",
      displayName: "State",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Published", "Unpublished", "Archived", "Trashed"],
      defaultValue: "Published"
      // ≈ Joomla! #__content.state (4 estados reais do Joomla!, incluindo
      // Archived — diferente do Published/Unpublished/Trashed de 3 estados
      // usado por MSECategories/MSETags/MSEModules).
    },
    {
      internalName: "Featured",
      displayName: "Featured",
      type: "Boolean",
      required: false,
      indexed: true,
      defaultValue: false
      // ≈ Joomla! #__content.featured.
    },
    {
      internalName: "Ordering",
      displayName: "Ordering",
      type: "Number",
      required: false,
      min: 0,
      defaultValue: 0
      // ≈ Joomla! #__content.ordering (também usado para ordenar
      // destacados, mesmo princípio do Joomla! real).
    },
    {
      internalName: "PublishUp",
      displayName: "Publish up",
      type: "DateTime",
      required: false
      // ≈ Joomla! #__content.publish_up.
    },
    {
      internalName: "PublishDown",
      displayName: "Publish down",
      type: "DateTime",
      required: false
      // ≈ Joomla! #__content.publish_down.
    },
    {
      internalName: "ParamsJson",
      displayName: "Parameters (JSON)",
      type: "Note",
      required: false,
      lines: 8
      // ≈ Joomla! #__content.attribs. Reserva, mesmo padrão das outras
      // listas do kernel.
    }
  ]
});
