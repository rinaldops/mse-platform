/**
 * View pura (sem rede) do módulo de posição `mod_random_image`: exibe 1
 * imagem (já escolhida por `random-data.js#pickRandomImage`), opcionalmente
 * envolta em um link (`link`, ver `random-settings-schema.js`).
 *
 * `FileRef` (campo nativo do SharePoint, já presente na biblioteca
 * `MSEMedia` — ver `kernel/schemas/mse-media.js`) é usado diretamente como
 * `src` da imagem, mesmo campo já usado como URL do arquivo por
 * `components/com_media/media-editor.js#renderTable` (`item.FileRef`).
 *
 * `maxWidth` (ver `random-settings-schema.js`) é aplicado via CSS inline
 * (`style.maxWidth`), não como atributo `width`/`height` do HTML: diferente
 * do Joomla! real (que calcula largura/altura reais do arquivo via
 * `getimagesize`), `MSEMedia` não declara dimensões de imagem — este MVP
 * só limita a largura de EXIBIÇÃO, sem preservar proporção calculada.
 */

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * @param {{
 *   root: Element,
 *   image: object | null,
 *   link?: string,
 *   maxWidth?: number,
 *   noImageText?: string
 * }} options `image` é o item de `MSEMedia` escolhido por `pickRandomImage`
 *   (ou `null` quando não há nenhuma imagem disponível).
 * @returns {() => void} função de limpeza.
 */
export function createRandomImageView({ root, image, link = "", maxWidth = 200, noImageText = "Nenhuma imagem disponível." } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");

  const document = root.ownerDocument;
  const wrapper = element(document, "div", "mse-module-random-image");

  if (!image) {
    wrapper.append(element(document, "p", "mse-module-random-image__empty", noImageText));
  } else {
    const img = element(document, "img", "mse-module-random-image__image");
    img.src = String(image.FileRef ?? "");
    img.alt = String(image.AltText ?? image.FileLeafRef ?? "");
    if (img.style?.setProperty) img.style.setProperty("max-width", `${maxWidth}px`);

    if (link) {
      const anchor = element(document, "a", "mse-module-random-image__link");
      anchor.href = link;
      anchor.append(img);
      wrapper.append(anchor);
    } else {
      wrapper.append(img);
    }
  }

  root.replaceChildren(wrapper);

  return () => {
    root.replaceChildren();
  };
}
