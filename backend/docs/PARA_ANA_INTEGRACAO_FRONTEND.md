# Para Ana - integracao com as correcoes do backend

Data: 14/10/2026. Referencia: PROBLEMAS_BACKEND_GESTAO_DE_PESSOAS-1.md e respostas de Peterson/Ana.

## Limite desta entrega

O codigo de `frontend/` foi devolvido ao estado versionado anterior as alteracoes do assistente. Nenhuma correcao de interface desta entrega foi mantida. As mudancas abaixo estao no backend; a integracao de telas fica com a Ana.

Nao houve commit, push nem merge. Nao considerar este documento como afirmacao de que todos os botoes do front ja funcionam: ha incompatibilidades confirmadas abaixo.

As rotas deste documento usam o prefixo `/api` e JWT em `Authorization: Bearer <token>`. Nao enviar senhas ou tokens em relatorios, prints ou commits.

## 1. Preparar a copia atualizada

Com MySQL disponivel e `.env` local configurado conforme o README do backend, executar na pasta `backend`:

```powershell
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run start:dev
```

Parar a API antes de reinstalar dependencias no Windows. Nao executar `migrate reset`, nao apagar o banco e nao copiar `.env` de outra pessoa para o Git.

A migration `20261014000400_categorias_cancelamentos` cria catalogos e auditoria, acrescenta `canceladoEm` e converte categoria de despesa para texto. Preserva registros anteriores; categorias antigas sao incorporadas ao catalogo e despesas sem categoria recebem OUTROS ou EXTRA_PROJETO. Fazer backup antes de aplicar em banco com dados importantes.

Swagger local: http://127.0.0.1:3000/docs. Front local usual: http://127.0.0.1:5173. Conferir a URL da API no ambiente do front e CORS no backend; seguir os READMEs para os nomes das variaveis.

## 2. Prioridade: incompatibilidades vistas no navegador

### Preco no novo material do estoque (E6)

`POST /api/estoque/materiais` exige `precoReferencia` positivo, alem de nome, categoria cadastrada, unidade e quantidade inicial. A decisao foi nao trabalhar com preco pendente.

O formulario atual nao possui/envia esse preco. O teste tentou cadastrar e recebeu 400, sem gravacao. Ajustar `useFormularioNovoMaterialEstoque.ts`, formulario e tipo do payload. Exemplo:

```json
{"nome":"Chapa teste","categoria":"Aco e Metais","unidadeMedida":"UN","quantidadeInicial":10,"precoReferencia":12.5}
```

O nome da categoria do exemplo deve existir no catalogo: nao fixar a grafia deste exemplo no codigo.

### Arredondamento do orcamento (C9/C20, X9)

O backend arredonda cada linha para centavos antes de somar. Exemplo: duas linhas de quantidade 0.333 e valor unitario 0.09 resultam em 0.03 + 0.03 = 0.06. O calculo atual do front mostrou 0.05. Ajustar a previa para o mesmo criterio e usar os totais devolvidos pela API como resultado definitivo. Nao usar ponto flutuante sem controle para fechar valores financeiros.

### PDF de frequencia (X7)

O botao atual abre impressao local. Para usar o relatorio do servidor, chamar `GET /api/frequencias/relatorio/pdf` com os mesmos filtros do relatorio JSON, JWT e resposta binaria (`responseType: 'blob'`). Criar uma URL temporaria para download e libera-la depois. Permissao: FREQUENCIA visualizar. A API calcula periodo, dias nao registrados e taxa; evitar recalcular com outra regra no front.

## 3. Categorias cadastraveis e unidades (E2, F10)

| Operacao | Endpoint | Permissao |
| --- | --- | --- |
| Listar categorias de material | GET /api/categorias/materiais | MATERIAIS, ESTOQUE ou DESPESAS visualizar |
| Criar categoria de material | POST /api/categorias/materiais | MATERIAIS ou ESTOQUE gerenciar |
| Listar categorias de despesa | GET /api/categorias/despesas | DESPESAS visualizar |
| Criar categoria de despesa | POST /api/categorias/despesas | DESPESAS gerenciar |

Criacao: `{"nome":"Frete especial"}`. A resposta inclui `id`, `tipo`, `nome` e `rotulo`. Exibir `rotulo` e enviar `nome` no material/despesa. Em despesas, o nome tecnico sera normalizado (por exemplo FRETE_ESPECIAL). Duplicidade retorna 409.

Categorias sao obrigatorias e precisam existir. COMPRA_MATERIAL recebe categoria automatica; DIVERSA precisa enviar categoria. EXTRA_PROJETO identifica gastos gerados pelo projeto. `categoria` de despesa agora e string, nao um enum fechado no TypeScript do front.

