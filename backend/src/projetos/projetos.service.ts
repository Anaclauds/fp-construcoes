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
          include: { parcelas: { orderBy: { numero: 'asc' as const } } },
        },
      },
    },
    extras: {
      orderBy: [{ dataRegistro: 'asc' as const }, { id: 'asc' as const }],
      include: {
        materiais: { include: { material: true } },
        servicos: { include: { servico: true } },
        despesa: true,
      },
    },
    cobrancas: {
      orderBy: { criadaEm: 'asc' as const },
      include: { parcelas: { orderBy: { numero: 'asc' as const } } },
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
              { titulo: { contains: query.busca } },
              { numero: { contains: buscaNumero } },
              { cliente: { nome: { contains: query.busca } } },
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
        this.prisma.projeto.count(),
        this.prisma.projeto.count({
          where: { status: StatusProjeto.EM_EXECUCAO },
        }),
        this.prisma.projeto.count({
          where: { status: StatusProjeto.CONCLUIDO },
        }),
      ]);

    return {
      indicadores: { totalProjetos, emExecucao, concluidos },
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
      throw new NotFoundException('Projeto nao encontrado');
    }

    return projeto;
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
      const projeto = await tx.projeto.findUnique({
        where: { id },
        include: {
          orcamento: true,
          cobrancas: { where: { etapaId: null } },
        },
      });

      if (!projeto) {
        throw new NotFoundException('Projeto nao encontrado');
      }
      if (projeto.status !== StatusProjeto.PLANEJADO) {
        throw new ConflictException(
          'Somente projeto planejado pode ser iniciado',
        );
      }

      const dataInicio = dto.dataInicio
        ? this.parseDate(dto.dataInicio)
        : (projeto.previsaoInicio ?? this.today());
      const previsaoConclusao = dto.previsaoConclusao
        ? this.parseDate(dto.previsaoConclusao)
        : projeto.previsaoConclusao;

      if (previsaoConclusao && previsaoConclusao < dataInicio) {
        throw new BadRequestException(
          'A previsao de conclusao nao pode ser anterior ao inicio',
        );
      }

      const geraCobrancaInicial =
        projeto.orcamento.tipo !== TipoOrcamento.CONSTRUCAO_CIVIL;
      if (geraCobrancaInicial) {
        if (projeto.cobrancas.length) {
          throw new ConflictException('O projeto ja possui cobranca inicial');
        }
        await this.cobrancasService.createInTransaction(
          tx,
          this.buildCobrancaDto(
            projeto,
            Number(projeto.orcamento.valorTotal),
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
    if (
      dto.status !== StatusProjeto.CONCLUIDO &&
      dto.status !== StatusProjeto.CANCELADO
    ) {
      throw new BadRequestException(
        'O status informado deve ser CONCLUIDO ou CANCELADO',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const projeto = await tx.projeto.findUnique({ where: { id } });
      if (!projeto) {
        throw new NotFoundException('Projeto nao encontrado');
      }
      if (projeto.status !== StatusProjeto.EM_EXECUCAO) {
        throw new ConflictException(
          'Somente projeto em execucao pode ser concluido ou cancelado',
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
          dataConclusao:
            dto.status === StatusProjeto.CONCLUIDO ? this.today() : null,
        },
      });
    });

    return this.findOne(id);
  }

  async createEtapa(id: number, dto: CreateEtapaProjetoDto) {
    await this.prisma.$transaction(async (tx) => {
      const projeto = await tx.projeto.findUnique({
        where: { id },
        include: { orcamento: true },
      });
      this.ensureEmExecucao(projeto);
      if (projeto.orcamento.tipo !== TipoOrcamento.CONSTRUCAO_CIVIL) {
        throw new BadRequestException(
          'Etapas de medicao sao exclusivas de projetos de construcao civil',
        );
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
        throw new BadRequestException(
          'Existe servico inexistente, inativo ou de outra categoria',
        );
      }

      const totalMedido = await tx.etapaProjeto.aggregate({
        where: { projetoId: id },
        _sum: { valorCobrado: true },
      });
      const novoTotal = this.money(totalMedido._sum.valorCobrado ?? 0).plus(
        dto.valorCobrado,
      );
      if (novoTotal.greaterThan(projeto.orcamento.valorTotal)) {
        throw new BadRequestException(
          'A soma das medicoes nao pode superar o valor do orcamento',
        );
      }

      const servicosPorId = new Map(servicos.map((item) => [item.id, item]));
      const itens = dto.servicos.map((item) => {
        const servico = servicosPorId.get(item.servicoId)!;
        return {
          servicoId: item.servicoId,
          quantidade: new Prisma.Decimal(item.quantidade),
          valorUnitario: this.money(
            item.valorUnitario ?? servico.valorReferencia,
          ),
          custoInternoEstimado: this.money(
            item.custoInternoEstimado ??
              Number(servico.valorReferencia) * item.quantidade,
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
    if (!materiaisDto.length && !servicosDto.length) {
      throw new BadRequestException(
        'Informe ao menos um material ou servico extra',
      );
    }

    await this.prisma.$transaction(async (tx) => {
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
        throw new BadRequestException('Existe material inexistente ou inativo');
      }
      if (servicos.length !== servicosDto.length) {
        throw new BadRequestException(
          'Existe servico inexistente, inativo ou de outra categoria',
        );
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
          quantidade: new Prisma.Decimal(item.quantidade),
          custoUnitarioEstimado: this.money(
            item.custoUnitarioEstimado ?? servico.valorReferencia,
          ),
        };
      });
      const custoInterno = [
        ...materiaisData.map((item) =>
          item.custoUnitarioEstimado.mul(item.quantidade),
        ),
        ...servicosData.map((item) =>
          item.custoUnitarioEstimado.mul(item.quantidade),
        ),
      ].reduce((total, valor) => total.plus(valor), this.money(0));
      const custoServicosContratados = servicosData
        .map((item) => item.custoUnitarioEstimado.mul(item.quantidade))
        .reduce((total, valor) => total.plus(valor), this.money(0));
      const dataRegistro = dto.dataRegistro
        ? this.parseDate(dto.dataRegistro)
        : this.today();

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
        },
      });

      await this.estoqueService.reservarExtra(tx, id, extra.id, usuarioId);

      if (custoServicosContratados.greaterThan(0)) {
        await this.financeiroService.ensureOpenCash(tx, dataRegistro);
        const despesa = await tx.despesa.create({
          data: {
            tipo: TipoDespesa.DIVERSA,
            categoria: null,
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
    return this.prisma.material.findMany({
      where: { status: StatusCadastro.ATIVO },
      orderBy: { nome: 'asc' },
    });
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
      throw new NotFoundException('Projeto nao encontrado');
    }
    if (projeto.status !== StatusProjeto.EM_EXECUCAO) {
      throw new ConflictException(
        'Registros de execucao exigem projeto em execucao',
      );
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
    const modalidade =
      condicao.modalidadeCobranca ?? projeto.orcamento.modalidadePagamento;
    if (modalidade === ModalidadeCobranca.PARCELADO_MANUAL) {
      throw new BadRequestException(
        'Nos layers, use A_VISTA ou PARCELADO_AUTOMATICO',
      );
    }
    if (!condicao.formaPagamento) {
      throw new BadRequestException('Informe a forma de pagamento da cobranca');
    }
    if (
      modalidade === ModalidadeCobranca.PARCELADO_AUTOMATICO &&
      condicao.formaPagamento === FormaPagamento.CARTAO_DEBITO
    ) {
      throw new BadRequestException(
        'Cartao de debito esta disponivel somente para cobranca a vista',
      );
    }

    const numeroParcelas =
      modalidade === ModalidadeCobranca.A_VISTA
        ? 1
        : (condicao.numeroParcelas ??
          projeto.orcamento.numeroParcelas ??
          undefined);
    if (
      modalidade === ModalidadeCobranca.PARCELADO_AUTOMATICO &&
      (!numeroParcelas || numeroParcelas < 2)
    ) {
      throw new BadRequestException(
        'Informe ao menos duas parcelas para a cobranca parcelada',
      );
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
      throw new BadRequestException(
        'O desconto nao pode zerar o valor da cobranca',
      );
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
      throw new BadRequestException(`Nao repita o mesmo ${label}`);
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
      throw new BadRequestException(
        'Acrescimo permitido somente para cartao de credito, cartao de debito ou boleto',
      );
    }
  }

  private money(value: Prisma.Decimal.Value) {
    return new Prisma.Decimal(value).toDecimalPlaces(2);
  }

  private parseDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatDate(value?: Date | null) {
    return value?.toISOString().slice(0, 10);
  }

  private today() {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
