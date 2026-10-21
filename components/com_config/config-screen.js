/**
 * Tela do Administrator para `option=com_config` — Fase 1 da normalização
 * Joomla! (ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`): componente em sua
 * própria pasta física, fiel à convenção `components/com_xxx/` do Joomla!.
 *
 * Fora de escopo de implementação nesta rodada (decisão já tomada antes da
 * normalização) — mantém o comportamento placeholder original de
 * `administrator/screens/collections.js`, agora via o helper comum
 * `components/_shared/collection-view.js#renderPlaceholderScreen`. Ver
 * `README.md` desta pasta.
 *
 * @param {{ root: Element, services?: object }} options
 * @returns {{ dispose(): void }}
 */
import { renderPlaceholderScreen } from "../_shared/collection-view.js";

export function renderConfigScreen({ root, services = {} } = {}) {
  const document = root.ownerDocument;
  return renderPlaceholderScreen({ root, document, label: "Configuração global", services });
}
