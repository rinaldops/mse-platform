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

### Etapa 1 — Testes de contrato do host (em execução)

- Criar teste explícito para `services.listIds` no formato `{ listId }`.
- Verificar preservação de serviços customizados e overrides.
- Revisor: agente independente.

**Gate:** teste reproduz o contrato sem depender de tenant.

### Etapa 2 — Auditoria e preparação de publicação

- Conferir arquivos incluídos no pacote e hashes.
- Conferir que não há referências de tenant/segredos.
- Conferir snippet do `Default.aspx` e caminhos absolutos/relativos.
- Atualizar documentação separando “local”, “publicado” e “validado no tenant”.

**Gate:** pacote reproduzível e plano de publicação somente-leitura.

### Etapa 3 — Validação real SharePoint

Executar exclusivamente via `app-devs/FIORI-AUTO`/RPC 47174, no site de produção autorizado, após autenticação disponível:

1. abrir `Default.aspx`;
2. confirmar carregamento dos assets;
3. acessar `#/administrator`;
4. acessar `com_content`/`com_publisher`;
5. ler `CAMAPPublicacoes`;
6. criar/editar item de teste;
7. verificar ETag, sanitização e 403/412;
8. confirmar renderização no BLOG;
9. remover/arquivar o item de teste conforme política do site.

**Gate:** evidência visual/DOM e resultado das operações sem alterar layout da equipe 2.

### Etapa 4 — Correções pós-tenant

- Corrigir apenas falhas reproduzidas.
- Reexecutar suítes locais.
- Regenerar pacote.
- Repetir validação do cenário afetado.

**Gate:** nenhum bloqueador conhecido e rollback documentado.

### Etapa 5 — Fechamento

- Atualizar status documental.
- Revisar diff completo.
- Commitar a branch.
- Push da branch.
- Produzir resumo de arquivos, testes e limitações.

## Fora do MVP

Painel completo de configuração/instalação, filtros avançados, categorias/tags avançadas, mídia, workflow editorial, histórico visual e editor rico ficam para evolução posterior. Templates e ACL própria continuam fora do escopo conforme decisão do projeto.

## Critérios de encerramento

O MVP só será declarado concluído quando as Etapas 0–5 tiverem evidência registrada. A ausência de autenticação ou de autorização para uma ação no tenant é bloqueio externo, não será mascarada como sucesso local.
