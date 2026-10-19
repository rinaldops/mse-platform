# Roadmap de fechamento do MVP — Mini Joomla!

**Data:** 19/10/2026
**Branch:** `feature/mini-joomla-publisher-administrator`

## Objetivo

Fechar o MVP do Mini Joomla! para o CAMAP-AGP, preservando o modelo Joomla! (Componentes, Módulos, Administrator e Publicador), usando um único MSE no `Default.aspx`, sem ACL própria e sem fallback para portal monolítico. O SharePoint permanece como autoridade de permissões.

## Método de coordenação

Cada etapa possui tarefas independentes, um agente executor e um revisor. Nenhuma etapa avança sem diff revisado, testes proporcionais verdes, critério de aceite registrado e nenhuma regressão nos arquivos da equipe de layout.

## Etapas e gates

### Etapa 0 — Baseline local (concluída nesta branch)

- Publicador integrado às rotas `com_content`/`com_publisher`.
- CRUD com ETag, datas, estados, sanitização e mensagens 403/412.
- Host injeta `adminClient` e listas como `{ listId }`; listas editoriais opcionais.
- Pacote `dist/mse-platform/current` regenerado.
- Suíte `npm test` verde.

**Gate:** código local e empacotamento aprovados.

### Etapa 1 — Testes de contrato do host (concluída)

- Criar teste explícito para `services.listIds` no formato `{ listId }`.
- Verificar preservação de serviços customizados e overrides.
- Revisor: agente independente.

**Gate:** teste reproduz o contrato sem depender de tenant. **Aprovado:**
`host-adapters/modern-script-editor/test/site-boot.test.js` cobre o formato
`{ listId }` e a preservação de serviços customizados.

### Etapa 2 — Auditoria e preparação de publicação (concluída)

- Conferir arquivos incluídos no pacote e hashes.
- Conferir que não há referências de tenant/segredos.
- Conferir snippet do `Default.aspx` e caminhos absolutos/relativos.
- Atualizar documentação separando “local”, “publicado” e “validado no tenant”.

**Gate:** pacote reproduzível e plano de publicação somente-leitura. **Aprovado:**
30 arquivos locais foram empacotados, 31 arquivos remotos foram verificados e a
verificação final terminou com `failures=0`.

### Etapa 3 — Validação real SharePoint (concluída)

Executar exclusivamente via `app-devs/FIORI-AUTO`/RPC 47175 (instância isolada), no site de produção autorizado, após autenticação disponível:

1. [concluído] abrir `Default.aspx`;
2. [concluído] confirmar carregamento dos assets;
3. [concluído] acessar `#/administrator`;
4. [concluído] acessar `com_content`/`com_publisher`;
5. [concluído] ler `CAMAPPublicacoes`;
6. [concluído] criar/editar item de teste;
7. [concluído] verificar ETag, sanitização e 403/412;
8. [concluído] confirmar renderização no BLOG;
9. [concluído] retornar o item de teste à `Lixeira` conforme política do site.

**Gate:** aprovado. A rota canônica do Administrator e o fluxo editorial
BLOG foram renderizados no tenant autorizado. Foram comprovados leitura, criação,
sanitização, ETag, conflito 412, catálogo BLOG, detalhe editorial e retorno SPA.
O item temporário foi retornado à `Lixeira`.

### Etapa 4 — Correções pós-tenant (concluída)

- [concluído] Reconciliar o alias efetivo de `MSEMenu` com a rota BLOG esperada.
- [concluído] Confirmar a renderização do artigo com título, resumo e corpo na rota correta.
- [concluído] Retornar o item temporário de teste à `Lixeira`.
- [concluído] Corrigir apenas a falha reproduzida de ausência da rota `destaques`.
- [concluído] Reexecutar as suítes locais.
- [concluído] Revalidar o pacote e os ativos publicados.
- [concluído] Repetir a validação do cenário afetado.

**Gate:** aprovado; não há bloqueador funcional conhecido e a alteração foi
limitada a um item idempotente de `MSEMenu`, sem alteração de canvas.

