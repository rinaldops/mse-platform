/**
 * Esqueleto DOM do Site Kernel — "index.php do template, mas sem template"
 * (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seção 3: "sem Templates e sem
 * ACL. Posições são declaradas pelo site; o visual é CSS do site"; seção 4,
 * `kernel/layout.js`: "esqueleto DOM + posições declaradas (sem template)").
 *
 * Este módulo NÃO decide o que vai dentro de cada posição (isso é
 * `kernel/positions.js`) nem qual Componente/visão é montado (isso é
 * `kernel/dispatcher.js`). Ele apenas cria o esqueleto mínimo de contêineres
 * DOM — um por posição declarada, mais um para o Componente da página — e
 * os anexa a `root` em ordem previsível. Nenhum HTML/CSS estrutural é
 * embutido: grid, espaçamento e cores são 100% responsabilidade do CSS do
 * site (`theme/`, decisão D9). As classes marcadoras (`data-mse-position`,
 * `data-mse-component`) existem só para o CSS do site poder selecionar os
 * contêineres — isso não é "estilo embutido", é o mesmo papel que
 * `data-mse-module`/`data-mse-view` já desempenham no host atual.
 *
 * O kernel é neutro (seção 3: "o kernel não conhece CAMAP-AGP"): não há
 * nenhum nome de posição hardcoded aqui. A lista de posições é sempre
 * recebida de fora (config/dados do site).
 *
 * --- Decisão: `componentPosition` é um contêiner separado das posições ---
 * O vocabulário do plano (seção 2) trata "Componente" e "Módulo" como
 * conceitos distintos: módulos vivem em posições (`kernel/positions.js`),
 * o Componente da rota atual não é um módulo e não compete por uma posição
 * nomeada. Por isso `componentElement` NUNCA entra em `positionElements` —
 * é um contêiner próprio, sempre presente, independente de `positions`.
 * `componentPosition` (string, default `"conteudo-principal"`) é apenas um
 * rótulo informativo gravado em `data-mse-component-position`, útil para o
 * CSS/depuração identificar o slot do Componente sem confundi-lo com uma
 * posição de módulo. Por isso `componentPosition` não pode colidir com um
 * nome em `positions` (lançaria ambiguidade para quem for escrever o CSS).
 *
 * --- Decisão: remontagem sobre `root` já montado ---
 * Espelha o princípio já usado em
 * `host-adapters/modern-script-editor/bootstrap.js` (`mountMseModule`:
 * `if (mounted.has(root)) await unmountMseModule(root);`): chamar
 * `createSiteLayout` de novo sobre um `root` que já tem um layout montado
 * por este módulo faz `dispose()` automático do layout anterior antes de
 * montar o novo, em vez de lançar. Isso evita exigir que todo chamador
 * lembre de desmontar manualmente antes de uma nova navegação/boot, e é
 * seguro porque `root` é de uso exclusivo do Site Kernel (o host entrega um
 * `<div data-mse-site>` vazio para esse fim, seção 4).
 *
 * --- Decisão: duplicatas em `positions` lançam erro ---
 * Em vez de deduplicar silenciosamente (o que esconderia um erro de
 * configuração do site), nomes repetidos em `positions` lançam `TypeError`
 * com a lista de nomes duplicados. Configuração de posições é dado do site
 * (editado futuramente pelo Administrator); falhar alto e claro aqui ajuda
 * a pegar o erro antes de ele chegar a `positions.js`.
 *
 * --- Decisão: `root` é limpo a cada montagem ---
 * Mesmo princípio de `unmountMseModule` (`root.replaceChildren()`): `root`
 * é de uso exclusivo do layout depois de montado, então `createSiteLayout`
 * sempre começa limpando `root` (via `dispose()` automático, ver acima, ou
 * limpeza direta na primeira montagem) antes de anexar os novos contêineres.
 */

const KEBAB_CASE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Layouts atualmente montados por este módulo, por elemento `root`. */
const mountedLayouts = new WeakMap();

/**
 * Valida que `root` tem a forma mínima de um elemento DOM que este módulo
 * sabe manipular (mesmo princípio de `kernel/router.js` validando
 * `window`/`onRoute`: falhar alto e claro em vez de quebrar mais adiante
 * com um erro obscuro).
 *
 * @param {*} root
 */
function assertValidRoot(root) {
  if (!root || typeof root !== "object") {
    throw new TypeError("root é obrigatório e deve ser um elemento DOM.");
  }
  if (!root.ownerDocument || typeof root.ownerDocument.createElement !== "function") {
    throw new TypeError("root deve ter ownerDocument.createElement (elemento DOM válido, com documento associado).");
  }
  if (typeof root.append !== "function" && typeof root.appendChild !== "function") {
    throw new TypeError("root deve suportar append ou appendChild.");
  }
  if (typeof root.replaceChildren !== "function" && typeof root.removeChild !== "function") {
    throw new TypeError("root deve suportar replaceChildren ou removeChild (necessário para dispose/remontagem).");
  }
}

/**
 * Valida um único nome de posição/slot: string não vazia em kebab-case
 * (letras minúsculas, dígitos e hifens, sem hifen duplo/nas pontas).
 *
 * @param {*} name
 * @param {string} label Usado só para a mensagem de erro (ex.: "posição",
 *   "componentPosition").
 */
function assertValidName(name, label) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError(`${label} inválido: deve ser uma string não vazia.`);
  }
  if (!KEBAB_CASE_PATTERN.test(name)) {
    throw new TypeError(`${label} inválido: "${name}" deve estar em kebab-case (ex.: "home-a"), sem acentos nem espaços.`);
  }
}

