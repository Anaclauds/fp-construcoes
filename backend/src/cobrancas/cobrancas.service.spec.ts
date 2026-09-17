import {
  FormaPagamento,
  ModalidadeCobranca,
  StatusProjeto,
  TipoCobranca,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CobrancasService } from './cobrancas.service';

describe('CobrancasService', () => {
  const projeto = {
    id: 1,
    status: StatusProjeto.NAO_INICIADO as StatusProjeto,
    orcamento: {},
  };

  function criarService() {
    const create = jest
      .fn<
        (args: { data: Record<string, unknown> }) => Promise<{ id: number }>
      >()
      .mockResolvedValue({ id: 1 });
    const tx = {
      projeto: { findUnique: jest.fn().mockResolvedValue(projeto) },
      cobranca: { create },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      projeto: { findMany: jest.fn() },
    } as unknown as PrismaService;

    return { service: new CobrancasService(prisma), create };
  }

  it.each([
    FormaPagamento.PIX,
    FormaPagamento.DINHEIRO,
    FormaPagamento.TRANSFERENCIA,
    FormaPagamento.CHEQUE,
  ])('rejeita acrescimo para %s', async (formaPagamento) => {
    const { service } = criarService();

    await expect(
      service.create({
        projetoId: 1,
        tipo: TipoCobranca.FINAL,
        modalidade: ModalidadeCobranca.A_VISTA,
        formaPagamento,
        percentualAcrescimo: 2,
        valorBase: 1000,
      }),
    ).rejects.toThrow('Acrescimo permitido somente');
  });

  it.each([
    FormaPagamento.CARTAO_CREDITO,
    FormaPagamento.CARTAO_DEBITO,
    FormaPagamento.BOLETO,
  ])('calcula desconto e acrescimo para %s', async (formaPagamento) => {
    const { service, create } = criarService();

    await service.create({
      projetoId: 1,
      tipo: TipoCobranca.FINAL,
      modalidade: ModalidadeCobranca.A_VISTA,
      formaPagamento,
      percentualDesconto: 5,
      percentualAcrescimo: 2,
      valorBase: 1000,
    });

    const chamadas = create.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(chamadas[0][0].data).toMatchObject({
      percentualDesconto: 5,
      percentualAcrescimo: 2,
      desconto: 50,
      acrescimo: 20,
      valorTotal: 970,
    });
  });

  it('rejeita periodo de relatorio invertido', async () => {
    const { service } = criarService();

    await expect(
      service.relatorio({
        dataInicio: '2026-09-30',
        dataFim: '2026-09-01',
      }),
    ).rejects.toThrow('A data inicial nao pode ser posterior');
  });
});
