# plugins/extension/manifest-validator

Plugin do grupo **`extension`** (convenção Joomla: `plugins/extension/*`).

## Objetivo
Validar, de forma transversal, os **manifestos** de extensões (`component`/`module`/`plugin`) carregadas pelo host/kernel.

## Contrato
- Entry-point: `manifest-validator.js`.
- Exporta `createPlugin(options?)` que devolve handlers de evento.
- Handler implementado: `onAfterRoute(payload)`.

### Payload esperado (mínimo)
```js
{
  manifests: [
    { elemento: "blog", manifest: {...}, manifestUrl: "..." },
    ...
  ],
  errors: [],
  warn: (message, meta) => void
}
```

## Modo de falha
- **default (`collect`)**: acumula em `payload.errors`.
- **`throw`**: lança no primeiro manifesto inválido (útil em testes/CI).

## Testes
- `plugins/extension/manifest-validator/test/manifest-validator.test.js`
