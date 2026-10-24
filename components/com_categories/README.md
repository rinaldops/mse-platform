# com_categories — Categorias

Componente `com_categories` (Categorias) do Administrator, seguindo a
convenção de diretórios do Joomla! (`components/com_xxx/`).

Implementado sobre a lista `MSECategories` (≈ Joomla! `#__categories`,
`kernel/schemas/mse-categories.js`), hoje escopada a `com_content`. CRUD-lite
de categorias hierárquicas (Título/Alias/Extensão/Pai/Nível/Ordem/Estado) em
`categories-editor.js`, montado pela tela `categories-screen.js`.
