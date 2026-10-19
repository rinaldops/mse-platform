# Roadmap de fechamento do MVP — Mini Joomla!

**Data:** 18/10/2026
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

### Etapa 3 — Validação real SharePoint (parcial; pendência de conteúdo)

Executar exclusivamente via `app-devs/FIORI-AUTO`/RPC 47175 (instância isolada), no site de produção autorizado, após autenticação disponível:

1. [concluído] abrir `Default.aspx`;
2. [concluído] confirmar carregamento dos assets;
3. [concluído] acessar `#/administrator`;
4. [concluído] acessar `com_content`/`com_publisher`;
5. [concluído] ler `CAMAPPublicacoes`;
6. [concluído] criar/editar item de teste;
7. [concluído] verificar ETag, sanitização e 403/412;
8. [pendente] confirmar renderização no BLOG;
9. [pendente] remover/arquivar o item de teste conforme política do site.

**Gate:** **parcialmente aprovado** para o Administrator: a rota canônica foi
renderizada no tenant, com leitura, criação, sanitização, ETag e conflito 412
comprovados. O gate permanece aberto para o conteúdo: a sondagem da rota BLOG
não montou Componente/Módulo e o item temporário precisa ser retornado a
`Lixeira`.

### Etapa 4 — Correções pós-tenant (aguardando a pendência de conteúdo)

- Reconciliar o alias efetivo de `MSEMenu` com a rota BLOG esperada.
- Confirmar a renderização do artigo com título, resumo e corpo na rota correta.
- Retornar o item temporário de teste à `Lixeira`.
- Corrigir apenas falhas reproduzidas.
- Reexecutar suítes locais.
- Regenerar pacote.
- Repetir validação do cenário afetado.

**Gate:** nenhum bloqueador conhecido e rollback documentado.

### Etapa 5 — Fechamento (em andamento; código commitado e publicado)

- Atualizar status documental após a validação de conteúdo.
- Revisar diff completo e repetir a suíte final se houver correção.
- Commitar e fazer push da correção, se houver.
- Produzir resumo final de arquivos, testes, limitações e evidências.

O commit/push do estado atual já foi realizado em `0aa7e5f`; esta etapa não é
reaberta para o código já entregue, apenas para registrar o fechamento da
validação pendente.

## Fora do MVP

Painel completo de configuração/instalação, filtros avançados, categorias/tags avançadas, mídia, workflow editorial, histórico visual e editor rico ficam para evolução posterior. Templates e ACL própria continuam fora do escopo conforme decisão do projeto.

## Critérios de encerramento

O MVP só será declarado concluído quando as Etapas 0–5 tiverem evidência registrada.
No estado atual, o código e o Administrator estão entregues, mas a validação
funcional do BLOG/detalhe e a limpeza do item temporário ainda não possuem
comprovação final. A ausência de autenticação ou de autorização para uma ação no tenant é bloqueio externo, não será mascarada como sucesso local.