### Etapa 5 — Fechamento (concluída)

- [concluído] Atualizar o status documental após a validação de conteúdo.
- [concluído] Revisar o diff e repetir a suíte final.
- [pendente operacional] Commitar/push da atualização documental, quando solicitado.
- [concluído] Registrar arquivos, testes, limitações e evidências.

O código funcional já estava commitado/publicado antes desta rodada. Esta rodada
acrescentou somente evidência e atualização documental local; não altera o
status de publicação dos ativos.

## Plano de coordenação da pendência BLOG (ciclo atual)

O ciclo foi dividido em frentes sem escrita concorrente:

| Frente | Responsável | Escopo | Gate |
|---|---|---|---|
| Diagnóstico de canvas/publicação | Orquestrador + Implementador A | Ler `CanvasContent1` de `Destaques.aspx` via FIORI-AUTO, sem alterar o tenant inicialmente | Evidência do MSE presente, publicado e apontando para a release correta |
| Auditoria de roteamento | Implementador B | Conferir contrato local de `MSEMenu`, `router`, `dispatcher` e manifesto BLOG | Alias, Componente, Visão e parâmetros documentados e coerentes |
| Revisão independente | Revisor | Conferir achados, riscos de produção e critérios de aceite | Aprovação ou lista de correções reproduzíveis |
| Integração/publicação | Orquestrador | Único responsável por alterações no canvas, upload e validação visual | Nenhuma escrita sem plano, ETag, rollback e evidência prévia |

### Sequência obrigatória

1. [concluído] Concluir a auditoria local de roteamento: o alias esperado do catálogo geral é `destaques`, não `blog`.
2. [concluído] Recarregar `Default.aspx#/destaques` no FIORI-AUTO e confirmar que a Home monta o DB com conteúdo real; a leitura direta do canvas REST continua limitada pelo retorno sem valor do CDP.
3. [concluído — divergência corrigida] O GET inicial de `MSEMenu`, por GUID resolvido via `RootFolder/Name`, confirmou a ausência de `Alias=destaques`; essa lacuna foi corrigida no passo 5.
4. [concluído] GET de `MSEExtensoes` por GUID confirmou `Elemento=blog`, `Tipo=Componente`, `Habilitado=true` (Id 5). O registro do BLOG não é a causa do `reason=not-found`.
5. [concluído] Aplicada a correção mínima e idempotente no tenant: criado `MSEMenu` Id 8 com `Alias=destaques`, `Componente=blog`, `Visao=list`, `Estado=Publicado`, `ParamsJson={}`. Não houve alteração em `MSEExtensoes`, canvas ou outras páginas.
6. [concluído] Publicar os ativos atualizados do CAMAP em `SiteAssets/camap-agp-modules/0.1.0` e recarregar `Default.aspx#/destaques`; verificação remota `checked=64`, `failures=0`.
7. [concluído] Após recarregar a página canônica, `#/destaques` renderizou o BLOG com 6 artigos na primeira página. O clique produziu `#/destaques/24-gerentes-a-bordo-ss-81-ns-58`; o detalhe exibiu título, resumo, corpo HTML sanitizado e botão de retorno. O retorno ao catálogo funcionou sem recarregar a página.
8. [condicional] Se qualquer gate falhar após uma escrita autorizada, reverter pelo histórico nativo do SharePoint e registrar a evidência.

A equipe de agentes não tem autorização para editar o tenant ou arquivos fora de
seu escopo. O orquestrador mantém a fila de navegador/publicação para evitar
corridas na mesma sessão e não trata uma resposta vazia do CDP como sucesso.


### Evidência inicial e correção do despacho — 19/10/2026

A sessão FIORI-AUTO foi reconectada ao tenant `petrobrasbr` usando o perfil
persistente autorizado. A leitura inicial foi feita diretamente no contexto da
página canônica `Default.aspx`:

- `MSEMenu` foi resolvida pelo catálogo `RootFolder/Name`, evitando depender do
  título exibido da lista.
