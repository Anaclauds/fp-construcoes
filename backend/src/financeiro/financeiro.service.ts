import { parseDateOnly, hojeNoFusoDoNegocio } from '../common/utils/date.util';
import { caixaParaLancamento } from '../common/utils/caixa.util';
import { ListCaixasQueryDto } from './dto/list-caixas-query.dto';
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

  async listarCaixas(query: ListCaixasQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = { status: query.status };
    const [caixas, total] = await this.prisma.$transaction([
      this.prisma.caixa.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ competencia: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.caixa.count({ where }),
    ]);
    const movimentos = await this.prisma.movimentacaoCaixa.groupBy({
      by: ['caixaId', 'tipo'],
      where: { caixaId: { in: caixas.map((item) => item.id) } },
      _sum: { valor: true },
    });
    return {
      data: caixas.map((caixa) => {
        const totalTipo = (tipo: TipoMovimentacaoCaixa) =>
          movimentos.find(
            (item) => item.caixaId === caixa.id && item.tipo === tipo,
          )?._sum.valor ?? new Prisma.Decimal(0);
        const totalEntradas = totalTipo('ENTRADA');
        const totalSaidas = totalTipo('SAIDA');
        return {
          ...caixa,
          resumo: {
            valorInicial: caixa.valorInicial,
            totalEntradas,
            totalSaidas,
            saldoAtual: caixa.valorInicial
              .plus(totalEntradas)
              .minus(totalSaidas),
          },
        };
      }),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async abrirCaixa(dto: AbrirCaixaDto) {
    const competencia = this.parseCompetencia(dto.competencia);
    if (competencia > this.competenciaAtual())
      throw new BadRequestException({
        codigo: 'FINANCEIRO_ABRIRCAIXA_BADREQUEST_01',
        message: 'Nao e permitido abrir caixa de um mes futuro',
      });

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM caixa ORDER BY competencia FOR UPDATE`;
      const existente = await tx.caixa.findUnique({ where: { competencia } });
      if (existente?.status === StatusCaixa.FECHADO) {
        throw new ConflictException({
          codigo: 'CAIXA_JA_FECHADO',
          message: 'O caixa desta competencia ja foi fechado',
        });
      }

      if (
        existente &&
        (await tx.movimentacaoCaixa.count({ where: { caixaId: existente.id } }))
      )
        throw new ConflictException({
          codigo: 'FINANCEIRO_ABRIRCAIXA_CONFLICT_02',
          message:
            'O saldo inicial nao pode ser alterado depois de movimentacoes',
        });
      const anterior = await tx.caixa.findFirst({
        where: { competencia: { lt: competencia } },
        orderBy: { competencia: 'desc' },
      });
      let valorInicial = new Prisma.Decimal(dto.valorInicial);
      if (anterior) {
        if (anterior.status !== StatusCaixa.FECHADO)
          throw new ConflictException({
            codigo: 'FINANCEIRO_ABRIRCAIXA_CONFLICT_03',
            message: 'Feche o caixa anterior antes de abrir o proximo',
          });
        const movimentos = await tx.movimentacaoCaixa.groupBy({
          by: ['tipo'],
          where: { caixaId: anterior.id },
          _sum: { valor: true },
        });
        valorInicial = movimentos.reduce(
          (saldo, item) =>
            item.tipo === TipoMovimentacaoCaixa.ENTRADA
              ? saldo.plus(item._sum.valor ?? 0)
              : saldo.minus(item._sum.valor ?? 0),
          anterior.valorInicial,
        );
      }
      await tx.caixa.upsert({
        where: { competencia },
        create: { competencia, valorInicial },
        update: { valorInicial },
      });
    });

    return this.consultarCaixa(dto.competencia);
  }

  async consultarCaixa(competenciaTexto?: string) {
    const competencia = competenciaTexto
      ? this.parseCompetencia(competenciaTexto)
      : this.competenciaAtual();

    const caixa = await this.prisma.caixa.findUnique({
      where: { competencia },
    });
    if (!caixa)
      return {
        id: 0,
        competencia,
        status: StatusCaixa.ABERTO,
        abertoEm: null,
        fechadoEm: null,
        fechadoPorUsuario: null,
        naoAberto: true,
        ...(await this.metadadosCaixa(competencia)),
        resumo: {
          valorInicial: '0',
          totalEntradas: '0',
          totalSaidas: '0',
          saldoAtual: '0',
        },
        entradas: [],
        saidas: [],
      };
    return this.carregarCaixa(caixa.id);
  }

  async fecharCaixa(id: number, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM caixa ORDER BY competencia FOR UPDATE`;
      const caixa = await tx.caixa.findUnique({ where: { id } });
      if (!caixa) {
        throw new NotFoundException({
          codigo: 'FINANCEIRO_FECHARCAIXA_NOTFOUND_01',
          message: 'Caixa nao encontrado',
        });
      }
      if (caixa.status === StatusCaixa.FECHADO) {
        throw new ConflictException({
          codigo: 'CAIXA_JA_FECHADO',
          message: 'O caixa ja esta fechado',
        });
      }
      if (caixa.competencia >= this.competenciaAtual())
        throw new BadRequestException({
          codigo: 'CAIXA_FECHADO',
          message: 'O caixa so pode ser fechado depois do fim do mes',
        });
      if (
        await tx.caixa.count({
          where: {
            competencia: { lt: caixa.competencia },
            status: StatusCaixa.ABERTO,
          },
        })
      )
        throw new ConflictException({
          codigo: 'FINANCEIRO_FECHARCAIXA_CONFLICT_02',
          message: 'Feche os meses anteriores primeiro',
        });

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
    return caixaParaLancamento(tx, data);
  }

  async reabrirCaixa(id: number, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM caixa WHERE id = ${id} FOR UPDATE`;
      const caixa = await tx.caixa.findUnique({ where: { id } });
      if (!caixa)
        throw new NotFoundException({
          codigo: 'FINANCEIRO_REABRIRCAIXA_NOTFOUND_01',
          message: 'Caixa nao encontrado',
        });
      if (caixa.status !== StatusCaixa.FECHADO)
        throw new ConflictException({
          codigo: 'CAIXA_JA_ABERTO',
          message: 'O caixa ja esta aberto',
        });
      if (
        await tx.caixa.count({
          where: { competencia: { gt: caixa.competencia } },
        })
      )
        throw new ConflictException({
          codigo: 'FINANCEIRO_REABRIRCAIXA_CONFLICT_02',
          message:
            'Reabra primeiro os caixas posteriores para preservar a continuidade dos saldos',
        });
      await tx.auditoriaCaixa.create({
        data: {
          caixaId: id,
          usuarioId,
          acao: 'REABERTURA',
          fechadoEmAnterior: caixa.fechadoEm,
          fechadoPorAnterior: caixa.fechadoPorUsuarioId,
        },
      });
      await tx.caixa.update({
        where: { id },
        data: {
          status: StatusCaixa.ABERTO,
          fechadoEm: null,
          fechadoPorUsuarioId: null,
        },
      });
    });
    return this.carregarCaixa(id);
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
      this.prisma.recebimento.groupBy({
        where,
        by: ['formaPagamento'],
        orderBy: { formaPagamento: 'asc' },
        _sum: { valor: true },
        _count: { _all: true },
      }),
    ]);
    const totalRecebido = valores.reduce(
      (soma, item) => soma.plus(item._sum?.valor ?? 0),
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
      atual.quantidade +=
        typeof item._count === 'object' ? (item._count._all ?? 0) : 0;
      atual.valor = atual.valor.plus(item._sum?.valor ?? 0);
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
          include: {
            despesa: {
              select: {
                id: true,
                fornecedor: { select: { id: true, nomeFantasia: true } },
                extraProjeto: {
                  select: {
                    projetoId: true,
                    projeto: {
                      select: {
                        id: true,
                        orcamento: {
                          select: {
                            titulo: true,
                            cliente: { select: { id: true, nome: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            recebimento: {
              select: {
                parcela: {
                  select: {
                    cobranca: {
                      select: {
                        projeto: {
                          select: {
                            id: true,
                            orcamento: {
                              select: {
                                titulo: true,
                                cliente: { select: { id: true, nome: true } },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!caixa) {
      throw new NotFoundException({
        codigo: 'FINANCEIRO_CARREGARCAIXA_NOTFOUND_01',
        message: 'Caixa nao encontrado',
      });
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

    const categorias = await this.prisma.categoriaCadastro.findMany({
      where: {
        tipo: 'DESPESAS',
        nome: {
          in: [...new Set(caixa.movimentacoes.map((item) => item.categoria))],
        },
      },
    });
    const rotulos = new Map(categorias.map((item) => [item.nome, item.rotulo]));
    const contexto = (item: (typeof caixa.movimentacoes)[number]) => {
      const projeto =
        item.recebimento?.parcela.cobranca.projeto ??
        item.despesa?.extraProjeto?.projeto;
      return {
        ...item,
        projeto: projeto
          ? { id: projeto.id, titulo: projeto.orcamento.titulo }
          : null,
        cliente: projeto?.orcamento.cliente ?? null,
        fornecedor: item.despesa?.fornecedor ?? null,
        categoriaRotulo:
          rotulos.get(item.categoria) ??
          (item.categoria === 'RECEBIMENTO_CLIENTE'
            ? 'Recebimento de cliente'
            : item.categoria === 'ESTORNO_DESPESA'
              ? 'Estorno de despesa'
              : item.categoria.replaceAll('_', ' ')),
      };
    };

    return {
      id: caixa.id,
      competencia: caixa.competencia,
      status: caixa.status,
      abertoEm: caixa.abertoEm,
      fechadoEm: caixa.fechadoEm,
      fechadoPorUsuario: caixa.fechadoPorUsuario,
      ...(await this.metadadosCaixa(caixa.competencia, caixa.status)),
      resumo: {
        valorInicial: caixa.valorInicial,
        totalEntradas,
        totalSaidas,
        saldoAtual: caixa.valorInicial.plus(totalEntradas).minus(totalSaidas),
      },
      entradas: entradas.map(contexto),
      saidas: saidas.map(contexto),
    };
  }

  private parseCompetencia(value: string) {
    if (!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(value))
      throw new BadRequestException({
        codigo: 'FINANCEIRO_PARSECOMPETENCIA_BADREQUEST_01',
        message:
          'Informe uma competencia valida entre 2000 e 2099 no formato AAAA-MM',
      });
    const [ano, mes] = value.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, 1));
  }

  private async metadadosCaixa(competencia: Date, status?: StatusCaixa) {
    const [primeiro, anteriores] = await this.prisma.$transaction([
      this.prisma.caixa.findFirst({
        orderBy: { competencia: 'asc' },
        select: { competencia: true },
      }),
      this.prisma.caixa.count({
        where: { competencia: { lt: competencia }, status: 'ABERTO' },
      }),
    ]);
    const encerrado = competencia < this.competenciaAtual();
    return {
      situacao: !status
        ? 'NAO_ABERTO'
        : status === 'FECHADO'
          ? 'FECHADO'
          : encerrado
            ? 'PENDENTE_FECHAMENTO'
            : 'EM_ANDAMENTO',
      podeFechar: status === 'ABERTO' && encerrado && anteriores === 0,
      competenciaMinima:
        primeiro?.competencia.toISOString().slice(0, 7) ?? null,
    };
  }

  private competenciaAtual() {
    return this.competenciaDaData(hojeNoFusoDoNegocio());
  }

  private competenciaDaData(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  }

  private parseDate(value: string) {
    return parseDateOnly(value);
  }
}
