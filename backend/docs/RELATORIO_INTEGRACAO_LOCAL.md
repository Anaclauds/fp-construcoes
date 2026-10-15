# Integracao local entre front-end e API

Data: 14/10/2026. Branch: `fix/integracao-front-back`.

> Atualizacao final: alteracoes do assistente no frontend foram desfeitas.
> Para o contrato atual e os ajustes que cabem a Ana, consultar
> [PARA_ANA_INTEGRACAO_FRONTEND.md](PARA_ANA_INTEGRACAO_FRONTEND.md).
> Resultado atualizado dos testes em
> [VERIFICACAO_GERAL_2026-10-14.md](VERIFICACAO_GERAL_2026-10-14.md).
> As pendencias e resultados descritos abaixo registram etapas anteriores.

## Resultado e alcance

Dependencias instaladas pelos lockfiles de `frontend/` e `backend/`. A API foi
comparada com os servicos HTTP e os formularios do front-end atual. Foram
corrigidos os problemas abaixo e executados testes com MySQL, alem de navegacao
e cadastro real pela interface Vue. Este relatorio nao declara concluido todo o
backlog do arquivo `PROBLEMAS_BACKEND_GESTAO_DE_PESSOAS-1.md`.

## Correcoes realizadas

- Paginas com ordenacao por nome agora usam ID para desempatar.
- Filtro `cadastroCompleto=false` deixa de ser convertido para `true`.
- Buscas por nomes com numeros nao usam apenas os digitos para encontrar clientes.
- `%`, `_` e barra invertida sao escapados nas buscas dos principais cadastros.
- Datas em DTOs aceitam somente dias reais no formato `AAAA-MM-DD`.
- Datas padrao de projetos, orcamentos, cobrancas e frequencia usam o fuso
  `America/Porto_Velho`, configuravel por `APP_TIMEZONE`.
- Textos de cadastros sao aparados; limites de tamanho e limites numericos sao
  validados antes da persistencia.
- Erros conhecidos do Prisma recebem status HTTP adequado e codigo estavel,
  com logs limitados a metadados do erro.
- Usuarios de funcionarios inativos nao podem ser criados nem reativados.
- Permissoes duplicadas sao recusadas; gerenciar implica visualizar.
- Usuario e funcionario do ultimo administrador ativo sao protegidos dentro
  da transacao, com bloqueio das linhas dos administradores.
- Login retorna uma mensagem unica para credenciais invalidas e sempre compara
  a senha com bcrypt. Limites: 10 tentativas/minuto por IP e 5 por CPF.
- `TRUST_PROXY` aceita saltos ou sub-redes; `true` e recusado.
- Observacao obrigatoria da frequencia nao pode ser apagada; quem edita fica registrado.
- Orçamentos passam a oferecer clientes e responsaveis por rotas de opcoes,
  protegidas pela permissao de Orcamentos.
- Aprovar orcamento reprovado ou de cliente inativo e recusado. A aprovacao
  usa atualizacao condicional antes de criar o projeto.
- Totais de orcamento preservam as 3 casas da quantidade e somam linhas ja
  arredondadas para centavos. O mesmo calculo foi ajustado no front-end.
- Vencimentos dos dias 29 a 31 sao limitados ao ultimo dia do mes de destino.
- Parcelas de valor zero sao recusadas.
- Cliente trocado de PF para PJ, ou vice-versa, deixa de conservar campos do outro tipo.
- Projeto existente sem cobrancas retorna lista vazia, em vez de 404.
- Cobrança sem recebimentos pode ser cancelada; o saldo restante cancelado e zero.
- Parcelas informam `vencida` na consulta.
- Projetos oferecem edicao de responsavel, previsoes e endereco; etapas e extras
  oferecem edicao limitada de texto e data.
- Inicio, etapa, extra, edicoes e cancelamento usam bloqueio da linha do projeto.
- Projeto planejado pode ser cancelado. Cobranças sem recebimentos sao canceladas;
  cobrancas com recebimentos sao preservadas e retornadas com aviso.
- Conclusao aceita data explicita e valida intervalo entre inicio e hoje.
- Opcoes e detalhe de projeto informam saldo dos materiais e saldo de medicoes.
- Estoque e conferido antes da cobranca inicial e da criacao de extras. Erros
  informam `materiais[]` e orientam a compra ou ajuste.
- Entrada ativa anterior e abatida da cobranca final ao iniciar o projeto.
- Parcelamento a vista aceita `numeroParcelas: 1`; limite de 60 parcelas.
- Etapas aceitam custo unitario e descricao por servico. Custo nao informado
  passa a zero; custo unitario e total informados juntos devem conferir.
- Extras aceitam descricao por servico e gastos avulsos; materiais em estoque
  continuam sendo reservados sem nova saida de caixa.
