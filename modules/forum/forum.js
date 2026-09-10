import { mountModule } from "../../../core/0.3.0/core.js";
import { selectRichTextEditor } from "../../../core/0.3.0/editor.js";
import { renderRichText, sanitizeRichText } from "../../../core/0.3.0/rich-text.js";
import { createForumView, createForumSummaryView } from "./forum-view.js";

export const FORUM_VERSION = "0.3.0";
export const SUPPORTED_CORE_MAJOR = 0;

// Lean panel for the Home page — see createForumSummaryView. Separate module
// name/selector so it never collides with the full mountForum() below, and
// mounting one has no effect on the other's config/behavior.
export function mountForumSummary({ service, globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "forum-summary",
    selector: '[data-mse-module="forum-summary"]',
    globalConfig,
    instances,
    moduleDefaults: {
      layout: { mode: "contained" }
    },
    render({ root, config }) {
      return createForumSummaryView({ root, service, pageHref: config.forumSummary?.pageHref });
    }
  });
}

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
        createRichTextEditor: selectRichTextEditor(config.forum?.Editor ?? config.forum?.editor ?? root.dataset.editor),
        renderRichText,
        sanitizeRichText,
        pageSize: config.forum?.pageSize ?? 12
      });
    }
  });
}
