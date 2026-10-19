# Revisão das migrações Tema 1 e Administrator

**Data:** 18/10/2026  
**Escopo:** revisão estática e testes locais; nenhuma alteração foi aplicada ao tenant.

## 1. Arquivos revisados

- `tools/migrate-camap-activate-tema-01.js`
- `tools/migrate-mse-administrator-route.js`
- `tools/test/migrate-camap-activate-tema-01.test.js`
- `tools/test/migrate-mse-administrator-route.test.js`

## 2. Resultado da revisão estática

### 2.1 Ativação do Tema 1

O script está adequado para aplicação controlada:

- plano puro e congelado (`buildActivateTema01Migration()`);
- exige exatamente um item `Escopo = Global`;
- não cria um segundo item global;
- em caso de zero ou mais de um item global, interrompe antes de gravar;
- faz leitura de ETag antes do `updateListItem`;
- envia somente `Tema: "camap-tema-01"`;
- preserva `Layout`, `ConfiguracaoJson` e os demais campos;
- é idempotente quando o tema já está ativo;
- exige confirmação explícita antes da leitura/aplicação;
- não contém chamada de rede no construtor do plano.

### 2.2 Rota do Administrator

O script também está adequado para aplicação controlada:

- plano puro e congelado (`buildMseAdministratorRouteMigration()`);
- usa as chaves naturais `MSEMenu.Alias` e `MSEExtensoes.Elemento`;
- cria somente registros ausentes;
- não duplica a rota ou a extensão em execuções repetidas;
- exige confirmação explícita;
- mantém `Protegido: true` para o registro administrativo;
- cria o item de menu como `administrator`, visão `controlpanel`, estado `Publicado`;
- não contém chamada de rede no construtor do plano.

### 2.3 Limites identificados

Os dois scripts recebem um cliente e uma função `confirm(plan)`; eles não devem ser
executados diretamente sem o runner autenticado que fornece esses objetos. A opção
`--apply` precisa continuar sendo responsabilidade do runner, nunca um atalho que
ignore a confirmação.

A migração da rota é deliberadamente `create-if-missing`: se já existir uma linha
com a chave natural, ela não reconcilia campos divergentes. Antes do `--apply`, uma
leitura real deve confirmar que os registros existentes, caso haja, apontam para o
Componente, visão, estado e proteção esperados. Se estiverem divergentes, o caso
deve ser tratado como decisão de dados, não corrigido silenciosamente.

A ativação do Tema 1 valida a cardinalidade do escopo global, mas a validação de
que `camap-tema-01` está publicado e compatível com o runtime ocorre na etapa de
validação visual do `Default.aspx` (canônico), antes da aplicação real.

## 3. Testes locais executados

```text
node tools/test/migrate-camap-activate-tema-01.test.js
node tools/test/migrate-mse-administrator-route.test.js
```

Resultado: os dois testes passaram.

Cobertura comprovada:

- plano congelado;
- validação de argumentos;
- confirmação negada sem gravação;
- criação dos registros ausentes;
- idempotência;
- execução parcial quando somente um dos registros já existe;
- rejeição de zero ou mais de um item global;
- atualização somente do campo `Tema`;
- preservação dos campos de configuração existentes;
- uso de ETag na atualização do Tema.

Os fakes são locais e não representam autenticação, permissões ou dados do tenant.
Portanto, os testes não autorizam nem substituem o `--dry-run` e a revisão humana
antes do `--apply`.

## 4. Procedimento recomendado antes da aplicação real

1. Publicar/conferir o pacote do Tema 1 no `Default.aspx` (canônico).
2. Validar visualmente posições, ordem, Hero, breadcrumbs e rodapé.
3. Executar ambos os runners em `--dry-run` contra o tenant real.
4. Revisar os planos e os registros já existentes.
5. Capturar o snapshot das linhas afetadas.
6. Aplicar primeiro a ativação do Tema 1.
7. Validar o `Default.aspx`.
8. Aplicar a rota do Administrator.
9. Validar `#/administrator` e a proteção da extensão.
10. Registrar o resultado e o rollback.

Nenhum item desta revisão executou `--apply`, criou listas, atualizou listas ou
alterou páginas SharePoint.
