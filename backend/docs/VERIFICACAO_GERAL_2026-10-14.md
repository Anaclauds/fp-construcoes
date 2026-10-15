# Verificacao geral local - 14/10/2026

## Resultado

- Backend e frontend compilados; tipos e ESLint aprovados.
- 45 testes unitarios, em 11 suites, aprovados.
- 31 testes de integracao HTTP, em 3 suites, aprovados com MySQL real.
- Cobertura da integracao: 89,54% statements, 69,12% branches, 90,43%
  funcoes e 89,49% linhas. Evidencia em `coverage/verificacao/coverage-summary.json`.
  Nao e cobertura isolada de testes unitarios.
- Auditoria npm: zero vulnerabilidades conhecidas no backend e no frontend.
  Isto nao substitui auditoria de seguranca, nem significa que todas as
  bibliotecas estejam sob suporte: ainda existem avisos de descontinuacao.

## Escopo exercitado

| Area | Verificacao |
| --- | --- |
| Autenticacao | Login valido/invalido, limite por CPF/IP, token ausente/adulterado, perfil e troca de senha sem exposicao do hash |
| Usuarios e funcionarios | Cadastro, consulta, edicao, permissao, ativacao/desativacao, revogacao e protecao concorrente do ultimo administrador |
| Clientes | Cadastro rapido, PF/PJ, filtros, documentos, contatos, edicao, exclusao logica e CPF unico em duas requisicoes simultaneas |
| Enderecos | Validacao, respostas controladas dos provedores, fallback e indisponibilidade em testes unitarios |
| Fornecedores/equipamentos | Cadastro, consulta, opcoes, edicao e status |
| Materiais/estoque | Preco, saldo inicial, compra, ajustes, reserva, insuficiencia e baixa de projeto |
| Servicos/orcamentos | Construcao civil, serralheria, calhas/rufos, itens, totais, arredondamento, edicao, aprovacao e criacao de projeto |
| Projetos | Inicio, endereco, datas, etapas, extras, historico, conclusao e cancelamento do projeto |
| Cobrancas | A vista, parcelas automaticas/manuais, desconto, acrescimo permitido/proibido, cancelamento sem recebimento, PDF e Excel |
| Recebimentos | PIX, dinheiro, transferencia, cheque, credito, debito, boleto, parcelas e movimentacao do caixa |
| Despesas/caixa | Compras e despesas diversas, reflexo no estoque/caixa, bloqueios, fechamento, reabertura auditada e heranca do saldo |
| Frequencia | Status, justificativas, dias nao registrados, taxa sobre o periodo, filtro e PDF |

Os 31 cenarios possuem varias verificacoes HTTP e de banco. O numero de
cenarios nao corresponde ao numero de endpoints nem a todas as combinacoes
de campos possiveis. Parte dos servicos e verificada pela integracao, nao
por uma suite unitaria individual para cada modulo.

## Navegador real

O teste automatizado usa Chrome, frontend Vue, API e MySQL reais:

- navega em 17 telas;
- autentica pela tela de login;
- cadastra cliente PF e confirma persistencia;
- detecta que o formulario de estoque nao envia preco e confirma recusa 400 sem gravacao;
- detecta que frequencia ainda usa impressao local, nao o PDF disponivel na API;
- confirma que consultar caixa nao cria registro, abre o caixa pela tela e
  verifica o bloqueio do fechamento do mes atual;
- detecta divergencia de arredondamento de orcamento (front 0.05, API 0.06) e faz captura em viewport mobile.

Foram 74 chamadas a API, sem erros JavaScript. O unico erro HTTP observado foi
o 400 esperado do formulario sem preco. O resultado explicita
`integracaoCompleta: false`: passar neste teste significa identificar
corretamente essas incompatibilidades, nao considera-las resolvidas.
O codigo de frontend foi restaurado e permanece sem alteracoes nesta entrega.

Resultado detalhado em `coverage/browser/resultado.json`. Capturas e PDF
gerados ficam em `coverage/browser/`, ignorado pelo Git. Navegar em uma tela
nao significa testar todas as suas acoes; os fluxos acima sao os exercitados
com interacao. Os demais modulos possuem verificacoes HTTP da tabela anterior.

