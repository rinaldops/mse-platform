// mse-platform/tools/migrate-camap-institutional-drafts.js
//
// Exemplo de migração de cinco páginas institucionais para rotas do BLOG.
// Os textos abaixo são placeholders públicos, não conteúdo de um consumidor.
// Revise/substitua o plano em armazenamento privado antes de qualquer aplicação.
//
// O mecanismo completo é entregue (rota -> BLOG artigo/categoria), MAS o
// conteúdo gerado fica em `EstadoEditorial: "Rascunho"` (nunca "Publicado"),
// com uma anotação explícita de pendência de revisão editorial. Isso não é
// só uma convenção de dados: `CAMAP-AGP/core/core.js#publication()`/
// `#published()` filtram SEMPRE `EstadoEditorial eq 'Publicado'` (confirmado
// pelo contrato do consumidor) — então, até alguém publicar manualmente o rascunho,
// a rota resolve mecanicamente (Componente/visão/parâmetros corretos) mas o
// BLOG mostra "Publicação não encontrada" (visão artigo) ou lista vazia
// (visão lista). Esse é o comportamento INTENCIONAL: nenhum texto
// institucional "novo" aparece em produção sem decisão humana, mesmo com a
// rota já funcionando.
//
// Mapeamento de exemplo:
//   - "quem-somos"           -> 1 artigo (CAMAPPublicacoes), Visao "article"
//   - "nossa-estrutura"      -> 1 artigo (CAMAPPublicacoes), Visao "article"
//   - "contatos"             -> 1 artigo (CAMAPPublicacoes), Visao "article"
//   - "servicos-e-processos" -> 1 categoria (CAMAPCategorias) + a visão "list"
//     do BLOG filtrada por `CategoriaTexto` (`core/core.js#published({categoria})`).
//   - "docs-e-padroes"       -> mesmo padrão de "servicos-e-processos".
//
// Rotas de ARTIGO (visão "article") precisam do `Id` NATIVO (numérico) do
// item de `CAMAPPublicacoes` em `MSEMenu.ParamsJson` — `modules/blog/blog.js
// #renderDetail` resolve a publicação por `pubId` numérico
// (`core.publication(id)`), nunca por `Slug`. Como esse `Id` só existe
// DEPOIS de o item ser criado (ou já existir, numa 2ª rodada), este script
// cria/resolve `CAMAPCategorias`+`CAMAPPublicacoes` PRIMEIRO e só então monta
// as linhas de `MSEMenu`, com o `Id` real já resolvido — mesmo princípio de
// duas fases (dados dependentes resolvidos antes do passo final) de
// `migrate-camap-home.js#migrateCamapHomeC4Adjustments` (lá para
// `MSEModulosMenu`, aqui para `MSEMenu`). Rotas de LISTA (visão "list") não
// têm essa dependência — usam o texto de `CategoriaTexto` diretamente.
//
// Cada artigo/categoria usa `Slug` igual ao alias da rota (ou a um slug
// auxiliar, nas 2 publicações-semente de categoria) como chave de
// idempotência; `MSEMenu` usa `Alias`. Nenhuma chave é o `Id` nativo.
//
// `CorpoHtmlSeguroV1`/`Title`/`Resumo` são montados a partir de
// `ConfiguracaoJsonV1.title`/`subtitle`/`items[].title`/`items[].description`
// de exemplo, reformatados em HTML simples de parágrafos/lista. Não são
// textos institucionais aprovados para publicação.
//
// Mesmo padrão de todo o resto de `tools/`: `buildX()` puro e congelado +
// `migrateX({ client, listIds, confirm })` idempotente, só grava atrás de
// `confirm` explícito. Diferente de `migrate-camap-home.js`, este script NÃO
// depende de `installer.verify()`: `CAMAPPublicacoes`/`CAMAPCategorias` não
// são provisionadas pelo instalador genérico do kernel (são provisionadas
// por `CAMAP-AGP/data/provisioning/provision-camap.js`, fora do kernel);
// `MSEMenu` é provisionada pelo kernel, mas já deve estar com
// `installer.apply()` aplicado desde o C3. Por isso quem chama resolve e
// informa os 3 `{ listId }`/título já prontos (ver JSDoc de
// `migrateCamapInstitutionalDrafts`).

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const DRAFT_NOTICE =
  "Rascunho técnico de exemplo — " +
  "pendente de revisão editorial antes de publicar.";

function escHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Converte o shape `{ subtitle, items: [{ title, description }] }` de
 * `ConfiguracaoJsonV1` (C1) em HTML simples (parágrafo de abertura + lista),
 * sem adicionar nenhum texto que não esteja já no JSON de origem — só o
 * aviso de rascunho (`DRAFT_NOTICE`) é texto deste script, nunca
 * apresentado como conteúdo institucional.
 *
 * @param {{ subtitle?: string, items?: Array<{ title?: string, description?: string }> }} config
 * @returns {string}
 */
function buildCorpoHtml(config) {
  const partes = [];
  if (config?.subtitle) {
    partes.push(`<p>${escHtml(config.subtitle)}</p>`);
  }
  const items = Array.isArray(config?.items) ? config.items : [];
  if (items.length > 0) {
    const linhas = items
      .map((item) => `<li><strong>${escHtml(item?.title)}</strong>${item?.description ? ` — ${escHtml(item.description)}` : ""}</li>`)
      .join("");
    partes.push(`<ul>${linhas}</ul>`);
  }
  partes.push(`<p><em>${escHtml(DRAFT_NOTICE)}</em></p>`);
  return partes.join("");
}

/**
 * Dados puros da migração de exemplo. Cada entrada de
 * `publicacoes`/`categorias` já traz o
 * HTML/`Title`/`Resumo` derivados de conteúdo fictício (congelado
 * aqui como literal, não recalculado em tempo de execução, para que o
 * conteúdo da migração seja auditável por leitura direta deste arquivo —
 * mesmo princípio de `buildCamapHomeMigration()`).
 *
 * `menuBlueprint` NÃO inclui `ParamsJson` final: isso só pode ser montado
 * depois de `publicacoes` estarem criadas/resolvidas (ver cabeçalho, rotas
 * de artigo precisam do `Id` nativo) — `migrateCamapInstitutionalDrafts`
 * completa esse passo.
 *
 * @returns {{
 *   categorias: { keyField: string, items: object[] },
 *   publicacoes: { keyField: string, items: object[] },
 *   menuBlueprint: Array<{
 *     Alias: string, Title: string, Ordem: number,
 *     routing: { kind: "article", pubSlug: string } | { kind: "list", categoria: string }
 *   }>
 * }}
 */
