# Prompt — Implementação de CRUD em SharePoint via JavaScript

> Prompt reutilizável para orientar outra equipe/LLM. Não contém URLs, credenciais,
> GUIDs, nomes de listas de um site específico ou dados corporativos.

## Contexto e objetivo

Você deverá desenvolver uma aplicação JavaScript executada dentro de uma página SharePoint, possivelmente por meio de uma WebPart Modern Script Editor. O SharePoint será a camada de persistência para listas e bibliotecas, e a aplicação deverá reutilizar a sessão autenticada do navegador para consultar e alterar os objetos autorizados.

Não armazene credenciais, cookies, tokens ou senhas no código. Não contorne permissões, TLS, proxy ou controles de segurança.

A arquitetura deve separar:

```text
Interface visual
        ↓
Serviços de domínio
        ↓
Cliente REST SharePoint
        ↓
Listas e bibliotecas SharePoint
```

A interface não deve executar REST diretamente. Componentes visuais devem consumir serviços como `listItems`, `getItem`, `createItem`, `updateItem`, `deleteItem`, `uploadFile` e `getPermissions`.

## 1. Descoberta e validação do site

Descubra o site atual usando preferencialmente:

```javascript
_spPageContextInfo.webServerRelativeUrl
```

Também aceite uma URL server-relative explicitamente fornecida pela configuração da aplicação. Valide-a antes do uso:

- aceite somente caminhos server-relative;
- rejeite URLs externas e caminhos iniciados por `//`;
- rejeite `?` e `#`;
- remova barras finais duplicadas;
- não permita chamadas a outro site sem autorização explícita.

```javascript
function normalizeWebUrl(value) {
  const fallback = globalThis._spPageContextInfo?.webServerRelativeUrl;
  const webUrl = String(value ?? fallback ?? "").trim();
  if (!webUrl || !webUrl.startsWith("/") || webUrl.startsWith("//")) {
    throw new Error("Não foi possível identificar uma URL SharePoint válida.");
  }
  if (/[?#]/.test(webUrl)) throw new Error("URL inválida.");
  return webUrl.replace(/\/+$/, "");
}
```

## 2. Cliente REST centralizado

Crie um cliente reutilizável, responsável por montar URLs, executar `fetch`, obter o Request Digest, tratar ETag, paginação, retry e erros.

```javascript
const client = createSharePointRestClient({ webUrl, fetchImpl });

client.getListItems(...);
client.getListItem(...);
client.createListItem(...);
client.updateListItem(...);
client.deleteListItem(...);
client.uploadFile(...);
client.getEffectiveBasePermissions(...);
```

Use:

```http
Accept: application/json;odata=nometadata
```

Nenhum componente visual deve duplicar a lógica HTTP.

## 3. Resolução de listas e bibliotecas

Não presuma que o título visível seja o nome interno. Liste os objetos disponíveis e identifique `Id`, `Title`, `RootFolder/Name` e campos internos:

```http
GET {webUrl}/_api/web/lists?$select=Id,Title,RootFolder/Name&$expand=RootFolder
```

Quando aplicável, resolva pela pasta raiz e depois use o GUID:

```text
/_api/web/lists(guid'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
```

Mantenha os identificadores resolvidos em um registro em memória e não faça a mesma descoberta repetidamente. Nunca invente GUIDs ou nomes de campos.

## 4. Consultas e paginação

Use sempre `$select`, `$filter`, `$orderby`, `$expand` e `$top` de forma explícita:

```http
GET .../items?$select=Id,Title,Estado,Created,Modified&$filter=Estado eq 'Publicado'&$orderby=Modified desc&$top=100
```

Valide nomes internos de campos e escape valores dinâmicos. Não concatene livremente valores do usuário em `$select`, `$expand`, `$orderby` ou `$filter`.

Trate `@odata.nextLink`. Exponha uma operação de página e outra que percorra páginas até um limite configurável, por exemplo `maxPages: 100`. Nunca permita paginação infinita.

