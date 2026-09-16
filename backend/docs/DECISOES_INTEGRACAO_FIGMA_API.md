# Decisoes de integracao entre Figma e API

Este documento registra as regras confirmadas por Peterson e Ana para a
versao do backend destinada a integracao com o frontend.

## Regras confirmadas

- Frequencia sem lancamento deve aparecer como nao registrada, nunca como
  presente automaticamente.
- A aprovacao do orcamento cria o projeto e exige responsavel, previsao de
  inicio, previsao de conclusao e endereco da obra.
- O endereco da obra parte do endereco do cliente, mas pode ser alterado antes
  da aprovacao.
- Orcamento possui prazo estimado obrigatorio e observacoes opcionais.
- Ao iniciar o projeto, as datas previstas devem vir preenchidas com os valores
  definidos anteriormente e podem ser ajustadas.
- Serralheria, calhas e rufos geram cobranca ao iniciar o projeto. Construcao
  civil gera cobrancas por etapa ou medicao.
- Materiais fornecidos pelo cliente em uma etapa sao historicos em texto livre
  e nao movimentam o estoque da empresa.
- O valor final usa a formula subtotal - desconto + acrescimo.
- O desconto pode ser aplicado a qualquer forma de pagamento.
- O acrescimo e informado manualmente e pode ser aplicado a cartao de credito
  a vista ou parcelado, boleto e cartao de debito. Dinheiro e PIX nao aceitam
  acrescimo.
- Material extra ja disponivel e apenas reservado e registrado como custo do
  projeto, sem nova saida de caixa.
- Material extra sem saldo deve ser comprado pelo fluxo de despesa, entrando no
  estoque antes da reserva.
- Servico ou gasto extra efetivamente contratado gera despesa e saida de caixa.
- Registro de recebimento possui forma de pagamento e observacoes opcionais.
- Fornecedor preferencial deve aparecer no cadastro de material.
- Codigo do material e automatico e nao pode ser alterado.
- Categoria de despesa permanece como atributo opcional. Nao sera criada uma
  tabela de categorias nesta etapa.
- Cadastro rapido de cliente exige apenas nome, telefone e cidade.
- Calculos financeiros sao feitos no backend e nao aceitam total final livre.
- Usuarios, funcionarios, frequencia, clientes, orcamentos, cobrancas,
  projetos, servicos, materiais, estoque, equipamentos, fornecedores,
  despesas e caixa possuem permissoes separadas.
- Relatorio de cobrancas deve aceitar filtros por tipo, incluindo calhas, data
  e cliente, e permitir exportacao em PDF e Excel.

## Regra operacional para extras

Como reservar um item que nao existe em estoque nao e possivel sem os dados da
compra, o cadastro de extra deve recusar saldo insuficiente e orientar o usuario
a registrar primeiro a compra do material. A compra gera a despesa, a saida de
caixa e a entrada no estoque; depois o material pode ser reservado para o
projeto.
