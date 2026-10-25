/**
 * Serviço de leitura + seleção aleatória de imagem para o módulo de posição
 * `mod_random_image`, sobre a biblioteca `MSEMedia` já usada pelo
 * Administrator (`components/com_media/`, ver `kernel/schemas/mse-media.js`).
 *
 * Reaproveita `kernel/admin-data.js#listAdminItems` (mesmo wrapper fino
 * usado por `components/com_media/media-editor.js#reload`) — nenhuma
 * lógica de REST é duplicada aqui. Diferente de `mod_related_items`/
 * `mod_tags_similar` (que leem `MSEPublicacoes`, lista cujo nome interno
 * varia por fallback), `MSEMedia` é um nome FIXO (ver
 * `components/com_media/media-editor.js#renderMediaEditor`,
 * `services.listIds?.MSEMedia`, sem lista de fallback) — por isso
 * `readMediaService` não precisa de uma função `resolveXList` equivalente
 * a `kernel/articles-data.js#resolveArticlesList`.
 *
 * Correspondência com os parâmetros reais de `mod_random_image.xml`
 * (Joomla!, ver `web-devs/JOOMLA/modules/mod_random_image/mod_random_image.xml`
 * e `RandomImageHelper`):
 * - `type` → `extensions` (lista de extensões aceitas, separadas por
 *   vírgula, comparação case-insensitive contra o sufixo de `FileLeafRef`).
 * - `folder` fica fora do MVP: `MSEMedia` é uma biblioteca única e plana,
 *   sem subpastas (ver `random-settings-schema.js`).
 * - `link` → `link` (URL de destino ao clicar; ver `random-view.js`).
 * - `width`/`height` ficam fora do MVP (ver `random-settings-schema.js`);
 *   este módulo usa só `maxWidth` (limite de exibição via CSS).
 *
 * Seleção aleatória: `pickRandomImage` aceita `random` injetável (função
 * `() => number` em `[0, 1)`, mesmo contrato de `Math.random`) para
 * permitir teste determinístico — mesmo princípio de dependência
 * injetável já usado em todo o Site Kernel para `client`/`services`
 * (nunca acessa `Math.random` globalmente "escondido" dentro da função).
 */

import { listAdminItems } from "../../kernel/admin-data.js";

const SELECT_FIELDS = ["Id", "FileLeafRef", "FileRef", "AltText", "Description"];

/**
 * Resolve `services.adminClient` + `services.listIds.MSEMedia` e devolve o
 * serviço de leitura pronto.
 *
 * @param {object} services
 * @returns {{ listMedia: () => Promise<object[]> }}
 */
export function readMediaService(services) {
  const client = services?.adminClient;
  const list = services?.listIds?.MSEMedia;
  if (!client || !list) {
    throw new TypeError(
      "services.adminClient e services.listIds.MSEMedia são obrigatórios para o módulo de Imagem aleatória."
    );
  }
  return Object.freeze({
    async listMedia() {
      return listAdminItems({ client, list, select: SELECT_FIELDS, orderby: "FileLeafRef" });
    }
  });
}

/**
 * Normaliza a string de extensões aceitas (`"jpg, PNG ,.gif"` →
 * `["jpg", "png", "gif"]`) — tolera espaços, maiúsculas e pontos à
 * esquerda, mesmo tratamento de `RandomImageHelper::getImagesFromFolder`.
 *
 * @param {string} extensions
 * @returns {string[]}
 */
export function parseExtensions(extensions) {
  return String(extensions ?? "")
    .split(",")
    .map((ext) => ext.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
}

/**
 * Filtra `items` (array já lido de `MSEMedia`) para os que têm extensão de
 * arquivo (`FileLeafRef`) presente em `extensions` — função pura, sem rede.
 *
 * @param {Array<object>} items
 * @param {string} extensions string separada por vírgula (ver `parseExtensions`).
 * @returns {Array<object>}
 */
export function filterImagesByExtension(items, extensions) {
  if (!Array.isArray(items)) return [];
  const accepted = new Set(parseExtensions(extensions));
  if (!accepted.size) return [];
  return items.filter((item) => {
    const name = String(item?.FileLeafRef ?? "");
    const dot = name.lastIndexOf(".");
    if (dot < 0) return false;
    return accepted.has(name.slice(dot + 1).toLowerCase());
  });
}

/**
 * Escolhe 1 imagem aleatoriamente dentro de `images` — função pura. Devolve
 * `null` quando `images` está vazio. `random` é injetável (ver cabeçalho do
 * arquivo); por padrão usa `Math.random`.
 *
 * @param {Array<object>} images
 * @param {{ random?: () => number }} [options]
 * @returns {object | null}
 */
export function pickRandomImage(images, { random = Math.random } = {}) {
  if (!Array.isArray(images) || !images.length) return null;
  const index = Math.floor(random() * images.length);
  return images[Math.min(index, images.length - 1)];
}