## 5. Request Digest

Para escritas, obtenha o digest com:

```http
POST {webUrl}/_api/contextinfo
```

Use `GetContextWebInformation.FormDigestValue` e `FormDigestTimeoutSeconds`. Mantenha o valor somente em memória, reutilize-o enquanto válido, evite chamadas simultâneas duplicadas e renove-o quando expirar ou falhar. Nunca o persista em arquivo, `localStorage`, lista ou log.

Inclua nas escritas:

```http
X-RequestDigest: <valor-em-memória>
```

## 6. CRUD de itens

### Criação

```http
POST .../items
```

Envie apenas campos permitidos e validados. Não aceite campos de sistema como `Author`, `Editor`, `Created` e `Modified` sem uma decisão explícita.

### Edição com concorrência otimista

Leia a ETag atual imediatamente antes de editar e utilize:

```http
POST .../items(123)
X-HTTP-Method: MERGE
If-Match: "etag-atual"
```

Não use `If-Match: *` por padrão. Em HTTP 412, não sobrescreva: recarregue o item, informe o conflito e permita nova revisão.

### Exclusão

Exija ETag também para excluir. Prefira exclusão lógica por estado, quando a regra de negócio permitir. Para exclusão física, solicite confirmação e trate 403, 404 e 412 separadamente.

O cliente deve retornar resultados normalizados, por exemplo:

```javascript
{ item, etag, status }
```

## 7. Upload em bibliotecas

Use o endpoint `Files/add` no diretório permitido. Valide nome, tamanho, MIME, extensão, destino e política de sobrescrita. Não aceite caminhos arbitrários completos fornecidos pelo usuário.

Retorne a URL server-relative do arquivo somente após validar a resposta do SharePoint.

## 8. Erros, retry e throttling

Normalize os erros em categorias estáveis:

```text
context-unavailable
network-error
access-denied
not-found
concurrency-conflict
throttled
invalid-response
request-failed
etag-required
page-limit
batch-failed
```

Mapeamento mínimo:

| HTTP | Categoria | Tratamento |
|---|---|---|
| 401/403 | `access-denied` | informar sessão/permissão |
| 404 | `not-found` | informar recurso inexistente |
| 412 | `concurrency-conflict` | recarregar antes de salvar |
| 429/503 | `throttled` | aguardar e repetir com limite |
| demais | `request-failed` | falha REST genérica |

Repita automaticamente somente operações seguras, sobretudo GET. Respeite `Retry-After` e use backoff exponencial limitado. Não repita POST, MERGE ou DELETE sem estratégia idempotente explícita.

Não registre cookies, tokens, digests, cabeçalhos completos ou dados pessoais.

## 9. Consultas em lote

Quando muitas listas forem carregadas juntas, considere `POST {webUrl}/_api/$batch` para GETs. Use `multipart/mixed`, boundary válido, uma chave lógica por requisição e validação da quantidade de sub-respostas. Trate falha do batch e falha de cada sub-requisição separadamente. Mantenha fallback para GETs individuais quando necessário.

## 10. Permissões nativas

Não crie uma ACL paralela. Use permissões nativas do SharePoint e, quando necessário, consulte:

```http
GET .../EffectiveBasePermissions
```

Normalize `Low`/`High` em capacidades como:

```javascript
{ canRead, canWrite, canManageLists, canManagePermissions }
```

Essa consulta apenas antecipa o estado da interface. A autorização real continua sendo do SharePoint; trate 403 mesmo quando a interface tenha exibido uma ação como disponível.

## 11. Sanitização e rich text

Sanitize HTML antes de persistir ou renderizar. Defina tags, atributos, URLs, imagens e estilos permitidos; remova `script`, handlers inline e esquemas perigosos como `javascript:`.

Para texto simples use `textContent`. Nunca faça `innerHTML` com conteúdo vindo do SharePoint sem sanitização.

