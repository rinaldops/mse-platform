# com_finder — Buscas Salvas

Componente `com_finder` (Buscas Salvas) do Administrator, seguindo a
convenção de diretórios do Joomla! (`components/com_xxx/`).

Implementado sobre a lista `MSESearchFilters` (≈ Joomla! `#__finder_filters`,
`kernel/schemas/mse-search-filters.js`). CRUD-lite de filtros de busca
salvos (Título/Alias/Criado por alias/Estado) em `finder-editor.js`, montado
pela tela `finder-screen.js`.

Decisão de escopo: o `com_finder` real do Joomla! é um motor de indexação
full-text completo (mapas de termos, tokens, `#__finder_tokens`/
`#__finder_links`/etc.). Este componente NÃO reimplementa esse motor — é
apenas a tela administrativa de "filtros salvos" (`#__finder_filters`), no
mesmo espírito CRUD-lite de `com_categories`/`com_tags`. A busca de verdade
no site é feita pelo módulo `modules/mod_search` (equivalente ao `mod_finder`
real), que filtra artigos já carregados em memória — sem usar nenhum filtro
salvo aqui.