- Despesa gerada por extra informa seu vinculo; valor e data sao protegidos.
- Lancamentos financeiros rejeitam datas futuras ou anteriores a 2000 e exigem
  caixa aberto em competencias anteriores ao mes atual.
- Reabertura de caixa possui endpoint proprio e trilha de auditoria.
- Despesas oferecem selecao de materiais e fornecedores com a propria permissao.
  Foram ajustadas apenas as consultas e verificacoes de permissao desse fluxo no front.
- Caixa tambem pode consultar seu relatorio de recebimentos com permissao CAIXA.
- Exportacoes expoem `Content-Disposition` via CORS.
- Edicao de material/equipamento preserva vinculo existente com fornecedor inativo.
- Campos opcionais de texto deixam de causar erro ao receber `null`.
- Servicos aceitam `status=TODOS`.
- Atualizacoes compativeis de dependencias foram aplicadas sem `--force`.

## Banco

Migrations aditivas:

1. `20261014000200_integracao_projetos`: descricoes em etapa/extra servico e
   tabela `extra_gasto_avulso`.
2. `20261014000300_auditoria_caixa`: tabela de auditoria da reabertura.

Nenhum reset do banco foi usado. Testes automatizados usam banco cujo nome
contem `test`; dados temporarios criados pelos testes sao removidos ao final.

## Testes

- `npm run build` em `backend/` e `frontend/`.
- `npx eslint "{src,test}/**/*.ts"` em `backend/`.
- `npm run test:all`: 34 testes unitarios e 20 testes de integracao HTTP com MySQL
  aprovados (54 no total).
- `npm run test:frontend`: Chrome automatizado, login, 16 telas e cadastro de
  pessoa fisica pela interface, confirmando persistencia no banco de testes.
  Tambem confere o arredondamento do resumo de orcamento no front. Resultado:
  60 chamadas a API, nenhuma resposta de erro no percurso e nenhum erro JavaScript.

Para repetir o teste do navegador, primeiro instalar os dois projetos, gerar
o Prisma Client e compilar o backend. O teste requer Chrome instalado e portas
3031 e 5174 livres; inicia e encerra os servidores temporarios sozinho. Nao deve
ser executado simultaneamente com outros testes que alterem o mesmo banco.

```powershell
cd backend
npm ci
npm run prisma:generate
npm run build
npm run test:all
npm run test:frontend
```

As capturas de tela e o resultado do navegador ficam em `backend/coverage/browser/`
e sao ignorados pelo Git. O teste usa a API e o banco reais de teste; nao simula
as respostas dos modulos. A consulta externa de CEP tem testes proprios com
respostas controladas; indisponibilidade externa nao e descartada por esta verificacao.

## Pendencias do levantamento original

Continuam para uma etapa especifica, com validacao de regra e testes adicionais:

- Politica completa de heranca do saldo inicial, encerramento em ordem e consulta
  do caixa sem criar competencia automaticamente.
- Categorias/unidades fixas, conversao de unidades e exigencia de quantidade inteira.
- Preco pendente de material criado pelo estoque e normalizacao de cadastros antigos.
- Indicadores filtrados completos e otimizacao das listas de cobrancas/despesas.
- Relatorio de frequencia com todos os dias e taxa conforme D1; PDF no servidor.
- Paginacao de usuarios e seletores adicionais de funcionarios com permissoes restritas.
- Edição de orcamento/compra com itens inativos, sem revalidar itens nao alterados.
- Codigos de erro padronizados para todas as regras de negocio, alem dos erros Prisma.
- Unicidade de nomes de servicos/materiais e regras completas de mudanca de categoria.
- Testes de concorrencia de ultimo administrador e edicao de etapa contra recebimento.
- Auditoria completa de cancelamentos/estornos e eventuais novas categorias de despesa.
- Alertas de dependencias restantes: o audit ainda informa 29 vulnerabilidades,
  sendo 5 altas e nenhuma critica. Requerem avaliacao de atualizacoes maiores;
  nao foram aplicados downgrades ou atualizacoes incompatíveis automaticamente.

O funcionamento dos fluxos testados nao substitui a conclusao dessas pendencias
nem uma verificacao de seguranca para implantacao em producao.

## Segunda rodada: correcoes independentes das respostas da Ana

- Cadastros e edicoes de clientes, funcionarios e fornecedores validam os
  digitos verificadores dos documentos numericos com biblioteca especializada.
  CPF/CNPJ invalidos, telefone fora do formato, CEP malformado e UF inexistente
  sao rejeitados antes da persistencia. Documentos antigos nao foram modificados
  nem foi alterada a autenticacao dos usuarios existentes.
- O suporte a CNPJ alfanumerico ainda precisa ser implementado de ponta a ponta:
  esta rodada preserva o contrato numerico atual, inclusive sua normalizacao.
