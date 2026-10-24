# com_media — Mídia

Gerenciador de mídia do Administrator: lista, envia e exclui arquivos da
biblioteca de documentos SharePoint `MSEMedia` (`template: 101`, ver
`kernel/schemas/mse-media.js`), reaproveitando `core/rest.js#uploadFile`
para o envio. Segue a mesma estrutura dos demais componentes do
Administrator — `media-editor.js` (CRUD) e `media-screen.js` (wrapper de
tela), registrados em `components/com_cpanel/`.
