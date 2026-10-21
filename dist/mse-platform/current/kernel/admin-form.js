/**
 * Converte o schema declarativo de uma lista editável do Administrator
 * (Site Kernel, Fase 5 — mse-platform/docs/PLANO-SITE-KERNEL-MSE.md) — o
 * objeto normalizado/congelado que `defineListSchema`
 * (`core/list-provisioning.js`) devolve para MSEExtensoes/MSEModulos/MSEMenu
 * (`kernel/schemas/mse-extensoes.js`, `mse-modulos.js`, `mse-menu.js`) — em
 * uma lista de descritores de campo GENÉRICOS e NEUTROS DE UI
 * (`FieldDescriptor[]`), para uma futura tela do Administrator (próxima
 * rodada, fora do escopo deste arquivo) desenhar o formulário real.
 *
 * Este arquivo é DELIBERADAMENTE sem DOM: nenhuma função aqui referencia
 * `document`, cria elementos ou lida com eventos de UI — é testável em Node
 * puro, no mesmo espírito de função pura de `kernel/positions.js`/
 * `kernel/menu.js`. `buildFormFields` só olha para a FORMA do schema
 * (`schema.fields[]`) e devolve dados simples e serializáveis
 * (`JSON.stringify`-áveis), nunca uma instância de classe nem uma função.
 *
 * Mapeamento de tipo SharePoint (`field.type`, confirmado lendo os 3
 * esquemas reais do kernel) -> `inputType` genérico:
 * - "Text"     -> "text"     (texto de uma linha; `maxLength`, quando
 *                 presente no schema, é preservado no descritor para a
 *                 futura UI aplicar como limite de digitação).
 * - "Note"     -> "textarea" (texto de múltiplas linhas — decisão desta
 *                 implementação: embora o enunciado desta tarefa só cite
 *                 "text"|"number"|"select"|"boolean"|"date" como exemplo de
 *                 `inputType`, mapear "Note" para o mesmo "text" de "Text"
 *                 perderia a única informação que diferencia os dois tipos
 *                 no schema — ser um campo de texto longo, ex.: ParamsJson
 *                 com várias linhas (`lines`) — então foi adicionado
 *                 "textarea" como um `inputType` genérico adicional, não
 *                 ligado a nenhuma particularidade de SharePoint).
 * - "Choice"   -> "select"   (campo de opção única; `field.choices` vira
 *                 `descriptor.options`, na mesma ordem).
 * - "Boolean"  -> "boolean"  (`field.defaultValue` sempre presente no schema
 *                 normalizado — `true` ou `false` — e sempre preservado).
 * - "Number"   -> "number"   (`field.min`, quando presente, é preservado
 *                 como `descriptor.min`, para a futura UI validar o limite
 *                 inferior sem precisar reconsultar o schema original).
 * - "DateTime" -> "date"     (sem hora separada nesta camada neutra — a
 *                 futura UI decide como editar a parte de hora, se precisar).
 *
 * "MultiChoice"/"UserMulti" são tipos válidos em `core/list-provisioning.js`
 * mas NÃO aparecem em nenhum dos 3 esquemas reais consumidos pelo
 * Administrator nesta fase — por isso não têm mapeamento aqui. Um campo com
 * um `type` não mapeado faz `buildFormFields` lançar `TypeError` com uma
 * mensagem clara (em vez de silenciosamente devolver um descritor
 * incompleto/inventado), mesmo padrão de falha explícita usado em todo o
 * resto do kernel (ex.: `kernel/application.js#mountEntrypoint`).
 *
 * `schema.titleField` (o campo Title, com forma própria — `displayName`/
 * `required`/`indexed`/`unique`, sem `type`) é DELIBERADAMENTE deixado fora
 * de `buildFormFields`: esta função mapeia apenas `schema.fields[]` (os
 * campos declarados pelo módulo), que é o que a tarefa desta rodada pede;
 * uma eventual exibição do campo Title no formulário fica para quando a tela
 * real do Administrator for desenhada.
 */

/** Mapa fixo de tipo SharePoint (`field.type`) -> `inputType` genérico. */
const TYPE_TO_INPUT = Object.freeze({
  Text: "text",
  Note: "textarea",
  Choice: "select",
  Boolean: "boolean",
  Number: "number",
  DateTime: "date"
});

/**
 * Converte um único campo normalizado de `defineListSchema` em um
 * `FieldDescriptor` simples e congelado.
 *
 * @param {{
 *   internalName: string,
 *   displayName: string,
 *   type: string,
 *   required: boolean,
 *   choices?: string[],
 *   maxLength?: number,
 *   min?: number,
 *   defaultValue?: unknown
 * }} field
 * @returns {Readonly<{
 *   name: string,
 *   label: string,
 *   inputType: "text"|"textarea"|"select"|"boolean"|"number"|"date",
 *   required: boolean,
 *   options?: string[],
 *   maxLength?: number,
 *   min?: number,
 *   defaultValue?: unknown
 * }>}
 */
function buildFieldDescriptor(field) {
  if (!field || typeof field !== "object" || Array.isArray(field)) {
    throw new TypeError("Cada campo de schema.fields deve ser um objeto.");
  }
  if (typeof field.internalName !== "string" || !field.internalName) {
    throw new TypeError("Cada campo de schema.fields deve ter internalName.");
  }
  const inputType = TYPE_TO_INPUT[field.type];
  if (!inputType) {
    throw new TypeError(
      `Tipo de campo sem mapeamento de formulário em "${field.internalName}": "${field.type}".`
    );
  }

  const descriptor = {
    name: field.internalName,
    label: field.displayName,
    inputType,
    required: Boolean(field.required)
  };
  if (field.type === "Choice") {
    descriptor.options = [...(field.choices ?? [])];
  }
  if (field.type === "Text" && field.maxLength !== undefined) {
    descriptor.maxLength = field.maxLength;
  }
  if (field.type === "Number" && field.min !== undefined) {
    descriptor.min = field.min;
  }
  if (field.defaultValue !== undefined) {
    descriptor.defaultValue = field.defaultValue;
  }
  return Object.freeze(descriptor);
}

/**
 * Converte `schema.fields[]` (o objeto devolvido por `defineListSchema`,
 * `core/list-provisioning.js`) em `FieldDescriptor[]` — sem DOM, sem rede,
 * puramente síncrona.
 *
 * `schema` precisa ser um objeto com `fields` como array (a mesma forma que
 * `defineListSchema` sempre devolve, mesmo para uma lista sem nenhum campo
 * declarado — nesse caso `fields` é `[]`, e esta função devolve `[]` sem
 * lançar). Um `schema` ausente, que não seja objeto, ou cujo `fields` não
 * seja array, é tratado como entrada malformada e lança `TypeError` — mesmo
 * padrão de validação de borda do resto do kernel (ver `kernel/admin-data.js`).
 *
 * @param {{ fields: object[] }} schema
 * @returns {ReadonlyArray<object>} `FieldDescriptor[]`, congelado.
 */
export function buildFormFields(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new TypeError("schema é obrigatório e deve ser o objeto devolvido por defineListSchema.");
  }
  if (!Array.isArray(schema.fields)) {
    throw new TypeError("schema.fields deve ser um array (use o objeto devolvido por defineListSchema).");
  }
  return Object.freeze(schema.fields.map(buildFieldDescriptor));
}
