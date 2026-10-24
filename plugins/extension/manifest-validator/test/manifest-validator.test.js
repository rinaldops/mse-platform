import assert from "node:assert/strict";
import {createExtensionValidatorPlugin,validateExtensionManifest} from "../manifest-validator.js";
assert.equal(validateExtensionManifest({id:"com-content",type:"component",version:"1.0.0"}).ok,true);
assert.equal(validateExtensionManifest({id:"Bad",type:"unknown"}).ok,false);
assert.equal(createExtensionValidatorPlugin().manifest.group,"extension");
console.log("plugins/extension: ok");
