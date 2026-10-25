/**
 * Tela do Administrator para `option=com_finder` — mesmo padrão de
 * `components/com_categories/categories-screen.js`: componente em sua
 * própria pasta física, fiel à convenção `components/com_xxx/` do Joomla!.
 *
 * Consome `route.task`/`route.id` (`finder.publish`/`finder.unpublish` —
 * ver `finder-editor.js` e `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.7/§3),
 * mesmo padrão `controller.task` já usado por `com_categories`/`com_tags`.
 *
 * @param {{ root: Element, route?: object, services?: object }} options
 * @returns {{ dispose(): void }}
 */
import { renderFinderEditor } from "./finder-editor.js";

export function renderFinderScreen({ root, route, services = {} } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h1 = document.createElement("h1");
  h1.textContent = "Buscas Salvas";
  panel.append(h1);
  root.append(panel);
  renderFinderEditor({ root: panel, route, services });
  return {
    dispose() {
      panel.remove();
    }
  };
}
