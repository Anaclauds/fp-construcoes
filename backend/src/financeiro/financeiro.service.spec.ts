import { FinanceiroService } from './financeiro.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, StatusCaixa } from '@prisma/client';

describe('Regras do caixa', () => {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    caixa: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    movimentacaoCaixa: { count: jest.fn(), groupBy: jest.fn() },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn(
      (fn: ((t: typeof tx) => Promise<unknown>) | unknown[]) =>
        Array.isArray(fn) ? Promise.all(fn) : fn(tx),
    ),
  };
  const service = new FinanceiroService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.clearAllMocks();
    tx.caixa.findFirst.mockResolvedValue(null);
    tx.caixa.count.mockResolvedValue(0);
  });
  it('consultar mes inexistente nao cria caixa', async () => {
    tx.caixa.findUnique.mockResolvedValue(null);
    const result = await service.consultarCaixa('2020-01');
    expect(result).toMatchObject({ id: 0, naoAberto: true });
    expect(tx.caixa.upsert).not.toHaveBeenCalled();
  });
  it('bloqueia saldo inicial apos movimentacoes', async () => {
    tx.caixa.findUnique.mockResolvedValue({
      id: 1,
      status: StatusCaixa.ABERTO,
    });
    tx.movimentacaoCaixa.count.mockResolvedValue(1);
    await expect(
      service.abrirCaixa({ competencia: '2020-01', valorInicial: 10 }),
    ).rejects.toThrow('depois de movimentacoes');
    expect(tx.caixa.upsert).not.toHaveBeenCalled();
  });
  it('herda automaticamente o saldo final do caixa anterior', async () => {
    tx.caixa.findUnique.mockResolvedValue(null);
    tx.caixa.findFirst.mockResolvedValue({
      id: 1,
      status: StatusCaixa.FECHADO,
      competencia: new Date('2020-01-01T00:00:00Z'),
      valorInicial: new Prisma.Decimal(100),
    });
    tx.movimentacaoCaixa.groupBy.mockResolvedValue([
      { tipo: 'ENTRADA', _sum: { valor: new Prisma.Decimal(50) } },
      { tipo: 'SAIDA', _sum: { valor: new Prisma.Decimal(20) } },
    ]);
    await service.abrirCaixa({ competencia: '2020-02', valorInicial: 999 });
    const chamadas = tx.caixa.upsert.mock.calls as unknown as Array<
      [{ create: { valorInicial: Prisma.Decimal } }]
    >;
    const dados = chamadas[0][0];
    expect(dados.create.valorInicial.toNumber()).toBe(130);
  });
});
