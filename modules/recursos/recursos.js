import { mountModule } from "../../../core/0.13.6/core.js";
import { createRecursosView } from "./recursos-view.js";

export const RECURSOS_VERSION = "0.1.0";
export const SUPPORTED_CORE_MAJOR = 0;

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
