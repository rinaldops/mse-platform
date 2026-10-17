/**
 * Seed mínimo e genérico das 5 listas do Site Kernel (mse-platform/docs/
 * PLANO-SITE-KERNEL-MSE.md, Fase 3): dados de exemplo suficientes para o
 * kernel renderizar algo (um item de menu "Início") sem depender de
 * conteúdo real de nenhum tenant.
 *
 * `buildKernelSeed()` é pura (sem rede/I-O) — apenas descreve os itens.
 * `seedKernelLists()` é a única função deste arquivo que toca rede, e só
 * grava depois de confirmar (via `installer.verify()`) que as 5 listas já
 * foram provisionadas por `kernel/installer.js` — nunca é chamada
 * automaticamente por `installer.apply()`; é sempre uma etapa separada e
 * explícita de quem orquestra a instalação.
 *
 * IMPORTANTE: nenhum dado aqui pode referenciar um tenant real (nome de
 * empresa, GUID corporativo, nome de site real) — apenas valores genéricos
 * de exemplo, com os nomes de campo exatos confirmados em
 * `kernel/schemas/mse-menu.js`, `kernel/schemas/mse-extensoes.js` e
 * `kernel/schemas/mse-modulos.js`.
 */

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Dados puros do seed do kernel, agrupados por `internalName` da lista
 * (mesmo valor usado em `KERNEL_LIST_SCHEMAS`, `kernel/installer.js`).
 * `keyField` identifica o campo de chave natural usado por
 * `seedKernelLists` para checar idempotência antes de criar cada item.
 *
 * @returns {{
 *   MSEMenuTipos: { keyField: string, items: object[] },
 *   MSEMenu: { keyField: string, items: object[] },
 *   MSEExtensoes: { keyField: string, items: object[] },
 *   MSEModulos: { keyField: string, items: object[] },
 *   MSEModulosMenu: { keyField: string, items: object[] }
 * }}
 */
export function buildKernelSeed() {
  return deepFreeze({
    MSEMenuTipos: {
      keyField: "Chave",
      items: [
        {
          Title: "Principal",
          Chave: "principal",
          Descricao: "Menu principal do site"
        }
      ]
    },
    MSEMenu: {
      keyField: "Alias",
      items: [
        {
          // Item raiz "Início": somente módulos (Componente vazio/ausente),
          // item padrão da árvore de menu "principal".
          Title: "Início",
          Alias: "inicio",
          TipoMenu: "principal",
          Nivel: 1,
          Ordem: 0,
          Padrao: true,
          AbrirEm: "MesmaAba",
          Estado: "Publicado"
        }
      ]
    },
    MSEExtensoes: {
      keyField: "Elemento",
      items: [
        {
          // Registro de exemplo claramente genérico — não representa uma
          // extensão real do catálogo.
          Title: "Exemplo",
          Tipo: "Modulo",
          Elemento: "exemplo",
          Habilitado: true,
          Protegido: false
        }
      ]
    },
    MSEModulos: {
      keyField: "ModuloTipo",
      items: []
    },
    MSEModulosMenu: {
      keyField: "ModuloId",
      items: []
    }
  });
}

function odataLiteral(value) {
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

async function itemExists(client, list, keyField, keyValue) {
  const existing = await client.getListItems(list, {
    select: [keyField],
    filter: `${keyField} eq ${odataLiteral(keyValue)}`,
    top: 1
  });
  return Array.isArray(existing) && existing.length > 0;
}

/**
 * Grava o seed do kernel via `client` (reaproveitado — nenhum fetch
 * direto), só depois de `installer.verify()` confirmar que as 5 listas
 * MSE* estão prontas, e só com confirmação explícita via `confirm` (mesmo
 * padrão de callback de `provisionLists`/`installer.apply`, nunca uma
 * gravação automática).
 *
 * Referenciar cada lista pelo `listId` resolvido por `installer.verify()`
 * (não pelo nome interno bruto) é obrigatório, não cosmético:
 * `core/list-provisioning.js#applyList()` cria a lista com
 * `Title = schema.internalName` e, no mesmo `apply()`, renomeia `Title`
 * para `schema.displayName` (ex. "MSEMenu" -> "Itens de menu") sempre que
 * `configureDisplayName` está pendente — o que é o caso logo após a
 * criação. `core/rest.js#listApiPath()` resolve uma string via
 * `getbytitle(nomeInterno)`, que casa pelo `Title` ATUAL da lista, não
 * pelo nome interno fixo — então, depois do `apply()`, `getbytitle(
 * "MSEMenu")` passa a devolver 404 (confirmado contra o tenant real).
 * `installer.verify()` já expõe `plan.lists[].{internalName,listId}`
 * (`publicPlan()`, `core/list-provisioning.js`), então o `listId` é
 * reaproveitado daqui sem nenhuma chamada de rede extra.
 *
 * Idempotente: cada item só é criado se nenhum item existente da lista
 * tiver o mesmo valor na chave natural (`keyField` de `buildKernelSeed()`).
 *
 * @param {{ installer: { verify: () => Promise<object> }, client: { getListItems: Function, createListItem: Function }, confirm: (seed: object) => (boolean | Promise<boolean>) }} options
 * @returns {Promise<{ status: "seeded" | "cancelled", created: Array<{ list: string, key: unknown }> }>}
 */
export async function seedKernelLists({ installer, client, confirm } = {}) {
  if (!installer || typeof installer.verify !== "function") {
    throw new TypeError("installer deve expor verify().");
  }
  if (!client || typeof client.getListItems !== "function" || typeof client.createListItem !== "function") {
    throw new TypeError("client deve expor getListItems(list, options) e createListItem(list, values).");
  }
  if (typeof confirm !== "function") {
    throw new TypeError(
      "O seed do kernel exige um callback confirm(seed) explícito, no mesmo padrão de provisionLists/apply."
    );
  }

  let verification;
  try {
    verification = await installer.verify();
  } catch (error) {
    throw new Error(
      "listas MSE* não estão prontas; rode installer.apply() antes do seed.",
      { cause: error }
    );
  }

  const listIdByInternalName = new Map(
    (verification?.plan?.lists ?? []).map((entry) => [entry.internalName, entry.listId])
  );

  const seed = buildKernelSeed();
  if (await confirm(seed) !== true) {
    return Object.freeze({ status: "cancelled", created: [] });
  }

  const created = [];
  for (const [internalName, { keyField, items }] of Object.entries(seed)) {
    const listId = listIdByInternalName.get(internalName);
    if (!listId) {
      throw new Error(`listId não resolvido para ${internalName} (installer.verify() incompleto ou desatualizado).`);
    }
    const list = { listId };
    for (const item of items) {
      const keyValue = item[keyField];
      // eslint-disable-next-line no-await-in-loop
      if (await itemExists(client, list, keyField, keyValue)) continue;
      // eslint-disable-next-line no-await-in-loop
      await client.createListItem(list, item);
      created.push({ list: internalName, key: keyValue });
    }
  }

  return Object.freeze({ status: "seeded", created });
}
