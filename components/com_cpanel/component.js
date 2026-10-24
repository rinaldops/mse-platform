import { parseAdministratorRoute, resolveAdministratorScreen } from "./router.js";
import { createAdministratorShell } from "./administrator-shell.js";
import { renderControlPanel } from "./control-panel.js";
import { renderPublisherScreen } from "../com_content/publisher.js";
import { renderDiagnosticsScreen } from "../com_diagnostics/diagnostics.js";
import { renderExtensionsScreen } from "../com_extensions/extensions-screen.js";
import { renderMenusScreen } from "../com_menus/menus-screen.js";
import { renderModulesScreen } from "../com_modules/modules-screen.js";
import { renderConfigScreen } from "../com_config/config-screen.js";
import { renderInstallerScreen } from "../com_installer/installer-screen.js";
import { renderTemplatesScreen } from "../com_templates/templates-screen.js";
import { renderCategoriesScreen } from "../com_categories/categories-screen.js";
import { renderTagsScreen } from "../com_tags/tags-screen.js";
import { renderMediaScreen } from "../com_media/media-screen.js";

const SCREEN_RENDERERS = {
  controlpanel: ({ root }) => renderControlPanel({ root }),
  publisher: ({ root, route, services }) => renderPublisherScreen({ root, route, services }),
  diagnostics: ({ root, route, services }) => renderDiagnosticsScreen({ root, route, services }),
  extensions: ({ root, route, services }) => renderExtensionsScreen({ root, route, services }),
  menus: ({ root, route, services }) => renderMenusScreen({ root, route, services }),
  modules: ({ root, route, services }) => renderModulesScreen({ root, route, services }),
  config: ({ root, route, services }) => renderConfigScreen({ root, route, services }),
  installer: ({ root, services }) => renderInstallerScreen({ root, services }),
  templates: ({ root, route, services }) => renderTemplatesScreen({ root, route, services }),
  categories: ({ root, route, services }) => renderCategoriesScreen({ root, route, services }),
  tags: ({ root, route, services }) => renderTagsScreen({ root, route, services }),
  media: ({ root, route, services }) => renderMediaScreen({ root, route, services })
};

// Shell formal do Administrator (components/com_cpanel/administrator-shell.js,
// análogo ao template de backend `atum` do Joomla! real): montado uma vez
// por navegação, substituindo o `<section class="mse-administrator__panel">`
// que cada tela desenhava "nua" — a tela ativa é injetada dentro de
// `shell.contentElement`, mantendo cabeçalho+navegação persistentes.
export function mount({ root, context = {}, services = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const route = parseAdministratorRoute(context.params || context.route?.query || {});
  root.className = "mse-administrator";
  const screen = resolveAdministratorScreen(route);
  const shell = createAdministratorShell({ root, activeOption: route.option });
  const render = SCREEN_RENDERERS[screen] || SCREEN_RENDERERS.controlpanel;
  const view = render({ root: shell.contentElement, route, services });
  return {
    dispose() {
      view?.dispose?.();
      shell.dispose();
      root.className = "";
    }
  };
}
