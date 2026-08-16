(async function loadForum() {
  const LISTS = [
    ["forum-taxonomy", "ForumTaxonomia"],
    ["forum-topics", "ForumTopicos"],
    ["forum-topic-tags", "ForumTopicoTags"],
    ["forum-answers", "ForumRespostas"],
    ["forum-reactions", "ForumReacoes"],
    ["forum-preferences", "ForumPreferencias"],
    ["forum-media", "ForumMidia"]
  ];

  const roots = [...document.querySelectorAll('[data-mse-module="forum"]')];
  const script = document.currentScript
    || [...document.scripts].find((item) => item.src.includes("/mse-platform/modules/forum/"));

  function write(message) {
    for (const root of roots) root.textContent = message;
  }

  try {
    if (!roots.length) return;

    const scriptPath = script?.src ? new URL(script.src, window.location.href).pathname : "";
    const assetBase = scriptPath.includes("/SiteAssets/")
      ? scriptPath.slice(0, scriptPath.indexOf("/SiteAssets/") + "/SiteAssets".length)
      : "";
    const webUrl = (roots[0].dataset.webUrl || assetBase.replace(/\/SiteAssets$/, "")).replace(/\/+$/, "");
    if (!webUrl || !assetBase) throw new Error("Unable to infer webUrl or SiteAssets path.");

    write("Carregando fórum...");

    const [{ createSharePointDataSourceRegistry }, { sanitizeRichText }, { createForumReadService }, { mountForum }] =
      await Promise.all([
        import(`${assetBase}/mse-platform/core/0.11.0/data-sources.js`),
        import(`${assetBase}/mse-platform/core/0.11.0/rich-text.js`),
        import(`${assetBase}/mse-platform/modules/forum/0.16.2/forum-data.js`),
        import(`${assetBase}/mse-platform/modules/forum/0.16.2/forum.js`)
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

    mountForum({
      service: createForumReadService({ dataSources, sanitizeRichText }),
      instances: Object.fromEntries(roots.map((root) => [
        root.dataset.configKey || root.id || "forum-home",
        {
          layout: { mode: root.dataset.layoutMode || "contained" },
          forum: { pageSize: Number(root.dataset.pageSize || 12) }
        }
      ]))
    });
  } catch (error) {
    write(`Falha ao carregar o fórum: ${error?.message || error}`);
    console.error(error);
  }
})();
