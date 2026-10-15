import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function exigirCategoria(
  tx: Pick<Prisma.TransactionClient, 'categoriaCadastro'>,
  tipo: string,
  nome?: string | null,
) {
  if (
    !nome ||
    !(await tx.categoriaCadastro.findUnique({
      where: { tipo_nome: { tipo, nome } },
    }))
  )
    throw new BadRequestException({
      codigo: 'UTILS_EXIGIRCATEGORIA_BADREQUEST_01',
      message: 'Selecione uma categoria cadastrada',
    });
}
