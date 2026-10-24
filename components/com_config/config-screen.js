/**
 * Tela do Administrator para `option=com_config` — Fase 1 da normalização
 * Joomla! (ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`): componente em sua
 * própria pasta física, fiel à convenção `components/com_xxx/` do Joomla!.
 *
 * Reproduz exatamente o wrapper que as outras telas de coleção desenham
 * (section.mse-administrator__panel + h1 + o editor CRUD montado dentro,
 * ver `components/com_extensions/extensions-screen.js`): `com_config`
 * deixou de ser placeholder — `config-editor.js` conecta o CRUD real de
 * `MSEConfiguracoes` (ver seu próprio cabeçalho sobre a decisão de manter
 * os nomes de campo em português).
 *
 * Consome `route.task`/`route.id` (`config.activate`/`config.deactivate` —
 * ver `config-editor.js` e `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.7/§3),
 * mesmo padrão `controller.task` já usado por `com_templates`.
 *
 * @param {{ root: Element, route?: object, services?: object }} options
 * @returns {{ dispose(): void }}
 */
import { renderConfigurationEditor } from "./config-editor.js";

export function renderConfigScreen({ root, route, services = {} } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h1 = document.createElement("h1");
  h1.textContent = "Configuração global";
  panel.append(h1);
  root.append(panel);
  renderConfigurationEditor({ root: panel, route, services });
  return {
    dispose() {
      panel.remove();
    }
  };
}
