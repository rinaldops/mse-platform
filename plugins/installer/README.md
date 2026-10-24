# plugins/installer

Plugin Joomla-like de instalação do Mini Joomla. Ele fornece o contrato de
ciclo de vida para inspeção, verificação e aplicação de estruturas, sem
executar rede nem escrever no SharePoint por conta própria.

- `manifest.js`: manifesto e fábrica do plugin;
- `plugin.js`: entrypoint e validação do contrato;
- `test/plugins/installer/installer-plugin.test.js`: testes unitários.

A operação `apply` exige um callback `confirm` explícito. A autorização real,
o Request Digest, ETag, permissões nativas e chamadas REST permanecem sob o
serviço instalador injetado pelo host.