- O inventário inicial retornou as rotas `quem-somos`, `nossa-estrutura`,
  `servicos-e-processos`, `docs-e-padroes`, `contatos` e `administrator`.
- Não existia item com `Alias="destaques"`.
- `MSEExtensoes` confirmou o BLOG habilitado: `Elemento="blog"`,
  `Tipo="Componente"`, `Habilitado=true`.
- Na rota `#/destaques/24-gerentes-a-bordo-ss-81-ns-58`, o componente ficou
  vazio com `data-mse-dispatch-reason="not-found"`.

Conclusão inicial: a falha não era de manifesto, ativo ou habilitação do BLOG;
era uma lacuna de dado de roteamento. A migração idempotente foi aplicada em
`MSEMenu` e o fechamento funcional está registrado na seção seguinte.

### Fechamento do fluxo BLOG — 19/10/2026

A rota ausente foi corrigida no tenant autorizado com uma única criação
idempotente em `MSEMenu`:

- item criado: `Id=8`, `Alias=destaques`, `Componente=blog`, `Visao=list`,
  `Estado=Publicado`, `ParamsJson={}`;
- nenhuma alteração foi feita em `MSEExtensoes`, no canvas do SharePoint ou em
  outras páginas/listas;
- após recarga completa da página canônica, o BLOG renderizou 6 artigos na
  primeira página;
- o clique no artigo `Id=24` produziu
  `#/destaques/24-gerentes-a-bordo-ss-81-ns-58`;
- o detalhe exibiu título, resumo, data e `CorpoHtmlSeguroV1`, com um botão de
  retorno ao catálogo;
- o retorno ao catálogo funcionou via navegação SPA, sem recarga;
- não permaneceu `data-mse-dispatch-reason` na renderização válida.

O aceite funcional do fluxo editorial principal foi atingido. A rota
`Destaques.aspx` continua fora do fluxo: a página canônica é `Default.aspx` e o
roteamento ocorre pelo hash.
## Matriz de diagnóstico e aceite do BLOG

| Evidência | Interpretação | Ação |
|---|---|---|
| `#/blog` vazio | Alias não previsto pelo catálogo, salvo se houver item `Alias=blog` | Não alterar MSEMenu por causa desse teste |
| `#/destaques` com `reason=not-found` | Item publicado ausente/incompatível em MSEMenu | Corrigido no tenant com a criação idempotente da rota; revalidar após qualquer alteração de listas |
| `reason=disabled` | BLOG ausente/desabilitado em MSEExtensoes | Corrigir extensão, sem alterar canvas |
| `reason=error` | Falha de manifesto/ativo/global do adapter | Inspecionar assets e console antes de editar listas |
| Componente vazio após #/destaques/<id>-<slug> | A rota pode estar ausente ou o BLOG pode ter falhado no carregamento | Confirmar `data-mse-dispatch-reason`, `MSEMenu` e `MSEExtensoes`; após a correção aplicada, revalidar o detalhe |
| `Destaques.aspx` sem MSE | Página interna não é a página canônica do modelo | Validar a rota hash no `Default.aspx` |

Aceite final: `Default.aspx#/destaques` deve mostrar a grade do BLOG; o clique
em um item deve produzir `#/destaques/<id>-<slug>` e exibir título, resumo e
`CorpoHtmlSeguroV1`, com navegação de retorno ao catálogo. Links externos não
satisfazem este critério.

## Fora do MVP

Painel completo de configuração/instalação, filtros avançados, categorias/tags avançadas, mídia, workflow editorial, histórico visual e editor rico ficam para evolução posterior. Templates e ACL própria continuam fora do escopo conforme decisão do projeto.

## Critérios de encerramento

As Etapas 0–5 estão concluídas com evidência registrada. O código, o
Administrator e a validação funcional do BLOG/detalhe estão entregues. O item
temporário foi limpo. Não há bloqueio funcional conhecido no fluxo BLOG
catálogo → detalhe → retorno.
