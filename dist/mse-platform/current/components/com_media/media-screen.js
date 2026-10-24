/**
 * Tela do Administrator para `option=com_media` — mesmo wrapper de
 * `components/com_modules/modules-screen.js`: `section.mse-administrator__panel`
 * + h1 "Mídia" + o editor CRUD `media-editor.js` montado dentro.
 *
 * @param {{ root: Element, route?: object, services?: object }} options
 * @returns {{ dispose(): void }}
 */
import { renderMediaEditor } from "./media-editor.js";

export function renderMediaScreen({ root, route, services = {} } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h1 = document.createElement("h1");
  h1.textContent = "Mídia";
  panel.append(h1);
  root.append(panel);
  renderMediaEditor({ root: panel, route, services });
  return {
    dispose() {
      panel.remove();
    }
  };
}
