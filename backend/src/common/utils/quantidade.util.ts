import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const QUANTIDADE_MAXIMA = new Prisma.Decimal('999999999.999');

export function validarQuantidadeUnidade(
  unidade: string,
  quantidade: Prisma.Decimal | number,
) {
  const normalizada = unidade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  if (
    [
      'UN',
      'UNIDADE',
      'UNIDADES',
      'PC',
      'PCS',
      'PECA',
      'PECAS',
      'BARRA',
      'CAIXA',
      'ROLO',
    ].includes(normalizada) &&
    !new Prisma.Decimal(quantidade).isInteger()
  ) {
    throw new BadRequestException({
      codigo: 'QUANTIDADE_INTEIRA_OBRIGATORIA',
      campo: 'quantidade',
      message: 'Esta unidade exige quantidade inteira',
    });
  }
}

export function validarEntradaEstoque(
  materialId: number,
  atual: Prisma.Decimal,
  entrada: Prisma.Decimal,
) {
  if (atual.plus(entrada).greaterThan(QUANTIDADE_MAXIMA))
    throw new BadRequestException({
      codigo: 'ESTOQUE_LIMITE_EXCEDIDO',
      message: 'O saldo do material passaria do limite permitido',
      detalhes: {
        materialId,
        quantidadeAtual: Number(atual),
        maximoEntrada: Number(QUANTIDADE_MAXIMA.minus(atual)),
      },
    });
}
