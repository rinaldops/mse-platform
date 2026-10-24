/**
 * View pura (sem rede) do módulo de posição `mod_tags_popular`: lista/nuvem
 * de tags mais usadas, a partir do resultado já agregado de
 * `popular-data.js#buildPopularTags`.
 *
 * Links: `kernel/router.js#serializeRoute` suporta `query` (ver assinatura
 * daquele módulo) — não existe uma rota dedicada por tag no kernel hoje, então
 * o link "ver artigos desta tag" usa `serializeRoute({ alias: "", query: { tag } })`
 * (mesma rota raiz, com a tag na query string), em vez de inventar uma rota
 * nova.
 *
 * Nuvem (`cloud: true`): tamanho de fonte aproximado por 5 níveis de classe
 * CSS (`mse-module-tags-popular__tag--size-1` a `--size-5`), proporcional à
 * contagem de cada tag dentro do conjunto exibido — não é pixel-perfect
 * (`minSize`/`maxSize` do Joomla! real mapeiam para o nível 1/5 desta escala).
 */

import { serializeRoute } from "../../kernel/router.js";

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function tagHref(tag) {
  return serializeRoute({ alias: "", query: { tag } });
}

/**
 * Calcula o nível de tamanho (1 a 5) de uma tag dentro do conjunto exibido,
 * proporcional à sua contagem entre a menor e a maior contagem do conjunto.
 * Conjunto com contagens todas iguais (ou com 1 item) cai no nível médio (3).
 *
 * @param {number} count
 * @param {number} min
 * @param {number} max
 * @returns {number} inteiro entre 1 e 5.
 */
function sizeLevel(count, min, max) {
  if (max === min) return 3;
  const ratio = (count - min) / (max - min);
  return Math.min(5, Math.max(1, Math.round(1 + ratio * 4)));
}

/**
 * @param {{
 *   root: Element,
 *   tags: Array<{ tag: string, count: number }>,
 *   cloud?: boolean,
 *   displayCount?: boolean,
 *   noResultsText?: string
 * }} options `tags` é o resultado de `buildPopularTags`.
 * @returns {() => void} função de limpeza.
 */
export function createPopularTagsView({
  root,
  tags,
  cloud = true,
  displayCount = false,
  noResultsText = "Nenhuma tag encontrada."
} = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!Array.isArray(tags)) throw new TypeError("tags deve ser um array.");

  const document = root.ownerDocument;
  const wrapper = element(document, "div", "mse-module-tags-popular");

  if (!tags.length) {
    wrapper.append(element(document, "p", "mse-module-tags-popular__empty", noResultsText));
  } else {
    const counts = tags.map((entry) => entry.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);

    const list = element(document, "ul", "mse-module-tags-popular__list");
    if (cloud) list.classList.add("mse-module-tags-popular__list--cloud");

    for (const entry of tags) {
      const item = element(document, "li", "mse-module-tags-popular__item");
      const level = sizeLevel(entry.count, min, max);
      const link = element(document, "a", `mse-module-tags-popular__tag mse-module-tags-popular__tag--size-${level}`, entry.tag);
      link.href = tagHref(entry.tag);
      item.append(link);

      if (displayCount) {
        item.append(element(document, "span", "mse-module-tags-popular__count", String(entry.count)));
      }

      list.append(item);
    }

    wrapper.append(list);
  }

  root.replaceChildren(wrapper);

  return () => {
    root.replaceChildren();
  };
}
