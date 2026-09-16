import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ModalidadeCobranca,
  Prisma,
  StatusCadastro,
  StatusOrcamento,
  TipoOrcamento,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AprovarOrcamentoDto } from './dto/aprovar-orcamento.dto';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { ListOrcamentosQueryDto } from './dto/list-orcamentos-query.dto';
import { OrcamentoMaterialDto } from './dto/orcamento-material.dto';
import { OrcamentoServicoDto } from './dto/orcamento-servico.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { UpdateStatusOrcamentoDto } from './dto/update-status-orcamento.dto';

@Injectable()
export class OrcamentosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly detailsInclude = {
    cliente: {
      select: {
        id: true,
        nome: true,
        telefone: true,
        cidade: true,
        estado: true,
        status: true,
      },
    },
    materiais: {
      orderBy: { id: 'asc' as const },
      include: {
        material: {
          select: {
            id: true,
            codigo: true,
            nome: true,
            unidadeMedida: true,
          },
        },
      },
    },
    servicos: {
      orderBy: { id: 'asc' as const },
      include: {
        servico: {
          select: {
            id: true,
            nome: true,
            unidadeMedida: true,
          },
        },
      },
    },
    projeto: {
      select: {
        id: true,
        responsavelId: true,
        status: true,
        previsaoInicio: true,
        previsaoConclusao: true,
      },
    },
  } satisfies Prisma.OrcamentoInclude;

  async create(dto: CreateOrcamentoDto) {
    await this.ensureClienteAtivo(dto.clienteId);
    const itens = await this.prepareItens(
      dto.tipo,
      dto.materiais,
      dto.servicos,
      dto.desconto ?? 0,
    );
    const pagamento = this.preparePagamento(dto);
    const dataEmissao = this.today();

    return this.prisma.orcamento.create({
      data: {
        numero: await this.nextNumero(),
        titulo: dto.titulo.trim(),
        tipo: dto.tipo,
        clienteId: dto.clienteId,
        dataEmissao,
        prazoEstimadoDias: dto.prazoEstimadoDias,
        observacoes: dto.observacoes?.trim() || null,
        desconto: itens.desconto,
        valorTotal: itens.valorTotal,
        modalidadePagamento: pagamento.modalidade,
        numeroParcelas: pagamento.numeroParcelas,
        dataPrimeiroVencimento: pagamento.dataPrimeiroVencimento ?? dataEmissao,
        materiais: itens.materiais.length
          ? { create: itens.materiais }
          : undefined,
        servicos: itens.servicos.length
          ? { create: itens.servicos }
          : undefined,
      },
      include: this.detailsInclude,
    });
  }

  async findAll(query: ListOrcamentosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const buscaNumero = query.busca?.replace('#', '');
    const where: Prisma.OrcamentoWhereInput = {
      status: query.status,
      tipo: query.tipo,
      OR: query.busca
        ? [
            { titulo: { contains: query.busca } },
            { numero: { contains: buscaNumero } },
            { cliente: { nome: { contains: query.busca } } },
          ]
        : undefined,
    };

    const [data, total, emAberto, pendentes, emAnalise] =
      await this.prisma.$transaction([
        this.prisma.orcamento.findMany({
          where,
          orderBy: [{ dataEmissao: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          include: this.detailsInclude,
        }),
        this.prisma.orcamento.count({ where }),
        this.prisma.orcamento.count({
          where: {
            status: {
              in: [
                StatusOrcamento.PENDENTE,
                StatusOrcamento.EM_ANALISE,
                StatusOrcamento.REPROVADO,
              ],
            },
          },
        }),
        this.prisma.orcamento.count({
          where: { status: StatusOrcamento.PENDENTE },
        }),
        this.prisma.orcamento.count({
          where: { status: StatusOrcamento.EM_ANALISE },
        }),
      ]);

    return {
      indicadores: { emAberto, pendentes, emAnalise },
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
    const orcamento = await this.prisma.orcamento.findUnique({
      where: { id },
      include: this.detailsInclude,
    });

    if (!orcamento) {
      throw new NotFoundException('Orcamento nao encontrado');
    }

    return orcamento;
  }

  async update(id: number, dto: UpdateOrcamentoDto) {
    const atual = await this.findOne(id);
    this.ensureEditavel(atual.status);

    const merged: CreateOrcamentoDto = {
      titulo: dto.titulo ?? atual.titulo,
      tipo: dto.tipo ?? atual.tipo,
      clienteId: dto.clienteId ?? atual.clienteId,
      prazoEstimadoDias: dto.prazoEstimadoDias ?? atual.prazoEstimadoDias,
      observacoes: dto.observacoes ?? atual.observacoes ?? undefined,
      desconto: dto.desconto ?? Number(atual.desconto),
      modalidadePagamento: dto.modalidadePagamento ?? atual.modalidadePagamento,
      numeroParcelas: dto.numeroParcelas ?? atual.numeroParcelas ?? undefined,
      dataPrimeiroVencimento:
        dto.dataPrimeiroVencimento ??
        this.formatDate(atual.dataPrimeiroVencimento),
      materiais:
        dto.materiais ??
        atual.materiais.map((item) => ({
          materialId: item.materialId,
          quantidade: Number(item.quantidade),
          valorUnitario: Number(item.valorUnitario),
        })),
      servicos:
        dto.servicos ??
        atual.servicos.map((item) => ({
          servicoId: item.servicoId,
          descricaoAdicional: item.descricaoAdicional ?? undefined,
          quantidade: Number(item.quantidade),
          valorUnitario: Number(item.valorUnitario),
        })),
    };

    await this.ensureClienteAtivo(merged.clienteId);
    const itens = await this.prepareItens(
      merged.tipo,
      merged.materiais,
      merged.servicos,
      merged.desconto ?? 0,
    );
    const pagamento = this.preparePagamento(merged);

    return this.prisma.$transaction(async (tx) => {
      if (dto.materiais) {
        await tx.orcamentoMaterial.deleteMany({ where: { orcamentoId: id } });
      }
      if (dto.servicos) {
        await tx.orcamentoServico.deleteMany({ where: { orcamentoId: id } });
      }

      return tx.orcamento.update({
        where: { id },
        data: {
          titulo: merged.titulo.trim(),
          tipo: merged.tipo,
          clienteId: merged.clienteId,
          prazoEstimadoDias: merged.prazoEstimadoDias,
          observacoes: merged.observacoes?.trim() || null,
          desconto: itens.desconto,
          valorTotal: itens.valorTotal,
          modalidadePagamento: pagamento.modalidade,
          numeroParcelas: pagamento.numeroParcelas,
          dataPrimeiroVencimento: pagamento.dataPrimeiroVencimento,
          materiais: dto.materiais?.length
            ? { create: itens.materiais }
            : undefined,
          servicos: dto.servicos?.length
            ? { create: itens.servicos }
            : undefined,
        },
        include: this.detailsInclude,
      });
    });
  }

  async updateStatus(id: number, dto: UpdateStatusOrcamentoDto) {
    const atual = await this.findOne(id);

    if (dto.status === StatusOrcamento.APROVADO) {
      throw new BadRequestException(
        'Use a operacao de aprovacao para converter o orcamento em projeto',
      );
    }
    this.ensureEditavel(atual.status);

    return this.prisma.orcamento.update({
      where: { id },
      data: { status: dto.status },
      include: this.detailsInclude,
    });
  }

  async aprovar(id: number, dto: AprovarOrcamentoDto) {
    return this.prisma.$transaction(async (tx) => {
      const orcamento = await tx.orcamento.findUnique({
        where: { id },
        include: { cliente: true, projeto: true },
      });

      if (!orcamento) {
        throw new NotFoundException('Orcamento nao encontrado');
      }
      if (orcamento.projeto || orcamento.status === StatusOrcamento.APROVADO) {
        throw new ConflictException('Orcamento ja foi convertido em projeto');
      }
      if (orcamento.status === StatusOrcamento.CANCELADO) {
        throw new BadRequestException(
          'Orcamento cancelado nao pode ser aprovado',
        );
      }

      const responsavel = await tx.funcionario.findFirst({
        where: { id: dto.responsavelId, status: StatusCadastro.ATIVO },
      });
      if (!responsavel) {
        throw new NotFoundException(
          'Funcionario responsavel ativo nao encontrado',
        );
      }

      const previsaoInicio = this.parseDate(dto.previsaoInicio);
      const previsaoConclusao = this.parseDate(dto.previsaoConclusao);
      if (previsaoConclusao < previsaoInicio) {
        throw new BadRequestException(
          'A previsao de conclusao nao pode ser anterior a previsao de inicio',
        );
      }

      const projeto = await tx.projeto.create({
        data: {
          orcamentoId: id,
          responsavelId: dto.responsavelId,
          previsaoInicio,
          previsaoConclusao,
          cepObra: this.onlyDigits(dto.cepObra),
          cidadeObra: dto.cidadeObra.trim(),
          estadoObra: dto.estadoObra.toUpperCase(),
          ruaObra: dto.ruaObra.trim(),
          numeroObra: dto.numeroObra.trim(),
          bairroObra: dto.bairroObra.trim(),
          complementoObra: dto.complementoObra?.trim() || null,
        },
        include: {
          responsavel: {
            select: { id: true, nomeCompleto: true, funcao: true },
          },
        },
      });

      await tx.orcamento.update({
        where: { id },
        data: { status: StatusOrcamento.APROVADO },
      });

      return {
        mensagem: 'Orcamento aprovado e convertido em projeto',
        projeto,
      };
    });
  }

  findMateriaisAtivos() {
    return this.prisma.material.findMany({
      where: { status: StatusCadastro.ATIVO },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        codigo: true,
        nome: true,
        categoria: true,
        unidadeMedida: true,
        precoReferencia: true,
      },
    });
  }

  findServicosAtivos() {
    return this.prisma.servico.findMany({
      where: { status: StatusCadastro.ATIVO },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        categoria: true,
        unidadeMedida: true,
        valorReferencia: true,
      },
    });
  }

  private async ensureClienteAtivo(clienteId: number) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, status: StatusCadastro.ATIVO },
      select: { id: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente ativo nao encontrado');
    }
  }

  private async prepareItens(
    tipoOrcamento: TipoOrcamento,
    materiais: OrcamentoMaterialDto[] = [],
    servicos: OrcamentoServicoDto[] = [],
    descontoValue = 0,
  ) {
    if (!materiais.length && !servicos.length) {
      throw new BadRequestException(
        'O orcamento deve possuir ao menos um material ou servico',
      );
    }

    this.ensureIdsUnicos(
      materiais.map((item) => item.materialId),
      'material',
    );
    this.ensureIdsUnicos(
      servicos.map((item) => item.servicoId),
      'servico',
    );

    const [materiaisAtivos, servicosAtivos] = await this.prisma.$transaction([
      this.prisma.material.findMany({
        where: {
          id: { in: materiais.map((item) => item.materialId) },
          status: StatusCadastro.ATIVO,
        },
        select: { id: true },
      }),
      this.prisma.servico.findMany({
        where: {
          id: { in: servicos.map((item) => item.servicoId) },
          status: StatusCadastro.ATIVO,
        },
        select: { id: true, categoria: true },
      }),
    ]);

    if (materiaisAtivos.length !== materiais.length) {
      throw new BadRequestException('Existe material inexistente ou inativo');
    }
    if (servicosAtivos.length !== servicos.length) {
      throw new BadRequestException('Existe servico inexistente ou inativo');
    }
    if (servicosAtivos.some((item) => item.categoria !== tipoOrcamento)) {
      throw new BadRequestException(
        'Todos os servicos devem pertencer ao mesmo tipo do orcamento',
      );
    }

    const materiaisData = materiais.map((item) => ({
      materialId: item.materialId,
      quantidade: new Prisma.Decimal(item.quantidade),
      valorUnitario: this.money(item.valorUnitario),
      valorTotal: this.money(item.quantidade).mul(item.valorUnitario),
    }));
    const servicosData = servicos.map((item) => ({
      servicoId: item.servicoId,
      descricaoAdicional: item.descricaoAdicional?.trim() || undefined,
      quantidade: new Prisma.Decimal(item.quantidade),
      valorUnitario: this.money(item.valorUnitario),
      valorTotal: this.money(item.quantidade).mul(item.valorUnitario),
    }));
    const subtotal = [...materiaisData, ...servicosData].reduce(
      (total, item) => total.plus(item.valorTotal),
      this.money(0),
    );
    const desconto = this.money(descontoValue);

    if (desconto.greaterThan(subtotal)) {
      throw new BadRequestException(
        'O desconto nao pode ser superior ao subtotal do orcamento',
      );
    }

    return {
      materiais: materiaisData,
      servicos: servicosData,
      desconto,
      valorTotal: subtotal.minus(desconto).toDecimalPlaces(2),
    };
  }

  private preparePagamento(dto: CreateOrcamentoDto) {
    const modalidade = dto.modalidadePagamento ?? ModalidadeCobranca.A_VISTA;
    const numeroParcelas =
      modalidade === ModalidadeCobranca.A_VISTA ? 1 : dto.numeroParcelas;

    if (
      modalidade !== ModalidadeCobranca.A_VISTA &&
      (!numeroParcelas || numeroParcelas < 2)
    ) {
      throw new BadRequestException(
        'Informe ao menos duas parcelas para pagamento parcelado',
      );
    }
    if (
      modalidade === ModalidadeCobranca.PARCELADO_AUTOMATICO &&
      !dto.dataPrimeiroVencimento
    ) {
      throw new BadRequestException(
        'Informe o primeiro vencimento do parcelamento automatico',
      );
    }

    return {
      modalidade,
      numeroParcelas,
      dataPrimeiroVencimento: dto.dataPrimeiroVencimento
        ? this.parseDate(dto.dataPrimeiroVencimento)
        : undefined,
    };
  }

  private ensureEditavel(status: StatusOrcamento) {
    if (
      status === StatusOrcamento.APROVADO ||
      status === StatusOrcamento.CANCELADO
    ) {
      throw new BadRequestException(
        'Orcamentos aprovados ou cancelados nao podem ser alterados',
      );
    }
  }

  private ensureIdsUnicos(ids: number[], label: string) {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(`Nao repita o mesmo ${label} no orcamento`);
    }
  }

  private async nextNumero() {
    const ultimo = await this.prisma.orcamento.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true, numero: true },
    });
    const numeroAnterior = Number(ultimo?.numero.replace(/\D/g, '')) || 0;
    const proximo = Math.max((ultimo?.id ?? 0) + 1, numeroAnterior + 1);
    return String(proximo).padStart(4, '0');
  }

  private money(value: Prisma.Decimal.Value) {
    return new Prisma.Decimal(value).toDecimalPlaces(2);
  }

  private parseDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private today() {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private formatDate(value?: Date | null) {
    return value?.toISOString().slice(0, 10);
  }

  private onlyDigits(value: string) {
    return value.replace(/\D/g, '');
  }
}
