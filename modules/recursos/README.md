# Explore Mais

Catálogo de links e materiais úteis. O ID público é `explore-mais`; a pasta
`recursos` e nomes históricos de funções/listas preservam compatibilidade.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lista `RecursosLinks` administrada pelos responsáveis pelo conteúdo.
- Busca, filtro por categoria, ordenação e visualizações de cartões/lista compacta.
- Grupos de categorias sempre abertos; esta interface não usa mais acordeão.
- Atalhos selecionados por ordem de curadoria.
- Abertura de links, com opção de nova janela.
- Resumo com seleção por categoria e acesso à página completa.

Configure `recursosSummary.pageHref` para o resumo. Seus itens levam à página
Explore Mais; os links externos são acessados no módulo completo.

## Limites

Meus favoritos e Sugerir link são botões sem fluxo implementado. O título
Atalhos mais usados não representa cliques medidos: utiliza o primeiro link de
cada categoria conforme `Ordem`. Filtros, ordenação e modo de visualização
ficam em memória. Não há editor de conteúdo na página do módulo.

Execute `npm --prefix modules/recursos test` a partir da raiz.
