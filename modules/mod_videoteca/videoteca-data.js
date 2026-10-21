const VIDEO_FIELDS = [
  "Id", "Title", "FileRef", "FileLeafRef", "URL", "CategoriaId", "Apresentadores/Id", "Apresentadores/Title", "Data",
  "Duracao", "DuracaoSegundos", "Miniatura", "Descricao", "Destaque", "OrdemCarrossel",
  "Visualizacoes", "Evento", "Edicao"
];

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new TypeError(`${label} deve ser um inteiro positivo.`);
  return number;
}

function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    const category = item.Categoria || "Outros";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  return [...groups.entries()].map(([category, videos]) => ({ category, color: videos[0]?.CategoriaCor || "", videos }));
}

function taxonomyColor(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : "";
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
    const taxonomySource = dataSources.get("videoteca-taxonomy");
    const relationSource = dataSources.get("videoteca-video-tags");
    const [items, drive, taxonomy, relations] = await Promise.all([
      client.getListItems(source, {
        select: VIDEO_FIELDS,
        expand: "Apresentadores",
        filter: "FSObjType eq 0 and Ativo eq 1",
        orderBy: "Data desc,Id desc",
        top: 500
      }),
      resolveDrive(client, source),
      dataSources.getClient("videoteca-taxonomy").getListItems(taxonomySource, {
        select: ["Id", "Title", "Tipo", "Cor", "Ordem"],
        filter: "Ativo eq 1",
        orderBy: "Ordem asc,Title asc",
        top: 5000
      }),
      dataSources.getClient("videoteca-video-tags").getListItems(relationSource, {
        select: ["VideoId", "TagId"],
        top: 5000
      })
    ]);
    const taxonomyById = new Map(taxonomy.map((item) => [item.Id, item]));
    const tagsByVideo = new Map();
    for (const relation of relations) {
      const tag = taxonomyById.get(relation.TagId);
      if (tag?.Tipo !== "Tag") continue;
      const tags = tagsByVideo.get(relation.VideoId) || [];
      tags.push(tag.Title);
      tagsByVideo.set(relation.VideoId, tags);
    }
    return items.map((item) => {
      const category = taxonomyById.get(item.CategoriaId);
      return {
        ...item,
        Categoria: category?.Title || "Outros",
        CategoriaCor: taxonomyColor(category?.Cor),
        Tags: [...new Set(tagsByVideo.get(item.Id) || [])],
        Title: item.Title || item.FileLeafRef || "Vídeo sem título",
        URL: item.URL || item.FileRef || "#",
        Miniatura: item.Miniatura || thumbnailUrl(source, drive, item.FileRef)
      };
    });
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
