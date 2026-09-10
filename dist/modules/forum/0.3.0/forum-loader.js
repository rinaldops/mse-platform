(async function loadForum() {
  const CORE_VERSION = "0.3.0";
  const FORUM_VERSION = "0.3.0";
  const LISTS = [
    ["forum-taxonomy", "ForumTaxonomia"],
    ["forum-topics", "ForumTopicos"],
    ["forum-topic-tags", "ForumTopicoTags"],
    ["forum-answers", "ForumRespostas"],
    ["forum-reactions", "ForumReacoes"],
    ["forum-preferences", "ForumPreferencias"],
    ["forum-media", "ForumMidia"]
  ];

  const script = document.currentScript
    || [...document.scripts].find((item) => item.src.includes("/mse-platform/modules/forum/"));
  const roots = [...document.querySelectorAll('[data-mse-module="forum"]')];
  const summaryRoots = [...document.querySelectorAll('[data-mse-module="forum-summary"]')];
  if (!roots.length && !summaryRoots.length && script?.parentNode) {
    const root = document.createElement("div");
    root.id = "mse-forum-home";
    root.dataset.mseModule = "forum";
    root.dataset.configKey = "forum-home";
    root.textContent = "Carregando fórum...";
    script.parentNode.insertBefore(root, script);
    roots.push(root);
  }

  const allRoots = [...roots, ...summaryRoots];

  function write(message) {
    for (const root of allRoots) root.textContent = message;
  }

  try {
    if (!allRoots.length) throw new Error("Missing forum root element.");

    const scriptPath = script?.src ? new URL(script.src, window.location.href).pathname : "";
    const assetBase = scriptPath.includes("/SiteAssets/")
      ? scriptPath.slice(0, scriptPath.indexOf("/SiteAssets/") + "/SiteAssets".length)
      : "";
    const webUrl = (allRoots[0].dataset.webUrl || assetBase.replace(/\/SiteAssets$/, "")).replace(/\/+$/, "");
    if (!webUrl || !assetBase) throw new Error("Unable to infer webUrl or SiteAssets path.");

    write("Carregando fórum...");

    const [{ createSharePointDataSourceRegistry }, { sanitizeRichText }, { createForumReadService }, { mountForum, mountForumSummary }] =
      await Promise.all([
        import(`${assetBase}/mse-platform/core/${CORE_VERSION}/data-sources.js`),
        import(`${assetBase}/mse-platform/core/${CORE_VERSION}/rich-text.js`),
        import(`${assetBase}/mse-platform/modules/forum/${FORUM_VERSION}/forum-data.js`),
        import(`${assetBase}/mse-platform/modules/forum/${FORUM_VERSION}/forum.js`)
      ]);

    const response = await fetch(
      `${webUrl}/_api/web/lists?$select=Id,RootFolder/Name&$expand=RootFolder&$top=5000`,
      { headers: { Accept: "application/json;odata=nometadata" }, cache: "no-store" }
    );
    if (!response.ok) throw new Error(`Unable to read forum lists: HTTP ${response.status}`);

    const lists = new Map((await response.json()).value.map((list) => [list.RootFolder?.Name, list.Id]));
    const sources = LISTS.map(([key, internalName]) => {
      const listId = lists.get(internalName);
      if (!listId) throw new Error(`Missing SharePoint list: ${internalName}`);
      return { key, webUrl, listId };
    });

    const dataSources = createSharePointDataSourceRegistry({
      allowedWebUrls: [webUrl],
      sources
    });

    const service = createForumReadService({ dataSources, sanitizeRichText });

    if (roots.length) {
      mountForum({
        service,
        instances: Object.fromEntries(roots.map((root) => [
          root.dataset.configKey || root.id || "forum-home",
          {
            layout: { mode: root.dataset.layoutMode || "contained" },
            forum: {
              editor: root.dataset.editor || undefined,
              pageSize: Number(root.dataset.pageSize || 12)
            }
          }
        ]))
      });
    }

    if (summaryRoots.length) {
      mountForumSummary({
        service,
        instances: Object.fromEntries(summaryRoots.map((root) => [
          root.dataset.configKey || root.id || "forum-summary",
          {
            layout: { mode: root.dataset.layoutMode || "contained" },
            forumSummary: { pageHref: root.dataset.pageHref }
          }
        ]))
      });
    }
  } catch (error) {
    write(`Falha ao carregar o fórum: ${error?.message || error}`);
    console.error(error);
  }
})();
