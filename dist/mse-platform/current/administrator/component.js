import { parseAdministratorRoute, resolveAdministratorScreen } from "./router.js";
import { renderControlPanel } from "./screens/control-panel.js";
import { renderCollectionScreen } from "./screens/collections.js";
import { renderPublisherScreen } from "./screens/publisher.js";
import { renderDiagnosticsScreen } from "./screens/diagnostics.js";
import { renderInstallerScreen } from "./screens/installer.js";
export function mount({ root, context = {}, services = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const route = parseAdministratorRoute(context.params || context.route?.query || {});
  root.replaceChildren(); root.className = "mse-administrator";
  const screen = resolveAdministratorScreen(route);
  const view = screen === "controlpanel" ? renderControlPanel({ root, route }) : screen === "publisher" ? renderPublisherScreen({ root, route, services }) : screen === "diagnostics" ? renderDiagnosticsScreen({ root, route, services }) : screen === "installer" ? renderInstallerScreen({ root, route, services }) : renderCollectionScreen({ root, route, services });
  return { dispose() { view?.dispose?.(); root.replaceChildren(); root.className = ""; } };
}
