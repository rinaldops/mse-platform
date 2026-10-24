# plugins/content

Plugin de ciclo de vida de conteúdo. A implementação é deliberadamente
agnóstica ao SharePoint: recebe dados já carregados, aplica transformação
segura e devolve o resultado ao pipeline. Não persiste dados nem implementa
sanitização HTML completa; essa política deve ser injetada pelo serviço de
conteúdo do site.
