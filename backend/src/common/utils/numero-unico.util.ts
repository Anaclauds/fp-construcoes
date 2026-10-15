import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function criarComNumeroUnico<T>(
  criar: () => Promise<T>,
): Promise<T> {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      return await criar();
    } catch (erro) {
      const numeroDuplicado =
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002' &&
        /numero/i.test(JSON.stringify(erro.meta?.target ?? ''));
      if (!numeroDuplicado) throw erro;
      if (tentativa === 4)
        throw new ConflictException({
          codigo: 'UTILS_CRIARCOMNUMEROUNICO_CONFLICT_01',
          message:
            'Nao foi possivel gerar um numero de orcamento. Tente novamente.',
        });
      await new Promise((resolve) => setTimeout(resolve, 10 * (tentativa + 1)));
    }
  }
  throw new ConflictException({
    codigo: 'UTILS_CRIARCOMNUMEROUNICO_CONFLICT_02',
    message: 'Nao foi possivel gerar um numero de orcamento',
  });
}
