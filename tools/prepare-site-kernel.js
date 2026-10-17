// mse-platform/tools/prepare-site-kernel.js
//
// Publica o Site Kernel (modelo novo de 1 MSE por site inteiro,
// `host-adapters/modern-script-editor/site-runner.js` + `site-boot.js`,
// mse-platform/docs/PLANO-SITE-KERNEL-MSE.md seção 4) numa pasta FIXA e com
// sobrescrita autorizada — mesmo padrão já em produção em
// `CAMAP-AGP/tools/prepare-siteassets.py` (pasta fixa "0.1.0", sobrescrita
// autorizada, `MANIFEST-SHA256.json`, remoção de arquivos obsoletos só
// dentro da própria pasta gerada).
//
// Por que não reaproveitar `tools/build-release.js`: aquele script varre
// diretórios inteiros (`roots = ["admin","core","host-adapters","modules","themes"]`),
// não inclui `kernel/` e se recusa a sobrescrever uma saída já existente
// (`stat()` lança se existir; manifest escrito com `flag: "wx"`) —
// incompatível com uma pasta fixa republicada a cada rodada. Este script,
// em vez disso, copia uma lista EXPLÍCITA e mínima de arquivos: só o que o
// caminho de boot do Site Kernel (`site-runner.js` -> `site-boot.js` ->
// `kernel/application.js` -> ...) efetivamente importa em tempo de execução
// no navegador — confirmado por leitura do grafo de import de cada arquivo
// antes de escrever esta lista (C3, PLANO-ARQUITETURA-MINI-JOOMLA.md):
//   - NÃO inclui `admin/`: só o host-adapter ANTIGO (`site-integration.js`,
//     modelo de 1 MSE por módulo) importa `admin/manifest.js`/
//     `admin/installer.js`; o novo `site-boot.js` não importa nada de
//     `admin/`.
//   - NÃO inclui `core/module-contract.js`: usado só por testes/validação
//     de manifesto em tempo de autoria (`defineModuleManifest`), nunca
//     importado em runtime por `kernel/application.js` (que lê
//     `manifest.views`/`manifest.entrypoints` direto, sem chamar nenhuma
//     função do contrato).
//   - NÃO inclui `host-adapters/modern-script-editor/layout.css`,
//     `bootstrap.js`, `runner.js`, `site-integration.js`, `snippet.html`:
//     são do modelo ANTIGO (1 MSE por módulo). O Site Kernel não injeta CSS
//     (`kernel/layout.js`: "Nenhum HTML/CSS estrutural é embutido... 100%
//     responsabilidade do CSS do site") — decisão já confirmada pelo
//     usuário para o C3 (reaproveitar o CSS legado do CAMAP-AGP via `<link>`
//     direto no snippet, sem mecanismo novo de injeção).
//   - NÃO inclui `kernel/installer.js`, `kernel/seed.js`, `kernel/schemas/*`:
//     rodam em Node (FIORI-AUTO/REST, provisionamento/migração de dados),
//     nunca carregados pelo navegador.
//   - NÃO inclui `kernel/content-services.js`: serviço opcional, não
//     importado por `kernel/application.js` nesta configuração (nenhum
//     módulo do CAMAP-AGP usa com_content ainda).
//
// Sobrescrita autorizada: workspace opera só em produção, destino único;
// mesma convenção já aprovada para `camap-agp-modules` (pasta fixa
// "0.1.0"). Aqui a pasta fixa é "current" (sem versionamento por pastas —
// histórico fica no Git do mse-platform e no `MANIFEST-SHA256.json`).

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicationFolder = "current";
const target = path.join(root, "dist", "mse-platform", publicationFolder);

// Lista explícita e mínima: só o que o caminho de boot do Site Kernel
// importa de fato (ver justificativa completa no cabeçalho deste arquivo).
const FILES = [
  "host-adapters/modern-script-editor/site-runner.js",
  "host-adapters/modern-script-editor/site-boot.js",
  "kernel/application.js",
  "kernel/router.js",
  "kernel/menu.js",
  "kernel/dispatcher.js",
  "kernel/extension-registry.js",
  "kernel/positions.js",
  "kernel/layout.js",
  "kernel/events.js",
  "kernel/site-config.js",
  "core/rest.js",
  "core/configuration-store.js",
  "core/provisioning.js",
  "core/navigation.js"
];

// Mesmas regras de `tools/build-release.js`: nenhum arquivo publicado pode
// conter nome de tenant/consumidor real.
const forbidden = [
  /petrobrasbr/iu,
  /tecnologiasdigitais/iu,
  /comunidades-de-interesse/iu,
  /petrobras/iu,
  /https?:\/\/[^\s"']+\.sharepoint\.com/iu
];

const manifest = { publicationFolder, files: [] };
const expected = new Set(["MANIFEST-SHA256.json"]);

await mkdir(target, { recursive: true });

for (const relative of FILES) {
  const source = path.join(root, relative);
  const raw = await readFile(source, "utf8");
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (forbidden.some((pattern) => pattern.test(text))) {
    throw new Error(`Referência específica de tenant/consumidor encontrada em ${relative}.`);
  }
  const data = Buffer.from(text, "utf8");
  const destination = path.join(target, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, data);
  manifest.files.push({
    path: relative,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex")
  });
  expected.add(relative);
}

// `target` é pasta gerada: remove arquivos obsoletos de execuções
// anteriores (mesmo princípio de `prepare-siteassets.py` — só dentro da
// própria pasta `target`, nunca fora dela).
async function removeObsolete(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await removeObsolete(absolute);
      continue;
    }
    const relative = path.relative(target, absolute).replaceAll("\\", "/");
    if (!expected.has(relative)) await unlink(absolute);
  }
}
await removeObsolete(target);

await writeFile(
  path.join(target, "MANIFEST-SHA256.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

console.log(`Site Kernel (${publicationFolder}): ${manifest.files.length} arquivos em ${target}`);
