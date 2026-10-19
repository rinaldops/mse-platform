# Administrator do Mini Joomla!

Componente administrativo enxuto, alinhado ao vocabulário do Joomla! e às listas `MSE*` do Site Kernel. O SharePoint continua sendo a autoridade de permissões; o componente não implementa ACL própria.

Rotas:

- `#/administrator?option=com_cpanel`
- `#/administrator?option=com_config`
- `#/administrator?option=com_diagnostics` — diagnóstico estrutural e permissões nativas
- `#/administrator?option=com_content` — Publicador
- `#/administrator?option=com_extensions`
- `#/administrator?option=com_menus`
- `#/administrator?option=com_modules`
- `#/administrator?option=com_installer`

## Publicador

A tela `com_content`/`com_publisher` lê e grava artigos em `CAMAPPublicacoes` (apresentada no SharePoint como `MSE Publicacoes`). A listagem e o formulário são deliberadamente mínimos para o MVP: título, slug, resumo, corpo seguro, estado editorial, vigência, destaque, ordem e categoria. Criação usa `createAdminItem`; edição usa `updateAdminItem`, que busca a ETag atual antes de gravar e propaga conflitos de concorrência.

Categorias, tags, mídia avançada, histórico visual e workflow editorial permanecem extensões futuras. O corpo é armazenado como texto HTML seguro e passa pela política de `core/rich-text.js` antes da gravação.

As telas de Extensões, Menus e Módulos permitem manutenção CRUD com ETag e tratamento de conflitos. Configuração global e Instalador integram os serviços estruturais do kernel; o provisionamento exige confirmação explícita.