/**
 * Valida a lista de posições declaradas pelo site: array de strings
 * kebab-case, não vazias, sem duplicatas (duplicata lança, não deduplica —
 * ver decisão no cabeçalho do arquivo).
 *
 * @param {*} positions
 * @returns {string[]} Cópia defensiva da lista, já validada.
 */
function assertValidPositions(positions) {
  if (!Array.isArray(positions)) {
    throw new TypeError("positions é obrigatório e deve ser um array de strings (nomes de posição em kebab-case).");
  }
  const seen = new Set();
  const duplicates = new Set();
  for (const name of positions) {
    assertValidName(name, "Nome de posição");
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  if (duplicates.size > 0) {
    throw new TypeError(`positions contém nomes duplicados: ${[...duplicates].join(", ")}.`);
  }
  return [...positions];
}

/**
 * Valida `componentPosition` e garante que não colide com nenhum nome em
 * `positions` (os dois são conceitos distintos — ver decisão no cabeçalho).
 *
 * @param {*} componentPosition
 * @param {string[]} positions Lista já validada por `assertValidPositions`.
 */
function assertValidComponentPosition(componentPosition, positions) {
  assertValidName(componentPosition, "componentPosition");
  if (positions.includes(componentPosition)) {
    throw new TypeError(
      `componentPosition ("${componentPosition}") não pode coincidir com um nome em positions: ` +
      "o contêiner do Componente é separado dos contêineres de posição (ver JSDoc de kernel/layout.js)."
    );
  }
}

/**
 * Remove todos os filhos de `root`, usando `replaceChildren` quando
 * disponível (mesmo utilitário usado por `unmountMseModule` em
 * `bootstrap.js`) e caindo para `removeChild` em loop quando não.
 *
 * @param {*} root
 */
function clearRoot(root) {
  if (typeof root.replaceChildren === "function") {
    root.replaceChildren();
    return;
  }
  while (root.firstChild) root.removeChild(root.firstChild);
}

/**
 * Anexa `element` a `root`, usando `append` quando disponível (padrão do
 * `FakeElement` de teste e dos elementos DOM reais) e caindo para
 * `appendChild`.
 *
 * @param {*} root
 * @param {*} element
 */
function appendToRoot(root, element) {
  if (typeof root.append === "function") root.append(element);
  else root.appendChild(element);
}

/**
 * Monta o esqueleto DOM do Site Kernel sobre `root`: um contêiner por
 * posição declarada (`data-mse-position="<nome>"`) mais um contêiner para o
 * Componente da rota atual (`data-mse-component`), anexados a `root` nesta
 * ordem fixa e previsível: **primeiro o contêiner do Componente, depois um
 * contêiner por posição, na mesma ordem em que aparecem em `positions`**.
 * Essa ordem é só a ordem de inserção no DOM — não implica posicionamento
 * visual algum; isso é 100% CSS do site (grid/flex via `theme/`).
 *
 * Chamar de novo sobre um `root` que este módulo já montou faz `dispose()`
 * automático do layout anterior antes de montar o novo (ver decisão no
 * cabeçalho do arquivo). `root` é sempre limpo antes de receber os novos
 * contêineres.
 *
 * @param {{
 *   root: Element,
 *   positions: string[],
 *   componentPosition?: string
 * }} options `root` e `positions` são obrigatórios. `componentPosition`
 *   (default `"conteudo-principal"`) é só um rótulo informativo do slot do
 *   Componente — ver decisão no cabeçalho sobre por que ele é separado de
 *   `positions`.
 * @returns {{
 *   root: Element,
 *   positionElements: Map<string, Element>,
 *   componentElement: Element,
 *   dispose: () => void
 * }} `positionElements` tem uma entrada por nome em `positions`, na mesma
 *   ordem. `dispose()` remove todos os contêineres criados (limpando
 *   `root` por inteiro, já que `root` é de uso exclusivo do layout) e é
 *   seguro chamar mais de uma vez (idempotente).
 */
export function createSiteLayout({ root, positions, componentPosition = "conteudo-principal" } = {}) {
  assertValidRoot(root);
  const normalizedPositions = assertValidPositions(positions);
  assertValidComponentPosition(componentPosition, normalizedPositions);

  // Remontagem sobre root já montado: dispose automático do layout
  // anterior (mesmo princípio de mountMseModule em bootstrap.js).
  const previous = mountedLayouts.get(root);
  if (previous) previous.dispose();

  clearRoot(root);

  const componentElement = root.ownerDocument.createElement("div");
  componentElement.setAttribute("data-mse-component", "");
  componentElement.setAttribute("data-mse-component-position", componentPosition);
  appendToRoot(root, componentElement);

  const positionElements = new Map();
  for (const name of normalizedPositions) {
    const element = root.ownerDocument.createElement("div");
    element.setAttribute("data-mse-position", name);
    positionElements.set(name, element);
    appendToRoot(root, element);
  }

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearRoot(root);
    positionElements.clear();
    if (mountedLayouts.get(root) === layout) mountedLayouts.delete(root);
  }

  const layout = { root, positionElements, componentElement, dispose };
  mountedLayouts.set(root, layout);
  return layout;
}

/**
 * Conveniência: desmonta o layout atualmente montado em `root` por
 * `createSiteLayout`, se houver (no-op silencioso caso contrário). Espelha
 * `unmountMseModule(root)` do host atual, mas aqui dentro do kernel.
 *
 * @param {Element} root
 */
export function disposeSiteLayout(root) {
  mountedLayouts.get(root)?.dispose();
}
