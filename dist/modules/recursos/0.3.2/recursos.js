import { mountModule } from "../../../core/0.3.0/core.js";
import { createRecursosView, createRecursosSummaryView } from "./recursos-view.js";

export const RECURSOS_VERSION = "0.3.0";
export const SUPPORTED_CORE_MAJOR = 0;

// Lean panel for the Home page — see createRecursosSummaryView. Separate
// module name/selector so it never collides with the full mountRecursos()
// below, and mounting one has no effect on the other's config/behavior.
export function mountRecursosSummary({ service, globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "recursos-summary",
    selector: '[data-mse-module="recursos-summary"]',
    globalConfig,
    instances,
    moduleDefaults: {
      layout: { mode: "contained" }
    },
    render({ root, config }) {
      return createRecursosSummaryView({ root, service, pageHref: config.recursosSummary?.pageHref });
    }
  });
}

export function mountRecursos({ service, globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "recursos",
    selector: '[data-mse-module="recursos"]',
    globalConfig,
    instances,
    moduleDefaults: {
      layout: { mode: "contained" }
    },
    render({ root }) {
      return createRecursosView({ root, service });
    }
  });
}
