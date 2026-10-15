import { Prisma } from '@prisma/client';
import { criarComNumeroUnico } from './numero-unico.util';

function duplicado(target: string) {
  return new Prisma.PrismaClientKnownRequestError('Duplicado', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

describe('Numeracao concorrente de orcamentos', () => {
  it('repete somente o conflito de numero e retorna o registro', async () => {
    const criar = jest
      .fn()
      .mockRejectedValueOnce(duplicado('uq_orcamento_numero'))
      .mockResolvedValue({ numero: '2' });
    await expect(criarComNumeroUnico(criar)).resolves.toEqual({ numero: '2' });
    expect(criar).toHaveBeenCalledTimes(2);
  });
  it('nao oculta conflitos em outros campos', async () => {
    const erro = duplicado('cpf');
    const criar = jest.fn().mockRejectedValue(erro);
    await expect(criarComNumeroUnico(criar)).rejects.toBe(erro);
    expect(criar).toHaveBeenCalledTimes(1);
  });
  it('limita as tentativas', async () => {
    const criar = jest.fn().mockRejectedValue(duplicado('numero'));
    await expect(criarComNumeroUnico(criar)).rejects.toThrow('Tente novamente');
    expect(criar).toHaveBeenCalledTimes(5);
  });
});
