import { escaparLike } from '../common/utils/like.util';
import { estornarDespesa } from '../common/utils/estorno.util';
import { parseDateOnly, hojeNoFusoDoNegocio } from '../common/utils/date.util';
import { SimularCobrancaDto } from './dto/simular-cobranca.dto';
import {
  UpdateProjetoDto,
  UpdateEtapaProjetoDto,
  UpdateExtraProjetoDto,
} from './dto/update-projeto.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FormaPagamento,
  ModalidadeCobranca,
  Prisma,
  StatusCadastro,
  StatusProjeto,
  StatusCobranca,
  StatusParcela,
  TipoDespesa,
  TipoCobranca,
  TipoOrcamento,
} from '@prisma/client';
import { CobrancasService } from '../cobrancas/cobrancas.service';
import { CobrancaPersistenciaInput } from '../cobrancas/dto/cobranca-persistencia.input';
import { EstoqueService } from '../estoque/estoque.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { PrismaService } from '../prisma/prisma.service';
import { CondicaoCobrancaProjetoDto } from './dto/condicao-cobranca-projeto.dto';
import { CreateEtapaProjetoDto } from './dto/create-etapa-projeto.dto';
import { CreateExtraProjetoDto } from './dto/create-extra-projeto.dto';
import { IniciarProjetoDto } from './dto/iniciar-projeto.dto';
import { ListProjetosQueryDto } from './dto/list-projetos-query.dto';
import { UpdateStatusProjetoDto } from './dto/update-status-projeto.dto';

