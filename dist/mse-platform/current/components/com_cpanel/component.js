import { parseAdministratorRoute, resolveAdministratorScreen } from "./router.js";
import { renderControlPanel } from "./control-panel.js";
import { renderPublisherScreen } from "../com_content/publisher.js";
import { renderDiagnosticsScreen } from "../com_diagnostics/diagnostics.js";
import { renderExtensionsScreen } from "../com_extensions/extensions-screen.js";
import { renderMenusScreen } from "../com_menus/menus-screen.js";
import { renderModulesScreen } from "../com_modules/modules-screen.js";
import { renderConfigScreen } from "../com_config/config-screen.js";
import { renderInstallerScreen } from "../com_installer/installer-screen.js";

const SCREEN_RENDERERS = {
  controlpanel: ({ root }) => renderControlPanel({ root }),
  publisher: ({ root, route, services }) => renderPublisherScreen({ root, route, services }),
  diagnostics: ({ root, route, services }) => renderDiagnosticsScreen({ root, route, services }),
  extensions: ({ root, services }) => renderExtensionsScreen({ root, services }),
  menus: ({ root, services }) => renderMenusScreen({ root, services }),
  modules: ({ root, services }) => renderModulesScreen({ root, services }),
  config: ({ root, services }) => renderConfigScreen({ root, services }),
  installer: ({ root, services }) => renderInstallerScreen({ root, services })
};

export function mount({ root, context = {}, services = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const route = parseAdministratorRoute(context.params || context.route?.query || {});
  root.replaceChildren(); root.className = "mse-administrator";
  const screen = resolveAdministratorScreen(route);
  const render = SCREEN_RENDERERS[screen] || SCREEN_RENDERERS.controlpanel;
  const view = render({ root, route, services });
  return { dispose() { view?.dispose?.(); root.replaceChildren(); root.className = ""; } };
}
