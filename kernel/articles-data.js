/**
 * Serviço de leitura de artigos (com_content) para os módulos de posição da
 * Wave 2 (`mod_articles_*`, `mod_tags_popular`/`mod_tags_similar`,
 * `com_finder`/`mod_search`) — mesmo papel de `modules/mod_menu/menu-data.js`
 * (`createMenuReadService`) e `modules/mod_breadcrumbs/breadcrumbs-data.js`
 * (`createBreadcrumbsReadService`), mas para a lista de ARTIGOS, e
 * centralizado aqui (em vez de duplicado módulo a módulo) porque todo
 * módulo da família `mod_articles_*`/`mod_tags_*`/`com_finder` precisa do
 * MESMO par "resolver a lista certa" + "ler e mapear os itens crus para o
 * shape de domínio" — só a filtragem/ordenação final (via
 * `kernel/content-services.js`) varia de módulo para módulo.
 *
 * `resolveArticlesList`: o nome interno da lista de artigos NÃO é fixo no
 * kernel (ao contrário de MSEMenu/MSECategories/MSETags/MSEMedia) — replica
 * deliberadamente a mesma lista de fallback já usada por
 * `components/com_content/publisher.js#resolvePublisherList`
 * (`CAMAPPublicacoes`/`MSEPublicacoes`/`Publicacoes`/`publicacoes`/
 * `publisher`), com `MSEContent` (ver `kernel/schemas/mse-content.js` ≈
 * Joomla! `#__content`) acrescentado como PRIMEIRA opção — sites novos
 * (ex. MINIJOOMLA) usam só o nome oficial em inglês; os 4 nomes legados
 * continuam intactos para não quebrar nenhum site existente. É uma CÓPIA,
 * não um import daquele módulo: `publisher.js` é
 * uma tela do Administrator (import pesado, não pensado para ser dependência
 * de um módulo de posição do site) — duplicar esta função pura de poucas
 * linhas evita acoplar módulos de posição a um Componente do Administrator.
 * Limite conhecido: se a lista de nomes de fallback mudar em um lugar,
 * precisa mudar no outro também; nenhum teste automatizado garante essa
 * sincronia hoje.
 *
 * `createArticlesReadService`: lê os campos crus mínimos para o shape de
 * domínio inteiro de `kernel/article-mapper.js#mapArticleItem` (todos os
 * nomes reais resolvidos a partir de `DEFAULT_FIELD_MAP`/`fieldMap`, mais
 * `Id`/`Created` nativos) e devolve os itens já mapeados — nenhum módulo de
 * posição desta Wave precisa conhecer nomes reais de campo nem
 * `DEFAULT_FIELD_MAP` diretamente. Não aplica nenhum filtro/ordenação (isso
 * é papel de `kernel/content-services.js`, chamado por quem consome este
 * serviço) e não pagina (lê a lista inteira, mesmo comportamento hoje
 * assumido por `components/com_content/publisher.js`).
 */

import { listAdminItems } from "./admin-data.js";
import { mapArticleItems } from "./article-mapper.js";
import { DEFAULT_FIELD_MAP } from "./publisher-data.js";

function resolveArticleFields(fieldMap) {
  const resolved = { ...DEFAULT_FIELD_MAP, ...(fieldMap || {}) };
  return ["Id", "Created", ...new Set(Object.values(resolved))];
}

/**
 * Resolve o `{ listId }` de artigos a partir de `services.listIds`, com a
 * mesma lista de fallback de
 * `components/com_content/publisher.js#resolvePublisherList` (ver cabeçalho
 * do arquivo). Devolve `null` quando nenhuma entrada conhecida está
 * presente (quem chama decide como degradar — nunca lança).
 *
 * @param {Record<string, {listId: string}> | undefined} listIds
 * @returns {{listId: string} | null}
 */
export function resolveArticlesList(listIds) {
  return (
    listIds?.MSEContent
    || listIds?.CAMAPPublicacoes
    || listIds?.MSEPublicacoes
    || listIds?.Publicacoes
    || listIds?.publicacoes
    || listIds?.publisher
    || null
  );
}

/**
 * @param {{
 *   client: { getListItems: Function },
 *   list: {listId: string},
 *   fieldMap?: Record<string, string>
 * }} options
 * @returns {{ listArticles: () => Promise<object[]> }} `listArticles()`
 *   devolve os artigos já no shape de domínio de `kernel/article-mapper.js`
 *   (sem filtro/ordenação/paginação — ver cabeçalho do arquivo).
 */
export function createArticlesReadService({ client, list, fieldMap } = {}) {
  if (!client || typeof client.getListItems !== "function") {
    throw new TypeError("client deve expor getListItems().");
  }
  if (!list || typeof list !== "object") {
    throw new TypeError("list deve ser o identificador resolvido da lista de artigos ({ listId }).");
  }
  const select = resolveArticleFields(fieldMap);

  async function listArticles() {
    const raw = await listAdminItems({ client, list, select });
    return mapArticleItems(raw, { fieldMap });
  }

  return Object.freeze({ listArticles });
}