Tambem existem `GET /api/materiais/opcoes/categorias` e `/api/materiais/opcoes/unidades`, retornando `{valor,rotulo}[]`. As unidades incluem padroes e valores existentes; nao ha conversao entre metro, barra, quilo etc. A compra deve usar a unidade cadastrada no material.

## 4. Seletores com permissao propria (X5, X6, X10, X11, X17)

Nao conceder permissao de outro modulo apenas para preencher um select.

| Uso | Endpoint | Permissao |
| --- | --- | --- |
| Funcionarios ativos sem usuario | GET /api/usuarios/opcoes/funcionarios | GESTAO_USUARIOS gerenciar |
| Funcionarios da frequencia | GET /api/frequencias/opcoes/funcionarios?status=TODOS | FREQUENCIA visualizar |
| Materiais para compra | GET /api/despesas/opcoes/materiais | DESPESAS visualizar |
| Fornecedores para despesa | GET /api/fornecedores/opcoes/ativos | DESPESAS visualizar (entre as permissoes aceitas) |
| Clientes para orcamento | GET /api/orcamentos/opcoes/clientes | ORCAMENTOS visualizar |
| Funcionarios para aprovacao | GET /api/orcamentos/opcoes/responsaveis | ORCAMENTOS visualizar |

O seletor de frequencia aceita ATIVO, INATIVO ou TODOS, retorna campos reduzidos e nao expoe salario. O de usuarios retorna apenas funcionarios elegiveis, sem usuario existente. Nao usar esse seletor de novos usuarios para substituir o vinculo ja existente na tela de edicao.

Revisar `useFuncionariosSemUsuario.ts`, `useTodosFuncionarios.ts`, `useOpcoesCompraDespesa.ts` e os servicos correspondentes. O front atual ainda consulta `/materiais` para compras e pode bloquear a consulta localmente por falta de permissao de MATERIAIS; trocar tanto a chamada quanto essa verificacao local. Materiais com saldo zero continuam necessarios para registrar compras.

## 5. Cancelamentos e estornos (F17 e decisao aprovada)

| Acao | Endpoint PATCH | Permissao |
| --- | --- | --- |
| Estornar despesa | /api/despesas/:id/cancelar | DESPESAS gerenciar |
| Cancelar etapa | /api/projetos/:id/etapas/:registroId/cancelar | PROJETOS gerenciar |
| Cancelar extra | /api/projetos/:id/extras/:registroId/cancelar | PROJETOS gerenciar |

Corpo: `{"motivo":"Lancamento registrado incorretamente"}`. Motivo obrigatorio, entre 3 e 500 caracteres. Sucesso 200; registro inexistente 404; conflito de regra 409; dados invalidos 400.

- `canceladoEm` identifica o registro cancelado. Manter historico visivel, marcar o estado e impedir edicao/novo cancelamento na interface.
- Estorno nao apaga a despesa nem a saida original: registra entrada compensatoria no caixa e auditoria de usuario/motivo/data.
- O caixa da competencia original precisa estar aberto. Nao trocar a data silenciosamente para contornar caixa fechado.
- Compra de material: reverte estoque somente quando permitido. Material reservado ou com baixa de projeto desde a data da compra bloqueia o estorno; sem rastreio por lote, a protecao e conservadora. Estoque disponivel insuficiente tambem bloqueia.
- Etapa com recebimento nao permite cancelamento simples; sem recebimento, cancela cobranca e parcelas e retira a etapa dos totais medidos.
- Extra libera suas reservas ativas e estorna a despesa vinculada, se houver. Reserva consumida ou recebimento no projeto bloqueia o cancelamento simples de extra.
- Despesa vinculada a extra deve ser cancelada pelo extra, nunca isoladamente em Despesas.
- Repetir a operacao nao duplica a compensacao: retorna conflito. Recarregar dados do projeto, caixa e estoque depois do sucesso.

Nao existe nesta entrega estorno livre de recebimento ja realizado. Nao criar botao prometendo esse fluxo.

## 6. Caixa, historico e formularios

### Caixa (F1, F3-F6, F14, X14)

GET `/api/financeiro/caixa?competencia=AAAA-MM` e somente consulta. Um caixa nao aberto e devolvido como representacao virtual (`id: 0`, `naoAberto`), sem gravar no banco. A interface precisa mostrar a abertura explicita, sem tentar fechar/reabrir id zero.

Abrir: POST `/api/financeiro/caixa/abrir` com competencia e valorInicial numerico (obrigatorio no DTO; quando ha caixa anterior, o backend substitui pelo saldo herdado). Fechar/reabrir: PATCH `/api/financeiro/caixa/:id/fechar` ou `/reabrir`. Todas exigem CAIXA gerenciar.

O saldo inicial e herdado do caixa anterior fechado. Depois de movimentacoes, nao pode ser alterado. Fechamento apenas de mes encerrado e na ordem correta; reabertura possui auditoria e bloqueios quando existe caixa posterior. Exibir a mensagem da API, sem simular sucesso local.

