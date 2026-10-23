/**
 * Tela do Administrator para `option=com_templates` — análoga ao
 * `com_templates` do Joomla! real (lista de templates instalados +
 * "Tornar padrão"). Mesmo wrapper fino de qualquer outro `*-screen.js`
 * (`com_extensions`, `com_modules`, `com_menus`): section.mse-administrator__panel
 * + h1 + o editor CRUD-lite (`templates-editor.js`) montado dentro.
 *
 * Primeira tela do Administrator a consumir `route.task`/`route.id` de
 * verdade (22/10/2026, prova de conceito da convenção `controller.task` —
 * ver `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.7/§3): repassa `route` para
 * `templates-editor.js`, que dispara "Tornar padrão" automaticamente quando
 * `task=templates.setdefault&id=N` está na URL, além do botão de sempre.
 *
 * @param {{ root: Element, route?: object, services?: object }} options
 * @returns {{ dispose(): void }}
 */
import { renderTemplatesEditor } from "./templates-editor.js";

export function renderTemplatesScreen({ root, route, services = {} } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h1 = document.createElement("h1");
  h1.textContent = "Templates";
  panel.append(h1);
  root.append(panel);
  renderTemplatesEditor({ root: panel, route, services });
  return {
    dispose() {
      panel.remove();
    }
  };
}
