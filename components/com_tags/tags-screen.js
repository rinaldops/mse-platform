/**
 * Tela do Administrator para `option=com_tags` — mesmo padrão exato de
 * `components/com_modules/modules-screen.js`: wrapper fino que desenha
 * `<section class="mse-administrator__panel">` + h1 "Tags" + o editor CRUD
 * `tags-editor.js` montado dentro, sem nenhuma lógica própria.
 *
 * Consome `route.task`/`route.id` (`tags.publish`/`tags.unpublish` — ver
 * `tags-editor.js`), mesmo padrão `controller.task` já usado por
 * `com_modules`/`com_templates`.
 *
 * @param {{ root: Element, route?: object, services?: object }} options
 * @returns {{ dispose(): void }}
 */
import { renderTagsEditor } from "./tags-editor.js";

export function renderTagsScreen({ root, route, services = {} } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h1 = document.createElement("h1");
  h1.textContent = "Tags";
  panel.append(h1);
  root.append(panel);
  renderTagsEditor({ root: panel, route, services });
  return {
    dispose() {
      panel.remove();
    }
  };
}
