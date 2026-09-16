# Guia de integracao do frontend

Este guia resume os contratos que precisam ser observados na integracao. O
Swagger UI permanece como referencia completa e executavel.

## Autenticacao

1. Enviar login e senha para `POST /api/auth/login`.
2. Guardar o `accessToken` retornado.
3. Enviar `Authorization: Bearer <token>` nas requisicoes protegidas.
4. Usar as permissoes retornadas pelo login para exibir ou ocultar modulos. A
   seguranca efetiva continua sendo aplicada pela API.

## Permissoes

As permissoes sao independentes para usuarios, funcionarios, frequencia,
clientes, orcamentos, cobrancas, projetos, servicos, materiais, estoque,
equipamentos, fornecedores, despesas e caixa.

`GET /api/usuarios/opcoes/modulos` retorna os codigos e rotulos oficiais para a
tela de cadastro e edicao de usuarios.

## Orcamentos e projetos

- O orcamento exige prazo estimado em dias e aceita observacoes.
- A aprovacao exige responsavel, previsao de inicio, previsao de conclusao e o
  endereco completo da obra.
- O endereco pode ser preenchido a partir do cliente, mas a tela deve permitir
  alteracao antes da aprovacao.
- Materiais fornecidos pelo cliente em uma etapa sao enviados como texto livre
  em `materiaisCliente` e nao movimentam o estoque.

## Desconto e acrescimo

O frontend envia percentuais; o backend calcula os valores usando:

```text
valor final = subtotal - desconto + acrescimo
```

- Desconto: permitido em qualquer forma de pagamento.
- Acrescimo: permitido em cartao de credito, cartao de debito e boleto.
- Dinheiro e PIX: nao aceitam acrescimo.

## Materiais e extras

- O codigo do material e gerado pela API e nao deve ser editado.
- O fornecedor preferencial pode ser informado no cadastro do material.
- Material extra com saldo e reservado e contabilizado como custo do projeto,
  sem nova saida de caixa.
- Sem saldo, a compra deve ser registrada antes; ela gera despesa, saida de
  caixa e entrada em estoque. Depois o material pode ser reservado.
- Servico ou gasto extra contratado gera automaticamente despesa e saida de
  caixa.

## Frequencia e cobrancas

- Ausencia de lancamento de frequencia deve ser exibida como `Nao registrado`.
- Recebimentos aceitam forma de pagamento e observacoes.
- Os relatorios de cobranca aceitam busca, tipo, status, cliente e periodo.
- Exportacoes: `GET /api/cobrancas/relatorios/exportar/pdf` e
  `GET /api/cobrancas/relatorios/exportar/excel`.

## Erros

O frontend deve exibir a mensagem devolvida pela API. Casos comuns incluem
dados invalidos, falta de autenticacao, falta de permissao, duplicidade,
estoque insuficiente e indisponibilidade temporaria da consulta de CEP.
