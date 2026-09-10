import assert from "node:assert/strict";
import { forumRouteUrl, readForumRoute } from "../forum-view.js";

assert.deepEqual(
  readForumRoute("https://example.test/pagina.aspx"),
  { view: "recent", sort: "recentes", categoryId: null, tagId: null, topicId: null, answerId: null, compose: false, edit: false, mine: false, search: "" }
);

assert.deepEqual(
  readForumRoute(
    "https://example.test/pagina.aspx?forumView=resolved&forumSort=respostas&forumCategory=12&forumTag=7&forumTopic=42&forumAnswer=55&forumCompose=1&forumEdit=1&forumMine=1&forumSearch=SharePoint"
  ),
  { view: "resolved", sort: "respostas", categoryId: 12, tagId: 7, topicId: 42, answerId: 55, compose: true, edit: true, mine: true, search: "SharePoint" }
);

assert.deepEqual(
  readForumRoute("https://example.test/pagina.aspx?forumView=invalida&forumSort=invalido&forumCategory=-1&forumTopic=abc"),
  { view: "recent", sort: "recentes", categoryId: null, tagId: null, topicId: null, answerId: null, compose: false, edit: false, mine: false, search: "" }
);

assert.equal(
  forumRouteUrl(
    "https://example.test/pagina.aspx?origem=menu&forumTopic=4",
    { topicId: null, tagId: 7, answerId: 9, compose: true, edit: true, view: "unanswered", sort: "visualizacoes", mine: true, search: "ETag" }
  ),
  "/pagina.aspx?origem=menu&forumView=unanswered&forumSort=visualizacoes&forumTag=7&forumAnswer=9&forumCompose=1&forumEdit=1&forumMine=1&forumSearch=ETag"
);

console.log("forum-view.test.js: verificações concluídas com sucesso.");
