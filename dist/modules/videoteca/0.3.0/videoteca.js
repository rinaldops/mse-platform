import { mountModule } from "../../../core/0.3.0/core.js";
import { createVideotecaView, createVideotecaSummaryView } from "./videoteca-view.js";

export const VIDEOTECA_VERSION = "0.3.0";
export const SUPPORTED_CORE_MAJOR = 0;

// Lean panel for the Home page — see createVideotecaSummaryView. Separate
// module name/selector so it never collides with the full mountVideoteca()
// below, and mounting one has no effect on the other's config/behavior.
export function mountVideotecaSummary({ service, globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "videoteca-summary",
    selector: '[data-mse-module="videoteca-summary"]',
    globalConfig,
    instances,
    moduleDefaults: {
      layout: { mode: "contained" }
    },
    render({ root, config }) {
      return createVideotecaSummaryView({ root, service, pageHref: config.videotecaSummary?.pageHref });
    }
  });
}

export function mountVideoteca({ service, globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "videoteca",
    selector: '[data-mse-module="videoteca"]',
    globalConfig,
    instances,
    moduleDefaults: {
      layout: { mode: "contained" }
    },
    render({ root }) {
      return createVideotecaView({ root, service });
    }
  });
}