@Injectable()
export class ProjetosService {
  async simularCobranca(id: number, dto: SimularCobrancaDto) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
      include: {
        orcamento: true,
        cobrancas: {
          where: {
            etapaId: null,
            tipo: 'ENTRADA',
            status: { not: 'CANCELADO' },
          },
        },
      },
    });
    if (!projeto)
      throw new NotFoundException({
        codigo: 'PROJETO_INEXISTENTE',
        message: 'Projeto nao encontrado',
      });
    const entradas = projeto.cobrancas.reduce(
      (total, item) => total.plus(item.valorTotal),
      this.money(0),
    );
    const valor =
      dto.valorCobrado ?? Number(projeto.orcamento.valorTotal.minus(entradas));
    return this.cobrancasService.simularParcelas(
      this.buildCobrancaDto(
        projeto,
        valor,
        dto.valorCobrado === undefined
          ? TipoCobranca.FINAL
          : TipoCobranca.MEDICAO,
        dto,
      ),
    );
  }

  formasPagamento() {
    const formas = Object.values(FormaPagamento);
    const aceitaAcrescimo = (valor: FormaPagamento) =>
      ['CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO'].includes(valor);
    return ['A_VISTA', 'PARCELADO'].map((modalidade) => ({
      modalidade,
      formas: formas
        .filter(
          (valor) => modalidade === 'A_VISTA' || valor !== 'CARTAO_DEBITO',
        )
        .map((valor) => ({
          valor,
          rotulo: valor.toLowerCase().replaceAll('_', ' '),
          aceitaAcrescimo: aceitaAcrescimo(valor),
        })),
    }));
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly cobrancasService: CobrancasService,
    private readonly estoqueService: EstoqueService,
    private readonly financeiroService: FinanceiroService,
  ) {}

  private readonly detailsInclude = {
    responsavel: {
      select: { id: true, nomeCompleto: true, funcao: true, status: true },
    },
    orcamento: {
      include: {
        cliente: true,
        materiais: {
          orderBy: { id: 'asc' as const },
          include: { material: true },
        },
        servicos: {
          orderBy: { id: 'asc' as const },
          include: { servico: true },
        },
      },
    },
    etapas: {
      orderBy: [{ dataRegistro: 'asc' as const }, { id: 'asc' as const }],
      include: {
        servicos: { include: { servico: true } },
        materiaisCliente: true,
        cobranca: {
          include: {
            parcelas: {
              orderBy: { numero: 'asc' as const },
              include: {
                recebimentos: {
                  select: {
                    id: true,
                    valor: true,
                    dataRecebimento: true,
                    formaPagamento: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    extras: {
      orderBy: [{ dataRegistro: 'asc' as const }, { id: 'asc' as const }],
      include: {
        gastosAvulsos: true,
        materiais: { include: { material: true } },
        servicos: { include: { servico: true } },
        despesa: true,
      },
    },
    cobrancas: {
      orderBy: { criadaEm: 'asc' as const },
      include: {
        parcelas: {
          orderBy: { numero: 'asc' as const },
          include: {
            recebimentos: {
              select: {
                id: true,
                valor: true,
                dataRecebimento: true,
                formaPagamento: true,
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.ProjetoInclude;

  async findAll(query: ListProjetosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const buscaNumero = query.busca?.replace('#', '');
    const where: Prisma.ProjetoWhereInput = {
      status: query.status,
      orcamento: {
        tipo: query.tipo,
        OR: query.busca
          ? [
              { titulo: { contains: escaparLike(query.busca) } },
              {
                numero: {
                  contains: buscaNumero ? escaparLike(buscaNumero) : undefined,
                },
              },
              { cliente: { nome: { contains: escaparLike(query.busca) } } },
            ]
          : undefined,
      },
    };

    const [data, total, totalProjetos, emExecucao, concluidos] =
      await this.prisma.$transaction([
        this.prisma.projeto.findMany({
          where,
          orderBy: { id: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            responsavel: {
              select: { id: true, nomeCompleto: true, funcao: true },
            },
            orcamento: { include: { cliente: true } },
            _count: { select: { etapas: true, extras: true } },
          },
        }),
        this.prisma.projeto.count({ where }),
        this.prisma.projeto.count({ where: { orcamento: where.orcamento } }),
        this.prisma.projeto.count({
          where: {
            orcamento: where.orcamento,
            status: StatusProjeto.EM_EXECUCAO,
          },
        }),
        this.prisma.projeto.count({
          where: {
            orcamento: where.orcamento,
            status: StatusProjeto.CONCLUIDO,
          },
        }),
      ]);

    const [planejados, cancelados, globais] = await this.prisma.$transaction([
      this.prisma.projeto.count({
        where: { orcamento: where.orcamento, status: 'PLANEJADO' },
      }),
      this.prisma.projeto.count({
        where: { orcamento: where.orcamento, status: 'CANCELADO' },
      }),
      this.prisma.projeto.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);
    const contar = (item: (typeof globais)[number]) =>
      typeof item._count === 'object' ? (item._count._all ?? 0) : 0;
    const porStatus = (status: StatusProjeto) => {
      const item = globais.find((item) => item.status === status);
      return item ? contar(item) : 0;
    };
    return {
      indicadoresGlobais: {
        totalProjetos: globais.reduce((soma, item) => soma + contar(item), 0),
        emExecucao: porStatus('EM_EXECUCAO'),
        concluidos: porStatus('CONCLUIDO'),
        planejados: porStatus('PLANEJADO'),
        cancelados: porStatus('CANCELADO'),
      },
      indicadoresFiltrados: {
        totalProjetos,
        emExecucao,
        concluidos,
        planejados,
        cancelados,
      },
      indicadores: {
        totalProjetos,
        emExecucao,
        concluidos,
        planejados,
        cancelados,
      },
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
      include: this.detailsInclude,
    });

    if (!projeto) {
      throw new NotFoundException({
        codigo: 'PROJETOS_FINDONE_NOTFOUND_01',
        message: 'Projeto nao encontrado',
      });
    }

    const materiaisSemSaldo =
      projeto.status === StatusProjeto.PLANEJADO
        ? await this.materiaisSemSaldo(this.prisma, projeto.orcamento.materiais)
        : [];
    const totalMedido = projeto.etapas
      .filter((etapa) => !etapa.canceladoEm)
      .reduce((total, item) => total.plus(item.valorCobrado), this.money(0));
    return {
      ...projeto,
      materiaisSemSaldo,
      estoqueSuficiente: materiaisSemSaldo.length === 0,
      medicoes:
        projeto.orcamento.tipo === TipoOrcamento.CONSTRUCAO_CIVIL
          ? {
              valorOrcamento: Number(projeto.orcamento.valorTotal),
              totalMedido: Number(totalMedido),
              saldoAMedir: Number(
                this.money(projeto.orcamento.valorTotal).minus(totalMedido),
              ),
            }
          : null,
    };
  }

  async findHistorico(id: number) {
    const projeto = await this.findOne(id);
    const historico = [
      ...projeto.etapas.map((etapa) => ({
        tipo: 'ETAPA' as const,
        data: etapa.dataRegistro,
        registro: etapa,
      })),
      ...projeto.extras.map((extra) => ({
        tipo: 'EXTRA' as const,
        data: extra.dataRegistro,
        registro: extra,
      })),
    ].sort((a, b) => a.data.getTime() - b.data.getTime());

    return { projetoId: projeto.id, historico };
  }

  async iniciar(id: number, dto: IniciarProjetoDto, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${id} FOR UPDATE`;
      const projeto = await tx.projeto.findUnique({
        where: { id },
        include: {
          orcamento: true,
          cobrancas: { where: { etapaId: null, status: { not: 'CANCELADO' } } },
        },
      });

      if (!projeto) {
        throw new NotFoundException({
          codigo: 'PROJETOS_INICIAR_NOTFOUND_01',
          message: 'Projeto nao encontrado',
        });
      }
      if (projeto.status !== StatusProjeto.PLANEJADO) {
        throw new ConflictException({
          codigo: 'PROJETO_STATUS_INVALIDO',
          detalhes: { statusAtual: projeto.status },
          message: 'Somente projeto planejado pode ser iniciado',
        });
      }

      const dataInicio = dto.dataInicio
        ? this.parseDate(dto.dataInicio)
        : (projeto.previsaoInicio ?? this.today());
      const previsaoConclusao = dto.previsaoConclusao
        ? this.parseDate(dto.previsaoConclusao)
        : projeto.previsaoConclusao;

      if (previsaoConclusao && previsaoConclusao < dataInicio) {
        throw new BadRequestException({
          codigo: 'PROJETOS_INICIAR_BADREQUEST_01',
          message: 'A previsao de conclusao nao pode ser anterior ao inicio',
        });
      }

      const geraCobrancaInicial =
        projeto.orcamento.tipo !== TipoOrcamento.CONSTRUCAO_CIVIL;
      const itensEstoque = await tx.orcamentoMaterial.findMany({
        where: { orcamentoId: projeto.orcamentoId },
      });
      await this.validarSaldo(tx, itensEstoque);
      if (geraCobrancaInicial) {
        if (
          projeto.cobrancas.some((item) => item.tipo === TipoCobranca.FINAL)
        ) {
          throw new ConflictException({
            codigo: 'PROJETOS_INICIAR_CONFLICT_02',
            message: 'O projeto ja possui cobranca inicial',
          });
        }
        const entradas = projeto.cobrancas
          .filter((item) => item.tipo === TipoCobranca.ENTRADA)
          .reduce((total, item) => total.plus(item.valorTotal), this.money(0));
        const restante = this.money(projeto.orcamento.valorTotal).minus(
          entradas,
        );
        if (restante.greaterThan(0))
          await this.cobrancasService.createInTransaction(
            tx,
            this.buildCobrancaDto(
              projeto,
              Number(restante),
              TipoCobranca.FINAL,
              dto,
            ),
          );
      }

      await this.estoqueService.reservarOrcamento(
        tx,
        projeto.id,
        projeto.orcamento.id,
        usuarioId,
      );

      await tx.projeto.update({
        where: { id },
        data: {
          status: StatusProjeto.EM_EXECUCAO,
          dataInicio,
          previsaoConclusao,
        },
      });
    });

    return this.findOne(id);
  }

  async updateStatus(
    id: number,
    dto: UpdateStatusProjetoDto,
    usuarioId: number,
  ) {
    const avisos: string[] = [];
    const cancelamento = {
      cobrancasCanceladas: [] as Array<{
        id: number;
        tipo: string;
        valorTotal: number;
        parcelasCanceladas: number;
      }>,
      cobrancasMantidas: [] as Array<{
        id: number;
        tipo: string;
        valorTotal: number;
        valorRecebido: number;
        motivo: string;
      }>,
      reservasLiberadas: 0,
    };
    if (
      dto.status !== StatusProjeto.CONCLUIDO &&
      dto.status !== StatusProjeto.CANCELADO
    ) {
      throw new BadRequestException({
        codigo: 'PROJETOS_UPDATESTATUS_BADREQUEST_01',
        message: 'O status informado deve ser CONCLUIDO ou CANCELADO',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${id} FOR UPDATE`;
      const projeto = await tx.projeto.findUnique({ where: { id } });
      if (!projeto) {
        throw new NotFoundException({
          codigo: 'PROJETOS_UPDATESTATUS_NOTFOUND_01',
          message: 'Projeto nao encontrado',
        });
      }
      if (
        projeto.status !== StatusProjeto.EM_EXECUCAO &&
        !(
          dto.status === StatusProjeto.CANCELADO &&
          projeto.status === StatusProjeto.PLANEJADO
        )
      ) {
        throw new ConflictException({
          codigo: 'PROJETO_STATUS_INVALIDO',
          message:
            'Somente projeto em execucao pode ser concluido ou cancelado',
        });
      }

      const dataConclusao =
        dto.status === StatusProjeto.CONCLUIDO
          ? dto.dataConclusao
            ? this.parseDate(dto.dataConclusao)
            : this.today()
          : null;
      if (dto.dataConclusao && dto.status !== StatusProjeto.CONCLUIDO)
        throw new BadRequestException({
          codigo: 'PROJETOS_UPDATESTATUS_BADREQUEST_02',
          message: 'Data de conclusao so pode ser informada ao concluir',
        });
      if (
        dataConclusao &&
        (dataConclusao > this.today() ||
          (projeto.dataInicio && dataConclusao < projeto.dataInicio))
      ) {
        throw new BadRequestException({
          codigo: 'PROJETOS_UPDATESTATUS_BADREQUEST_03',
          message: 'A conclusao deve ser entre o inicio do projeto e hoje',
        });
      }

      await tx.$queryRaw`SELECT id FROM cobranca WHERE projeto_id = ${id} ORDER BY id FOR UPDATE`;
      const cobrancas = await tx.cobranca.findMany({
        where: { projetoId: id, status: { not: StatusCobranca.CANCELADO } },
        include: { parcelas: { include: { recebimentos: true } } },
      });
      if (dto.status === StatusProjeto.CANCELADO) {
        cancelamento.reservasLiberadas = await tx.reservaEstoque.count({
          where: { projetoId: id, status: 'ATIVA' },
        });
        for (const cobranca of cobrancas) {
          const recebido = cobranca.parcelas.reduce(
            (total, parcela) =>
              total +
              parcela.recebimentos.reduce(
                (soma, item) => soma + Number(item.valor),
                0,
              ),
            0,
          );
          if (
            cobranca.parcelas.some((parcela) => parcela.recebimentos.length)
          ) {
            cancelamento.cobrancasMantidas.push({
              id: cobranca.id,
              tipo: cobranca.tipo,
              valorTotal: Number(cobranca.valorTotal),
              valorRecebido: recebido,
              motivo: 'Ja possui recebimento. Trate o saldo em Cobrancas',
            });
          } else {
            await tx.parcela.updateMany({
              where: { cobrancaId: cobranca.id },
              data: { status: StatusParcela.CANCELADA },
            });
            await tx.cobranca.update({
              where: { id: cobranca.id },
              data: { status: StatusCobranca.CANCELADO },
            });
            cancelamento.cobrancasCanceladas.push({
              id: cobranca.id,
              tipo: cobranca.tipo,
              valorTotal: Number(cobranca.valorTotal),
              parcelasCanceladas: cobranca.parcelas.length,
            });
          }
        }
        if (cancelamento.cobrancasMantidas.length)
          avisos.push(
            'Cobrancas com recebimentos foram mantidas. Confira o saldo em Cobrancas',
          );
      } else if (
        cobrancas.some((cobranca) => cobranca.status !== StatusCobranca.PAGO)
      ) {
        avisos.push(
          'O projeto foi concluido com cobrancas em aberto. As cobrancas nao foram alteradas',
        );
      }

      await this.estoqueService.finalizarReservasProjeto(
        tx,
        id,
        dto.status,
        usuarioId,
      );
      await tx.projeto.update({
        where: { id },
        data: {
          status: dto.status,
          dataConclusao,
        },
      });
    });

    return {
      ...(await this.findOne(id)),
      avisos,
      cancelamento:
        dto.status === StatusProjeto.CANCELADO ? cancelamento : null,
    };
  }

  async createEtapa(id: number, dto: CreateEtapaProjetoDto) {
    if (!dto.descricao.trim())
      throw new BadRequestException({
        codigo: 'PROJETOS_CREATEETAPA_BADREQUEST_01',
        message: 'Informe a descricao da etapa',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${id} FOR UPDATE`;
      const projeto = await tx.projeto.findUnique({
        where: { id },
        include: { orcamento: true },
      });
      this.ensureEmExecucao(projeto);
      if (projeto.orcamento.tipo !== TipoOrcamento.CONSTRUCAO_CIVIL) {
        throw new BadRequestException({
          codigo: 'PROJETOS_CREATEETAPA_BADREQUEST_02',
          message:
            'Etapas de medicao sao exclusivas de projetos de construcao civil',
        });
      }

      this.ensureIdsUnicos(
        dto.servicos.map((item) => item.servicoId),
        'servico',
      );
      const servicos = await tx.servico.findMany({
        where: {
          id: { in: dto.servicos.map((item) => item.servicoId) },
          status: StatusCadastro.ATIVO,
          categoria: projeto.orcamento.tipo,
        },
      });
      if (servicos.length !== dto.servicos.length) {
        throw new BadRequestException({
          codigo: 'PROJETOS_CREATEETAPA_BADREQUEST_03',
          message: 'Existe servico inexistente, inativo ou de outra categoria',
        });
      }

      const totalMedido = await tx.etapaProjeto.aggregate({
        where: { projetoId: id, canceladoEm: null },
        _sum: { valorCobrado: true },
      });
      const novoTotal = this.money(totalMedido._sum.valorCobrado ?? 0).plus(
        dto.valorCobrado,
      );
      if (novoTotal.greaterThan(projeto.orcamento.valorTotal)) {
        throw new BadRequestException({
          codigo: 'PROJETOS_CREATEETAPA_BADREQUEST_04',
          message: 'A soma das medicoes nao pode superar o valor do orcamento',
        });
      }

      const servicosPorId = new Map(servicos.map((item) => [item.id, item]));
      const itens = dto.servicos.map((item) => {
        const servico = servicosPorId.get(item.servicoId)!;
        const custoUnitario =
          item.custoUnitarioEstimado === undefined
            ? undefined
            : this.money(item.custoUnitarioEstimado)
                .mul(item.quantidade)
                .toDecimalPlaces(2);
        if (
          custoUnitario !== undefined &&
          item.custoInternoEstimado !== undefined &&
          custoUnitario.minus(item.custoInternoEstimado).abs().greaterThan(0.01)
        )
          throw new BadRequestException({
            codigo: 'PROJETOS_CREATEETAPA_BADREQUEST_05',
            message: 'Custo unitario e custo total do servico nao conferem',
          });
        return {
          servicoId: item.servicoId,
          descricao: item.descricao?.trim() || null,
          quantidade: new Prisma.Decimal(item.quantidade),
          valorUnitario: this.money(
            item.valorUnitario ?? servico.valorReferencia,
          ),
          custoInternoEstimado: this.money(
            item.custoInternoEstimado ?? custoUnitario ?? 0,
          ),
        };
      });
      const custoInterno = itens.reduce(
        (total, item) => total.plus(item.custoInternoEstimado),
        this.money(0),
      );
      const etapa = await tx.etapaProjeto.create({
        data: {
          projetoId: id,
          descricao: dto.descricao.trim(),
          dataRegistro: dto.dataRegistro
            ? this.parseDate(dto.dataRegistro)
            : this.today(),
          custoInternoEstimado: custoInterno,
          valorCobrado: this.money(dto.valorCobrado),
          servicos: { create: itens },
          materiaisCliente: dto.materiaisCliente?.length
            ? {
                create: dto.materiaisCliente.map((item) => ({
                  nome: item.nome.trim(),
                  quantidade: new Prisma.Decimal(item.quantidade),
                  unidadeMedida: item.unidadeMedida.trim(),
                })),
              }
            : undefined,
        },
      });

      await this.cobrancasService.createInTransaction(
        tx,
        this.buildCobrancaDto(
          projeto,
          dto.valorCobrado,
          TipoCobranca.MEDICAO,
          dto,
          etapa.id,
        ),
      );
    });

    return this.findOne(id);
  }

  async createExtra(id: number, dto: CreateExtraProjetoDto, usuarioId: number) {
    const materiaisDto = dto.materiais ?? [];
    const servicosDto = dto.servicos ?? [];
    const gastosDto = dto.gastosAvulsos ?? [];
    if (!dto.descricaoJustificativa.trim())
      throw new BadRequestException({
        codigo: 'PROJETOS_CREATEEXTRA_BADREQUEST_01',
        message: 'Informe a justificativa do extra',
      });
    if (!materiaisDto.length && !servicosDto.length && !gastosDto.length) {
      throw new BadRequestException({
        codigo: 'PROJETOS_CREATEEXTRA_BADREQUEST_02',
        message: 'Informe ao menos um material ou servico extra',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${id} FOR UPDATE`;
      const projeto = await tx.projeto.findUnique({
        where: { id },
        include: { orcamento: true },
      });
      this.ensureEmExecucao(projeto);
      this.ensureIdsUnicos(
        materiaisDto.map((item) => item.materialId),
        'material',
      );
      this.ensureIdsUnicos(
        servicosDto.map((item) => item.servicoId),
        'servico',
      );

      const [materiais, servicos] = await Promise.all([
        tx.material.findMany({
          where: {
            id: { in: materiaisDto.map((item) => item.materialId) },
            status: StatusCadastro.ATIVO,
          },
        }),
        tx.servico.findMany({
          where: {
            id: { in: servicosDto.map((item) => item.servicoId) },
            status: StatusCadastro.ATIVO,
            categoria: projeto.orcamento.tipo,
          },
        }),
      ]);
      if (materiais.length !== materiaisDto.length) {
        throw new BadRequestException({
          codigo: 'PROJETOS_CREATEEXTRA_BADREQUEST_03',
          message: 'Existe material inexistente ou inativo',
        });
      }
      if (servicos.length !== servicosDto.length) {
        throw new BadRequestException({
          codigo: 'PROJETOS_CREATEEXTRA_BADREQUEST_04',
          message: 'Existe servico inexistente, inativo ou de outra categoria',
        });
      }

      const materiaisPorId = new Map(materiais.map((item) => [item.id, item]));
      const servicosPorId = new Map(servicos.map((item) => [item.id, item]));
      const materiaisData = materiaisDto.map((item) => {
        const material = materiaisPorId.get(item.materialId)!;
        return {
          materialId: item.materialId,
          quantidade: new Prisma.Decimal(item.quantidade),
          custoUnitarioEstimado: this.money(
            item.custoUnitarioEstimado ?? material.precoReferencia,
          ),
        };
      });
      const servicosData = servicosDto.map((item) => {
        const servico = servicosPorId.get(item.servicoId)!;
        return {
          servicoId: item.servicoId,
          descricao: item.descricao?.trim() || null,
          quantidade: new Prisma.Decimal(item.quantidade),
          custoUnitarioEstimado: this.money(
            item.custoUnitarioEstimado ?? servico.valorReferencia,
          ),
        };
      });
      const custoInterno = [
        ...gastosDto.map((item) => this.money(item.valor)),
        ...materiaisData.map((item) =>
          item.custoUnitarioEstimado.mul(item.quantidade),
        ),
        ...servicosData.map((item) =>
          item.custoUnitarioEstimado.mul(item.quantidade),
        ),
      ].reduce((total, valor) => total.plus(valor), this.money(0));
      const custoServicosContratados = servicosData
        .map((item) => item.custoUnitarioEstimado.mul(item.quantidade))
        .reduce(
          (total, valor) => total.plus(valor),
          gastosDto.reduce(
            (total, item) => total.plus(item.valor),
            this.money(0),
          ),
        );
      const dataRegistro = dto.dataRegistro
        ? this.parseDate(dto.dataRegistro)
        : this.today();

      await this.validarSaldo(tx, materiaisData);
      if (custoServicosContratados.greaterThan(0))
        await this.financeiroService.ensureOpenCash(tx, dataRegistro);

      const extra = await tx.extraProjeto.create({
        data: {
          projetoId: id,
          descricaoJustificativa: dto.descricaoJustificativa.trim(),
          dataRegistro,
          custoInternoEstimado: custoInterno,
          materiais: materiaisData.length
            ? { create: materiaisData }
            : undefined,
          servicos: servicosData.length ? { create: servicosData } : undefined,
          gastosAvulsos: gastosDto.length
            ? {
                create: gastosDto.map((item) => ({
                  descricao: item.descricao.trim(),
                  valor: this.money(item.valor),
                })),
              }
            : undefined,
        },
      });

      await this.estoqueService.reservarExtra(tx, id, extra.id, usuarioId);

      if (custoServicosContratados.greaterThan(0)) {
        await this.financeiroService.ensureOpenCash(tx, dataRegistro);
        const despesa = await tx.despesa.create({
          data: {
            tipo: TipoDespesa.DIVERSA,
            categoria: 'EXTRA_PROJETO',
            data: dataRegistro,
            descricao: `Servicos extras contratados para o projeto ${id}: ${dto.descricaoJustificativa.trim()}`,
            valorTotal: custoServicosContratados,
            registradoPorUsuarioId: usuarioId,
          },
        });
        await this.financeiroService.registrarSaidaDespesa(tx, {
          id: despesa.id,
          data: despesa.data,
          descricao: despesa.descricao,
          categoria: 'EXTRA_PROJETO',
          valor: despesa.valorTotal,
        });
        await tx.extraProjeto.update({
          where: { id: extra.id },
          data: { despesaId: despesa.id },
        });
      }
    });

    return this.findOne(id);
  }

  findMateriaisAtivos() {
    return this.prisma.material
      .findMany({
        where: { status: StatusCadastro.ATIVO },
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        include: { estoque: true },
      })
      .then((materiais) =>
        materiais.map((material) => ({
          ...material,
          quantidadeAtual: Number(material.estoque?.quantidadeAtual ?? 0),
          quantidadeReservada: Number(
            material.estoque?.quantidadeReservada ?? 0,
          ),
          saldoDisponivel:
            Number(material.estoque?.quantidadeAtual ?? 0) -
            Number(material.estoque?.quantidadeReservada ?? 0),
        })),
      );
  }

  findServicosAtivos() {
    return this.prisma.servico.findMany({
      where: { status: StatusCadastro.ATIVO },
      orderBy: { nome: 'asc' },
    });
  }

  private ensureEmExecucao(
    projeto:
      | (Prisma.ProjetoGetPayload<{ include: { orcamento: true } }> & object)
      | null,
  ): asserts projeto is Prisma.ProjetoGetPayload<{
    include: { orcamento: true };
  }> {
    if (!projeto) {
      throw new NotFoundException({
        codigo: 'PROJETOS_ENSUREEMEXECUCAO_NOTFOUND_01',
        message: 'Projeto nao encontrado',
      });
    }
    if (projeto.status !== StatusProjeto.EM_EXECUCAO) {
      throw new ConflictException({
        codigo: 'PROJETO_STATUS_INVALIDO',
        message: 'Registros de execucao exigem projeto em execucao',
      });
    }
  }

  private buildCobrancaDto(
    projeto: {
      id: number;
      orcamento: {
        modalidadePagamento: ModalidadeCobranca;
        numeroParcelas: number | null;
        dataPrimeiroVencimento: Date | null;
      };
    },
    valorTotal: number,
    tipo: TipoCobranca,
    condicao: CondicaoCobrancaProjetoDto,
    etapaId?: number,
  ): CobrancaPersistenciaInput {
    let modalidade =
      condicao.modalidadeCobranca ??
      (condicao.numeroParcelas === 1
        ? ModalidadeCobranca.A_VISTA
        : projeto.orcamento.modalidadePagamento);
    if (
      !condicao.modalidadeCobranca &&
      modalidade === ModalidadeCobranca.PARCELADO_MANUAL
    ) {
      modalidade =
        (condicao.numeroParcelas ?? projeto.orcamento.numeroParcelas ?? 1) >= 2
          ? ModalidadeCobranca.PARCELADO_AUTOMATICO
          : ModalidadeCobranca.A_VISTA;
    }
    if (modalidade === ModalidadeCobranca.PARCELADO_MANUAL) {
      throw new BadRequestException({
        codigo: 'PROJETOS_BUILDCOBRANCADTO_BADREQUEST_01',
        message: 'Nos layers, use A_VISTA ou PARCELADO_AUTOMATICO',
      });
    }
    if (!condicao.formaPagamento) {
      throw new BadRequestException({
        codigo: 'PROJETOS_BUILDCOBRANCADTO_BADREQUEST_02',
        message: 'Informe a forma de pagamento da cobranca',
      });
    }
    if (
      modalidade === ModalidadeCobranca.PARCELADO_AUTOMATICO &&
      condicao.formaPagamento === FormaPagamento.CARTAO_DEBITO
    ) {
      throw new BadRequestException({
        codigo: 'PROJETOS_BUILDCOBRANCADTO_BADREQUEST_03',
        message:
          'Cartao de debito esta disponivel somente para cobranca a vista',
      });
    }

    const numeroParcelas =
      modalidade === ModalidadeCobranca.A_VISTA
        ? 1
        : (condicao.numeroParcelas ??
          projeto.orcamento.numeroParcelas ??
          undefined);
    if (
      modalidade === ModalidadeCobranca.A_VISTA &&
      condicao.numeroParcelas !== undefined &&
      condicao.numeroParcelas !== 1
    ) {
      throw new BadRequestException({
        codigo: 'PROJETOS_BUILDCOBRANCADTO_BADREQUEST_04',
        message: 'Cobranca a vista deve ter uma parcela',
      });
    }
    if (
      modalidade === ModalidadeCobranca.PARCELADO_AUTOMATICO &&
      (!numeroParcelas || numeroParcelas < 2)
    ) {
      throw new BadRequestException({
        codigo: 'PROJETOS_BUILDCOBRANCADTO_BADREQUEST_05',
        message: 'Informe ao menos duas parcelas para a cobranca parcelada',
      });
    }
    const primeiroVencimento =
      condicao.primeiroVencimento ??
      this.formatDate(projeto.orcamento.dataPrimeiroVencimento) ??
      this.formatDate(this.today())!;
    const percentualDesconto = condicao.descontoPercentual ?? 0;
    const percentualAcrescimo = condicao.acrescimoPercentual ?? 0;
    this.validarAcrescimo(condicao.formaPagamento, percentualAcrescimo);
    const valorOriginalCentavos = Math.round(valorTotal * 100);
    const descontoCentavos = Math.round(
      (valorOriginalCentavos * percentualDesconto) / 100,
    );
    const acrescimoCentavos = Math.round(
      (valorOriginalCentavos * percentualAcrescimo) / 100,
    );
    const valorFinal = Number(
      (
        (valorOriginalCentavos - descontoCentavos + acrescimoCentavos) /
        100
      ).toFixed(2),
    );
    if (valorFinal <= 0) {
      throw new BadRequestException({
        codigo: 'PROJETOS_BUILDCOBRANCADTO_BADREQUEST_06',
        message: 'O desconto nao pode zerar o valor da cobranca',
      });
    }

    return {
      projetoId: projeto.id,
      etapaId,
      tipo,
      modalidade,
      formaPagamento: condicao.formaPagamento,
      percentualDesconto,
      percentualAcrescimo,
      desconto: Number((descontoCentavos / 100).toFixed(2)),
      acrescimo: Number((acrescimoCentavos / 100).toFixed(2)),
      valorTotal: valorFinal,
      numeroParcelas,
      primeiroVencimento,
    };
  }

  private ensureIdsUnicos(ids: number[], label: string) {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException({
        codigo: 'PROJETOS_ENSUREIDSUNICOS_BADREQUEST_01',
        message: `Nao repita o mesmo ${label}`,
      });
    }
  }

  private validarAcrescimo(
    formaPagamento: FormaPagamento | undefined,
    percentualAcrescimo: number,
  ) {
    if (!percentualAcrescimo) {
      return;
    }

    const formasPermitidas: FormaPagamento[] = [
      FormaPagamento.CARTAO_CREDITO,
      FormaPagamento.CARTAO_DEBITO,
      FormaPagamento.BOLETO,
    ];
    if (!formaPagamento || !formasPermitidas.includes(formaPagamento)) {
      throw new BadRequestException({
        codigo: 'PROJETOS_VALIDARACRESCIMO_BADREQUEST_01',
        message:
          'Acrescimo permitido somente para cartao de credito, cartao de debito ou boleto',
      });
    }
  }

  private money(value: Prisma.Decimal.Value) {
    const valor = new Prisma.Decimal(value).toDecimalPlaces(2);
    if (!valor.isFinite() || valor.abs().greaterThan('9999999999.99'))
      throw new BadRequestException({
        codigo: 'PROJETOS_MONEY_BADREQUEST_01',
        message: 'O valor ultrapassa o limite de R$ 9.999.999.999,99',
      });
    return valor;
  }

  private parseDate(value: string) {
    return parseDateOnly(value);
  }

  private formatDate(value?: Date | null) {
    return value?.toISOString().slice(0, 10);
  }

  private today() {
    return hojeNoFusoDoNegocio();
  }

  async cancelarRegistro(
    id: number,
    registroId: number,
    tipo: 'ETAPA' | 'EXTRA',
    usuarioId: number,
    motivo: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${id} FOR UPDATE`;
      const projeto = await tx.projeto.findUnique({
        where: { id },
        include: { orcamento: true },
      });
      this.ensureEmExecucao(projeto);
      if (tipo === 'ETAPA') {
        await tx.$queryRaw`SELECT id FROM cobranca WHERE etapa_id = ${registroId} FOR UPDATE`;
        const etapa = await tx.etapaProjeto.findFirst({
          where: { id: registroId, projetoId: id },
          include: {
            cobranca: {
              include: { parcelas: { include: { recebimentos: true } } },
            },
          },
        });
        if (!etapa)
          throw new NotFoundException({
            codigo: 'PROJETOS_CANCELARREGISTRO_NOTFOUND_01',
            message: 'Etapa nao encontrada',
          });
        if (etapa.canceladoEm)
          throw new ConflictException({
            codigo: 'PROJETOS_CANCELARREGISTRO_CONFLICT_01',
            message: 'Etapa ja cancelada',
          });
        if (
          etapa.cobranca?.parcelas.some(
            (parcela) => parcela.recebimentos.length,
          )
        )
          throw new ConflictException({
            codigo: 'PROJETOS_CANCELARREGISTRO_CONFLICT_02',
            message: 'Etapa com recebimento nao pode ser cancelada',
          });
        if (etapa.cobranca) {
          await tx.parcela.updateMany({
            where: { cobrancaId: etapa.cobranca.id },
            data: { status: 'CANCELADA' },
          });
          await tx.cobranca.update({
            where: { id: etapa.cobranca.id },
            data: { status: 'CANCELADO' },
          });
        }
        await tx.etapaProjeto.update({
          where: { id: registroId },
          data: { canceladoEm: new Date() },
        });
      } else {
        const extra = await tx.extraProjeto.findFirst({
          where: { id: registroId, projetoId: id },
        });
        if (!extra)
          throw new NotFoundException({
            codigo: 'PROJETOS_CANCELARREGISTRO_NOTFOUND_02',
            message: 'Extra nao encontrado',
          });
        if (extra.canceladoEm)
          throw new ConflictException({
            codigo: 'PROJETOS_CANCELARREGISTRO_CONFLICT_03',
            message: 'Extra ja cancelado',
          });
        await tx.$queryRaw`SELECT id FROM cobranca WHERE projeto_id = ${id} ORDER BY id FOR UPDATE`;
        if (
          await tx.recebimento.count({
            where: { parcela: { cobranca: { projetoId: id } } },
          })
        )
          throw new ConflictException({
            codigo: 'PROJETOS_CANCELARREGISTRO_CONFLICT_04',
            message:
              'Projeto com recebimento nao permite cancelamento simples de extra',
          });
        const reservas = await tx.reservaEstoque.findMany({
          where: { extraMaterial: { extraId: registroId } },
          orderBy: { materialId: 'asc' },
        });
        if (reservas.some((reserva) => reserva.status === 'CONSUMIDA'))
          throw new ConflictException({
            codigo: 'PROJETOS_CANCELARREGISTRO_CONFLICT_05',
            message: 'Material do extra ja consumido',
          });
        for (const reserva of reservas.filter(
          (item) => item.status === 'ATIVA',
        )) {
          const alterados =
            await tx.$executeRaw`UPDATE estoque_material SET quantidade_reservada = quantidade_reservada - ${reserva.quantidade}, atualizado_em = ${new Date()} WHERE material_id = ${reserva.materialId} AND quantidade_reservada >= ${reserva.quantidade}`;
          if (alterados !== 1)
            throw new ConflictException({
              codigo: 'PROJETOS_CANCELARREGISTRO_CONFLICT_06',
              message: 'A reserva foi alterada. Consulte o projeto novamente',
            });
          await tx.reservaEstoque.update({
            where: { id: reserva.id },
            data: { status: 'CANCELADA' },
          });
          await tx.movimentacaoEstoque.create({
            data: {
              materialId: reserva.materialId,
              tipo: 'LIBERACAO_RESERVA',
              quantidade: reserva.quantidade,
              reservaEstoqueId: reserva.id,
              registradoPorUsuarioId: usuarioId,
              justificativa: `Cancelamento do extra ${registroId}: ${motivo}`,
            },
          });
        }
        if (extra.despesaId)
          await estornarDespesa(tx, extra.despesaId, usuarioId, motivo, true);
        await tx.extraProjeto.update({
          where: { id: registroId },
          data: { canceladoEm: new Date() },
        });
      }
      await tx.cancelamentoRegistro.create({
        data: { tipo, registroId, usuarioId, motivo },
      });
    });
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateProjetoDto) {
    if (dto.responsavelId === null)
      throw new BadRequestException({
        codigo: 'PROJETOS_UPDATE_BADREQUEST_01',
        message: 'O responsavel nao pode ser removido',
      });
    if (!Object.keys(dto).length)
      throw new BadRequestException({
        codigo: 'PROJETOS_UPDATE_BADREQUEST_02',
        message: 'Informe os campos a alterar',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${id} FOR UPDATE`;
      const atual = await tx.projeto.findUnique({ where: { id } });
      if (!atual)
        throw new NotFoundException({
          codigo: 'PROJETOS_UPDATE_NOTFOUND_01',
          message: 'Projeto nao encontrado',
        });
      if (
        atual.status !== StatusProjeto.PLANEJADO &&
        atual.status !== StatusProjeto.EM_EXECUCAO
      )
        throw new ConflictException({
          codigo: 'PROJETOS_UPDATE_CONFLICT_01',
          message: 'Projeto concluido ou cancelado nao pode ser editado',
        });
      if (
        dto.responsavelId !== undefined &&
        !(await tx.funcionario.findFirst({
          where: { id: dto.responsavelId, status: StatusCadastro.ATIVO },
        }))
      )
        throw new BadRequestException({
          codigo: 'RESPONSAVEL_INATIVO',
          message: 'Responsavel deve ser um funcionario ativo',
        });
      const inicio =
        dto.previsaoInicio === undefined
          ? atual.previsaoInicio
          : dto.previsaoInicio === null
            ? null
            : this.parseDate(dto.previsaoInicio);
      const fim =
        dto.previsaoConclusao === undefined
          ? atual.previsaoConclusao
          : dto.previsaoConclusao === null
            ? null
            : this.parseDate(dto.previsaoConclusao);
      if (inicio && fim && fim < inicio)
        throw new BadRequestException({
          codigo: 'PROJETOS_UPDATE_BADREQUEST_04',
          message: 'A previsao de conclusao nao pode ser anterior ao inicio',
        });
      for (const campo of [
        'cepObra',
        'cidadeObra',
        'estadoObra',
        'ruaObra',
        'numeroObra',
        'bairroObra',
      ] as const) {
        if (dto[campo] !== undefined && !dto[campo]?.trim())
          throw new BadRequestException({
            codigo: 'PROJETOS_UPDATE_BADREQUEST_05',
            message: `O campo ${campo} nao pode ser vazio`,
          });
      }
      await tx.projeto.update({
        where: { id },
        data: {
          ...dto,
          previsaoInicio: inicio,
          previsaoConclusao: fim,
          estadoObra: dto.estadoObra?.toUpperCase(),
          complementoObra:
            dto.complementoObra === undefined
              ? undefined
              : dto.complementoObra?.trim() || null,
        },
      });
    });
    return this.findOne(id);
  }

  async updateEtapa(id: number, etapaId: number, dto: UpdateEtapaProjetoDto) {
    if (
      !Object.keys(dto).length ||
      (dto.descricao !== undefined && !dto.descricao?.trim())
    )
      throw new BadRequestException({
        codigo: 'PROJETOS_UPDATEETAPA_BADREQUEST_01',
        message: 'Informe uma descricao ou data valida',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${id} FOR UPDATE`;
      const projeto = await tx.projeto.findUnique({
        where: { id },
        include: { orcamento: true },
      });
      this.ensureEmExecucao(projeto);
      await tx.$queryRaw`SELECT id FROM cobranca WHERE etapa_id = ${etapaId} FOR UPDATE`;
      const etapa = await tx.etapaProjeto.findFirst({
        where: { id: etapaId, projetoId: id },
        include: {
          cobranca: {
            include: { parcelas: { include: { recebimentos: true } } },
          },
        },
      });
      if (!etapa)
        throw new NotFoundException({
          codigo: 'PROJETOS_UPDATEETAPA_NOTFOUND_01',
          message: 'Etapa nao encontrada',
        });
      if (etapa.canceladoEm)
        throw new ConflictException({
          codigo: 'PROJETOS_UPDATEETAPA_CONFLICT_01',
          message: 'Etapa cancelada nao pode ser editada',
        });
      if (etapa.cobranca?.parcelas.some((item) => item.recebimentos.length))
        throw new ConflictException({
          codigo: 'PROJETOS_UPDATEETAPA_CONFLICT_02',
          message: 'Etapa com recebimento nao pode ser editada',
        });
      await tx.etapaProjeto.update({
        where: { id: etapaId },
        data: {
          descricao: dto.descricao?.trim(),
          dataRegistro: dto.dataRegistro
            ? this.parseDate(dto.dataRegistro)
            : undefined,
        },
      });
    });
    return this.findOne(id);
  }

  async updateExtra(id: number, extraId: number, dto: UpdateExtraProjetoDto) {
    if (
      !Object.keys(dto).length ||
      (dto.descricaoJustificativa !== undefined &&
        !dto.descricaoJustificativa?.trim())
    )
      throw new BadRequestException({
        codigo: 'PROJETOS_UPDATEEXTRA_BADREQUEST_01',
        message: 'Informe uma justificativa ou data valida',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${id} FOR UPDATE`;
      const projeto = await tx.projeto.findUnique({
        where: { id },
        include: { orcamento: true },
      });
      this.ensureEmExecucao(projeto);
      const extra = await tx.extraProjeto.findFirst({
        where: { id: extraId, projetoId: id },
      });
      if (!extra)
        throw new NotFoundException({
          codigo: 'PROJETOS_UPDATEEXTRA_NOTFOUND_01',
          message: 'Extra nao encontrado',
        });
      if (extra.canceladoEm)
        throw new ConflictException({
          codigo: 'PROJETOS_UPDATEEXTRA_CONFLICT_01',
          message: 'Extra cancelado nao pode ser editado',
        });
      const data = dto.dataRegistro
        ? this.parseDate(dto.dataRegistro)
        : undefined;
      if (
        extra.despesaId &&
        data &&
        data.getTime() !== extra.dataRegistro.getTime()
      )
        throw new ConflictException({
          codigo: 'PROJETOS_UPDATEEXTRA_CONFLICT_02',
          message: 'A data do extra com despesa nao pode ser alterada',
        });
      await tx.extraProjeto.update({
        where: { id: extraId },
        data: {
          descricaoJustificativa: dto.descricaoJustificativa?.trim(),
          dataRegistro: data,
        },
      });
      if (extra.despesaId && dto.descricaoJustificativa !== undefined) {
        const descricao = `Servicos extras contratados para o projeto ${id}: ${dto.descricaoJustificativa.trim()}`;
        await tx.despesa.update({
          where: { id: extra.despesaId },
          data: { descricao },
        });
        await tx.movimentacaoCaixa.updateMany({
          where: { despesaId: extra.despesaId },
          data: { descricao: descricao.slice(0, 255) },
        });
      }
    });
    return this.findOne(id);
  }

  private async materiaisSemSaldo(
    tx: Prisma.TransactionClient,
    itens: Array<{ materialId: number; quantidade: Prisma.Decimal }>,
  ) {
    const necessarios = new Map<number, Prisma.Decimal>();
    for (const item of itens)
      necessarios.set(
        item.materialId,
        (necessarios.get(item.materialId) ?? new Prisma.Decimal(0)).plus(
          item.quantidade,
        ),
      );
    const materiais = await tx.material.findMany({
      where: { id: { in: [...necessarios.keys()] } },
      include: { estoque: true },
    });
    return materiais.flatMap((material) => {
      const necessario = necessarios.get(material.id)!;
      const disponivel = new Prisma.Decimal(
        material.estoque?.quantidadeAtual ?? 0,
      ).minus(material.estoque?.quantidadeReservada ?? 0);
      return necessario.greaterThan(disponivel)
        ? [
            {
              id: material.id,
              nome: material.nome,
              necessario: Number(necessario),
              disponivel: Number(disponivel),
            },
          ]
        : [];
    });
  }

  private async validarSaldo(
    tx: Prisma.TransactionClient,
    itens: Array<{ materialId: number; quantidade: Prisma.Decimal }>,
  ) {
    for (const id of [...new Set(itens.map((item) => item.materialId))].sort(
      (a, b) => a - b,
    )) {
      await tx.$queryRaw`SELECT material_id FROM estoque_material WHERE material_id = ${id} FOR UPDATE`;
    }
    const materiais = await this.materiaisSemSaldo(tx, itens);
    if (materiais.length)
      throw new BadRequestException({
        codigo: 'ESTOQUE_INSUFICIENTE',
        detalhes: { materiais },
        message: `Estoque insuficiente de ${materiais.map((item) => item.nome).join(', ')}. Registre a compra em Despesas ou ajuste o estoque e tente novamente`,
        materiais,
      });
  }
}
