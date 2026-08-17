import { mountModule } from "../../../core/0.13.6/core.js";
import { createVideotecaView } from "./videoteca-view.js";

export const VIDEOTECA_VERSION = "0.1.0";
export const SUPPORTED_CORE_MAJOR = 0;

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
