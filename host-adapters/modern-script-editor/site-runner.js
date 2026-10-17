// mse-platform Site Kernel runner (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
// seção 4: "host-adapters/modern-script-editor/site-runner.js NOVO: único
// script do snippet de site").
//
// Motivation: mesmo motivo de runner.js (módulo único) existir separado de
// bootstrap.js — alguns MSE não executam <script> inline de forma confiável,
// então este arquivo é referenciado via <script src=".../site-runner.js"
// ...data-*> (ver site-snippet.html) e só lê os atributos data-* do próprio
// <script> antes de delegar a site-boot.js (bootSiteKernel), que por sua vez
// delega a kernel/application.js (createSiteApplication). Este é o ÚNICO
// script carregado por página no modelo novo: ele substitui 1 MSE por módulo
// (runner.js) por 1 MSE para o site inteiro.
//
// Diferente de runner.js (que monta um Componente/Módulo por instância MSE),
// aqui há tipicamente um único <div data-mse-site> por página — mas o mesmo
// padrão de "localizar o <script> atual mesmo com vários MSE na página" é
// mantido via data-mse-site-instance, para o raro caso de mais de um snippet
// de site convivendo (ex.: ambiente de teste visual lado a lado).

(function () {
  function parseCsv(value) {
    return String(value || "")
      .split(",")
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function getAttr(el, name, fallback) {
    return (el && el.getAttribute && el.getAttribute(name)) || fallback;
  }

  function parseJsonAttr(el, name) {
    var raw = getAttr(el, name, "");
    if (!raw) return {};
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.error("site-runner.js: " + name + " não é um JSON válido, ignorando.", error);
      return {};
    }
  }

  function currentScript() {
    var s = document.currentScript;
    if (getAttr(s, "data-release-base", "")) return s;
    var instance = "";
    try { instance = (new URL(String(s && s.src || ""), document.baseURI).searchParams.get("mseSiteInstance") || "").split(/[?&]/)[0]; } catch (_) {}
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i -= 1) {
      if (String(all[i].src || "").indexOf("/site-runner.js") >= 0
          && getAttr(all[i], "data-release-base", "")
          && (!instance || getAttr(all[i], "data-mse-site-instance", "") === instance)) return all[i];
    }
    return null;
  }

  function findRoot(instanceId) {
    if (instanceId) return document.querySelector('[data-mse-site][data-mse-site-instance="' + instanceId + '"]');
    return document.querySelector("[data-mse-site]");
  }

  async function main() {
    var s = currentScript();
    var releaseBase = getAttr(s, "data-release-base", "");
    var instanceId = getAttr(s, "data-mse-site-instance", "");
    var positions = parseCsv(getAttr(s, "data-positions", ""));
    var componentPosition = getAttr(s, "data-component-position", undefined);
    var defaultView = getAttr(s, "data-default-view", undefined);
    var webUrl = getAttr(s, "data-web-url", undefined);
    var manifestPathByElemento = parseJsonAttr(s, "data-manifest-path-overrides");

    if (!releaseBase) {
      throw new Error("site-runner.js: data-release-base é obrigatório.");
    }

    var root = findRoot(instanceId);
    if (!root) throw new Error("site-runner.js: raiz [data-mse-site] não encontrada" + (instanceId ? " para a instância " + instanceId : "") + ".");

    var base = releaseBase.replace(/\/+$/, "");
    var siteBootUrl = base + "/host-adapters/modern-script-editor/site-boot.js";
    var boot = await import(siteBootUrl);

    return boot.bootSiteKernel({
      root: root,
      webUrl: webUrl,
      releaseBase: releaseBase,
      positions: positions,
      componentPosition: componentPosition,
      defaultView: defaultView,
      manifestPathByElemento: manifestPathByElemento,
      onLoadError: function (error, chave) {
        console.error("mse-platform site kernel: falha ao carregar \"" + chave + "\", mantendo último estado válido.", error);
      },
      onModuleError: function (error, info) {
        console.error("mse-platform site kernel: falha isolada em \"" + (info && info.elemento) + "\" (" + (info && info.kind) + ").", error);
      }
    });
  }

  main().catch(function (error) {
    console.error("mse-platform site-runner failed", error);
  });
})();
