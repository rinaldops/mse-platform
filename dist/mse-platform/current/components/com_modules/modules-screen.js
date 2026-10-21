/**
 * Tela do Administrator para `option=com_modules` — Fase 1 da normalização
 * Joomla! (ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`): componente em sua
 * própria pasta física, fiel à convenção `components/com_xxx/` do Joomla!.
 *
 * Reproduz exatamente o wrapper que `administrator/screens/collections.js`
 * desenhava para esta rota antes da divisão (section.mse-administrator__panel
 * + h1 "Módulos" + o editor CRUD `modules-editor.js` montado dentro), sem
 * nenhuma mudança de comportamento — só de local do arquivo.
 *
 * @param {{ root: Element, services?: object }} options
 * @returns {{ dispose(): void }}
 */
import { renderModulesEditor } from "./modules-editor.js";

export function renderModulesScreen({ root, services = {} } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h1 = document.createElement("h1");
  h1.textContent = "Módulos";
  panel.append(h1);
  root.append(panel);
  renderModulesEditor({ root: panel, services });
  return {
    dispose() {
      panel.remove();
    }
  };
}
