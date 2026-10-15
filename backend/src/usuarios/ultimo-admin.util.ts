import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function protegerUltimoAdmin(
  tx: Prisma.TransactionClient,
  usuarioId: number,
) {
  const admins = await tx.$queryRaw<Array<{ id: number }>>`
    SELECT u.id FROM usuario u
    INNER JOIN funcionario f ON f.id = u.funcionario_id
    INNER JOIN permissao_usuario p ON p.usuario_id = u.id
    WHERE u.status = 'ATIVO' AND f.status = 'ATIVO'
      AND p.modulo = 'GESTAO_USUARIOS' AND p.pode_gerenciar = 1
    ORDER BY u.id FOR UPDATE
  `;
  if (admins.length === 1 && admins[0].id === usuarioId) {
    throw new BadRequestException({
      codigo: 'USUARIOS_PROTEGERULTIMOADMIN_BADREQUEST_01',
      message:
        'O ultimo administrador ativo nao pode ser desativado nem perder sua permissao',
    });
  }
}
