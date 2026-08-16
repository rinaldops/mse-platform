import { mountModule } from "../../../core/0.12.2/core.js";
import { createRichTextEditor } from "../../../core/0.12.2/editor-quill.js";
import { renderRichText, sanitizeRichText } from "../../../core/0.12.2/rich-text.js";
import { createForumView } from "./forum-view.js";

export const FORUM_VERSION = "0.17.2";
export const SUPPORTED_CORE_MAJOR = 0;

export function mountForum({ service, globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "forum",
    selector: '[data-mse-module="forum"]',
    globalConfig,
    instances,
    moduleDefaults: {
      layout: { mode: "contained" },
      forum: { pageSize: 12 }
    },
    render({ root, config }) {
      return createForumView({
        root,
        service,
        createRichTextEditor,
        renderRichText,
        sanitizeRichText,
        pageSize: config.forum?.pageSize ?? 12
      });
    }
  });
}
