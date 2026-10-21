/**
 * Barramento de eventos do Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
 * seção 4, `kernel/events.js`; seção 4.1).
 *
 * `createEventBus()` devolve um emissor simples, sem dependências e sem rede:
 * módulos, componentes e (no futuro) plugins se registram em nomes de evento
 * (strings arbitrárias) e são notificados por `emit`.
 *
 * Isolamento de falha (princípio geral da plataformização, ver seção 4.1
 * "Isolamento" do plano): um handler que lança não deve impedir os demais
 * handlers do mesmo `emit` de rodar. Todos os erros capturados durante um
 * `emit` são coletados; se houve pelo menos um, `emit` lança, ao final, um
 * único `AggregateError` reunindo todos eles (preservando o nome do evento
 * e a lista de erros em `error.errors`). Isso dá ao chamador um jeito de
 * saber que algo falhou (ex.: logar, mostrar estado de erro local) sem que
 * a ordem/execução dos outros handlers seja afetada — equivalente ao
 * "estado de erro local sem derrubar a página" descrito para Módulos.
 */

export const KERNEL_EVENTS = Object.freeze(["onAfterRoute", "onBeforeRender", "onAfterRender"]);

/**
 * @returns {{
 *   on: (eventName: string, handler: Function) => void,
 *   off: (eventName: string, handler: Function) => void,
 *   emit: (eventName: string, payload?: unknown) => void
 * }}
 */
export function createEventBus() {
  /** @type {Map<string, Function[]>} */
  const handlersByEvent = new Map();

  function on(eventName, handler) {
    if (typeof eventName !== "string" || eventName.trim() === "") {
      throw new TypeError("eventName deve ser uma string não vazia.");
    }
    if (typeof handler !== "function") {
      throw new TypeError("handler deve ser uma função.");
    }

    const handlers = handlersByEvent.get(eventName);
    if (handlers) {
      handlers.push(handler);
    } else {
      handlersByEvent.set(eventName, [handler]);
    }
  }

  function off(eventName, handler) {
    const handlers = handlersByEvent.get(eventName);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  }

  function emit(eventName, payload) {
    const handlers = handlersByEvent.get(eventName);
    if (!handlers || handlers.length === 0) return;

    const errors = [];
    // Copia a lista antes de iterar: um handler que chama `off` durante o
    // emit (inclusive sobre si mesmo) não deve afetar esta rodada.
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `${errors.length} handler(es) do evento "${eventName}" falharam.`
      );
    }
  }

  return { on, off, emit };
}