- Indicadores de orcamentos e projetos consideram busca e tipo. Os indicadores
  por situacao continuam independentes do filtro de status da tabela; orcamentos
  reprovados nao entram mais no total em aberto.
- Criacao de orcamento repete ate cinco vezes somente conflitos de unicidade
  do numero, recalculando-o em cada tentativa. Outros conflitos nao sao ocultados.
  A restricao unica do MySQL continua sendo a garantia final da numeracao.
- Testes adicionais cobrem documentos/contatos e a repeticao limitada de numeros.
  Os testes HTTP tambem verificam que entradas invalidas nao alteram o cliente.

Esta rodada nao encerra todas as pendencias tecnicas acima. Paginacao, seletores,
relatorio de frequencia, edicao de itens inativos, otimizacao das listas e testes
adicionais de concorrencia continuam registrados, alem das decisoes de uso que
aguardam a Ana. Nenhuma dessas decisoes foi presumida nesta rodada.

## Terceira rodada: respostas da Ana

Decisoes recebidas e preservadas: manter PDF/Excel de cobrancas; novos relatorios
limitados a frequencia; categorias obrigatorias e cadastraveis; sem conversao
de unidades; preco obrigatorio; cancelamentos com historico e bloqueio quando
ja existem recebimentos; fornecedor opcional em despesa diversa.

Implementado nesta rodada:

- Consulta do caixa nao cria registros: competencia ainda nao aberta retorna
  `naoAberto: true`, ID zero e resumo vazio. A tela permite abrir o caixa e nao
  oferece fechamento para esse resultado virtual.
- Saldo inicial fica bloqueado apos movimentacoes. Ao abrir a competencia,
  havendo caixa anterior, ele precisa estar fechado e seu saldo final e herdado,
  ignorando o valor manual. A primeira abertura permite saldo manual.
- Fechamento exige mes encerrado e ausencia de caixas anteriores abertos.
  Reabrir competencia que possui caixa posterior e bloqueado para nao invalidar
  saldos herdados. Lancamentos exigem caixa aberto, inclusive no mes atual.
- Material novo no estoque exige preco positivo com duas casas decimais;
  formulario Vue atualizado. Compra exige a unidade cadastrada no material.
- Despesa diversa aceita fornecedor opcional, validado quando informado.
- Frequencia inclui todos os dias ate hoje, inclusive dias sem lancamento;
  taxa considera o periodo inteiro e fica nula com filtro de status. A resposta
  preserva `registros` e acrescenta `dias`. Filtro `NAO_REGISTRADO` e aceito.
- PDF de frequencia gerado na API, com download conectado ao botao do front.

Verificacao: 40 testes unitarios e 20 de integracao passaram em um banco novo
isolado. Os cenarios financeiros foram atualizados para respeitar bloqueio do
saldo inicial e fechamento cronologico. Front e back compilados.

Nao concluido nesta rodada: categorias cadastraveis/obrigatorias ponta a ponta,
estorno completo de despesas, cancelamento individual de etapas/extras,
paginacao e seletores, historico de itens inativos, otimizacoes e demais testes
de concorrencia do backlog. As respostas da Ana nao sao mais bloqueio para
esses itens. Esta rodada NAO declara o sistema completo nem pronto para producao.

## Quarta rodada: verificacao ampla e dependencias

Resultado atualizado em 14/10/2026: 40 testes unitarios e 25 testes HTTP com
MySQL aprovados, cobertura de 89,25% das linhas do backend. Chrome: 17 telas,
76 chamadas a API sem erros no percurso, cadastro de cliente e de material,
preco obrigatorio, saldo persistido, PDF de frequencia e abertura do caixa.

Foi validada instalacao limpa e corrigida a arvore de dependencias com
overrides documentados. Auditoria npm atual: zero vulnerabilidades conhecidas
nos dois projetos. Os numeros de alertas das secoes anteriores sao historicos.
Ainda ha avisos de pacotes descontinuados e limites funcionais do backlog.

O novo `npm run test:verificar` audita as dependencias, compila os dois
projetos, verifica tipos/lint, executa testes e navegador em banco temporario
aleatorio e remove somente esse banco ao final. Resultados detalhados e
pendencias nao encerradas: `VERIFICACAO_GERAL_2026-10-14.md`.

## Executar a versao local

Com MySQL ativo e `.env` local configurado:

```powershell
# Terminal do backend
cd backend
npm run prisma:generate
npx prisma migrate deploy
npm run start:dev
```

```powershell
# Outro terminal, na raiz do repositorio
cd frontend
npm run dev -- --host 127.0.0.1
```

- Front-end: http://127.0.0.1:5173/
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/docs

As credenciais continuam no ambiente local. Nao foram criados commits, push ou
merge nesta etapa.