### Edicao de itens historicos inativos (C22, F7)

Orcamentos e compras preservam vinculos anteriores inativos quando mantidos sem alteracao. Nao filtrar o valor atual para fora do select nem substitui-lo automaticamente. Mostrar como historico/inativo, sem oferecer como novo item. Alteracoes de quantidade/preco ou novo vinculo continuam sujeitas a validacao.

### Despesas diversas e projetos

Fornecedor e opcional em DIVERSA e pode ser limpo com `fornecedorId: null`. Categoria continua obrigatoria. Em despesa gerada por extra, valor e data nao podem ser alterados fora do projeto; descricao continua editavel conforme a decisao D20. `editavel` identifica a possibilidade de edicao geral, nao autoriza mudar valor/data vinculados.

Previsoes opcionais de projeto podem ser limpas com null no PATCH; o formulario precisa permitir enviar isso em vez de impedir localmente. Detalhes de recebimentos retornados no projeto evitam exigir permissao de COBRANCAS apenas para mostrar uma etapa.

### Usuarios e indicadores (X4, P13)

GET `/api/usuarios` sem page/limit preserva a resposta antiga em array. Com `?page=1&limit=10`, retorna `{data,meta}`. Ajustar o tipo e a leitura somente ao adotar a paginacao. ATIVO exige usuario e funcionario ativos; INATIVO inclui qualquer um inativo.

Projetos devolvem indicadores correspondentes aos filtros em `indicadores` (e no alias `indicadoresFiltrados`); `indicadoresGlobais` oferece os totais sem filtro. Os cartoes respeitam busca/tipo/cliente, mas nao o filtro de status, conforme D12. Usuarios tambem incluem `acessoAtivo`, calculado com o status do usuario e do funcionario.

### Complementos da revisao item a item

- Materiais, fornecedores e equipamentos aceitam `status=TODOS`; sem status, mantem ATIVO por padrao.
- Estoque retorna indicadores filtrados: `materiaisCadastrados`, `comReservaAtiva`, `semReserva`, `semSaldo` (saldo fisico zero) e `disponiveis` (saldo livre positivo). Nao usar disponiveis como sinonimo de semReserva.
- Unidades contaveis como UN/Unidade/Peca exigem quantidade inteira nas movimentacoes. Metro pode ser fracionado. Nao existe conversao automatica de unidades.
- `GET /api/financeiro/caixas?page=1&limit=10` lista caixas existentes e seus saldos sem abrir meses. Permissao CAIXA visualizar.
- A consulta individual de caixa acrescenta `situacao`, `podeFechar` e `competenciaMinima`; movimentos incluem `projeto`, `cliente`, `fornecedor` e `categoriaRotulo` quando aplicaveis.
- Despesas incluem `editavel`; a lista aceita `fornecedorId` e `categoria=SEM_CATEGORIA` (para compatibilidade com registros antigos).
- Detalhe do estoque retorna ate cinco compras e cinco baixas de forma independente, com valores/data da despesa nas compras.
- O catalogo de permissoes inclui `grupo` e rotulos legiveis. Nao foram criados modulos artificiais de Venda/Compra/Pagamento/Recebimento; manter COBRANCAS, DESPESAS, CAIXA e FREQUENCIA conforme as decisoes.

### Simulacoes sem gravar (X9)

`POST /api/orcamentos/simular`, permissao ORCAMENTOS visualizar, aceita `tipo`, `materiais`, `servicos` e `desconto`, com os mesmos formatos dos itens de cadastro. Retorna `totalMateriais`, `totalServicos`, `desconto`, `valorTotal` e `itens`. Usa o mesmo preparo de itens da gravacao.

`GET /api/projetos/opcoes/formas-pagamento`, permissao PROJETOS visualizar, retorna modalidades e formas com `aceitaAcrescimo`.

`POST /api/projetos/:id/cobranca/simular`, permissao PROJETOS visualizar, aceita as condicoes usadas no iniciar/etapa: `modalidadeCobranca`, `formaPagamento`, `numeroParcelas`, `primeiroVencimento`, `descontoPercentual`, `acrescimoPercentual` e `valorCobrado` opcional. Com valorCobrado, simula uma medicao. Sem ele, simula o saldo do inicio, descontando as entradas previas. Retorna `subtotal`, `desconto`, `acrescimo`, `valorFinal` e `parcelas`. Nenhuma das simulacoes cria orcamento, cobranca, reserva ou movimento financeiro.

## 7. Erros e seguranca

Datas de calendario usam AAAA-MM-DD; datas inexistentes ou com horario sao recusadas. Campos somente com espacos, valores fora dos limites e documentos invalidos podem retornar 400. Duplicidades e regras incompativeis retornam conflito. Nao depender exclusivamente do texto exato para decidir se houve sucesso.

