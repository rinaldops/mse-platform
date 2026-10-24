import assert from "node:assert/strict";
import {createContentPlugin,sanitizeText} from "../manifest.js";
const p=createContentPlugin({prepare:x=>x,beforeRender:x=>x,afterRender:x=>x});
assert.equal(p.manifest.group,"content"); assert.equal(p.onContentPrepare({x:1}).x,1); assert.equal(sanitizeText("a\0b"),"ab"); assert.throws(()=>createContentPlugin({prepare(){},beforeRender(){}}),/afterRender/); console.log("plugins/content: ok");
