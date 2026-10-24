/**
 * Tela do Administrator para `option=com_categories` — mesmo padrão de
 * `components/com_modules/modules-screen.js`: componente em sua própria
 * pasta física, fiel à convenção `components/com_xxx/` do Joomla!.
 *
 * Consome `route.task`/`route.id` (`categories.publish`/`categories.unpublish`
 * — ver `categories-editor.js` e `docs/AUDITORIA-JOOMLA-PENTE-FINO.md`
 * §2.7/§3), mesmo padrão `controller.task` já usado por `com_modules`.
 *
 * @param {{ root: Element, route?: object, services?: object }} options
 * @returns {{ dispose(): void }}
 */
import { renderCategoriesEditor } from "./categories-editor.js";

export function renderCategoriesScreen({ root, route, services = {} } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h1 = document.createElement("h1");
  h1.textContent = "Categorias";
  panel.append(h1);
  root.append(panel);
  renderCategoriesEditor({ root: panel, route, services });
  return {
    dispose() {
      panel.remove();
    }
  };
}
