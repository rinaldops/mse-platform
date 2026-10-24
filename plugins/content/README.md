# plugins/content

Plugin de ciclo de vida e sanitização de conteúdo. O pacote sanitize usa o sanitizador rico já existente no core e registra handlers no event bus sem alterar o kernel. A integração em produção deve ser feita por um loader que injete o event bus e o contexto do host.
