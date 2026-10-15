# Conferencia item a item do relatorio da Ana

Data: 14/10/2026. Origem: PROBLEMAS_BACKEND_GESTAO_DE_PESSOAS-1.md.

Inventario: 154 itens e 10 fundamentos (164 IDs unicos). O documento original nao foi modificado. Esta matriz registra o tratamento no codigo, nao inventa 164 testes independentes: os testes possuem varios endpoints e as evidencias de execucao estao em VERIFICACAO_GERAL_2026-10-14.md.

## Como interpretar

- Tratado no backend: a regra/correcao foi conferida no codigo atual. A bateria integrada verifica cenarios representativos; nao e uma garantia matematica para toda combinacao de entrada.
- Regra mantida/documentada: o relato e uma decisao ou esclarecimento, nao demanda implementar outro comportamento.
- Escopo delimitado/opcional: aplica-se a decisao expressa de nao acrescentar novos relatorios alem da frequencia; exportacoes de cobrancas foram mantidas.
- A coluna backend nao significa que a Ana ja integrou a tela. As alteracoes exclusivamente de front estao em PARA_ANA_INTEGRACAO_FRONTEND.md.

## Matriz

| ID | Item original | Tratamento | Evidencia no backend (caminhos relativos a src, salvo indicacao) |
| --- | --- | --- | --- |
| B0.1 | Datas só-dia (parseDateOnly, @IsDataSomenteDia) e "hoje" no fuso (hojeNoFusoDoNegocio, APP_TIMEZONE) em src/common/utils/date.util.ts e src/common/validators/ | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| B0.2 | escaparLike() (src/common/utils/like.util.ts) em todo contains | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| B0.3 | PrismaExceptionFilter global (P2002→409, P2000→400, P2034→409, P2003→400, P2025→404; log só com code/modelName/target) | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| B0.4 | Transformers @AparaTexto/@SomenteDigitos/@TextoOpcional e validadores @IsCpf/@IsCnpj/@IsCpfOuCnpj | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| B0.5 | Limites reutilizáveis (src/common/utils/valor.util.ts: valor ≤ 9.999.999.999,99; quantidade ≤ 999.999.999,999) | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| B0.6 | Desempate { id: 'asc' } como último critério de todo orderBy paginado | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| B0.7 | exceptionFactory do ValidationPipe (mensagens em português + erros[{campo, mensagem}]) e codigo estável nos erros de regra | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| B0.8 | @nestjs/throttler + LoginThrottlerGuard (IP e CPF) + TRUST_PROXY | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| B0.9 | CORS com exposedHeaders: ['Content-Disposition'] | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| B0.10 | npm audit fix (sem --force) | Tratado no backend | common/; main.ts; AppModule; validadores/DTOs; lockfile e auditoria npm |
| 1 | Paginação de funcionários repete e perde registros | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| X1 | Mesmo desempate em clientes, materiais, equipamentos, fornecedores, estoque e serviços | Tratado no backend | orderBy composto nas listas |
| 2 | Usuário de funcionário inativo pode ser criado e reativado | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| S5 | PATCH /usuarios/:id {status:ATIVO} ignora a mesma regra | Tratado no backend | auth/, usuarios/ultimo-admin.util.ts; filtros; testes de seguranca e concorrencia |
| C19 | Quem só tem ORCAMENTOS não lista nem lê clientes | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C3 | Sem opções de responsável para aprovar orçamento | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| S8 | Lista de clientes do orçamento sem telefone/endereço | Tratado no backend | auth/, usuarios/ultimo-admin.util.ts; filtros; testes de seguranca e concorrencia |
| X17 | Cliente inativo do orçamento e relatório de recebimentos com CAIXA | Tratado no backend | financeiro.controller.ts: CAIXA ou COBRANCAS; orcamentos.service.ts: endereco do cliente no detalhe |
| P1 | Saldo de estoque antes de iniciar/extra e erro que orienta | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| C23 | Estoque conferido antes de criar a cobrança; aviso no orçamento | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| E9 | Erro de estoque insuficiente estruturado (materiais[]) | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E10 | Opções de material do projeto/extra com saldo | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E1 | Detalhe do estoque sem valor das compras e sem baixas | Tratado no backend | estoque.service.ts: cinco compras e cinco baixas consultadas separadamente |
| E2 | Categorias de material em texto livre, sem endpoint de opções | Tratado no backend | common/categorias.controller.ts; migration 20261014000400 |
| E16 | Lacunas de cadastro (unidades fixas, status=TODOS, código) | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E19 | Unidade contável aceita fração | Tratado no backend | common/utils/quantidade.util.ts: unidades contaveis |
| F1 | Valor inicial do caixa não herda o saldo do mês anterior | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F14 | valorInicial sobrescrito a qualquer momento, sem trilha | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F2 | Usuário de DESPESAS não lista fornecedores nem materiais da compra | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| X10 | Opções de material da compra com saldo e ESTOQUE_LIMITE_EXCEDIDO | Tratado no backend | despesas.service.ts e common/utils/quantidade.util.ts |
| X11 | Opções de material com busca/limit | Tratado no backend | GET despesas/opcoes/materiais: busca e paginacao |
| F3 | Caixa pode ser fechado no próprio mês, no futuro e fora de ordem | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F8 | Unidade da compra livre e sem conversão | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| 3 | Funcionários: dados inválidos aceitos e 500 | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| 4 | Datas inexistentes aceitas e gravadas no dia seguinte | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| 5 | Observação obrigatória apagada pelo PATCH | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| 6 | Login sem limite de tentativas | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| S2 | Limite de login atrás de proxy (TRUST_PROXY) | Tratado no backend | auth/, usuarios/ultimo-admin.util.ts; filtros; testes de seguranca e concorrencia |
| S4 | Login permite descobrir CPFs; limite por CPF | Tratado no backend | auth/, usuarios/ultimo-admin.util.ts; filtros; testes de seguranca e concorrencia |
| X4 | Usuários sem paginação e com status efetivo calculado no front | Tratado no backend | usuarios.service.ts: paginacao opcional e acessoAtivo |
| X5 | Sem endpoint de funcionários sem usuário | Tratado no backend | GET usuarios/opcoes/funcionarios |
| X6 | Lista de funcionários para quem só tem Frequência | Tratado no backend | GET frequencias/opcoes/funcionarios |
| X7 | Relatório de frequência com todos os dias e taxa da decisão D1 | Tratado no backend | frequencias.service.ts: periodo completo, taxa e PDF |
| C1 | Validação de cliente: tamanhos, CEP, UF (500 por estouro) | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C31 | CPF/CNPJ com DV, nascimento não futura, telefone 10–11 dígitos | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C2 | Datas não estritas (data com hora → 500) | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C28 | Confirmação de C2 em recebimento, cliente e orçamento | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C4 | Aprovação aceita orçamento REPROVADO e cliente inativo | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C16 | Trocar PF↔PJ mantém os campos do tipo anterior | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C6 | PATCH de cliente com tipo (coberto por C16) | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C18 | PATCH {tipo:null} aceito | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| X12 | Cliente PJ mantém o nome do cadastro rápido | Tratado no backend | clientes.service.ts: nome de PJ derivado da razao social |
| C17 | Busca de clientes com letras e números traz registros sem relação | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C34 | %/_ curinga em clientes, orçamentos e cobranças; cobranças sensíveis a acento | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C20 | Total do orçamento diferente da soma dos itens | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C9 | Quantidade arredondada a 2 casas antes do cálculo | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C21 | Data de emissão em UTC | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C26 | Vencimento automático nos dias 29–31 pula mês | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C12 | Mesmo defeito (origem do levantamento) | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| P19 | Mesmo defeito visto em iniciar/etapa | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| C27 | Recebimento aceita data futura/inexistente e cria caixa de qualquer mês | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C29 | Concorrência responde 500 em vez de 409 | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C10 | Número do orçamento gerado sem trava | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C30 | PATCH de orçamento revalida itens e cliente não enviados | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C22 | observacoes: null não limpa | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| P3 | Cancelar/concluir projeto não mexe nas cobranças; sem cancelar PLANEJADO | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P4 | Gasto extra fora do catálogo não suportado | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P5 | Despesa do extra cria caixa sem exigir abertura | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P6 | Despesa gerada por extra editável livremente | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| F9 | Mesmo defeito, visto pelo Financeiro | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F22 | Despesa de extra sem marca (extraProjeto) na resposta | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| G6 | Despesa do extra desatualizada ao editar o extra | Tratado no backend | projetos.service.ts: updateExtra sincroniza descricao da despesa e movimentacao |
| P7 | Custo interno inconsistente entre etapa e extra | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P8 | Datas com hora, sem limites de valor e de parcelas | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P26 | Extra acima de DECIMAL(12,2) → 500 | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P27 | Cobrança com parcelas de R$ 0,00 | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P20 | dataRegistro de etapa/extra em UTC | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P28 | dataConclusao em UTC e sem data no body | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| G5 | Datas do projeto incoerentes (início futuro, conclusão antes do início) | Tratado no backend | DTOs, filtros comuns e regras de datas/valores dos services; testes HTTP |
| X8 | Detalhe do projeto sem data de pagamento para quem não tem Cobranças | Tratado no backend | projetos.service.ts: recebimentos nas parcelas |
| X9 | Regras de cálculo replicadas no front (simulação no backend) | Tratado no backend | POST orcamentos/simular; POST projetos/:id/cobranca/simular; GET projetos/opcoes/formas-pagamento |
| E3 | null em campos opcionais do PATCH → 500 | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E4 | Não dá para limpar data/valor de aquisição | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E5 | Datas com hora estouram 500 (equipamentos) | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| G2 | Confirmação de E5/F11 | Tratado no backend | DTOs, filtros comuns e regras de datas/valores dos services; testes HTTP |
| E6 | Material criado pelo estoque nasce com preço 0 | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E7 | Desativar fornecedor quebra a edição de materiais/equipamentos | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| F7 | Mesmo defeito na edição da compra | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| E8 | Indicadores do estoque diferentes do Figma e ignorando filtros | Tratado no backend | estoque.service.ts: count por filtro, semReserva e semSaldo |
| E17 | Ajuste de estoque aceita justificativa só com espaços | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E11 | Strings só com espaços viram vazio | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| G1 | Valores acima do DECIMAL → 500 | Tratado no backend | DTOs, filtros comuns e regras de datas/valores dos services; testes HTTP |
| E12 | Sem limites máximos no estoque/cadastros | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| F12 | Sem limites na despesa e no valor inicial | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| G3 | %/_ curinga em materiais, equipamentos, fornecedores, estoque e despesas | Tratado no backend | DTOs, filtros comuns e regras de datas/valores dos services; testes HTTP |
| F23 | Mesmo defeito em GET /despesas | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F4 | GET /financeiro/caixa grava no banco e cria caixa de qualquer competência | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F20 | Competência de qualquer ano aceita e criada | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| X14 | situacao, podeFechar e competenciaMinima no caixa | Tratado no backend | financeiro.service.ts: situacao, podeFechar, competenciaMinima |
| F15 | Competência "atual" em UTC | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F5 | Não existe reabertura de caixa | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| P24 | Mesmo item, visto em Projetos | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| S6 | Auditoria da reabertura (auditoria_caixa) | Tratado no backend | auth/, usuarios/ultimo-admin.util.ts; filtros; testes de seguranca e concorrencia |
| F6 | Despesas com qualquer data criam caixas de meses arbitrários | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F10 | Categorias de despesa/caixa diferentes do Figma; categoria nula | Tratado no backend | catalogo de categorias e categoria EXTRA_PROJETO; migration 20261014000400 |
| F24 | Filtros fornecedorId e categoria=SEM_CATEGORIA | Tratado no backend | ListDespesasQueryDto e buildWhere: fornecedorId e SEM_CATEGORIA |
| F11 | Datas com hora → 500 em despesas e filtros | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F13 | Movimentações do caixa sem projeto/cliente/fornecedor | Tratado no backend | financeiro.service.ts: contexto de projeto/cliente/fornecedor e categoriaRotulo |
| F21 | Despesa não informa se o caixa está fechado (editavel) | Tratado no backend | despesas.service.ts: editavel |
| G4 | Despesa inconsistente aceita (total 0, descrição vazia) | Tratado no backend | DTOs, filtros comuns e regras de datas/valores dos services; testes HTTP |
| S1 | Regra do último administrador sujeita a corrida | Tratado no backend | auth/, usuarios/ultimo-admin.util.ts; filtros; testes de seguranca e concorrencia |
| 9 | Nada impede desativar o último administrador | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| S3 | Dependências com vulnerabilidade | Tratado no backend | auth/, usuarios/ultimo-admin.util.ts; filtros; testes de seguranca e concorrencia |
| X2 | Mensagens do ValidationPipe em inglês e sem campo | Tratado no backend | common/validators/validation.pipe.ts |
| X3 | Erros sem código estável | Tratado no backend | codigo literal nas excecoes; common/filters/http-exception.filter.ts |
| 7 | Busca com %/_ retorna tudo (funcionários, usuários) | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| 8 | Busca por celular com máscara não encontra | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| 10 | Permissões duplicadas no PATCH → 500 | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| 11 | "Gerenciar" aceito sem "Visualizar" | Tratado no backend | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| X15 | Rótulos de módulos sem acento e sem grupo | Tratado no backend | auth/permissions.constants.ts: grupos e rotulos; permissoes sem novos modulos |
| C5 | cadastroCompleto=false retorna os completos | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C8 | ?tipo= nas opções de serviço do orçamento | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C11 | Indicadores ignoram parte dos filtros | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C13 | Sem cancelar cobrança; VENCIDA/CANCELADA nunca usados | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C33 | valorRestante de cobrança cancelada não zera | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C14 | PARCELADO_MANUAL aceito no orçamento e recusado no iniciar | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C24 | CORS sem Access-Control-Expose-Headers | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C25 | Descrições geradas sem acento | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C32 | Relatórios PDF/Excel com códigos, sem acento e sem filtros | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C35 | Movimentação de caixa não distingue as medições | Tratado no backend | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| X16 | PDF de orçamento e de caixa no servidor (opcional) | Opcional: impressao mantida | PDFs de orcamento/caixa nao sao exigidos na primeira versao; interface ja possui impressao. PDF de frequencia e exportacoes de cobrancas estao na API. |
| P9 | Forma/modalidade aceitas no DTO e recusadas no service; à vista com 1 parcela → 400 | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P10 | Nomes diferentes dos mesmos campos (aliases) | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P11 | ENTRADA manual prévia bloqueia o iniciar | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P13 | Indicadores de projetos globais, sem planejados e cancelados | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P23 | Mesmo item, confirmado na tela | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P14 | Faltam endpoints de edição de projeto, etapa e extra e a data de conclusão | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| X13 | PATCH /projetos/:id não limpa previsões | Tratado no backend | projetos.service.ts: PATCH aceita null nas previsoes opcionais |
| P15 | Serviços: unicidade, trim, limites, categoria de serviço usado | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P25 | /servicos sem "todos os status" | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P16 | Descrição da etapa e justificativa do extra aceitam vazio | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P17 | Concorrência em iniciar/etapa sem lock | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| S9 | Edição de etapa/extra concorrendo com recebimento | Tratado no backend | auth/, usuarios/ultimo-admin.util.ts; filtros; testes de seguranca e concorrencia |
| P21 | Sem descrição por serviço na etapa e no extra | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P22 | GET /cobrancas/projetos/:id dá 404 sem cobranças | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P29 | %/_ curinga em projetos e serviços | Tratado no backend | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| E13 | Contato do fornecedor sem validação de formato | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E14 | Busca de equipamento pela razão social do fornecedor | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E15 | Data de aquisição "futura" avaliada em UTC | Tratado no backend | estoque/, materiais/, equipamentos/, fornecedores/; DTOs e testes HTTP |
| E18 | Nome de material e nome fantasia de fornecedor duplicados | Tratado no backend | materiais.service.ts e fornecedores.service.ts: nome ativo duplicado bloqueado |
| G7 | Diversos (avisos em pt-BR, dataInicio > dataFim, status=TODOS) | Tratado no backend | DTOs, filtros comuns e regras de datas/valores dos services; testes HTTP |
| F16 | Corridas no upsert do caixa e na sincronização → 500/409 | Tratado no backend | financeiro/, despesas/; common/utils/caixa.util.ts; testes de caixa e despesas |
| F17 | Sem excluir/estornar despesa | Tratado no backend | common/utils/estorno.util.ts: caixa, estoque e auditoria transacionais |
| F18 | Diversa descarta fornecedorId; indicadores carregam tudo | Tratado no backend | despesas.service.ts: fornecedor opcional e agregacao groupBy |
| F19 | Telas/endpoints do Figma sem backend (lista de caixas, relatório de despesas) | Escopo delimitado | GET financeiro/caixas implementado. Nao criar novos relatorios de despesas/pagamentos: decisao 10 limita novos relatorios a frequencia, mantendo exportacoes de cobrancas. |
| S7 | Log do filtro Prisma com dados pessoais | Tratado no backend | auth/, usuarios/ultimo-admin.util.ts; filtros; testes de seguranca e concorrencia |
| 12 | Nome enganoso funcionariosAtivos no relatório (totalRegistros) | Regra mantida/documentada | funcionarios/, usuarios/, frequencias/, auth/; integracao-completa e login-limits |
| C7 | Cadastro rápido exige estado (decisão D15: manter; documentar no Swagger) | Regra mantida/documentada | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C15 | Decimal como texto × número (decisão D16: manter; documentar) | Regra mantida/documentada | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| C36 | listarResumos de cobranças pagina em memória | Tratado no backend | cobrancas/resumos.sql.ts: agregacao e paginacao SQL |
| C37 | Mensagens sem acento (respeitar a regra de mensagens do item 6 de "Como usar") | Regra mantida/documentada | clientes/, orcamentos/, cobrancas/; testes HTTP de comercial e vendas |
| P2 | "Desconto duplo" não é bug (decisão D6; documentar no Swagger) | Regra mantida/documentada | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P12 | Teto das medições sobre o valor bruto (decisão D7; mensagem com saldo e medicoes no detalhe) | Regra mantida/documentada | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |
| P18 | dataInicio padrão e status LIBERADA (decisão D22; Swagger) | Regra mantida/documentada | projetos/, estoque/, cobrancas/; testes HTTP de execucao e cancelamento |

## Verificacao complementar

Foram acrescentados testes para validacao em portugues/campos aninhados, codigos HTTP, status TODOS, simulacoes sem persistencia, filtros SQL, valores historicos inativos, limite acumulado de estoque e concorrencia de saidas/estornos/cancelamento com recebimento.

Testes locais de concorrencia nao substituem dimensionamento do ambiente publicado. Configurar dominio, HTTPS, segredos, backup e monitoramento exige o destino de hospedagem e suas credenciais; nao foram feitos deploy nem alteracoes de infraestrutura nesta tarefa.
