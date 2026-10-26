/**
 * Adapter que expõe o SPMIDDLE (`web-devs/SPMIDDLE/packages/sharepoint-rest-browser`)
 * com o MESMO contrato de client que `core/rest.js#createSharePointRestClient`
 * já fornece a `site-boot.js`/`kernel/*` (`webUrl`, `request`, `getDigest`,
 * `getListItems`, `getListItem`, `createListItem`, `updateListItem`,
 * `deleteListItem`) — shim de transporte, sem lógica de domínio própria.
 *
 * Por que existe: o SPMIDDLE documenta explicitamente que deve "permanecer
 * independente de MSE, Site Kernel, Joomla!, DOM"
 * (`SPMIDDLE/docs/INTEGRATION-MSE-PLATFORM.md`) — ou seja, nenhuma ligação
 * com o Site Kernel pode viver dentro do pacote do SPMIDDLE, nem o
 * `kernel/`/`site-boot.js` deve importar o SPMIDDLE diretamente ponto a
 * ponto. Este arquivo é essa camada de adaptação externa: só ele conhece os
 * dois lados.
 *
 * `webUrl`/`request`/`getDigest`: `SPMIDDLE.createSharePointRestClient({webUrl})`
 * já devolve exatamente esse shape (`{webUrl, request, getDigest}`,
 * `request(path, {method, headers, body, etag, allowWildcardEtag})` →
 * `{data, etag, status}`) — reaproveitados tal como estão, sem wrapper.
 *
 * `getListItems`/`getListItem`/`createListItem`/`updateListItem`/
 * `deleteListItem`: o SPMIDDLE modela isso como um client POR LISTA
 * (`createSharePointListClient({transport, listId})`), diferente de
 * `core/rest.js` (um client único, `list` como primeiro parâmetro de cada
 * chamada) — por isso cada chamada aqui monta um list-client efêmero para o
 * `list` recebido (sem cache: chamadas de boot/Administrator são
 * esporádicas, não um hot path; cachear por `listId` é uma otimização
 * adiável se isso um dia se mostrar um problema real).
 *
 * `list` suportado apenas como `{ listId }` (GUID) — o único shape que
 * `kernel/articles-data.js#resolveArticlesList`/`resolveKernelListIds`
 * produzem hoje; `core/rest.js` também aceita um título cru, mas nenhum
 * consumidor real do Site Kernel passa isso, então esse caso não é
 * suportado aqui (ponytail: não generalizar sem um chamador real).
 */

import { createSharePointRestClient, createSharePointListClient } from "../../../SPMIDDLE/packages/sharepoint-rest-browser/src/index.js";

function listClientFor(transport, list) {
  if (!list || typeof list.listId !== "string" || !list.listId.trim()) {
    throw new TypeError("list deve ser { listId } (GUID) — spmiddle-rest-adapter.js não suporta título cru.");
  }
  return createSharePointListClient({ transport, listId: list.listId });
}

export function createSpmiddleRestClient({ webUrl, fetchImpl, sleepImpl, nowImpl, maxRetries } = {}) {
  const transport = createSharePointRestClient({ webUrl, fetchImpl, sleepImpl, nowImpl, maxRetries });

  async function getListItems(list, { select, filter, orderBy, top } = {}) {
    const response = await listClientFor(transport, list).getAllPages({ select, filter, orderBy, top });
    return response?.data?.value ?? [];
  }

  async function getListItem(list, id, { select, expand } = {}) {
    const result = await listClientFor(transport, list).getListItem(id, { select, expand });
    return Object.freeze({ item: result.data, etag: result.etag, status: result.status });
  }

  async function createListItem(list, values) {
    const result = await listClientFor(transport, list).createListItem(values);
    return Object.freeze({ item: result.data, etag: result.etag, status: result.status });
  }

  async function updateListItem(list, id, values, { etag, allowWildcardEtag } = {}) {
    const result = await listClientFor(transport, list).updateListItem(id, values, { etag, allowWildcardEtag });
    return Object.freeze({ item: result.data, etag: result.etag, status: result.status });
  }

  async function deleteListItem(list, id, { etag, allowWildcardEtag } = {}) {
    const result = await listClientFor(transport, list).deleteListItem(id, { etag, allowWildcardEtag });
    return Object.freeze({ etag: result.etag, status: result.status });
  }

  return Object.freeze({
    webUrl: transport.webUrl,
    request: transport.request,
    getDigest: transport.getDigest,
    getListItems,
    getListItem,
    createListItem,
    updateListItem,
    deleteListItem
  });
}
