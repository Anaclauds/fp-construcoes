import { reactive } from 'vue'

/**
 * Recursos opcionais do backend. O front commitado precisa funcionar com o backend antigo, que recusa campos
 * desconhecidos (400 "property X should not exist") e não tem as rotas novas (404). Cada recurso começa como
 * suportado; o primeiro erro que prove o contrário o desliga até recarregar a página, e as telas escondem o que
 * não existe.
 */
export const suporte = reactive({
  /** `servicos[].descricao` em etapa e extra. */
  descricaoDoServico: true,
  /** `gastosAvulsos` no extra. */
  gastosAvulsos: true,
  /** `dataConclusao` ao concluir o projeto. */
  dataConclusao: true,
  /** `PATCH /projetos/:id`, `/etapas/:id` e `/extras/:id` (editar projeto, etapa e extra). */
  edicaoProjeto: true,
  /** Cancelar projeto ainda PLANEJADO (o backend antigo só cancela projeto em execução: 409). */
  cancelarPlanejado: true,
})
