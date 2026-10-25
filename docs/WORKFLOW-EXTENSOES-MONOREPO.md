# Workflow — extensões (components/modules/plugins/templates) no monorepo

Este documento descreve **responsabilidades** e **fluxo de trabalho** para
desenvolver extensões no `mse-platform` (Mini Joomla), mantendo alinhamento
com a arquitetura Joomla-like.

> Objetivo: permitir que pessoas (e LLMs) encontrem rapidamente onde adicionar
> funcionalidades e como validar sem tocar no tenant.

## 1) Vocabulário

- **Componente**: `components/com_<nome>/` (≈ Joomla `com_*`) — aplicação
  principal renderizada por rota (`option=com_xxx`).
- **Módulo**: `modules/mod_<nome>/` (≈ Joomla `mod_*`) — bloco/posição de página
  (resumo, navegação, widgets).
- **Plugin**: `plugins/<grupo>/<elemento>/` — extensão transversal orientada a
  eventos (ciclo de vida do kernel), sem UI própria por padrão.
- **Template**: `templates/<nome>/` — layout/skin instalável (site/administrator).

## 2) Onde cada coisa vive (responsabilidades)

### Kernel / Core (infraestrutura compartilhada)

- `core/`: contratos, REST SharePoint, provisionamento, rich-text/sanitização.
- `kernel/`: roteamento, dispatcher, layout, menu, posições, event bus.

**Regra:** mudanças em `core/` e `kernel/` são as mais caras (impacto global).
Evite alterar kernel apenas para provar um conceito de extensão.

### Extensões

- `components/`: UI/rotas administrativas e componentes do site.
- `modules/`: widgets/posições.
- `plugins/`: handlers de ciclo de vida (event bus), validação e contratos.
- `templates/`: skin/layout (padrão e system).

## 3) Manifestos e registro

### Manifesto (contrato declarativo)

Extensões JS usam `core/module-contract.js#defineModuleManifest` com:

- `id` (kebab-case)
- `type`: `"component" | "module" | "plugin"`
- `entrypoints.full` (arquivo JS do entrypoint)

Plugins devem declarar `events: [...]` (nomes do event bus).

### Registry/Loader (planejado)

O kernel já possui:

- event bus (`kernel/events.js`)
- registro de extensões (`kernel/extension-registry.js`) e ordenação de plugins
  (`sortPlugins`) com base na lista `MSEExtensions`.

O que ainda é responsabilidade do **loader futuro** (não implementado aqui):

1. resolver plugins habilitados no `MSEExtensions` (`Enabled=true`, `Type=Plugin`);
2. carregar/importar entrypoints;
3. chamar `register(bus, context)` em ordem determinística;
4. oferecer `dispose()` e controle de erro por plugin.

## 4) Workflow recomendado (por tipo)

### 4.1 Plugin

1. Criar em `plugins/<grupo>/<elemento>/`:
   - manifesto (JS/JSON), entrypoint e README;
   - testes em `test/` rodando **sem rede**, usando `createEventBus()`.
2. Validar contrato/handlers localmente.
3. Somente depois integrar no loader/registry e registrar no SharePoint.

### 4.2 Componente / Módulo

1. Criar `manifest.js` (via `defineModuleManifest`).
2. Separar camada de dados (services) de camada de render (view).
3. Incluir testes de DOM fake quando necessário (padrão já usado no repo).

## 5) Critérios de aceite (mínimos)

- **Determinismo:** ordem e resultados previsíveis.
- **Isolamento:** uma falha não derruba o ciclo completo.
- **Sem efeitos colaterais no teste:** testes não fazem REST, não exigem tenant.
- **Docs atualizados quando necessário:** README / plugins/README.md / convenções.

