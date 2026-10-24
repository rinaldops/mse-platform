import assert from "node:assert/strict";
import {
  translateConfiguracaoItem,
  readMseConfiguracoes,
  buildMseConfiguracoesMigrationPlan,
  migrateMseConfiguracoesToEnglish
} from "../migrate-mse-configuracoes-to-english.js";

/**
 * Fake client simplificado, mesmo princípio dos outros testes de `tools/`
 * (ver cabeçalho de `migrate-camap-activate-tema-01.test.js`).
 */
const LIST_IDS = Object.freeze({
  MSEConfiguracoes: "60000000-0000-4000-8000-000000000001"
});

function createFakeClient(initialItems = []) {
  const items = initialItems.map((item) => ({ ...item }));
  const updates = [];

  async function getListItems() {
    return items.map((item) => ({ ...item }));
  }

  async function getListItem(_list, id) {
    const item = items.find((entry) => entry.Id === Number(id));
    if (!item) throw new Error(`getListItem: item ${id} não encontrado.`);
    return { item: { ...item }, etag: `"item-${item.Id}"`, status: 200 };
  }

  async function updateListItem(_list, id, values, { etag } = {}) {
    if (!etag) throw new Error("updateListItem: etag é obrigatória (fake client).");
    const item = items.find((entry) => entry.Id === Number(id));
    if (!item) throw new Error(`updateListItem: item ${id} não encontrado.`);
    Object.assign(item, values);
    updates.push({ id, values });
    return { item: { ...item }, etag: `"item-${item.Id}-updated"`, status: 204 };
  }

  return { client: { getListItems, getListItem, updateListItem }, items, updates };
}

const LIST_REFS = Object.freeze({ MSEConfiguracoes: { listId: LIST_IDS.MSEConfiguracoes } });

// translateConfiguracaoItem() é pura, congelada, e traduz PT -> EN.
{
  const translated = translateConfiguracaoItem({
    Id: 1, Title: "global", Escopo: "Global", Modulo: null, Tema: "default",
    ConfiguracaoJson: "{}", Ativo: true, Estado: "Publicado", ExtensaoElemento: null
  });
  assert.ok(Object.isFrozen(translated));
  assert.equal(translated.Id, 1);
  assert.deepEqual(translated.values, {
    Scope: "Global", Module: null, Theme: "default", ConfigurationJson: "{}",
    Active: true, State: "Published", ExtensionElement: null
  });
}

{
  const translated = translateConfiguracaoItem({
    Id: 2, Title: "sd-principal", Escopo: "Instancia", Modulo: "sd", Tema: null,
    ConfiguracaoJson: "{}", Ativo: true, Estado: "Rascunho", ExtensaoElemento: null
  });
  assert.deepEqual(translated.values.Scope, "Instance");
  assert.deepEqual(translated.values.State, "Draft");
}

{
  const translated = translateConfiguracaoItem({
    Id: 3, Title: "forum-config", Escopo: "Extensao", Modulo: null, Tema: null,
    ConfiguracaoJson: "{}", Ativo: false, Estado: "Publicado", ExtensaoElemento: "forum"
  });
  assert.equal(translated.values.Scope, "Extension");
  assert.equal(translated.values.ExtensionElement, "forum");
  assert.equal(translated.values.Active, false);
}

// Id ausente/inválido -> lança.
{
  assert.throws(() => translateConfiguracaoItem({ Escopo: "Global" }), /item\.Id/);
}

// Valor de Escopo/Estado sem tradução conhecida -> lança (nunca assume).
{
  assert.throws(() => translateConfiguracaoItem({ Id: 1, Escopo: "Invalido" }), /sem tradução conhecida/);
}

