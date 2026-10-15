import { BadRequestException } from '@nestjs/common';
import { Prisma, StatusCaixa } from '@prisma/client';
import { hojeNoFusoDoNegocio } from './date.util';

export async function caixaParaLancamento(
  tx: Prisma.TransactionClient,
  data: Date,
) {
  const hoje = hojeNoFusoDoNegocio();
  if (data > hoje || data.getUTCFullYear() < 2000)
    throw new BadRequestException({
      codigo: 'UTILS_CAIXAPARALANCAMENTO_BADREQUEST_01',
      message: 'A data do lancamento deve ser entre 2000 e hoje',
    });
  const competencia = new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1),
  );
  await tx.$queryRaw`SELECT id FROM caixa WHERE competencia = ${competencia} FOR UPDATE`;
  const existente = await tx.caixa.findUnique({ where: { competencia } });
  if (existente?.status === StatusCaixa.FECHADO)
    throw new BadRequestException({
      codigo: 'CAIXA_FECHADO',
      message:
        'O caixa da competencia informada esta fechado. Reabra o caixa antes de registrar',
    });
  if (existente) return existente;
  if (
    competencia.getUTCFullYear() !== hoje.getUTCFullYear() ||
    competencia.getUTCMonth() !== hoje.getUTCMonth()
  ) {
    throw new BadRequestException({
      codigo: 'UTILS_CAIXAPARALANCAMENTO_BADREQUEST_03',
      message:
        'Nao ha caixa aberto para a competencia. Abra o caixa antes de registrar o lancamento',
    });
  }
  throw new BadRequestException({
    codigo: 'UTILS_CAIXAPARALANCAMENTO_BADREQUEST_04',
    message: 'Abra o caixa da competencia antes de registrar o lancamento',
  });
}
