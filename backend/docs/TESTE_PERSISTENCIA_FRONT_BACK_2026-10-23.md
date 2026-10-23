# Teste de persistencia: frontend, backend e MySQL

Data: 23/10/2026. Base versionada: f210a18.

## Resultado

APROVADO nos cenarios abaixo: 40 verificacoes de persistencia, 17 telas acessadas e 412 chamadas a API, sem erros JavaScript nem respostas HTTP inesperadas.

Os testes de ponta a ponta foram executados com Playwright no Chrome, utilizando os formularios e botoes do frontend. A verificacao relaciona as respostas HTTP, consultas independentes ao MySQL e a exibicao dos dados apos recarregar as telas. Ao final, a API de teste foi reiniciada e os dados continuaram acessiveis.

## Operacoes executadas pela interface

- Login, criacao e edicao de cliente pessoa fisica.
- Cadastro de fornecedor e equipamento, conferindo o relacionamento.
- Cadastro de funcionario, salario e usuario associado; conferencia do hash da senha.
- Registro de frequencia e consulta apos recarregar.
- Cadastro de servicos de serralheria, calhas e construcao civil.
- Cadastro de material com preco e saldo inicial.
- Criacao de orcamento para cada um dos tres tipos, incluindo material e servico, com total de R$ 206,25 por orcamento.
- Aprovacao de cada orcamento e criacao do projeto relacionado.
- Inicio dos tres projetos e conferencia das reservas: 0,5 por projeto, total reservado de 1,5.
- Criacao automatica de cobrancas ao iniciar serralheria e calhas.
- Recebimentos parciais em Pix, dinheiro, transferencia, cheque, cartao de credito, cartao de debito e boleto, ate quitar a cobranca de serralheria.
- Quitacao da cobranca de calhas, conferindo a entrada correspondente no caixa.
- Registro de etapa de construcao civil: servico de R$ 100,00, custo estimado de R$ 50,00, cobranca e recebimento.
- Compra de material: despesa, itens, aumento de estoque e saida no caixa.
- Tentativa de estornar compra de material reservado: bloqueio esperado com HTTP 409 e codigo UTILS_ESTORNARDESPESA_CONFLICT_03, sem alterar os dados.
- Compra e estorno de material sem reservas: aumento e reversao do estoque, entrada compensatoria no caixa e preservacao da despesa no historico.
- Registro e estorno de despesa diversa, com auditoria.
- Abertura, conciliacao e fechamento do caixa de um mes anterior.
- Cliente, caixa fechado e saldo acessiveis apos reiniciar a API.
- Download do PDF de frequencia retornado pela API, verificando conteudo PDF e download concluido.

## Conferencia financeira

| Item | Valor |
| --- | ---: |
| Saldo inicial | R$ 100,00 |
| Entradas, incluindo compensacoes dos estornos | R$ 547,50 |
| Saidas | R$ 60,00 |
| Saldo final | R$ 587,50 |

O saldo foi conferido nos registros do MySQL e na tela recarregada, antes e depois de reiniciar a API.

## Repetir e consultar evidencias

No terminal da pasta backend, com MySQL disponivel, dependencias instaladas e build do backend atualizado:

Pre-requisitos adicionais: Google Chrome instalado, portas 3031 e 5174 livres, arquivo .env local configurado e usuario MySQL com permissao para criar e remover o banco temporario. As dependencias do frontend tambem precisam estar instaladas. Para atualizar o build antes do teste, execute npm.cmd run build no backend.

```powershell
npm.cmd run test:persistencia
```

O comando usa um banco temporario de nome aleatorio fp_visual_test_<identificador>, aplica as migrations, cria somente dados ficticios e remove esse banco ao terminar. Os dados do banco local habitual nao sao alterados. Usa as portas de teste 3031 e 5174.

- Evidencias de persistencia: coverage/persistencia-visual/resultado.json.
- Capturas das 40 verificacoes: coverage/persistencia-visual/01.png a 40.png.
- Resumo do navegador: coverage/browser/resultado.json.

Os arquivos de coverage sao locais e ignorados pelo Git. O campo completo do resultado se refere a esta sequencia de testes, nao a todas as combinacoes possiveis do sistema.

## Escopo das alteracoes

Foram ampliados os testes no backend e adicionado o comando test:persistencia. Nenhum arquivo do frontend nem regra de negocio da aplicacao foi alterado nesta verificacao.

Estes testes verificam operacao e persistencia locais nos cenarios descritos; nao equivalem a testar todos os botoes, todas as variacoes de pagamento ou a implantacao na internet.
