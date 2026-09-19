const VIDEO_FIELDS = [
  "Id", "Title", "FileRef", "FileLeafRef", "URL", "Categoria", "Categorias", "Apresentadores/Id", "Apresentadores/Title", "Data",
  "Duracao", "DuracaoSegundos", "Miniatura", "Descricao", "Destaque", "OrdemCarrossel",
  "Visualizacoes", "Evento", "Edicao"
];

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new TypeError(`${label} deve ser um inteiro positivo.`);
  return number;
}

function categoriesFor(item) {
  const value = item?.Categorias?.results ?? item?.Categorias;
  const categories = Array.isArray(value) ? value : [];
  const normalized = categories.map((category) => String(category).trim()).filter(Boolean);
  if (!normalized.length && item?.Categoria) normalized.push(String(item.Categoria).trim());
  return [...new Set(normalized.length ? normalized : ["Outros"])];
}

function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    for (const category of categoriesFor(item)) {
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    }
  }
  return [...groups.entries()].map(([category, videos]) => ({ category, videos }));
}

function normalizedGuid(value) {
  return String(value || "").replace(/[{}]/g, "").toLowerCase();
}

async function resolveDrive(client, source) {
  try {
    const result = await client.request("/_api/v2.1/drives?$select=id,webUrl,sharepointIds");
    const drives = result.data?.value || result.data?.d?.results || [];
    return drives.find((drive) => normalizedGuid(drive.sharepointIds?.listId) === normalizedGuid(source.listId)) || null;
  } catch {
    return null;
  }
}

function thumbnailUrl(source, drive, fileRef) {
  if (!drive?.id || !drive.webUrl || !fileRef) return "";
  let rootPath;
  try {
    rootPath = new URL(drive.webUrl).pathname.replace(/\/$/, "");
  } catch {
    return "";
  }
  if (!fileRef.startsWith(`${rootPath}/`)) return "";
  const relativePath = fileRef.slice(rootPath.length + 1).split("/").map(encodeURIComponent).join("/");
  return `${source.webUrl}/_api/v2.1/drives/${encodeURIComponent(drive.id)}/root:/${relativePath}:/thumbnails/0/c1280x720/content`;
}

export function createVideotecaReadService({ dataSources } = {}) {
  if (!dataSources || typeof dataSources.get !== "function" || typeof dataSources.getClient !== "function") {
    throw new TypeError("dataSources deve ser um registro de fontes do núcleo.");
  }

  async function listAllActive() {
    const source = dataSources.get("videoteca-videos");
    const client = dataSources.getClient("videoteca-videos");
    const [items, drive] = await Promise.all([client.getListItems(source, {
      select: VIDEO_FIELDS,
      expand: "Apresentadores",
      filter: "FSObjType eq 0 and Ativo eq 1",
      orderBy: "Data desc,Id desc",
      top: 500
    }), resolveDrive(client, source)]);
    return items.map((item) => ({
      ...item,
      Categorias: categoriesFor(item),
      Categoria: categoriesFor(item)[0],
      Title: item.Title || item.FileLeafRef || "Vídeo sem título",
      URL: item.URL || item.FileRef || "#",
      Miniatura: item.Miniatura || thumbnailUrl(source, drive, item.FileRef)
    }));
  }

  async function listCatalog() {
    const items = await listAllActive();
    const featured = items
      .filter((item) => item.Destaque)
      .sort((a, b) => (a.OrdemCarrossel ?? 0) - (b.OrdemCarrossel ?? 0));
    return { videos: items, featured, groups: groupByCategory(items) };
  }

  async function registerView(videoId) {
    const id = positiveInteger(videoId, "videoId");
    const source = dataSources.get("videoteca-videos");
    const client = dataSources.getClient("videoteca-videos");
    const current = await client.getListItem(source, id, { select: ["Id", "Visualizacoes"] });
    if (!current.item) return null;
    await client.updateListItem(
      source,
      id,
      { Visualizacoes: Number(current.item.Visualizacoes ?? 0) + 1 },
      { etag: current.etag }
    );
    return id;
  }

  return Object.freeze({ listCatalog, registerView });
}
