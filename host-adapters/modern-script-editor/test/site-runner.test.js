// mse-platform/host-adapters/modern-script-editor/test/site-runner.test.js
//
// Teste de caracterização do IIFE `site-runner.js` (mesmo princípio de
// `core/test/mse-runner.test.js`: executa o SOURCE real via `vm.Script`
// contra um `document` fake, sem jsdom), focado no bug corrigido em
// 18/10/2026: `data-template-path-overrides` nunca era lido nem repassado a
// `boot.bootSiteKernel({ templatePathByName })` — então um Template
// publicado fora da convenção padrão `${releaseBase}/templates/<nome>/
// index.js` (ex. o pacote real do CAMAP-AGP, publicado em
// `SiteAssets/camap-agp-modules/0.1.0/templates/camap-tema-01/`, fora de
// `SiteAssets/mse-platform/current/`) nunca seria encontrado, mesmo com
// `MSEConfiguracoes.Tema` corretamente configurado.
//
// Intercepta `boot.bootSiteKernel` via `importModuleDynamically` (mesmo
// mecanismo de `mse-runner.test.js`, que intercepta o import só para
// confirmar QUE foi alcançado) — aqui vamos além: devolvemos um módulo fake
// com `bootSiteKernel` que captura os argumentos recebidos, para afirmar
// sobre `templatePathByName` e `manifestPathByElemento` ao mesmo tempo (não
// regressão do override já existente).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../site-runner.js", import.meta.url), "utf8");

function buildScriptElement(attributes, src) {
  return {
    src,
    getAttribute: (name) => (name in attributes ? attributes[name] : null)
  };
}

// Node 16 (sem --experimental-vm-modules) exige que o valor retornado por
// `importModuleDynamically` seja um Module real resolvido via import() de
// verdade — um objeto literal simples causa ERR_VM_MODULE_NOT_MODULE
// silenciosamente capturado só pelo console.error do próprio IIFE. Por
// isso, em vez de devolver um objeto fake direto (como seria mais simples),
// construímos um módulo ES real on-the-fly via `data:` URL — cada chamada
// usa uma chave global única (em vez de um nome fixo) para não haver
// vazamento de estado entre os 3 cenários deste arquivo, que compartilham o
// mesmo processo Node.
let fakeModuleCounter = 0;

async function runWithAttributes(attributes) {
  const captured = {};
  const rootElement = { tagName: "DIV" };
  const scriptEl = buildScriptElement(attributes, `${attributes["data-release-base"]}/host-adapters/modern-script-editor/site-runner.js`);

  const context = vm.createContext({
    document: {
      currentScript: scriptEl,
      baseURI: "https://example.invalid/",
      getElementsByTagName: () => [scriptEl],
      querySelector: () => rootElement
    },
    console: { error: (...args) => { captured.consoleErrors ||= []; captured.consoleErrors.push(args.map(String).join(" ")); } }
  });

  const globalKey = `__site_runner_test_captured_${fakeModuleCounter++}__`;
  globalThis[globalKey] = captured;
  const fakeModuleSource =
    `export function bootSiteKernel(options) {` +
    `globalThis[${JSON.stringify(globalKey)}].bootOptions = options;` +
    `return Promise.resolve({ ok: true });` +
    `}`;
  const dataUrl = `data:text/javascript,${encodeURIComponent(fakeModuleSource)}`;

  new vm.Script(source, {
    importModuleDynamically: async () => import(dataUrl)
  }).runInContext(context);

  // main() é async e roda "fire-and-forget" dentro do IIFE — mesmo padrão de
  // mse-runner.test.js; aqui aguardamos por tempo (não só microtasks) porque
  // o import() real do data: URL passa por E/S assíncrona do próprio loader
  // do Node, não só pela fila de microtasks.
  await new Promise((resolve) => setTimeout(resolve, 50));
  delete globalThis[globalKey];

  // captured.bootOptions.templatePathByName/manifestPathByElemento foram
  // criados por JSON.parse rodando DENTRO do contexto vm (outro realm) —
  // mesmo com o mesmo shape, assert.deepEqual compara via
  // Object.prototype.toString, que para objetos cross-realm não bate.
  // Normalizamos aqui com um round-trip de JSON (fora do vm) só para a
  // comparação, sem mudar o que foi de fato capturado.
  if (captured.bootOptions) {
    captured.bootOptions = JSON.parse(JSON.stringify(captured.bootOptions));
  }
  return captured;
}

// (1) data-template-path-overrides ausente -> templatePathByName === {}
// (comportamento prévio preservado, sem regressão).
{
  const captured = await runWithAttributes({
    "data-release-base": "https://example.invalid/SiteAssets/mse-platform/current",
    "data-positions": "hero,rodape",
    "data-manifest-path-overrides": '{"sd":"../../camap-agp-modules/0.1.0/modules/sd/manifest.js"}'
  });
  assert.ok(captured.bootOptions, "bootSiteKernel deveria ter sido chamado");
  assert.deepEqual(captured.bootOptions.templatePathByName, {}, "sem o atributo, templatePathByName deve ser {}");
  assert.deepEqual(
    captured.bootOptions.manifestPathByElemento,
    { sd: "../../camap-agp-modules/0.1.0/modules/sd/manifest.js" },
    "manifestPathByElemento (já existente) não deve regredir"
  );
  console.log("site-runner.test.js: sem data-template-path-overrides, templatePathByName é {} (sem regressão) ok.");
}

// (2) data-template-path-overrides presente -> chega intacto a bootSiteKernel
// (o bug: antes desta correção, esta chave nem existia nas opções).
{
  const captured = await runWithAttributes({
    "data-release-base": "https://example.invalid/SiteAssets/mse-platform/current",
    "data-positions": "hero,rodape",
    "data-template-path-overrides": '{"camap-tema-01":"../../camap-agp-modules/0.1.0/templates/camap-tema-01/index.js"}'
  });
  assert.ok(captured.bootOptions, "bootSiteKernel deveria ter sido chamado");
  assert.deepEqual(
    captured.bootOptions.templatePathByName,
    { "camap-tema-01": "../../camap-agp-modules/0.1.0/templates/camap-tema-01/index.js" },
    "data-template-path-overrides deve chegar intacto em bootSiteKernel({ templatePathByName })"
  );
  console.log("site-runner.test.js: data-template-path-overrides chega a bootSiteKernel({ templatePathByName }) ok.");
}

// (3) JSON malformado em data-template-path-overrides degrada para {} sem lançar
// (mesmo tratamento de erro já usado por data-manifest-path-overrides).
{
  const captured = await runWithAttributes({
    "data-release-base": "https://example.invalid/SiteAssets/mse-platform/current",
    "data-positions": "hero,rodape",
    "data-template-path-overrides": "{not-json"
  });
  assert.ok(captured.bootOptions, "bootSiteKernel deveria ter sido chamado mesmo com JSON malformado");
  assert.deepEqual(captured.bootOptions.templatePathByName, {}, "JSON malformado deve degradar para {}, não lançar");
  console.log("site-runner.test.js: data-template-path-overrides malformado degrada para {} sem lançar ok.");
}

console.log("site-runner.test.js: verificações concluídas com sucesso.");
