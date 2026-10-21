# Roadmap de fechamento do MVP — Mini Joomla!

## Objetivo

Entregar Componentes, Módulos, Administrator e Publicador usando um único MSE
na página canônica do consumidor, sem ACL própria nem fallback monolítico.
O SharePoint permanece como autoridade de permissões.

Este roteiro público descreve contratos e critérios de aceite, não comprova
publicação nem validação em qualquer tenant. Endereços, identificadores,
conteúdo, capturas e resultados reais ficam no registro privado do consumidor.

## Etapas e gates

### 0 — Baseline local

- Publicador integrado às rotas `com_content`/`com_publisher`.
- CRUD com ETag, datas, estados editoriais, sanitização e erros 403/412.
- Host injeta `adminClient` e listas como `{ listId }`; listas editoriais opcionais.
- Executar `npm test` e conferir o pacote e seu manifesto de hashes.

**Gate:** código e empacotamento verificados localmente.

### 1 — Contrato do host

`host-adapters/modern-script-editor/test/site-boot.test.js` deve cobrir
`services.listIds` no formato `{ listId }`, serviços customizados e overrides.

**Gate:** testes reproduzíveis sem tenant.

### 2 — Preparação de publicação

- Auditar pacote e histórico ainda não publicado para referências de ambiente
  e segredos; exemplos devem usar placeholders.
- Conferir snippet, caminhos e hashes sem modificar o destino.
- Separar explicitamente implementação local, publicação e aceite em tenant.

**Gate:** pacote reproduzível, destino autorizado e rollback definidos.

### 3 — Validação autorizada em SharePoint

1. Confirmar página canônica e carregamento dos assets.
2. Acessar `#/administrator` e o Publicador.
3. Verificar leitura, criação e edição de item temporário.
4. Verificar sanitização, ETag e tratamento de conflito 412 e permissão 403.
5. Confirmar catálogo BLOG, detalhe e retorno SPA.
6. Limpar o item temporário conforme a política do consumidor.

**Gate:** resultados e limitações registrados privadamente. Nenhuma etapa
local substitui estes testes nem autoriza escrita em produção.

### 4 — Correções e revalidação

Reconciliar o alias de `MSEMenu` com a configuração do catálogo. Antes de criar
uma rota, resolver listas pelo catálogo `RootFolder/Name`, conferir a extensão
em `MSEExtensoes` e revisar os dados existentes. Usar migração idempotente,
ETag e snapshot para rollback; repetir testes locais e o cenário afetado.

Uma resposta vazia da automação não comprova sucesso. Diagnóstico de canvas,
upload e navegação compartilhada devem seguir uma fila, sem escritas concorrentes.

### 5 — Fechamento

Revisar diff, repetir testes proporcionais, registrar limitações e conferir
limpeza dos itens temporários. Commit, push e publicação dependem do escopo
autorizado; código local não implica ativos publicados.

## Matriz de diagnóstico e aceite do BLOG

| Sintoma | Interpretação | Ação |
|---|---|---|
| `#/blog` vazio | Alias não previsto pelo catálogo | Conferir configuração antes de alterar listas |
| `reason=not-found` | Rota publicada ausente/incompatível em `MSEMenu` | Conferir alias, Componente, Visão e parâmetros |
| `reason=disabled` | BLOG ausente/desabilitado em `MSEExtensoes` | Conferir extensão antes do canvas |
| `reason=error` | Falha de manifesto, ativo ou adapter | Inspecionar assets e console |
| Detalhe vazio | Rota ausente ou falha no carregamento | Inspecionar `data-mse-dispatch-reason` e registros |
| Página interna sem MSE | Pode não ser a página canônica | Conferir snippet e `CanvasContent1` antes de publicar |

**Aceite:** `#/<catalogo>` mostra a grade; o clique leva a
`#/<catalogo>/<id>-<slug>` e exibe título, resumo e `CorpoHtmlSeguroV1`,
com retorno ao catálogo sem recarga. Links externos não satisfazem o critério.
A aprovação estética é separada do aceite funcional.

## Evolução posterior

Workflow editorial, mídia, categorias/tags avançadas, histórico visual e editor
rico ficam para evolução posterior. Não implementar ACL própria.
