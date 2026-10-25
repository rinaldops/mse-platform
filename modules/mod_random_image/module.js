import { settingsDefaults } from "../../core/module-contract.js";
import { readMediaService, filterImagesByExtension, pickRandomImage } from "./random-data.js";
import { createRandomImageView } from "./random-view.js";
import { RANDOM_IMAGE_SETTINGS_SCHEMA } from "./random-settings-schema.js";

const DEFAULTS = settingsDefaults(RANDOM_IMAGE_SETTINGS_SCHEMA);

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-random-image__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readMediaService(services);

  let disposed = false;
  let disposeView = null;

  try {
    const itens = await service.listMedia();
    if (disposed) return Object.freeze({ dispose() {} });

    const extensoes = config.extensions ?? DEFAULTS.extensions;
    const imagens = filterImagesByExtension(itens, extensoes);
    const imagem = pickRandomImage(imagens);

    disposeView = createRandomImageView({
      root,
      image: imagem,
      link: config.link ?? DEFAULTS.link,
      maxWidth: config.maxWidth ?? DEFAULTS.maxWidth,
      noImageText: config.noImageText ?? DEFAULTS.noImageText
    });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar a imagem aleatória."));
  }

  return Object.freeze({
    dispose() {
      disposed = true;
      disposeView?.();
      root.replaceChildren();
    }
  });
}

export function dispose() {}
