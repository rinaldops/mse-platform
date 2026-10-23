import assert from "node:assert/strict";
import { validateExtensionValues } from "../extensions-editor.js";

const extensionBase = { Title: "BLOG", Type: "Component", Element: "blog", Version: "1.0.0", Enabled: true, Protected: false, Ordering: 1, ParamsJson: "{}" };
assert.equal(validateExtensionValues(extensionBase).Element, "blog");
assert.throws(() => validateExtensionValues({ ...extensionBase, Type: "Widget" }), /Tipo/);
assert.throws(() => validateExtensionValues({ ...extensionBase, Element: "Blog Principal" }), /Elemento/);
assert.throws(() => validateExtensionValues({ ...extensionBase, ParamsJson: "true" }), /ParamsJson/);
assert.equal(validateExtensionValues({ ...extensionBase, Ordering: "" }).Ordering, null);

// ClientId (≈ #__extensions.client_id, acrescentado 22/10/2026): default
// "Site" quando ausente, aceita "Administrator", rejeita valor inválido.
assert.equal(validateExtensionValues(extensionBase).ClientId, "Site");
assert.equal(validateExtensionValues({ ...extensionBase, ClientId: "Administrator" }).ClientId, "Administrator");
assert.throws(() => validateExtensionValues({ ...extensionBase, ClientId: "Backend" }), /Client/);

console.log("editor-validation.test.js (com_extensions): verificações concluídas com sucesso.");