export function buildCamapInstitutionalDraftsMigration() {
  const quemSomos = {
    subtitle:
      "A organização de exemplo reúne competências para apoiar seus projetos. " +
      "Substitua este texto após revisão editorial.",
    items: [
      { title: "Nossa atuação", description: "Descreva a atuação da organização de exemplo." },
      { title: "Missão e posicionamento", description: "Insira a missão aprovada pelo responsável editorial." },
      { title: "Organograma e gestores", description: "Insira as informações organizacionais aprovadas." }
    ]
  };
  const nossaEstrutura = {
    subtitle:
      "O modelo de exemplo apresenta quatro frentes de trabalho. " +
      "Substitua os rótulos e descrições após revisão.",
    items: [
      { title: "Área de exemplo 1", description: "Descrição a revisar." },
      { title: "Área de exemplo 2", description: "Descrição a revisar." },
      { title: "Área de exemplo 3", description: "Descrição a revisar." },
      { title: "Área de exemplo 4", description: "Descrição a revisar." }
    ]
  };
  const contatos = {
    subtitle: "Gestores, pontos focais e canais de colaboração organizados por assunto e macrofrente.",
    items: [
      { title: "Dúvidas sobre o portal", description: "Canal do dono do conteúdo para correções, sugestões e dúvidas sobre navegação." },
      { title: "Demandas técnicas", description: "Pontos focais por disciplina para orientar o encaminhamento de solicitações." },
      { title: "Comunicação e eventos", description: "Insira um canal editorial aprovado." }
    ]
  };
  const servicosEProcessos = {
    subtitle: "Fluxos, entradas necessárias, prazos de referência e pontos focais, organizados por tipo de solicitação.",
    items: [
      { title: "Solicitar apoio técnico", description: "Orientação para enquadrar uma demanda, identificar a disciplina responsável e preparar as informações mínimas para análise." },
      { title: "Consultar processos", description: "Insira as referências aprovadas dos processos." },
      { title: "Acompanhar compromissos", description: "Acesso a fóruns, calendários e instrumentos aprovados de acompanhamento, respeitando as permissões de cada ambiente." }
    ]
  };
  const docsEPadroes = {
    subtitle: "Padrões, manuais e diretrizes apresentados por tema e área proprietária, sem duplicar os arquivos das bibliotecas oficiais.",
    items: [
      { title: "Padrões e diretrizes", description: "Insira as referências normativas aprovadas." },
      { title: "Manuais e guias", description: "Materiais de apoio à execução das rotinas, com responsável e data da próxima revisão claramente identificados." },
      { title: "Modelos e ferramentas", description: "Templates, checklists e instrumentos de trabalho publicados em seus repositórios oficiais." }
    ]
  };

  return deepFreeze({
    // --- CAMAPCategorias: 1 por rota de lista -----------------------------
    categorias: {
      keyField: "Slug",
      items: [
        { Title: "Serviços e processos", Slug: "servicos-e-processos", Descricao: DRAFT_NOTICE, Ordem: 1, Ativo: true },
        { Title: "Docs e padrões", Slug: "docs-e-padroes", Descricao: DRAFT_NOTICE, Ordem: 2, Ativo: true }
      ]
    },

    // --- CAMAPPublicacoes: 3 artigos fixos + 2 artigos-semente de categoria
    publicacoes: {
      keyField: "Slug",
      items: [
        {
          Title: "Quem somos", Slug: "quem-somos",
          Resumo: quemSomos.subtitle, CorpoHtmlSeguroV1: buildCorpoHtml(quemSomos),
          EstadoEditorial: "Rascunho", Destaque: false, CategoriaTexto: ""
        },
        {
          Title: "Nossa estrutura", Slug: "nossa-estrutura",
          Resumo: nossaEstrutura.subtitle, CorpoHtmlSeguroV1: buildCorpoHtml(nossaEstrutura),
          EstadoEditorial: "Rascunho", Destaque: false, CategoriaTexto: ""
        },
        {
          Title: "Contatos", Slug: "contatos",
          Resumo: contatos.subtitle, CorpoHtmlSeguroV1: buildCorpoHtml(contatos),
          EstadoEditorial: "Rascunho", Destaque: false, CategoriaTexto: ""
        },
        // Artigos-semente das 2 rotas de lista: sem eles a rota "funciona"
        // mecanicamente mas filtra uma lista vazia — a semente garante que
        // há algo filtrável por CategoriaTexto desde já (ainda em Rascunho,
        // não visível em produção até revisão/publicação humana).
        {
          Title: "Serviços e processos", Slug: "servicos-e-processos-intro",
          Resumo: servicosEProcessos.subtitle, CorpoHtmlSeguroV1: buildCorpoHtml(servicosEProcessos),
          EstadoEditorial: "Rascunho", Destaque: false, CategoriaTexto: "Serviços e processos"
        },
        {
          Title: "Docs e padrões", Slug: "docs-e-padroes-intro",
          Resumo: docsEPadroes.subtitle, CorpoHtmlSeguroV1: buildCorpoHtml(docsEPadroes),
          EstadoEditorial: "Rascunho", Destaque: false, CategoriaTexto: "Docs e padrões"
        }
      ]
    },

    // --- MSEMenu: montado em 2 fases (ver cabeçalho do arquivo) -----------
    menuBlueprint: [
      { Alias: "quem-somos", Title: "Quem somos", Ordem: 10, routing: { kind: "article", pubSlug: "quem-somos" } },
      { Alias: "nossa-estrutura", Title: "Nossa estrutura", Ordem: 20, routing: { kind: "article", pubSlug: "nossa-estrutura" } },
      { Alias: "servicos-e-processos", Title: "Serviços e processos", Ordem: 30, routing: { kind: "list", categoria: "Serviços e processos" } },
      { Alias: "docs-e-padroes", Title: "Docs e padrões", Ordem: 40, routing: { kind: "list", categoria: "Docs e padrões" } },
      { Alias: "contatos", Title: "Contatos", Ordem: 50, routing: { kind: "article", pubSlug: "contatos" } }
    ]
  });
}

