# plugins/ — extensões (Joomla-like) no monorepo modular

Este diretório adota a convenção Joomla:

```text
plugins/<grupo>/<elemento>/
```

No **Mini Joomla (mse-platform)**, plugins são extensões transversais (infra)
que reagem ao ciclo de vida do Site Kernel, sem substituir Componentes
(`components/com_*`) nem Módulos (`modules/mod_*`).

## Status atual (fato)

- Existem plugins reais no repositório (não é mais uma pasta "reservada").
- **O kernel ainda não possui um loader automático** de plugins. Portanto, os
  plugins aqui presentes são executáveis/testáveis isoladamente e o workflow
  de integração ainda depende de um registrador/loader no host (futuro).

## Grupos presentes

- `plugins/system/` — plugins de infraestrutura do kernel (diagnóstico, etc.).
- `plugins/content/` — transformação/sanitização de conteúdo (HTML seguro).
- `plugins/extension/` — validação/ciclo de vida de extensões (manifests).
- `plugins/installer/` — contrato de instalação/inspeção/verificação/aplicação.

## Convenções de manifesto e contrato

- Manifestos seguem `core/module-contract.js#defineModuleManifest` com:
  - `type: "plugin"`
  - `events: [...]` (nomes do event bus do kernel, ex.: `onBeforeRender`)
  - `entrypoints.full` apontando para o entrypoint do plugin.

## Event bus (ciclo de vida)

O barramento mínimo atual está em `kernel/events.js`:

- `onAfterRoute`
- `onBeforeRender`
- `onAfterRender`

Plugins devem registrar handlers nesses eventos, mantendo:

- **isolamento de falha** (o kernel coleta exceções e consolida em
  `AggregateError` por evento);
- **determinismo** (ordem de execução definida pelo loader futuro, tipicamente
  pelo `Ordering` em `MSEExtensions`).

## Responsabilidades (objetivo e boundaries)

- **Plugin** (este diretório):
  - define contrato/manifesto/handlers;
  - não chama SharePoint REST diretamente por padrão;
  - é testável em memória, usando `createEventBus()`.

- **Registry/Loader (futuro, fora do escopo desta pasta):**
  - resolve plugins habilitados (≈ `MSEExtensions` / `#__extensions`);
  - importa entrypoints;
  - executa `register(bus, context)` em ordem;
  - faz cache/isolamento e fornece `dispose()`.

## Workflow recomendado (desenvolvimento)

1. Criar/editar um plugin em `plugins/<grupo>/<elemento>/`.
2. Incluir:
   - manifesto (JS ou JSON), entrypoint e README;
   - testes unitários em `test/` executando via `createEventBus()`.
3. Não alterar `kernel/` para validar o plugin: testes devem ser isolados.
4. A integração no tenant deve ocorrer apenas quando existir loader e
   migrações aprovadas para registrar/habilitar o plugin.

> Importante: `libraries/ui/` é infraestrutura visual compartilhada, não plugin.
> `components/_shared/` é infraestrutura interna do Administrator, não plugin.
