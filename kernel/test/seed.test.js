import assert from "node:assert/strict";
import { buildKernelSeed, seedKernelLists } from "../seed.js";

/**
 * Fake client simplificado, independente do fake client HTTP de
 * `kernel/test/installer.test.js`: aqui só precisamos de
 * `getListItems(list, { filter })` e `createListItem(list, values)` — a
 * mesma assinatura de `core/rest.js` (`createSharePointRestClient`), mas
 * operando sobre um Map em memória, sem simular o protocolo REST completo
 * (isso já é testado em `core/test/rest.test.js`/`core/test/list-provisioning.test.js`).
 *
 * `seedKernelLists` agora referencia cada lista por `{ listId }` (resolvido
 * via `installer.verify()`, nunca pelo nome interno bruto — ver comentário
 * em `kernel/seed.js#seedKernelLists` sobre o bug real de renomeação de
 * `Title`), então este fake client indexa `lists` por `listId` e usa
 * `LIST_IDS`/`internalNameByListId` só para popular dados iniciais por
 * nome interno nos testes.
 */
const LIST_IDS = Object.freeze({
  MSEMenuTipos: "10000000-0000-4000-8000-000000000001",
  MSEMenu: "10000000-0000-4000-8000-000000000002",
  MSEExtensoes: "10000000-0000-4000-8000-000000000003",
  MSEModulos: "10000000-0000-4000-8000-000000000004",
  MSEModulosMenu: "10000000-0000-4000-8000-000000000005"
});

function createFakeClient(initialItems = {}) {
  const lists = new Map(
    Object.entries(initialItems).map(([internalName, items]) => [LIST_IDS[internalName], [...items]])
  );
  const internalNameByListId = new Map(Object.entries(LIST_IDS).map(([name, id]) => [id, name]));
  const creates = [];

  async function getListItems(list, { filter } = {}) {
    const items = lists.get(list.listId) ?? [];
    if (!filter) return items;
    const match = /^(\w+) eq '([^']*)'$/.exec(filter) ?? /^(\w+) eq (\d+|true|false)$/.exec(filter);
    if (!match) throw new Error(`filtro não suportado pelo fake client: ${filter}`);
    const [, field, rawValue] = match;
    const value = rawValue === "true" ? true : rawValue === "false" ? false
      : /^\d+$/.test(rawValue) ? Number(rawValue) : rawValue;
    return items.filter((item) => item[field] === value);
  }

  async function createListItem(list, values) {
    creates.push({ list: internalNameByListId.get(list.listId), values });
    const items = lists.get(list.listId) ?? [];
    items.push({ ...values });
    lists.set(list.listId, items);
    return { item: { ...values }, etag: '"item-1"', status: 201 };
  }

  // Exposto para asserções em termos de nome interno (mais legível nos
  // testes) a partir do Map interno indexado por listId.
  const listsByInternalName = {
    get(internalName) { return lists.get(LIST_IDS[internalName]); }
  };

  return { client: { getListItems, createListItem }, lists: listsByInternalName, creates };
}

function fakeInstaller({ verifyError } = {}) {
  return {
    verify: async () => {
      if (verifyError) throw verifyError;
      return {
        status: "ready",
        plan: {
          lists: Object.entries(LIST_IDS).map(([internalName, listId]) => ({ internalName, listId }))
        }
      };
    }
  };
}

// buildKernelSeed() é pura, congelada, e usa os nomes de campo exatos dos
// schemas migrados.
{
  const seed = buildKernelSeed();
  assert.ok(Object.isFrozen(seed));
  assert.ok(Object.isFrozen(seed.MSEMenu));
  assert.deepEqual(Object.keys(seed), ["MSEMenuTipos", "MSEMenu", "MSEExtensoes", "MSEModulos", "MSEModulosMenu"]);

  assert.equal(seed.MSEMenuTipos.items.length, 1);
  assert.equal(seed.MSEMenuTipos.items[0].Chave, "principal");

  assert.equal(seed.MSEMenu.items.length, 1);
  const inicio = seed.MSEMenu.items[0];
  assert.equal(inicio.Alias, "inicio");
  assert.equal(inicio.TipoMenu, "principal");
  assert.equal(inicio.Padrao, true);
  assert.equal(inicio.Componente, undefined); // item "somente módulos"

  assert.equal(seed.MSEModulos.items.length, 0);
  assert.equal(seed.MSEModulosMenu.items.length, 0);

  // Nenhum dado real de tenant: nada de nomes de empresa/site reais ou GUIDs.
  const serialized = JSON.stringify(seed);
  assert.doesNotMatch(serialized, /camap|agp/i);
  assert.doesNotMatch(serialized, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
}

// seedKernelLists lança erro claro se chamado antes do apply/sem verify() OK.
{
  const { client, creates } = createFakeClient();
  const installer = fakeInstaller({ verifyError: new Error("pendências") });
  await assert.rejects(
    seedKernelLists({ installer, client, confirm: () => true }),
    /listas MSE\* não estão prontas; rode installer\.apply\(\) antes do seed/
  );
  assert.equal(creates.length, 0);
}

// confirm ausente/sem função lança erro, sem gravar nada.
{
  const { client, creates } = createFakeClient();
  const installer = fakeInstaller();
  await assert.rejects(seedKernelLists({ installer, client }), /confirm/);
  assert.equal(creates.length, 0);
}

// confirm que nega não grava nada.
{
  const { client, creates } = createFakeClient();
  const installer = fakeInstaller();
  const result = await seedKernelLists({ installer, client, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(creates.length, 0);
}

// Com tudo pronto e confirm, grava os itens esperados.
{
  const { client, creates } = createFakeClient();
  const installer = fakeInstaller();
  const result = await seedKernelLists({ installer, client, confirm: () => true });
  assert.equal(result.status, "seeded");
  assert.equal(creates.length, 3); // MSEMenuTipos(1) + MSEMenu(1) + MSEExtensoes(1); MSEModulos/MSEModulosMenu vazios
  assert.deepEqual(
    result.created.map((entry) => entry.list).sort(),
    ["MSEExtensoes", "MSEMenu", "MSEMenuTipos"].sort()
  );
  assert.equal(creates.find((entry) => entry.list === "MSEMenuTipos").values.Chave, "principal");
  assert.equal(creates.find((entry) => entry.list === "MSEMenu").values.Alias, "inicio");
  assert.equal(creates.find((entry) => entry.list === "MSEExtensoes").values.Elemento, "exemplo");
}

// Idempotência: rodar duas vezes não duplica (a segunda consulta já encontra o item).
{
  const { client, creates, lists } = createFakeClient();
  const installer = fakeInstaller();

  const first = await seedKernelLists({ installer, client, confirm: () => true });
  assert.equal(first.status, "seeded");
  assert.equal(creates.length, 3);

  const second = await seedKernelLists({ installer, client, confirm: () => true });
  assert.equal(second.status, "seeded");
  assert.equal(second.created.length, 0); // nada novo: todas as chaves já existem
  assert.equal(creates.length, 3); // nenhuma escrita adicional
  assert.equal(lists.get("MSEMenuTipos").length, 1);
  assert.equal(lists.get("MSEMenu").length, 1);
  assert.equal(lists.get("MSEExtensoes").length, 1);
}

console.log("seed.test.js (kernel): verificações concluídas com sucesso.");
