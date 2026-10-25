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
//   - NÃO inclui `host-adapters/modern-script-editor/layout.css`,
//     `bootstrap.js`, `runner.js`, `site-integration.js`, `snippet.html`:
//     são do modelo ANTIGO (1 MSE por módulo). O Site Kernel não injeta CSS
//     (`kernel/layout.js`: "Nenhum HTML/CSS estrutural é embutido... 100%
//     responsabilidade do CSS do site") — decisão já confirmada pelo
//     usuário para o C3 (reaproveitar o CSS legado do CAMAP-AGP via `<link>`
//     direto no snippet, sem mecanismo novo de injeção).
//   - NÃO inclui `kernel/seed.js`: roda em Node (FIORI-AUTO/REST, migração de
//     dados), nunca carregado pelo navegador. `kernel/installer.js` (ver nota
//     abaixo) deixou de se qualificar para esta exclusão em 21/10/2026: o
//     Administrator (`com_installer`) passou a importá-lo em runtime do
//     navegador (`host-adapters/modern-script-editor/site-boot.js#buildAdministratorServices`
//     -> `createKernelInstaller`), então ele e seus próprios imports
//     (`kernel/schemas/mse-menu-types.js`, `mse-modules-menu.js` — os únicos
//     dois schemas que ainda não estavam nesta lista; os outros 3 já vinham
//     do Administrator, ver nota abaixo) precisam ser publicados.
//   - `kernel/content-services.js`/`kernel/article-mapper.js`/
//     `kernel/articles-data.js`/`kernel/categories.js`/`kernel/publisher-data.js`
//     (Wave 2, módulos de posição `mod_articles_*`/`mod_tags_*`): deixaram de
//     se qualificar para a exclusão original ("nenhum módulo usa com_content
//     ainda") — ver nota abaixo, mesmo princípio de `kernel/installer.js`
//     acima.
//
// Administrator (18/10/2026, ampliação de escopo — Templates/Administrator
// trazidos para o escopo formal): o Administrator É carregado pelo
// navegador em runtime (resolveManifestUrl/importModule, mesmo mecanismo de
// qualquer Componente real) — ao contrário dos manifestos simples do
// CAMAP-AGP (objeto plano, sem import), `administrator/manifest.js` importa
// `core/module-contract.js#defineModuleManifest` de verdade, então esse
// arquivo PRECISA ser publicado também (a nota acima sobre module-contract
// só valia enquanto nenhum manifesto real o importava em runtime).
// `administrator/screens/collections.js` importa por sua vez
// `kernel/admin-data.js`, `kernel/admin-form.js` e os 3 schemas usados nas
// telas já conectadas a dados reais (`kernel/schemas/mse-extensions.js`,
// `mse-menu.js`, `mse-modules.js`), que importam `core/list-provisioning.js`
// (só para `defineListSchema` — não aciona nenhum provisionamento de rede
// nesse caminho). Fica tudo sob `administrator/` e `kernel/`/`core/`
// (mesmos caminhos relativos do fonte, preservando os `import`s existentes
// sem reescrevê-los) — SEM pasta `modules/administrator/`: o path real é
// resolvido via `data-manifest-path-overrides` no snippet do site, não pela
// convenção padrão `modules/<elemento>/manifest.js`.
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
  "core/navigation.js",
  "core/rich-text.js",
  // Administrator (18/10/2026) — ver justificativa completa no cabeçalho.
  "core/module-contract.js",
  "kernel/admin-data.js",
  "kernel/admin-form.js",
  "kernel/schemas/mse-extensions.js",
  "kernel/schemas/mse-menu.js",
  "kernel/schemas/mse-modules.js",
  "kernel/schemas/mse-menu-types.js",
  "kernel/schemas/mse-modules-menu.js",
  "kernel/schemas/mse-template-styles.js",
  // 24/10/2026 — faltavam nesta lista explícita (causa raiz de um boot
  // quebrado em produção: `kernel/installer.js` importa os 3 na raiz do
  // módulo, então qualquer import dele falhava com 404 antes de qualquer
  // outra coisa acontecer, inclusive o `component.js` do Administrator,
  // que depende de `kernel/installer.js` via `site-boot.js#buildAdministratorServices`).
  "kernel/schemas/mse-categories.js",
  "kernel/schemas/mse-tags.js",
  "kernel/schemas/mse-media.js",
  "kernel/installer.js",
  "kernel/template-registry.js",
  "core/list-provisioning.js",
  // Wave 2 (módulos de posição mod_articles_*/mod_tags_*, com_categories
  // já publicado acima): estes módulos leem artigos/categorias em memória
  // via services.adminClient (mesmo contrato de mod_menu/mod_breadcrumbs),
  // então as funções puras que consomem precisam estar no pacote publicado.
  "kernel/content-services.js",
  "kernel/article-mapper.js",
  "kernel/articles-data.js",
  "kernel/categories.js",
  "kernel/publisher-data.js",
  // Nota de integração (Wave 2): os próprios arquivos de
  // `modules/mod_tags_popular`/`mod_tags_similar`/`mod_articles_*` NÃO
  // entram nesta lista — ao contrário do Site Kernel central (listado aqui
  // de forma explícita e mínima), módulos de posição são publicados por
  // `tools/build-release.js` (que varre `modules/` por completo, incluindo
  // `.css`/README/USAGE/package.json), mesmo mecanismo já usado por
  // `mod_menu`/`mod_breadcrumbs`/`mod_footer` — confirmado antes de
  // mesclar as 3 branches da Wave 2 (uma delas havia adicionado esses
  // módulos aqui por engano; removido na integração).
  // Templates shipped pela PLATAFORMA (fallback de 2º/3º nível — ver
  // site-boot.js#createTemplateLayoutResolver): carregados em runtime pelo
  // navegador via import() dinâmico, mesmo mecanismo de qualquer Template
  // real, então precisam ser publicados aqui (pacote do mse-platform), não
  // no pacote de nenhum site consumidor.
  "templates/mse-default/index.js",
  "templates/mse-default/template.json",
  "templates/mse-default/css/template.css",
  "templates/system/index.js",
  "templates/system/template.css",
  "components/com_cpanel/manifest.js",
  "components/com_cpanel/component.js",
  "components/com_cpanel/router.js",
  "components/com_cpanel/administrator.css",
  "components/com_cpanel/administrator-shell.js",
  "components/com_cpanel/administrator-toolbar.js",
  "components/com_cpanel/control-panel.js",
  "components/com_extensions/extensions-screen.js",
  "components/com_extensions/extensions-editor.js",
  "components/com_menus/menus-screen.js",
  "components/com_menus/menus-editor.js",
  "components/com_modules/modules-screen.js",
  "components/com_modules/modules-editor.js",
  "components/com_config/config-screen.js",
  "components/com_config/config-editor.js",
  "components/com_installer/installer-screen.js",
  "components/com_templates/templates-screen.js",
  "components/com_templates/templates-editor.js",
  "components/com_content/publisher.js",
  "components/com_content/publisher-filters.js",
  "components/com_diagnostics/diagnostics.js",
  "kernel/administrator-diagnostics.js",
  "kernel/administrator-permissions.js",
  // 24/10/2026 — com_categories/com_tags/com_media faltavam nesta lista
  // explícita (mesma causa raiz do comentário acima sobre os 3 schemas):
  // `components/com_cpanel/component.js` importa os 3 `*-screen.js` na raiz
  // do módulo (SCREEN_RENDERERS), então qualquer navegação para o
  // Administrator falhava ao importar o Componente inteiro, mesmo para
  // option=com_cpanel/com_menus/etc. — não só para estas 3 telas.
  "components/com_categories/categories-screen.js",
  "components/com_categories/categories-editor.js",
  "components/com_tags/tags-screen.js",
  "components/com_tags/tags-editor.js",
  "components/com_media/media-screen.js",
  "components/com_media/media-editor.js",
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
