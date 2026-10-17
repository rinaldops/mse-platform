import assert from "node:assert/strict";
import { createEventBus, KERNEL_EVENTS } from "../events.js";

// --- KERNEL_EVENTS -------------------------------------------------------

assert.deepEqual([...KERNEL_EVENTS], ["afterRoute", "beforeRender", "afterRender"]);
assert.ok(Object.isFrozen(KERNEL_EVENTS));

console.log("events.test.js: KERNEL_EVENTS ok.");

// --- on/emit: registro e emissão simples ---------------------------------

{
  const bus = createEventBus();
  let received;
  bus.on("afterRoute", (payload) => { received = payload; });
  bus.emit("afterRoute", { alias: "blog" });
  assert.deepEqual(received, { alias: "blog" });

  console.log("events.test.js: registro e emissão simples ok.");
}

// --- múltiplos handlers chamados na ordem certa --------------------------

{
  const bus = createEventBus();
  const order = [];
  bus.on("beforeRender", () => order.push("primeiro"));
  bus.on("beforeRender", () => order.push("segundo"));
  bus.on("beforeRender", () => order.push("terceiro"));
  bus.emit("beforeRender");
  assert.deepEqual(order, ["primeiro", "segundo", "terceiro"]);

  console.log("events.test.js: ordem dos handlers ok.");
}

// --- off remove o handler --------------------------------------------------

{
  const bus = createEventBus();
  let calls = 0;
  function handler() { calls += 1; }
  bus.on("afterRender", handler);
  bus.emit("afterRender");
  assert.equal(calls, 1);

  bus.off("afterRender", handler);
  bus.emit("afterRender");
  assert.equal(calls, 1);

  console.log("events.test.js: off remove o handler ok.");
}

// --- off é no-op silencioso quando o handler não existe --------------------

{
  const bus = createEventBus();
  assert.doesNotThrow(() => bus.off("afterRender", () => {}));
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
  assert.throws(() => bus.on("afterRoute", null), TypeError);
  assert.throws(() => bus.on("afterRoute", "não é função"), TypeError);

  console.log("events.test.js: validação de on ok.");
}

// --- handler que lança não impede os demais no mesmo emit ------------------

{
  const bus = createEventBus();
  let secondCalled = false;
  bus.on("afterRoute", () => { throw new Error("falha do primeiro handler"); });
  bus.on("afterRoute", () => { secondCalled = true; });

  assert.throws(() => bus.emit("afterRoute"), AggregateError);
  assert.equal(secondCalled, true);

  console.log("events.test.js: isolamento de falha entre handlers ok.");
}

// --- erro agregado reúne todos os erros capturados --------------------------

{
  const bus = createEventBus();
  const errorA = new Error("erro A");
  const errorB = new Error("erro B");
  bus.on("afterRender", () => { throw errorA; });
  bus.on("afterRender", () => {});
  bus.on("afterRender", () => { throw errorB; });

  try {
    bus.emit("afterRender");
    assert.fail("esperava que emit lançasse.");
  } catch (aggregate) {
    assert.ok(aggregate instanceof AggregateError);
    assert.deepEqual([...aggregate.errors], [errorA, errorB]);
  }

  console.log("events.test.js: erro agregado reúne todos os erros ok.");
}

console.log("events.test.js: verificações concluídas com sucesso.");
