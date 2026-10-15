import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { caixaParaLancamento } from './caixa.util';

export async function estornarDespesa(
  tx: Prisma.TransactionClient,
  id: number,
  usuarioId: number,
  motivo: string,
  origemExtra = false,
) {
  await tx.$queryRaw`SELECT id FROM despesa WHERE id = ${id} FOR UPDATE`;
  const despesa = await tx.despesa.findUnique({
    where: { id },
    include: { materiais: true, extraProjeto: true },
  });
  if (!despesa)
    throw new NotFoundException({
      codigo: 'UTILS_ESTORNARDESPESA_NOTFOUND_01',
      message: 'Despesa nao encontrada',
    });
  if (despesa.canceladoEm)
    throw new ConflictException({
      codigo: 'UTILS_ESTORNARDESPESA_CONFLICT_01',
      message: 'Despesa ja estornada',
    });
  if (despesa.extraProjeto && !origemExtra)
    throw new ConflictException({
      codigo: 'UTILS_ESTORNARDESPESA_CONFLICT_02',
      message: 'Cancele o extra no projeto para estornar esta despesa',
    });
  const caixa = await caixaParaLancamento(tx, despesa.data);
  for (const item of [...despesa.materiais].sort(
    (a, b) => a.materialId - b.materialId,
  )) {
    if (
      (await tx.reservaEstoque.count({
        where: { materialId: item.materialId, status: 'ATIVA' },
      })) ||
      (await tx.movimentacaoEstoque.count({
        where: {
          materialId: item.materialId,
          tipo: 'BAIXA_PROJETO',
          dataHora: { gte: despesa.data },
        },
      }))
    )
      throw new ConflictException({
        codigo: 'UTILS_ESTORNARDESPESA_CONFLICT_03',
        message:
          'Material ja utilizado ou reservado: a compra nao pode ser estornada',
      });
    const alterados =
      await tx.$executeRaw`UPDATE estoque_material SET quantidade_atual = quantidade_atual - ${item.quantidade}, atualizado_em = ${new Date()} WHERE material_id = ${item.materialId} AND quantidade_atual - quantidade_reservada >= ${item.quantidade}`;
    if (alterados !== 1)
      throw new BadRequestException({
        codigo: 'UTILS_ESTORNARDESPESA_BADREQUEST_01',
        message: 'Nao ha estoque disponivel para estornar esta compra',
      });
    await tx.movimentacaoEstoque.create({
      data: {
        materialId: item.materialId,
        tipo: 'AJUSTE_SAIDA',
        quantidade: item.quantidade,
        despesaMaterialId: item.id,
        registradoPorUsuarioId: usuarioId,
        justificativa: `Estorno da despesa ${id}: ${motivo}`,
      },
    });
  }
  const movimento = await tx.movimentacaoCaixa.create({
    data: {
      caixaId: caixa.id,
      tipo: 'ENTRADA',
      data: despesa.data,
      categoria: 'ESTORNO_DESPESA',
      valor: despesa.valorTotal,
      descricao: `Estorno da despesa ${id}: ${motivo}`.slice(0, 255),
    },
  });
  await tx.cancelamentoRegistro.create({
    data: {
      tipo: 'DESPESA',
      registroId: id,
      usuarioId,
      motivo,
      movimentacaoId: movimento.id,
    },
  });
  await tx.despesa.update({ where: { id }, data: { canceladoEm: new Date() } });
}