## Dependencias

Foi validada instalacao limpa por `npm ci`, sem `npm audit fix --force`.
O lockfile foi regenerado respeitando as faixas declaradas no package.json.
Foram fixadas dependencias transitivas por `overrides`:

- driver MariaDB do adaptador Prisma: 3.5.4;
- js-yaml do Swagger: 5.4.3;
- mysql2 do Prisma CLI: 3.24.6;
- js-yaml do leitor de configuracao de cobertura: 4.3.2;
- deepmerge-ts do Prisma config: 8.0.2;
- uuid do ExcelJS: 11.1.1.

Os consumidores dessas dependencias foram conferidos e a bateria foi repetida
apos a reinstalacao. Os overrides devem ser reavaliados ao atualizar os
pacotes principais. Zero avisos no audit e um retrato desta execucao: novos
avisos podem surgir posteriormente.

## Fechamento e escopo

Foram implementados no backend: categorias cadastraveis, estorno de despesas
com auditoria, cancelamento individual de etapas/extras sem recebimento,
seletores com permissoes proprias, paginacao opcional de usuarios e preservacao
de vinculos historicos inativos em orcamentos/compras. Os novos testes cobrem
tambem duplicacao de cancelamento, compra com reserva e etapa recebida.

A integracao desses recursos no frontend continua com a Ana. O handoff em
[PARA_ANA_INTEGRACAO_FRONTEND.md](PARA_ANA_INTEGRACAO_FRONTEND.md) detalha os
contratos, as tres incompatibilidades observadas e a conferencia conjunta.
Na revisao complementar foram implementados: paginacao e filtros de cobrancas
no MySQL, indicadores agregados de estoque/recebimentos, situacao e contexto
do caixa, lista de caixas existentes, status TODOS nos cadastros, erros de
validacao em portugues com campo, codigos literais de regras de negocio e
simulacoes sem gravar usando os mesmos helpers de calculo da persistencia.

A conferencia individual de 154 itens e 10 fundamentos esta em
[AUDITORIA_RELATORIO_ANA.md](AUDITORIA_RELATORIO_ANA.md). Itens opcionais e
decisoes de escopo estao identificados, nao misturados a defeitos de codigo.

Os testes adicionais cobrem limite acumulado do estoque, fracao de unidade
contavel, duas saidas simultaneas, estornos duplicados concorrentes e disputa
entre recebimento e cancelamento de etapa (tres repeticoes). Esta ultima
revelou um erro de concorrencia, corrigido ao padronizar a ordem dos locks:
primeiro projeto, depois cobranca. Tambem houve 20 consultas paralelas de
caixa, sem gravacao de novas competencias. Isto nao e benchmark de producao.

Tambem nao foram declarados completos suporte a CNPJ alfanumerico, testes de
carga, restauracao de backup, seguranca de infraestrutura ou implantacao em
producao. CEP externo e controlado nos testes HTTP: a disponibilidade real
dos provedores nao e garantida por esta bateria.

As correcoes de backend conferidas estao discriminadas na matriz individual.
A integracao das telas e a preparacao do ambiente publicado sao etapas
separadas; nao foram feitas alteracoes no front nem deploy nesta entrega.

## Repetir

Com dependencias dos dois projetos instaladas, Chrome e MySQL disponiveis,
execute dentro de `backend`:

```powershell
npm run test:verificar
```

O usuario MySQL precisa poder criar/remover bancos temporarios. O comando
usa nome aleatorio exclusivo, aplica migrations e remove somente o banco
criado para aquela execucao. Nao altera o `.env` nem os dados do banco local
de desenvolvimento. Nao execute verificacoes simultaneas: as portas 3031 e
5174 precisam estar livres.

Cada etapa fica registrada em `coverage/verificacao/execucao.json`; cobertura
em `coverage/verificacao/coverage-summary.json` e `lcov-report/index.html`.
Nenhum commit, push ou merge foi realizado.
