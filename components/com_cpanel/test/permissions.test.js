import assert from "node:assert/strict";
import { normalizeEffectiveBasePermissions, permissionBitmask, queryEffectivePermissions } from "../../../kernel/administrator-permissions.js";
assert.equal(permissionBitmask({ Low: 3, High: 1 }), 4294967299);
assert.deepEqual(normalizeEffectiveBasePermissions({ Low: 2055, High: 0 }), { mask: 2055, canRead: true, canWrite: true, canManageLists: true, canManagePermissions: false });
const permissions = await queryEffectivePermissions({ client: { async getEffectiveBasePermissions() { return { permissions: { Low: 1, High: 0 } }; } }, list: { listId: "x" } });
assert.equal(permissions.canRead, true); assert.equal(permissions.canWrite, false);
console.log("permissions.test.js: verificações concluídas com sucesso.");