// readMseConfiguracoes/buildMseConfiguracoesMigrationPlan compõem o plano
// puro a partir dos itens reais.
{
  const { client } = createFakeClient([
    { Id: 1, Title: "global", Escopo: "Global", Modulo: null, Tema: "default", ConfiguracaoJson: "{}", Ativo: true, Estado: "Publicado", ExtensaoElemento: null }
  ]);
  const items = await readMseConfiguracoes(client, LIST_REFS.MSEConfiguracoes);
  const plan = buildMseConfiguracoesMigrationPlan(items);
  assert.ok(Object.isFrozen(plan));
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].Id, 1);
}

// migrateMseConfiguracoesToEnglish exige client/listIds/confirm corretos.
{
  const { client } = createFakeClient();
  await assert.rejects(migrateMseConfiguracoesToEnglish({ client }), /listIds/);
  await assert.rejects(migrateMseConfiguracoesToEnglish({ client, listIds: LIST_REFS }), /confirm/);
}

// confirm que nega não grava nada.
{
  const { client, updates } = createFakeClient([
    { Id: 1, Escopo: "Global", Modulo: null, Tema: "default", ConfiguracaoJson: "{}", Ativo: true, Estado: "Publicado", ExtensaoElemento: null }
  ]);
  const result = await migrateMseConfiguracoesToEnglish({ client, listIds: LIST_REFS, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(updates.length, 0);
}

// Item sem os campos EN ainda -> UPDATE in-place, nunca cria item novo.
{
  const { client, updates, items } = createFakeClient([
    { Id: 1, Title: "global", Escopo: "Global", Modulo: null, Tema: "default", ConfiguracaoJson: '{"foo":1}', Ativo: true, Estado: "Publicado", ExtensaoElemento: null }
  ]);
  const result = await migrateMseConfiguracoesToEnglish({ client, listIds: LIST_REFS, confirm: () => true });
  assert.equal(result.status, "migrated");
  assert.deepEqual(result.updated, [1]);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].values, {
    Scope: "Global", Module: null, Theme: "default", ConfigurationJson: '{"foo":1}',
    Active: true, State: "Published", ExtensionElement: null
  });
  assert.equal(items.length, 1, "nunca cria um item novo");
  assert.equal(items[0].Escopo, "Global", "PT permanece inalterado");
}

// Item cujos campos EN já batem -> idempotente, nenhum MERGE disparado.
{
  const { client, updates } = createFakeClient([
    {
      Id: 1, Escopo: "Global", Modulo: null, Tema: "default", ConfiguracaoJson: "{}", Ativo: true, Estado: "Publicado", ExtensaoElemento: null,
      Scope: "Global", Module: null, Theme: "default", ConfigurationJson: "{}", Active: true, State: "Published", ExtensionElement: null
    }
  ]);
  const result = await migrateMseConfiguracoesToEnglish({ client, listIds: LIST_REFS, confirm: () => true });
  assert.equal(result.status, "migrated");
  assert.deepEqual(result.updated, []);
  assert.equal(updates.length, 0, "nenhum MERGE deve ser disparado quando os valores EN já batem");
}

// Múltiplos itens: só os desatualizados recebem UPDATE.
{
  const { client, updates } = createFakeClient([
    {
      Id: 1, Escopo: "Global", Modulo: null, Tema: "default", ConfiguracaoJson: "{}", Ativo: true, Estado: "Publicado", ExtensaoElemento: null,
      Scope: "Global", Module: null, Theme: "default", ConfigurationJson: "{}", Active: true, State: "Published", ExtensionElement: null
    },
    { Id: 2, Escopo: "Instancia", Modulo: "forum", Tema: null, ConfiguracaoJson: "{}", Ativo: true, Estado: "Publicado", ExtensaoElemento: null }
  ]);
  const result = await migrateMseConfiguracoesToEnglish({ client, listIds: LIST_REFS, confirm: () => true });
  assert.deepEqual(result.updated, [2]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 2);
}

console.log("migrate-mse-configuracoes-to-english.test.js (tools): verificações concluídas com sucesso.");
