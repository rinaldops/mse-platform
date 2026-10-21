# UI compartilhada

Pacote `0.7.7`: componentes sem regras de negócio ou chamadas SharePoint.

- `accordion`: botões com aria-expanded/aria-controls e painéis ocultáveis;
  mantém apenas um item aberto por padrão.
- `carousel`: um item por vez, controles acessíveis, pausa em hover/foco e
  avanço automático desativado com movimento reduzido.

Cada componente recebe um root e dados já resolvidos e retorna um controlador
com `destroy()`. Classes `mse-ui-*` delimitam os estilos. O Explore Mais atual
não consome o acordeão, mas o componente permanece disponível.

Os testes estão incluídos em `npm --prefix core test`. Para publicar, preserve
a árvore da [release completa](../../docs/INSTALACAO-MSE.md).
