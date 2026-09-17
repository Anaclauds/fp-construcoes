import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCaixa, TipoMovimentacaoCaixa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbrirCaixaDto } from './dto/abrir-caixa.dto';
import { RelatorioRecebimentosQueryDto } from './dto/relatorio-recebimentos-query.dto';

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  async abrirCaixa(dto: AbrirCaixaDto) {
    const competencia = this.parseCompetencia(dto.competencia);

    await this.prisma.$transaction(async (tx) => {
      const existente = await tx.caixa.findUnique({ where: { competencia } });
      if (existente?.status === StatusCaixa.FECHADO) {
        throw new ConflictException('O caixa desta competencia ja foi fechado');
      }

      await tx.caixa.upsert({
        where: { competencia },
        create: { competencia, valorInicial: dto.valorInicial },
        update: { valorInicial: dto.valorInicial },
      });
    });

    return this.consultarCaixa(dto.competencia);
  }

  async consultarCaixa(competenciaTexto?: string) {
    const competencia = competenciaTexto
      ? this.parseCompetencia(competenciaTexto)
      : this.competenciaAtual();

    const caixaId = await this.prisma.$transaction(async (tx) => {
      const caixa = await tx.caixa.upsert({
        where: { competencia },
        create: { competencia, valorInicial: 0 },
        update: {},
      });
      await this.sincronizarCompetencia(
        tx,
        caixa.id,
        competencia,
        caixa.status,
      );
      return caixa.id;
    });

    return this.carregarCaixa(caixaId);
  }

  async fecharCaixa(id: number, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const caixa = await tx.caixa.findUnique({ where: { id } });
      if (!caixa) {
        throw new NotFoundException('Caixa nao encontrado');
      }
      if (caixa.status === StatusCaixa.FECHADO) {
        throw new ConflictException('O caixa ja esta fechado');
      }

      await this.sincronizarCompetencia(
        tx,
        caixa.id,
        caixa.competencia,
        caixa.status,
      );
      await tx.caixa.update({
        where: { id },
        data: {
          status: StatusCaixa.FECHADO,
          fechadoEm: new Date(),
          fechadoPorUsuarioId: usuarioId,
        },
      });
    });

    return this.carregarCaixa(id);
  }

  async ensureOpenCash(tx: Prisma.TransactionClient, data: Date) {
    const competencia = this.competenciaDaData(data);
    const caixa = await tx.caixa.upsert({
      where: { competencia },
      create: { competencia, valorInicial: 0 },
      update: {},
    });
    if (caixa.status === StatusCaixa.FECHADO) {
      throw new BadRequestException(
        'O caixa da competencia informada esta fechado',
      );
    }
    return caixa;
  }

  async registrarSaidaDespesa(
    tx: Prisma.TransactionClient,
    despesa: {
      id: number;
      data: Date;
      descricao: string;
      categoria: string;
      valor: Prisma.Decimal.Value;
    },
  ) {
    const caixa = await this.ensureOpenCash(tx, despesa.data);
    return tx.movimentacaoCaixa.create({
      data: {
        caixaId: caixa.id,
        tipo: TipoMovimentacaoCaixa.SAIDA,
        data: despesa.data,
        descricao: despesa.descricao.slice(0, 255),
        categoria: despesa.categoria,
        valor: despesa.valor,
        despesaId: despesa.id,
      },
    });
  }

  async relatorioRecebimentos(query: RelatorioRecebimentosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.RecebimentoWhereInput = {
      dataRecebimento:
        query.dataInicio || query.dataFim
          ? {
              gte: query.dataInicio
                ? this.parseDate(query.dataInicio)
                : undefined,
              lte: query.dataFim ? this.parseDate(query.dataFim) : undefined,
            }
          : undefined,
      formaPagamento: query.formaPagamento,
      parcela: {
        cobranca: {
          projeto: {
            id: query.projetoId,
            orcamento: { clienteId: query.clienteId },
          },
        },
      },
    };
    const include = {
      registradoPorUsuario: {
        select: {
          id: true,
          login: true,
          funcionario: { select: { nomeCompleto: true } },
        },
      },
      parcela: {
        include: {
          cobranca: {
            include: {
              projeto: {
                include: {
                  orcamento: {
                    include: { cliente: { select: { id: true, nome: true } } },
                  },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.RecebimentoInclude;

    const [data, total, valores] = await this.prisma.$transaction([
      this.prisma.recebimento.findMany({
        where,
        include,
        orderBy: [{ dataRecebimento: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recebimento.count({ where }),
      this.prisma.recebimento.findMany({
        where,
        select: { valor: true, formaPagamento: true },
      }),
    ]);
    const totalRecebido = valores.reduce(
      (soma, item) => soma.plus(item.valor),
      new Prisma.Decimal(0),
    );
    const porForma = new Map<
      string,
      { quantidade: number; valor: Prisma.Decimal }
    >();
    for (const item of valores) {
      const atual = porForma.get(item.formaPagamento) ?? {
        quantidade: 0,
        valor: new Prisma.Decimal(0),
      };
      atual.quantidade += 1;
      atual.valor = atual.valor.plus(item.valor);
      porForma.set(item.formaPagamento, atual);
    }

    return {
      indicadores: {
        totalRecebido,
        quantidadeRecebimentos: total,
        ticketMedio: total
          ? totalRecebido.dividedBy(total).toDecimalPlaces(2)
          : 0,
      },
      resumoPorFormaPagamento: [...porForma.entries()].map(
        ([formaPagamento, resumo]) => ({ formaPagamento, ...resumo }),
      ),
      data: data.map((item) => ({
        id: item.id,
        dataRecebimento: item.dataRecebimento,
        valor: item.valor,
        formaPagamento: item.formaPagamento,
        observacoes: item.observacoes,
        parcela: {
          id: item.parcela.id,
          numero: item.parcela.numero,
          vencimento: item.parcela.vencimento,
        },
        cobrancaId: item.parcela.cobranca.id,
        projeto: {
          id: item.parcela.cobranca.projeto.id,
          numero: item.parcela.cobranca.projeto.orcamento.numero,
          titulo: item.parcela.cobranca.projeto.orcamento.titulo,
        },
        cliente: item.parcela.cobranca.projeto.orcamento.cliente,
        registradoPorUsuario: item.registradoPorUsuario,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async sincronizarCompetencia(
    tx: Prisma.TransactionClient,
    caixaId: number,
    competencia: Date,
    status: StatusCaixa,
  ) {
    if (status === StatusCaixa.FECHADO) {
      return;
    }
    const proximaCompetencia = new Date(
      Date.UTC(competencia.getUTCFullYear(), competencia.getUTCMonth() + 1, 1),
    );
    const recebimentos = await tx.recebimento.findMany({
      where: {
        dataRecebimento: { gte: competencia, lt: proximaCompetencia },
        movimentacaoCaixa: { is: null },
      },
      include: {
        parcela: {
          include: {
            cobranca: {
              include: { projeto: { include: { orcamento: true } } },
            },
          },
        },
      },
    });
    for (const recebimento of recebimentos) {
      await tx.movimentacaoCaixa.create({
        data: {
          caixaId,
          tipo: TipoMovimentacaoCaixa.ENTRADA,
          data: recebimento.dataRecebimento,
          descricao: `Recebimento do projeto ${recebimento.parcela.cobranca.projeto.orcamento.numero}, parcela ${recebimento.parcela.numero}`,
          categoria: 'RECEBIMENTO_CLIENTE',
          valor: recebimento.valor,
          recebimentoId: recebimento.id,
        },
      });
    }

    const despesas = await tx.despesa.findMany({
      where: {
        data: { gte: competencia, lt: proximaCompetencia },
        movimentacaoCaixa: { is: null },
      },
    });
    for (const despesa of despesas) {
      await tx.movimentacaoCaixa.create({
        data: {
          caixaId,
          tipo: TipoMovimentacaoCaixa.SAIDA,
          data: despesa.data,
          descricao: despesa.descricao.slice(0, 255),
          categoria: despesa.categoria ?? 'SEM_CATEGORIA',
          valor: despesa.valorTotal,
          despesaId: despesa.id,
        },
      });
    }
  }

  private async carregarCaixa(id: number) {
    const caixa = await this.prisma.caixa.findUnique({
      where: { id },
      include: {
        fechadoPorUsuario: {
          select: {
            id: true,
            login: true,
            funcionario: { select: { nomeCompleto: true } },
          },
        },
        movimentacoes: {
          orderBy: [{ data: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!caixa) {
      throw new NotFoundException('Caixa nao encontrado');
    }
    const entradas = caixa.movimentacoes.filter(
      (item) => item.tipo === TipoMovimentacaoCaixa.ENTRADA,
    );
    const saidas = caixa.movimentacoes.filter(
      (item) => item.tipo === TipoMovimentacaoCaixa.SAIDA,
    );
    const totalEntradas = entradas.reduce(
      (soma, item) => soma.plus(item.valor),
      new Prisma.Decimal(0),
    );
    const totalSaidas = saidas.reduce(
      (soma, item) => soma.plus(item.valor),
      new Prisma.Decimal(0),
    );

    return {
      id: caixa.id,
      competencia: caixa.competencia,
      status: caixa.status,
      abertoEm: caixa.abertoEm,
      fechadoEm: caixa.fechadoEm,
      fechadoPorUsuario: caixa.fechadoPorUsuario,
      resumo: {
        valorInicial: caixa.valorInicial,
        totalEntradas,
        totalSaidas,
        saldoAtual: caixa.valorInicial.plus(totalEntradas).minus(totalSaidas),
      },
      entradas,
      saidas,
    };
  }

  private parseCompetencia(value: string) {
    const [ano, mes] = value.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, 1));
  }

  private competenciaAtual() {
    return this.competenciaDaData(new Date());
  }

  private competenciaDaData(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  }

  private parseDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