Permissoes sao verificadas no servidor e continuam separadas por modulo. Gerenciar implica visualizar. Usuario/funcionario inativo nao pode continuar operando, mesmo com token antigo. Nao remover essas verificacoes para acomodar uma tela.

Os decorators de resposta documentam o Swagger; os erros reais vem da execucao da API. As excecoes de negocio agora possuem `codigo` literal e o filtro HTTP cobre os erros do framework. Usar `codigo` para decisoes locais e `message` para exibicao; preservar leitura de message string ou array. Nao criar novas comparacoes por texto.

Validacao retorna `codigo: VALIDACAO`, `message` e `erros: [{campo,mensagem}]` em portugues, incluindo caminho aninhado como `materiais.0.quantidade`. Campo extra retorna CAMPO_NAO_ACEITO com o mesmo array erros e preserva `property X should not exist` em message para a deteccao de compatibilidade do front antigo.

Erros de estoque acrescentam detalhes numericos: ESTOQUE_LIMITE_EXCEDIDO (`materialId`, `quantidadeAtual`, `maximoEntrada`), ESTOQUE_SAIDA_ACIMA_DO_DISPONIVEL (`maximo`) e ESTOQUE_INSUFICIENTE (`materiais`). RECEBIMENTO_ACIMA_DO_RESTANTE inclui `detalhes.restante`. CPF_CNPJ_DUPLICADO de cliente informa `campo: cpfCnpj`. Deadlock/timeout de lock conhecido retorna conflito, nao erro generico 500. Rota inexistente retorna ROTA_INEXISTENTE.

## 8. Conferencia conjunta depois dos ajustes da Ana

1. Testar com usuario administrador e com perfis limitados: apenas DESPESAS, apenas FREQUENCIA, apenas ORCAMENTOS e GESTAO_USUARIOS.
2. Cadastrar material pelo estoque com preco e categoria existentes; confirmar saldo e dados persistidos.
3. Conferir calculo de linhas fracionarias e total devolvido pelo backend.
4. Baixar PDF de frequencia pela API com filtros; manter exportacoes de cobrancas em PDF e Excel.
5. Criar categoria e usa-la no formulario sem reiniciar o sistema.
6. Estornar compra permitida e testar bloqueio com reserva/consumo. Confirmar caixa, estoque e historico.
7. Cancelar etapa/extra sem recebimento e verificar bloqueio depois de receber.
8. Conferir caixa nao aberto, abertura, heranca, bloqueio do saldo inicial e fechamento/reabertura.
9. Editar vinculos historicos inativos sem transforma-los em novos itens ativos.
10. Repetir os testes automatizados com `npm run test:verificar` dentro do backend.

O teste de navegador atual identifica tres pendencias conhecidas em vez de altera-las: preco no estoque, arredondamento e uso do PDF de frequencia. Enquanto existirem, o resultado registra `integracaoCompleta: false`. Navegar pelas telas nao equivale a testar todos os botoes.

Ultima bateria: compilacao dos dois projetos, tipos do frontend e ESLint do backend aprovados; 45 testes unitarios e 31 de integracao HTTP aprovados. A cobertura exata e o numero de chamadas do Chrome estao nas evidencias locais: `coverage/verificacao/execucao.json`, `coverage/verificacao/coverage-summary.json` e `coverage/browser/resultado.json` (ignoradas pelo Git). Chrome percorreu 17 telas, com as tres pendencias discriminadas acima. Auditoria npm sem vulnerabilidades conhecidas naquela execucao.

## 9. Fechamento do escopo

A conferencia do relatorio original esta em [AUDITORIA_RELATORIO_ANA.md](AUDITORIA_RELATORIO_ANA.md), com 154 itens e 10 fundamentos identificados individualmente. Nesta revisao foram tratados os pontos antes deixados genericamente em aberto: erros, listas, filtros, seletores, contexto financeiro, simulacoes e testes adicionais de concorrencia.

O que depende da Ana esta discriminado nas secoes acima: integrar campos, respostas, permissoes locais, botoes e downloads, sem alterar as regras do servidor. O frontend nao foi modificado nesta entrega.

Nao foram solicitados novos relatorios de despesas/pagamentos ou PDFs de caixa/orcamento: mantem-se impressao local para esses dois ultimos, PDF de frequencia e PDF/Excel de cobrancas. Isso e delimitacao aprovada de escopo, nao uma correcao de backend abandonada.

Dominio, HTTPS, segredos do ambiente publicado, backup e monitoramento dependem da hospedagem escolhida e nao foram configurados. Os testes locais comprovam os cenarios executados; dimensionamento de carga de producao depende daquele ambiente. Nao houve commit, push, merge nem deploy.
