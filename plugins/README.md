# plugins/ — reservado (preparação de convenção)

Pasta reservada, sem nenhum plugin real ainda — preparação da convenção
Joomla! `plugins/<grupo>/<nome>/` para uso futuro (Fase 1 da normalização
Joomla!, ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`).

Estrutura esperada quando o primeiro plugin for criado:

```
plugins/
  <grupo>/          # ex.: content, system, user, installer
    <nome>/
      <nome>.js      # ponto de entrada
      services.js    # lógica própria do plugin, se houver
      test/
```

Convenção de evento (Fase 2 da normalização): plugins devem reagir a
eventos do Site Kernel nomeados `on<Área><Momento>` (ex.:
`onAfterRoute`, `onBeforeRender`, `onAfterRender` — ver `kernel/events.js`),
espelhando a convenção `on<Área><Momento><Ação>` do Joomla! original.

Nenhum plugin real existe hoje no mse-platform; esta pasta não deve ser
confundida com `libraries/ui/` (infraestrutura visual compartilhada, não
um plugin) nem com `components/_shared/` (infraestrutura interna de
componentes do Administrator).
