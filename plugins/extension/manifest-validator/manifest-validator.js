/** Joomla-like extension plugin: validates declarative extension manifests. */
export const EXTENSION_PLUGIN_MANIFEST = Object.freeze({id:"extension-validator",type:"plugin",group:"extension",version:"1.0.0",events:["onExtensionDiscover"]});
const ID=/^[a-z][a-z0-9-]{0,63}$/;
export function validateExtensionManifest(manifest){
 if(!manifest||typeof manifest!=="object") return {ok:false,errors:["manifest deve ser objeto"]};
 const errors=[]; for(const k of ["id","type","version"]){if(typeof manifest[k]!=="string"||!manifest[k].trim()) errors.push(`${k} obrigatório`);}
 if(manifest.id&&!ID.test(manifest.id)) errors.push("id inválido");
 if(manifest.type&&!new Set(["component","module","plugin","template"]).has(manifest.type)) errors.push("type inválido");
 return errors.length?{ok:false,errors}:{ok:true,value:Object.freeze({...manifest})};
}
export function createExtensionValidatorPlugin({onDiscover}={}){const handler=onDiscover??((m)=>validateExtensionManifest(m)); if(typeof handler!=="function") throw new TypeError("onDiscover deve ser função"); return Object.freeze({manifest:EXTENSION_PLUGIN_MANIFEST,onExtensionDiscover:handler});}
