# UI compartilhada

Versão atual: `0.4.0`.

Componentes visuais pequenos e sem domínio para módulos MSE.

## Contrato

Cada componente recebe um `root` já montado e retorna um controlador com
operações explícitas e `destroy()`. O componente não acessa SharePoint, não
carrega dependências externas e mantém seus estilos sob classes `mse-ui-*`.

## Componentes atuais

- `accordion`: usa botões, `aria-expanded`, `aria-controls` e painéis ocultáveis;
  por padrão mantém apenas um item aberto.
- `carousel`: mostra um item por vez, oferece controles acessíveis, pausa em
  foco/hover e desabilita avanço automático com `prefers-reduced-motion`.

Os módulos de negócio podem usar dados estáticos ou serviços REST, desde que
transformem os dados em `items` antes de montar o componente.
