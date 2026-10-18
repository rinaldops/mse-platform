# Administrator do Mini Joomla!

Componente administrativo enxuto, alinhado ao vocabulário do Joomla! e às
listas `MSE*` do Site Kernel. Esta primeira etapa fornece o manifesto, a rota
administrativa por query/hash, o Control Panel e telas estruturais para
Configuração, Extensões, Menus, Módulos e Instalador.

Rotas previstas:

- `#/administrator?option=com_cpanel`
- `#/administrator?option=com_config`
- `#/administrator?option=com_extensions`
- `#/administrator?option=com_menus`
- `#/administrator?option=com_modules`
- `#/administrator?option=com_installer`

A camada de dados real deve usar `kernel/admin-data.js` (CRUD/ETag),
`kernel/admin-form.js` (descritores de formulário), `kernel/installer.js` e os
schemas `kernel/schemas/mse-*.js`. O `admin/` existente permanece legado e é
reaproveitado conceitualmente, sem ser alterado nesta etapa.

Este componente não implementa ACL próprio; o SharePoint continua decidindo as
permissões. Não inclui ainda o Publicador/editorial.
