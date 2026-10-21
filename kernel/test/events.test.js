import assert from "node:assert/strict";
import { createEventBus, KERNEL_EVENTS } from "../events.js";

// --- KERNEL_EVENTS -------------------------------------------------------

assert.deepEqual([...KERNEL_EVENTS], ["onAfterRoute", "onBeforeRender", "onAfterRender"]);
assert.ok(Object.isFrozen(KERNEL_EVENTS));

console.log("events.test.js: KERNEL_EVENTS ok.");

// --- on/emit: registro e emissão simples ---------------------------------

{
  const bus = createEventBus();
  let received;
  bus.on("onAfterRoute", (payload) => { received = payload; });
  bus.emit("onAfterRoute", { alias: "blog" });
  assert.deepEqual(received, { alias: "blog" });

  console.log("events.test.js: registro e emissão simples ok.");
}

// --- múltiplos handlers chamados na ordem certa --------------------------

{
  const bus = createEventBus();
  const order = [];
  bus.on("onBeforeRender", () => order.push("primeiro"));
  bus.on("onBeforeRender", () => order.push("segundo"));
  bus.on("onBeforeRender", () => order.push("terceiro"));
  bus.emit("onBeforeRender");
  assert.deepEqual(order, ["primeiro", "segundo", "terceiro"]);

  console.log("events.test.js: ordem dos handlers ok.");
}

// --- off remove o handler --------------------------------------------------

{
  const bus = createEventBus();
  let calls = 0;
  function handler() { calls += 1; }
  bus.on("onAfterRender", handler);
  bus.emit("onAfterRender");
  assert.equal(calls, 1);

  bus.off("onAfterRender", handler);
  bus.emit("onAfterRender");
  assert.equal(calls, 1);

  console.log("events.test.js: off remove o handler ok.");
}

// --- off é no-op silencioso quando o handler não existe --------------------

{
  const bus = createEventBus();
  assert.doesNotThrow(() => bus.off("onAfterRender", () => {}));
  assert.doesNotThrow(() => bus.off("evento-nunca-registrado", () => {}));

  console.log("events.test.js: off no-op ok.");
}

// --- emit sem handlers registrados não lança -------------------------------

{
  const bus = createEventBus();
  assert.doesNotThrow(() => bus.emit("evento-sem-handlers", { qualquer: true }));

  console.log("events.test.js: emit sem handlers ok.");
}

// --- validação em on --------------------------------------------------------

{
  const bus = createEventBus();
  assert.throws(() => bus.on("", () => {}), TypeError);
  assert.throws(() => bus.on("   ", () => {}), TypeError);
  assert.throws(() => bus.on(null, () => {}), TypeError);
  assert.throws(() => bus.on(123, () => {}), TypeError);
  assert.throws(() => bus.on("onAfterRoute", null), TypeError);
  assert.throws(() => bus.on("onAfterRoute", "não é função"), TypeError);

  console.log("events.test.js: validação de on ok.");
}

// --- handler que lança não impede os demais no mesmo emit ------------------

{
  const bus = createEventBus();
  let secondCalled = false;
  bus.on("onAfterRoute", () => { throw new Error("falha do primeiro handler"); });
  bus.on("onAfterRoute", () => { secondCalled = true; });

  assert.throws(() => bus.emit("onAfterRoute"), AggregateError);
  assert.equal(secondCalled, true);

  console.log("events.test.js: isolamento de falha entre handlers ok.");
}

// --- erro agregado reúne todos os erros capturados --------------------------

{
  const bus = createEventBus();
  const errorA = new Error("erro A");
  const errorB = new Error("erro B");
  bus.on("onAfterRender", () => { throw errorA; });
  bus.on("onAfterRender", () => {});
  bus.on("onAfterRender", () => { throw errorB; });

  try {
    bus.emit("onAfterRender");
    assert.fail("esperava que emit lançasse.");
  } catch (aggregate) {
    assert.ok(aggregate instanceof AggregateError);
    assert.deepEqual([...aggregate.errors], [errorA, errorB]);
  }

  console.log("events.test.js: erro agregado reúne todos os erros ok.");
}

console.log("events.test.js: verificações concluídas com sucesso.");
