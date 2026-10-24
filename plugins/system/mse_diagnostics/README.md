# plugins/system/mse_diagnostics

Plugin **System** mínimo do Mini Joomla (mse-platform) para diagnosticar o ciclo de vida do Site Kernel.

## Objetivo

- Ser o primeiro plugin real na convenção Joomla `plugins/<group>/<element>/`.
- Exercitar o contrato mínimo de plugin: **manifest + entry**.
- Registrar handlers para os eventos do kernel:
  - `onAfterRoute`
  - `onBeforeRender`
  - `onAfterRender`

## Como funciona

- O plugin exporta uma função `createPlugin()` que devolve `{ register(ctx) }`.
- `register(ctx)` faz `ctx.events.on(eventName, handler)` e devolve um `dispose()`.
- Os handlers acumulam contadores e o `dispose()` desregistra.

> Nota: nesta fase o kernel ainda não possui um loader de plugins. O plugin é **funcional e testado** isoladamente; a integração no kernel/host-adapter será feita em outra fase.

## Arquivos

- `manifest.json` — metadados do plugin.
- `mse_diagnostics.js` — entrypoint do plugin (criação e registro no event bus).
- `test/mse_diagnostics.test.js` — testes unitários do plugin.
