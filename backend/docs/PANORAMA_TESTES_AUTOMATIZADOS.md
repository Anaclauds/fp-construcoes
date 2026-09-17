# Panorama dos testes automatizados

## Resultado atual

- Testes unitarios: 15 aprovados em 4 suites.
- Testes de ponta a ponta: 12 cenarios aprovados em 2 suites.
- Verificacoes HTTP no fluxo integrado: mais de 140.
- Cobertura E2E da API: 90,69% de statements, 68,66% de branches, 90,26%
  de funcoes e 90,23% de linhas.
- Banco utilizado: banco MySQL exclusivo cujo nome obrigatoriamente contem
  `test`.

## Matriz funcional

| Area         | Cenarios automatizados                                                                       | Situacao                     |
| ------------ | -------------------------------------------------------------------------------------------- | ---------------------------- |
| Aplicacao    | Inicializacao e rota de saude                                                                | Aprovado                     |
| Autenticacao | Login valido, credencial invalida, JWT ausente, usuario ativo e revogacao                    | Aprovado                     |
| Autorizacao  | Usuario administrador, usuario limitado, visualizar e gerenciar                              | Aprovado                     |
| Usuarios     | Cadastro, consulta, alteracao, permissoes separadas, desativacao e reativacao                | Aprovado                     |
| Funcionarios | Cadastro, filtros, consulta, edicao, desativacao e reativacao                                | Aprovado                     |
| Frequencia   | Nao registrado, presente, meio periodo, falta justificada, falta nao justificada e relatorio | Aprovado                     |
| Clientes     | Cadastro rapido, PF, PJ, consulta, filtros, endereco, duplicidade, edicao e exclusao logica  | Aprovado                     |
| Enderecos    | CEP invalido, nao encontrado, ViaCEP, fallback BrasilAPI e indisponibilidade                 | Aprovado em testes unitarios |
| Fornecedores | Cadastro, opcoes ativas, consulta, edicao, desativacao e reativacao                          | Aprovado                     |
| Equipamentos | Cadastro patrimonial, consulta, edicao, desativacao e reativacao                             | Aprovado                     |
| Materiais    | Cadastro com fornecedor, codigo automatico, consulta, edicao e status                        | Aprovado                     |
| Estoque      | Entrada, saida, compra, reserva, saldo disponivel, saldo insuficiente e baixa do projeto     | Aprovado                     |
| Servicos     | Cadastro e uso em construcao civil, serralheria e calhas/rufos                               | Aprovado                     |
| Orcamentos   | Criacao, itens, categorias compativeis, edicao, status, aprovacao e geracao do projeto       | Aprovado                     |
| Projetos     | Inicio, datas, endereco da obra, etapas, historico, conclusao e cancelamento                 | Aprovado                     |
| Etapas       | Medicao, cobranca e materiais fornecidos pelo cliente sem movimentar estoque                 | Aprovado                     |
| Extras       | Material reservado sem nova despesa, servico contratado com despesa e saldo insuficiente     | Aprovado                     |
| Cobrancas    | A vista, parcelamento automatico, parcelamento manual e soma manual invalida                 | Aprovado                     |
| Calculos     | Desconto geral, acrescimo permitido, acrescimo proibido e valor final calculado pela API     | Aprovado                     |
| Recebimentos | PIX, dinheiro, transferencia, cheque, credito, debito e boleto                               | Aprovado                     |
| Despesas     | Compra de material, despesa diversa, categoria opcional, edicao e impacto no caixa           | Aprovado                     |
| Caixa        | Abertura, entradas, saidas, saldo, fechamento, fechamento duplicado e movimentacao bloqueada | Aprovado                     |
| Relatorios   | Recebimentos, cobrancas filtradas e exportacoes PDF e Excel                                  | Aprovado                     |
| Validacao    | Campo extra, DTO invalido, recurso inexistente, duplicidade e regras de estado               | Aprovado                     |

## Tipos de servico

O modelo atual possui `CONSTRUCAO_CIVIL`, `SERRALHERIA` e `CALHAS`. No MySQL,
`CALHAS` e armazenado como `CALHAS_RUFOS`, portanto calhas e rufos formam uma
unica categoria funcional nesta versao. Os tres valores atuais foram testados.

## Formas e condicoes de pagamento

Foram executados recebimentos reais no banco de testes para PIX, dinheiro,
transferencia, cheque, cartao de credito, cartao de debito e boleto.

O desconto foi aplicado no servidor. O acrescimo foi aceito para credito,
debito e boleto, e rejeitado para PIX, dinheiro, transferencia e cheque. A
formula verificada foi:

```text
valor final = valor base - desconto + acrescimo
```

## Limites dos testes

- A consulta externa de CEP e simulada no teste de ponta a ponta para evitar
  falhas causadas pela internet. O comportamento real do cliente HTTP e
  verificado separadamente em testes unitarios.
- Cobertura de 90% nao significa ausencia total de defeitos. Ramos de erro
  raros e novas regras devem receber testes conforme o sistema evoluir.
- Os testes validam a categoria conjunta `CALHAS_RUFOS`. Separar calhas e rufos
  exigiria uma nova decisao de negocio, alteracao do schema e novos contratos.

## Como repetir

```bash
npm run test:all
npm run test:e2e:coverage
```
