import assert from "node:assert/strict";
import { forumRouteUrl, readForumRoute } from "../forum-view.js";

assert.deepEqual(
  readForumRoute("https://example.test/pagina.aspx"),
  { view: "recent", categoryId: null, tagId: null, topicId: null, answerId: null, compose: false, edit: false, search: "" }
);

assert.deepEqual(
  readForumRoute(
    "https://example.test/pagina.aspx?forumView=resolved&forumCategory=12&forumTag=7&forumTopic=42&forumAnswer=55&forumCompose=1&forumEdit=1&forumSearch=SharePoint"
  ),
  { view: "resolved", categoryId: 12, tagId: 7, topicId: 42, answerId: 55, compose: true, edit: true, search: "SharePoint" }
);

assert.deepEqual(
  readForumRoute("https://example.test/pagina.aspx?forumView=invalida&forumCategory=-1&forumTopic=abc"),
  { view: "recent", categoryId: null, tagId: null, topicId: null, answerId: null, compose: false, edit: false, search: "" }
);

assert.equal(
  forumRouteUrl(
    "https://example.test/pagina.aspx?origem=menu&forumTopic=4",
    { topicId: null, tagId: 7, answerId: 9, compose: true, edit: true, view: "unanswered", search: "ETag" }
  ),
  "/pagina.aspx?origem=menu&forumView=unanswered&forumTag=7&forumAnswer=9&forumCompose=1&forumEdit=1&forumSearch=ETag"
);

console.log("forum-view.test.js: verificações concluídas com sucesso.");