function odataLiteral(value) {
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

/**
 * Busca o item de `list` cujo `keyField` casa com `keyValue`, trazendo
 * também `Id` e os campos de `extraSelect`. Devolve `null` quando não
 * encontrado — nunca lança por ausência. Mesma função de
 * `migrate-camap-home.js#findItemByKey` (não reimportada de lá de
 * propósito — `tools/` evita acoplar scripts de migração uns aos outros;
 * cada um é standalone e auditável isoladamente).
 *
 * @param {object} client
 * @param {{listId:string}|string} list
 * @param {string} keyField
 * @param {unknown} keyValue
 * @param {string[]} [extraSelect]
 * @returns {Promise<object|null>}
 */
async function findItemByKey(client, list, keyField, keyValue, extraSelect = []) {
  const select = [...new Set(["Id", keyField, ...extraSelect])];
  const found = await client.getListItems(list, {
    select,
    filter: `${keyField} eq ${odataLiteral(keyValue)}`,
    top: 1
  });
  return Array.isArray(found) && found.length > 0 ? found[0] : null;
}

/**
 * Cria o item (chave `keyField`/`keyValue`) se ainda não existir; devolve o
 * `Id` nativo em qualquer um dos dois casos (encontrado ou recém-criado) —
 * é esse `Id` que as rotas de artigo (`MSEMenu.ParamsJson`) precisam.
 *
 * @returns {Promise<{ id: number, created: boolean }>}
 */
async function createIfMissing(client, list, keyField, values) {
  const keyValue = values[keyField];
  const existing = await findItemByKey(client, list, keyField, keyValue, ["Id"]);
  if (existing) return { id: existing.Id, created: false };
  const { item } = await client.createListItem(list, values);
  if (item?.Id == null) {
    throw new Error(`createListItem não devolveu Id para "${keyValue}" (keyField ${keyField}).`);
  }
  return { id: item.Id, created: true };
}

/**
 * Aplica `buildCamapInstitutionalDraftsMigration()` contra o tenant real.
 * Diferente de `migrate-camap-home.js#migrateCamapHome`, as listas aqui não
 * vêm de `installer.verify()` — ver cabeçalho do arquivo. Quem chama
 * resolve e informa os 3 `{ listId }`/título diretamente.
 *
 * Fluxo (ver cabeçalho para o motivo das 2 fases):
 * 1. Cria/resolve `CAMAPCategorias` (idempotente por `Slug`).
 * 2. Cria/resolve `CAMAPPublicacoes` (idempotente por `Slug`), guardando o
 *    `Id` nativo de cada uma por `Slug`.
 * 3. Monta as 5 linhas de `MSEMenu` a partir de `menuBlueprint`, resolvendo
 *    `Visao`/`ParamsJson` conforme `routing.kind`:
 *    - `"article"` -> `Visao: "article"`, `ParamsJson: {"id": <Id nativo>}`.
 *    - `"list"` -> `Visao: "list"`, `ParamsJson: {"categoria": <texto>}`.
 *    Cria cada linha só se `Alias` ainda não existir (mesmo padrão aditivo
 *    de `migrateCamapHome` — este script nunca re-sincroniza um item de
 *    menu já existente; isso é tarefa do Administrator, não de uma
 *    migração automática).
 *
 * @param {{
 *   client: { getListItems: Function, createListItem: Function },
 *   listIds: {
 *     MSEMenu: {listId:string}|string,
 *     CAMAPCategorias: {listId:string}|string,
 *     CAMAPPublicacoes: {listId:string}|string
 *   },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{
 *   status: "migrated" | "cancelled",
 *   categorias: Array<{ key: string, action: "created"|"skipped" }>,
 *   publicacoes: Array<{ key: string, action: "created"|"skipped" }>,
 *   menuItems: Array<{ key: string, action: "created"|"skipped" }>
 * }>}
 */
export async function migrateCamapInstitutionalDrafts({ client, listIds, confirm } = {}) {
  if (!client || typeof client.getListItems !== "function" || typeof client.createListItem !== "function") {
    throw new TypeError("client deve expor getListItems(list, options) e createListItem(list, values).");
  }
  if (!listIds || !listIds.MSEMenu || !listIds.CAMAPCategorias || !listIds.CAMAPPublicacoes) {
    throw new TypeError(
      "listIds deve informar MSEMenu, CAMAPCategorias e CAMAPPublicacoes (listId ou título — ver core/rest.js#listApiPath)."
    );
  }
  if (typeof confirm !== "function") {
    throw new TypeError(
      "A migração exige um callback confirm(plan) explícito, no mesmo padrão de migrateCamapHome."
    );
  }

  const plan = buildCamapInstitutionalDraftsMigration();
  if (await confirm(plan) !== true) {
    return Object.freeze({ status: "cancelled", categorias: [], publicacoes: [], menuItems: [] });
  }

  const categorias = [];
  for (const values of plan.categorias.items) {
    const keyValue = values[plan.categorias.keyField];
    // eslint-disable-next-line no-await-in-loop
    const { created } = await createIfMissing(client, listIds.CAMAPCategorias, plan.categorias.keyField, values);
    categorias.push({ key: keyValue, action: created ? "created" : "skipped" });
  }

  const publicacoes = [];
  const pubIdBySlug = new Map();
  for (const values of plan.publicacoes.items) {
    const keyValue = values[plan.publicacoes.keyField];
    // eslint-disable-next-line no-await-in-loop
    const { id, created } = await createIfMissing(client, listIds.CAMAPPublicacoes, plan.publicacoes.keyField, values);
    pubIdBySlug.set(keyValue, id);
    publicacoes.push({ key: keyValue, action: created ? "created" : "skipped" });
  }

  const menuItems = [];
  for (const { Alias, Title, Ordem, routing } of plan.menuBlueprint) {
    let visao;
    let paramsJson;
    if (routing.kind === "article") {
      const pubId = pubIdBySlug.get(routing.pubSlug);
      if (pubId == null) {
        throw new Error(`Id de CAMAPPublicacoes não resolvido para slug "${routing.pubSlug}" (passo anterior falhou silenciosamente?).`);
      }
      visao = "article";
      paramsJson = JSON.stringify({ id: pubId });
    } else if (routing.kind === "list") {
      visao = "list";
      paramsJson = JSON.stringify({ categoria: routing.categoria });
    } else {
      throw new Error(`routing.kind desconhecido: "${routing.kind}".`);
    }

    const menuValues = {
      Title, Alias, TipoMenu: "principal", Nivel: 1, Ordem,
      Componente: "blog", Visao: visao, ParamsJson: paramsJson,
      Padrao: false, AbrirEm: "MesmaAba", Estado: "Publicado"
    };
    // eslint-disable-next-line no-await-in-loop
    const existing = await findItemByKey(client, listIds.MSEMenu, "Alias", Alias);
    if (existing) {
      menuItems.push({ key: Alias, action: "skipped" });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await client.createListItem(listIds.MSEMenu, menuValues);
    menuItems.push({ key: Alias, action: "created" });
  }

  return Object.freeze({ status: "migrated", categorias, publicacoes, menuItems });
}