## 12. Separação de dados

Separe configuração, conteúdo editorial, mídia, menus e extensões. Uma lista genérica pode atender vários componentes quando possuir um discriminador, por exemplo `Elemento`, `Tipo`, `Modulo`, `Instancia`, `Escopo`, `Estado` e `ConfiguracaoJson`.

Nesse caso:

- filtre sempre pelo tipo funcional e pela instância;
- valide o schema;
- impeça que um componente leia registros de outro;
- documente nomes internos e valores permitidos;
- não misture configuração com conteúdo editorial sem contrato explícito.

## 13. Estrutura recomendada

```text
src/
├── core/
│   ├── rest.js
│   ├── errors.js
│   ├── pagination.js
│   ├── digest.js
│   ├── batch.js
│   ├── etag.js
│   └── sanitize.js
├── sharepoint/
│   ├── list-resolver.js
│   ├── permissions.js
│   ├── list-schemas.js
│   └── data-source-registry.js
├── services/
│   ├── content-service.js
│   ├── configuration-service.js
│   └── media-service.js
├── components/
├── modules/
└── host/modern-script-editor/site-runner.js
```

O snippet do MSE deve ser pequeno: localizar a raiz DOM, carregar o bundle, informar caminho dos assets e iniciar a aplicação. CRUD, autenticação, regras de negócio e HTML extenso devem permanecer no bundle.

Use uma raiz DOM estável e IDs únicos para múltiplas instâncias.

## 14. Testes obrigatórios

Crie testes para:

- normalização de URL e validação de allowlist;
- montagem de endpoints e escaping;
- seleção de campos;
- paginação e limites;
- Request Digest e sua validade;
- retry e throttling;
- HTTP 401, 403, 404, 412, 429 e 503;
- JSON inválido e respostas `$batch` inválidas;
- resolução de listas por GUID/pasta raiz;
- filtros e ordenação;
- criação, edição com ETag e conflito de concorrência;
- exclusão lógica/física;
- upload e MIME;
- sanitização;
- permissões;
- estado vazio, erro, falta de permissão e múltiplas instâncias;
- teclado e acessibilidade.

## 15. Ordem de implementação

1. Descobrir a URL server-relative.
2. Inventariar listas, bibliotecas, GUIDs e campos internos.
3. Documentar os schemas.
4. Implementar cliente REST centralizado.
5. Implementar digest em memória.
6. Implementar GET, filtros e paginação.
7. Resolver e armazenar os GUIDs.
8. Implementar permissões nativas.
9. Implementar criação.
10. Implementar edição com ETag.
11. Implementar exclusão lógica ou física.
12. Implementar upload, se necessário.
13. Implementar sanitização e throttling.
14. Executar testes locais.
15. Validar numa página SharePoint autenticada.
16. Gerar e publicar o bundle somente após os testes.
17. Registrar commit, bundle, destino, evidências e rollback.

## 16. Restrições

- Não gravar credenciais, tokens, cookies ou digests.
- Não desabilitar TLS nem contornar permissões.
- Não inventar URLs, GUIDs, listas, campos ou permissões.
- Não sobrescrever itens sem ETag.
- Não excluir dados sem confirmação e estratégia de rollback.
- Não declarar publicação apenas porque o código existe localmente.
- Separar sempre implementação, testes, bundle, publicação e validação no tenant.

## Resultado esperado

Entregue:

1. cliente REST reutilizável;
2. resolução segura de listas e bibliotecas;
3. serviços CRUD;
4. Request Digest;
5. ETag e concorrência;
6. paginação e throttling;
7. permissões nativas;
8. sanitização;
9. testes automatizados;
10. documentação de schemas e nomes internos;
11. instruções de publicação e rollback.

Descubra os dados no próprio site SharePoint da equipe e documente somente o que for confirmado. Não presuma nomes, GUIDs, URLs ou permissões.
