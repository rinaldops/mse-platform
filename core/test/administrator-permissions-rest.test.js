import assert from "node:assert/strict";
import { createSharePointRestClient } from "../rest.js";

/**
 * Cobertura isolada de `client.getEffectiveBasePermissions` contra um fetch
 * fake — complementa `components/com_cpanel/test/permissions.test.js`
 * (que cobre `normalizeEffectiveBasePermissions`/`queryEffectivePermissions`
 * a partir de um client já fake) com um teste de unidade mais próximo do
 * REST real: a URL montada, o método HTTP e o unwrap do envelope
 * `{ d: { Low, High } }` (odata=verbose) devolvido pelo SharePoint.
 */
const calls = [];
const client = createSharePointRestClient({
  webUrl: "/teams/core-test",
  fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      async json() { return { d: { Low: 2055, High: 0 } }; }
    };
  }
});
const result = await client.getEffectiveBasePermissions({ listId: "550e8400-e29b-41d4-a716-446655440000" });
assert.deepEqual(result.permissions, { Low: 2055, High: 0 });
assert.equal(result.status, 200);
assert.equal(calls.length, 1);
assert.equal(calls[0].options.method, "GET");
assert.equal(calls[0].url, "/teams/core-test/_api/web/lists(guid'550e8400-e29b-41d4-a716-446655440000')/EffectiveBasePermissions");
console.log("administrator-permissions-rest.test.js: consulta EffectiveBasePermissions ok.");
