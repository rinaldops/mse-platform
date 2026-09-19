# Contratos de módulo

## Manifesto

Todo módulo publica um `manifest.js` criado com `defineModuleManifest`. O
manifesto identifica o módulo, sua versão, a faixa de compatibilidade com o
Core, capacidades, versão do schema de dados e entrypoints.

O manifesto é declarativo: importá-lo não pode consultar SharePoint, alterar o
DOM ou provisionar estruturas.

## Ciclo de vida

O entrypoint exporta:

```javascript
mount({ root, config, services, context })
dispose()
```

`mount` deve limitar toda renderização a `root`. Serviços SharePoint são
recebidos em `services`; o módulo não os cria a partir do Modern Script Editor.
Ele pode retornar um `dispose` específico da instância.

## Settings

O `settings-schema.js` contém apenas grupos e campos reconhecidos pelo renderer
comum. Identificadores com ponto representam propriedades aninhadas, por
exemplo `layout.mode`. O JSON permanece um detalhe de persistência e não é
exposto ao gestor.

Tipos suportados inicialmente: `text`, `number`, `select`, `multiselect`,
`boolean`, `color`, `url`, `page`, `list` e `taxonomy`.

O Centro de Administração usa `createSharePointConfigurationStore` para listar,
criar e editar instâncias. A gravação exige a ETag obtida na leitura; alterações
concorrentes são recusadas sem sobrescrever o trabalho de outra pessoa.

Mudanças de versão usam migrações puras e sequenciais por meio de
`migrateSettings`. A função devolve a configuração migrada e o relatório das
etapas aplicadas antes de qualquer persistência.

## Hosts

O adaptador MSE está em
`host-adapters/modern-script-editor/bootstrap.js`. O host local em
`examples/local-host/` usa a mesma assinatura pública para demonstrar que o
módulo não depende do MSE. O host local é somente uma ferramenta de
desenvolvimento; MSE permanece o único host produtivo deste ciclo.

O snippet mínimo está em
`host-adapters/modern-script-editor/snippet.html`. A integração privada do site
fornece `configurationStore` e `services`; o adaptador não contém URLs, GUIDs
ou regras de um consumidor. Use `data-mse-view="summary"` para o entrypoint
resumido declarado pelo módulo.

## Provisionamento

O runtime pode chamar `resolveListSources`, que somente inspeciona as estruturas
e devolve suas URLs. Criação ou atualização usa `provisionLists` em fluxo
administrativo com confirmação visível. Um loader nunca deve chamar
`provisionLists` durante a carga normal da página.

O instalador administrativo expõe operações separadas: `inspect` produz o
plano sem gravar, `apply` exige confirmação explícita e `verify` relê todas as
estruturas. A configuração do site usa o schema v2 de `MSEConfiguracoes`, que
distingue Full/Summary, rascunho/publicado e registra as versões de módulo e de
settings usadas na validação. O runtime carrega somente registros publicados.
