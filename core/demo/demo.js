import {
  disposeModule,
  loadSharePointConfiguration,
  resolveConfig
} from "../core.js";
import { renderRichText, sanitizeRichText } from "../rich-text.js";
import { mountBanner } from "./banner.js";
import { mountSummary } from "./summary.js";

let configurationRequests = 0;
const localConfigurationFetch = async () => {
  configurationRequests += 1;
  return {
    ok: true,
    status: 200,
    async json() {
      return {
        value: [
          {
            Title: "global",
            Escopo: "Global",
            Layout: "Contained",
            Tema: "default",
            ConfiguracaoJson: JSON.stringify({
              theme: {
                tokens: {
                  colorPrimary: "#0f6cbd",
                  radius: "0.75rem"
                }
              }
            }),
            Ativo: true
          },
          {
            Title: "summary-demo",
            Escopo: "Instancia",
            Modulo: "demo-summary",
            Layout: "Herdar",
            ConfiguracaoJson: JSON.stringify({
              title: "Configuração global com override local"
            }),
            Ativo: true
          },
          {
            Title: "banner-demo",
            Escopo: "Instancia",
            Modulo: "demo-banner",
            Layout: "FullBleed",
            ConfiguracaoJson: JSON.stringify({
              title: "Full bleed aplicado somente neste root"
            }),
            Ativo: true
          }
        ]
      };
    }
  };
};

const configuration = await loadSharePointConfiguration({
  webUrl: "/preview-local",
  fetchImpl: localConfigurationFetch
});
await loadSharePointConfiguration({
  webUrl: "/preview-local",
  fetchImpl: localConfigurationFetch
});

const globalConfig = configuration.globalConfig;
const summaryInstances = configuration.instancesByModule["demo-summary"];
const bannerInstances = configuration.instancesByModule["demo-banner"];

const results = document.querySelector("#test-results");
const summary = document.querySelector("#test-summary");
let passed = 0;
let failed = 0;

function check(description, condition) {
  const item = document.createElement("li");
  item.textContent = description;
  item.className = condition ? "mse-demo__test--passed" : "mse-demo__test--failed";
  results.append(item);
  if (condition) passed += 1;
  else failed += 1;
}

await mountSummary({ globalConfig, instances: summaryInstances });
await mountBanner({ globalConfig, instances: bannerInstances });

const summaryRoot = document.querySelector("#summary-demo");
const bannerRoot = document.querySelector("#banner-demo");

check("Os dois módulos foram montados.",
  summaryRoot.dataset.mseState === "ready" && bannerRoot.dataset.mseState === "ready");
check("A lista de configuração foi consultada uma única vez por página.", configurationRequests === 1);
check("O módulo contido recebeu seu layout.", summaryRoot.classList.contains("mse-app--contained"));
check("O banner recebeu full bleed sem alterar o outro módulo.",
  bannerRoot.classList.contains("mse-app--full-bleed") &&
  !summaryRoot.classList.contains("mse-app--full-bleed"));
check("O token global foi aplicado nos dois roots.",
  summaryRoot.style.getPropertyValue("--mse-color-primary") === "#0f6cbd" &&
  bannerRoot.style.getPropertyValue("--mse-color-primary") === "#0f6cbd");

const resolved = resolveConfig({
  globalConfig: { sample: "global" },
  moduleDefaults: { sample: "module" },
  instanceConfig: { sample: "instance" }
});
check("A instância prevalece na composição e o resultado é imutável.",
  resolved.sample === "instance" && Object.isFrozen(resolved));

let invalidConfigRejected = false;
try {
  resolveConfig({ instanceConfig: { layout: { mode: "invalid" } } });
} catch {
  invalidConfigRejected = true;
}
check("Layout inválido é rejeitado.", invalidConfigRejected);

const maliciousHtml = [
  '<p onclick="alert(1)" style="color:red">Olá <strong>mundo</strong></p>',
  '<script>globalThis.comprometido = true</script>',
  '<svg><a href="javascript:alert(2)">vetor</a></svg>',
  '<form><input name="segredo"><p>formulário</p></form>',
  '<a href="javascript:alert(3)" target="_blank">link ruim</a>',
  '<a href="/sites/portal" title="Portal">link seguro</a>',
  '<pre><code class="language-js" data-token="x">const seguro = true;</code></pre>',
  '<table><tr><th scope="col" colspan="2" onclick="alert(4)">Coluna</th></tr></table>'
].join("");
const sanitizedHtml = sanitizeRichText(maliciousHtml);
check("O rich text remove elementos executáveis e atributos fora da allowlist.",
  !/script|svg|form|input|onclick|style=|target=|data-token|javascript:/i.test(sanitizedHtml));
const sanitizedTemplate = document.createElement("template");
sanitizedTemplate.innerHTML = sanitizedHtml;
check("O rich text preserva estruturas e atributos explicitamente permitidos.",
  sanitizedTemplate.content.querySelector("strong")?.textContent === "mundo"
  && sanitizedTemplate.content.querySelector('a[href="/sites/portal"]')
  && sanitizedTemplate.content.querySelector("code.language-js")
  && sanitizedTemplate.content.querySelector('th[scope="col"][colspan="2"]'));
const richTextRoot = document.createElement("div");
renderRichText(richTextRoot, maliciousHtml);
check("A renderização segura não cria nós ativos.",
  !richTextRoot.querySelector("script,svg,iframe,form")
  && richTextRoot.querySelector("a")?.getAttribute("href") === null
  && richTextRoot.querySelectorAll("a")[1]?.getAttribute("href") === "/sites/portal");
await mountSummary({ globalConfig, instances: summaryInstances });
check("Uma segunda montagem não duplica a renderização.", summaryRoot.dataset.renderCount === "1");

await disposeModule(summaryRoot);
await mountSummary({ globalConfig, instances: summaryInstances });
check("Dispose permite remontagem limpa.",
  summaryRoot.dataset.mseState === "ready" && summaryRoot.dataset.renderCount === "2");

await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
check("A página não possui overflow horizontal.",
  document.documentElement.scrollWidth <= document.documentElement.clientWidth);

summary.textContent = failed === 0
  ? `${passed} verificações concluídas com sucesso.`
  : `${failed} de ${passed + failed} verificações falharam.`;
summary.className = failed === 0
  ? "mse-demo__summary--passed"
  : "mse-demo__summary--failed";
