import { FrequenciasService } from './frequencias.service';
import { PrismaService } from '../prisma/prisma.service';
import { StatusFrequencia } from '@prisma/client';

describe('Relatorio de frequencia', () => {
  const prisma = {
    funcionario: { findUnique: jest.fn() },
    frequencia: { findMany: jest.fn() },
  };
  const service = new FrequenciasService(prisma as unknown as PrismaService);
  beforeEach(() => {
    prisma.funcionario.findUnique.mockResolvedValue({
      id: 1,
      nomeCompleto: 'Teste',
    });
    prisma.frequencia.findMany.mockResolvedValue([
      {
        data: new Date('2020-01-01'),
        status: StatusFrequencia.PRESENTE,
        observacao: null,
      },
    ]);
  });
  it('inclui dias sem registro e calcula a taxa sobre todo o periodo', async () => {
    const result = await service.relatorio({
      funcionarioId: 1,
      dataInicial: '2020-01-01',
      dataFinal: '2020-01-03',
    });
    expect(result.dias).toHaveLength(3);
    expect(result.indicadores.naoRegistrados).toBe(2);
    expect(result.indicadores.taxaPresenca).toBe(33);
  });
  it('filtra dias nao registrados sem apresentar uma taxa enganosa', async () => {
    const result = await service.relatorio({
      funcionarioId: 1,
      dataInicial: '2020-01-01',
      dataFinal: '2020-01-03',
      status: 'NAO_REGISTRADO',
    });
    expect(result.dias).toHaveLength(2);
    expect(result.registros).toHaveLength(0);
    expect(result.indicadores.taxaPresenca).toBeNull();
  });
  it('gera um PDF real', async () => {
    const result = await service.relatorioPdf({
      funcionarioId: 1,
      dataInicial: '2020-01-01',
      dataFinal: '2020-01-03',
    });
    expect(result.subarray(0, 4).toString()).toBe('%PDF');
  });
});
