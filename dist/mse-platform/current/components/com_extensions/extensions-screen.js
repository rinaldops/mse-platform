/**
 * Tela do Administrator para `option=com_extensions` — Fase 1 da
 * normalização Joomla! (ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`):
 * componente em sua própria pasta física, fiel à convenção
 * `components/com_xxx/` do Joomla!.
 *
 * Reproduz exatamente o wrapper que `administrator/screens/collections.js`
 * desenhava para esta rota antes da divisão (section.mse-administrator__panel
 * + h1 "Extensões" + o editor CRUD `extensions-editor.js` montado dentro),
 * sem nenhuma mudança de comportamento — só de local do arquivo.
 *
 * Consome `route.task`/`route.id` (`extensions.enable`/`extensions.disable`
 * — ver `extensions-editor.js` e `docs/AUDITORIA-JOOMLA-PENTE-FINO.md`
 * §2.7/§3), mesmo padrão `controller.task` já usado por `com_templates`.
 *
 * @param {{ root: Element, route?: object, services?: object }} options
 * @returns {{ dispose(): void }}
 */
import { renderExtensionsEditor } from "./extensions-editor.js";

export function renderExtensionsScreen({ root, route, services = {} } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h1 = document.createElement("h1");
  h1.textContent = "Extensões";
  panel.append(h1);
  root.append(panel);
  renderExtensionsEditor({ root: panel, route, services });
  return {
    dispose() {
      panel.remove();
    }
  };
}
