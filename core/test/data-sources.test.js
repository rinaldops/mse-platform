import assert from "node:assert/strict";
import { createSharePointDataSourceRegistry } from "../data-sources.js";

const requests = [];
const registry = createSharePointDataSourceRegistry({
  allowedWebUrls: ["/teams/forum", "/teams/log-central/"],
  sources: [
    {
      key: "forum-topics",
      webUrl: "/teams/forum",
      listId: "67E55044-10B1-426F-9247-BB680E5FE0C8"
    },
    {
      key: "central-logs",
      webUrl: "/teams/log-central/",
      listId: "550E8400-E29B-41D4-A716-446655440000"
    }
  ],
  fetchImpl: async (url) => {
    requests.push(url);
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ value: [] })
    };
  }
});

assert.deepEqual(registry.get("central-logs"), {
  key: "central-logs",
  webUrl: "/teams/log-central",
  listId: "550e8400-e29b-41d4-a716-446655440000"
});
const centralClient = registry.getClient("central-logs");
assert.equal(centralClient, registry.getClient("central-logs"));
await centralClient.getListItems(registry.get("central-logs"), { select: ["Id"] });
assert.match(requests[0], /^\/teams\/log-central\/_api\/web\/lists\(guid'/);

assert.throws(
  () => createSharePointDataSourceRegistry({
    allowedWebUrls: ["/teams/forum"],
    sources: [{
      key: "central-logs",
      webUrl: "/teams/log-central",
      listId: "550e8400-e29b-41d4-a716-446655440000"
    }]
  }),
  /allowlist/
);
assert.throws(() => registry.get("desconhecida"), /desconhecida/);

console.log("data-sources.test.js: verificações concluídas com sucesso.");
