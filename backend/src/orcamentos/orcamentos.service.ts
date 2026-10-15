import { criarComNumeroUnico } from '../common/utils/numero-unico.util';
import { SimularOrcamentoDto } from './dto/simular-orcamento.dto';
import { escaparLike } from '../common/utils/like.util';
import { hojeNoFusoDoNegocio, parseDateOnly } from '../common/utils/date.util';
import { OpcoesOrcamentoQueryDto } from './dto/opcoes-orcamento-query.dto';
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

  async simular(dto: SimularOrcamentoDto) {
    const itens = await this.prepareItens(
      dto.tipo,
      dto.materiais,
      dto.servicos,
      dto.desconto ?? 0,
    );
    const somar = (valores: Array<{ valorTotal: Prisma.Decimal }>) =>
      valores.reduce(
        (total, item) => total.plus(item.valorTotal),
        this.money(0),
      );
    return {
      totalMateriais: somar(itens.materiais),
      totalServicos: somar(itens.servicos),
      desconto: itens.desconto,
      valorTotal: itens.valorTotal,
      itens: [...itens.materiais, ...itens.servicos],
    };
  }

  private readonly detailsInclude = {
    cliente: {
      select: {
        id: true,
        nome: true,
        telefone: true,
        cep: true,
        rua: true,
        numero: true,
        bairro: true,
        complemento: true,
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

    return criarComNumeroUnico(async () =>
      this.prisma.orcamento.create({
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
          dataPrimeiroVencimento:
            pagamento.dataPrimeiroVencimento ?? dataEmissao,
          materiais: itens.materiais.length
            ? { create: itens.materiais }
            : undefined,
          servicos: itens.servicos.length
            ? { create: itens.servicos }
            : undefined,
        },
        include: this.detailsInclude,
      }),
    );
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
            { titulo: { contains: escaparLike(query.busca) } },
            {
              numero: {
                contains: buscaNumero ? escaparLike(buscaNumero) : undefined,
              },
            },
            { cliente: { nome: { contains: escaparLike(query.busca) } } },
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
            ...where,
            status: {
              in: [StatusOrcamento.PENDENTE, StatusOrcamento.EM_ANALISE],
            },
          },
        }),
        this.prisma.orcamento.count({
          where: { ...where, status: StatusOrcamento.PENDENTE },
        }),
        this.prisma.orcamento.count({
          where: { ...where, status: StatusOrcamento.EM_ANALISE },
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
      throw new NotFoundException({
        codigo: 'ORCAMENTOS_FINDONE_NOTFOUND_01',
        message: 'Orcamento nao encontrado',
      });
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

    if (merged.clienteId !== atual.clienteId)
      await this.ensureClienteAtivo(merged.clienteId);
    const itens = await this.prepareItens(
      merged.tipo,
      merged.materiais,
      merged.servicos,
      merged.desconto ?? 0,
      {
        materiais: atual.materiais
          .filter((antigo) =>
            merged.materiais?.some(
              (novo) =>
                novo.materialId === antigo.materialId &&
                antigo.quantidade.equals(novo.quantidade) &&
                antigo.valorUnitario.equals(novo.valorUnitario),
            ),
          )
          .map((item) => item.materialId),
        servicos: atual.servicos
          .filter((antigo) =>
            merged.servicos?.some(
              (novo) =>
                novo.servicoId === antigo.servicoId &&
                antigo.quantidade.equals(novo.quantidade) &&
                antigo.valorUnitario.equals(novo.valorUnitario),
            ),
          )
          .map((item) => item.servicoId),
      },
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

    if (dto.status === atual.status) return atual;
    if (dto.status === StatusOrcamento.APROVADO) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_UPDATESTATUS_BADREQUEST_01',
        message:
          'Use a operacao de aprovacao para converter o orcamento em projeto',
      });
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
        throw new NotFoundException({
          codigo: 'ORCAMENTOS_APROVAR_NOTFOUND_01',
          message: 'Orcamento nao encontrado',
        });
      }
      if (orcamento.projeto || orcamento.status === StatusOrcamento.APROVADO) {
        throw new ConflictException({
          codigo: 'ORCAMENTOS_APROVAR_CONFLICT_01',
          message: 'Orcamento ja foi convertido em projeto',
        });
      }
      if (orcamento.status === StatusOrcamento.CANCELADO) {
        throw new BadRequestException({
          codigo: 'ORCAMENTO_STATUS_INVALIDO',
          message: 'Orcamento cancelado nao pode ser aprovado',
        });
      }
      if (orcamento.status === StatusOrcamento.REPROVADO) {
        throw new BadRequestException({
          codigo: 'ORCAMENTO_STATUS_INVALIDO',
          message:
            'Orcamento reprovado precisa ser reaberto antes de ser aprovado',
        });
      }
      if (orcamento.cliente.status !== StatusCadastro.ATIVO) {
        throw new BadRequestException({
          codigo: 'ORCAMENTOS_APROVAR_BADREQUEST_03',
          message:
            'O cliente do orcamento esta inativo. Reative o cliente antes de aprovar',
        });
      }

      const responsavel = await tx.funcionario.findFirst({
        where: { id: dto.responsavelId, status: StatusCadastro.ATIVO },
      });
      if (!responsavel) {
        throw new NotFoundException({
          codigo: 'RESPONSAVEL_INATIVO',
          message: 'Funcionario responsavel ativo nao encontrado',
        });
      }

      const previsaoInicio = this.parseDate(dto.previsaoInicio);
      const previsaoConclusao = this.parseDate(dto.previsaoConclusao);
      if (previsaoConclusao < previsaoInicio) {
        throw new BadRequestException({
          codigo: 'ORCAMENTOS_APROVAR_BADREQUEST_04',
          message:
            'A previsao de conclusao nao pode ser anterior a previsao de inicio',
        });
      }

      const atualizado = await tx.orcamento.updateMany({
        where: {
          id,
          status: {
            in: [StatusOrcamento.PENDENTE, StatusOrcamento.EM_ANALISE],
          },
        },
        data: { status: StatusOrcamento.APROVADO },
      });
      if (!atualizado.count)
        throw new ConflictException({
          codigo: 'ORCAMENTOS_APROVAR_CONFLICT_02',
          message: 'Orcamento ja foi convertido em projeto',
        });
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

  findServicosAtivos(tipo?: TipoOrcamento) {
    return this.prisma.servico.findMany({
      where: { status: StatusCadastro.ATIVO, categoria: tipo },
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
      throw new NotFoundException({
        codigo: 'ORCAMENTOS_ENSURECLIENTEATIVO_NOTFOUND_01',
        message: 'Cliente ativo nao encontrado',
      });
    }
  }

  findClientesAtivos(query: OpcoesOrcamentoQueryDto) {
    return this.prisma.cliente.findMany({
      where: {
        status: StatusCadastro.ATIVO,
        OR: query.busca
          ? [
              { nome: { contains: escaparLike(query.busca) } },
              { razaoSocial: { contains: escaparLike(query.busca) } },
              { nomeFantasia: { contains: escaparLike(query.busca) } },
              { cidade: { contains: escaparLike(query.busca) } },
              { telefone: { contains: escaparLike(query.busca) } },
            ]
          : undefined,
      },
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      take: query.limit ?? 50,
      select: {
        id: true,
        nome: true,
        razaoSocial: true,
        nomeFantasia: true,
        tipo: true,
        cidade: true,
        estado: true,
        bairro: true,
        complemento: true,
        telefone: true,
      },
    });
  }

  async findClienteAtivo(id: number) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, status: StatusCadastro.ATIVO },
      select: {
        id: true,
        nome: true,
        razaoSocial: true,
        nomeFantasia: true,
        tipo: true,
        cidade: true,
        estado: true,
        telefone: true,
        cep: true,
        rua: true,
        numero: true,
        bairro: true,
        complemento: true,
      },
    });
    if (!cliente)
      throw new NotFoundException({
        codigo: 'ORCAMENTOS_FINDCLIENTEATIVO_NOTFOUND_01',
        message: 'Cliente ativo nao encontrado',
      });
    return cliente;
  }

  findResponsaveis(busca?: string) {
    return this.prisma.funcionario.findMany({
      where: {
        status: StatusCadastro.ATIVO,
        nomeCompleto: busca ? { contains: escaparLike(busca) } : undefined,
      },
      select: { id: true, nomeCompleto: true, funcao: true },
      orderBy: [{ nomeCompleto: 'asc' }, { id: 'asc' }],
    });
  }

  private async prepareItens(
    tipoOrcamento: TipoOrcamento,
    materiais: OrcamentoMaterialDto[] = [],
    servicos: OrcamentoServicoDto[] = [],
    descontoValue = 0,
    historicos: { materiais: number[]; servicos: number[] } = {
      materiais: [],
      servicos: [],
    },
  ) {
    if (!materiais.length && !servicos.length) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_PREPAREITENS_BADREQUEST_01',
        message: 'O orcamento deve possuir ao menos um material ou servico',
      });
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
          OR: [
            { status: StatusCadastro.ATIVO },
            { id: { in: historicos.materiais } },
          ],
        },
        select: { id: true },
      }),
      this.prisma.servico.findMany({
        where: {
          id: { in: servicos.map((item) => item.servicoId) },
          OR: [
            { status: StatusCadastro.ATIVO },
            { id: { in: historicos.servicos } },
          ],
        },
        select: { id: true, categoria: true },
      }),
    ]);

    if (materiaisAtivos.length !== materiais.length) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_PREPAREITENS_BADREQUEST_02',
        message: 'Existe material inexistente ou inativo',
      });
    }
    if (servicosAtivos.length !== servicos.length) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_PREPAREITENS_BADREQUEST_03',
        message: 'Existe servico inexistente ou inativo',
      });
    }
    if (servicosAtivos.some((item) => item.categoria !== tipoOrcamento)) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_PREPAREITENS_BADREQUEST_04',
        message: 'Todos os servicos devem pertencer ao mesmo tipo do orcamento',
      });
    }

    const materiaisData = materiais.map((item) => ({
      materialId: item.materialId,
      quantidade: new Prisma.Decimal(item.quantidade),
      valorUnitario: this.money(item.valorUnitario),
      valorTotal: new Prisma.Decimal(item.quantidade)
        .mul(item.valorUnitario)
        .toDecimalPlaces(2),
    }));
    const servicosData = servicos.map((item) => ({
      servicoId: item.servicoId,
      descricaoAdicional: item.descricaoAdicional?.trim() || undefined,
      quantidade: new Prisma.Decimal(item.quantidade),
      valorUnitario: this.money(item.valorUnitario),
      valorTotal: new Prisma.Decimal(item.quantidade)
        .mul(item.valorUnitario)
        .toDecimalPlaces(2),
    }));
    const subtotal = [...materiaisData, ...servicosData].reduce(
      (total, item) => total.plus(item.valorTotal),
      this.money(0),
    );
    this.money(subtotal);
    for (const item of [...materiaisData, ...servicosData])
      this.money(item.valorTotal);
    const desconto = this.money(descontoValue);

    if (desconto.greaterThan(subtotal)) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_PREPAREITENS_BADREQUEST_05',
        message: 'O desconto nao pode ser superior ao subtotal do orcamento',
      });
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
    if (modalidade === ModalidadeCobranca.PARCELADO_MANUAL) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_PREPAREPAGAMENTO_BADREQUEST_01',
        message: 'Parcelas manuais sao definidas ao registrar a cobranca',
      });
    }
    const numeroParcelas =
      modalidade === ModalidadeCobranca.A_VISTA ? 1 : dto.numeroParcelas;

    if (
      modalidade !== ModalidadeCobranca.A_VISTA &&
      (!numeroParcelas || numeroParcelas < 2)
    ) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_PREPAREPAGAMENTO_BADREQUEST_02',
        message: 'Informe ao menos duas parcelas para pagamento parcelado',
      });
    }
    if (
      modalidade === ModalidadeCobranca.PARCELADO_AUTOMATICO &&
      !dto.dataPrimeiroVencimento
    ) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_PREPAREPAGAMENTO_BADREQUEST_03',
        message: 'Informe o primeiro vencimento do parcelamento automatico',
      });
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
      throw new BadRequestException({
        codigo: 'ORCAMENTO_STATUS_INVALIDO',
        message: 'Orcamentos aprovados ou cancelados nao podem ser alterados',
      });
    }
  }

  private ensureIdsUnicos(ids: number[], label: string) {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException({
        codigo: 'ORCAMENTOS_ENSUREIDSUNICOS_BADREQUEST_01',
        message: `Nao repita o mesmo ${label} no orcamento`,
      });
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
    const valor = new Prisma.Decimal(value).toDecimalPlaces(2);
    if (!valor.isFinite() || valor.abs().greaterThan('9999999999.99'))
      throw new BadRequestException({
        codigo: 'VALOR_LIMITE_EXCEDIDO',
        message: 'O valor ultrapassa o limite de R$ 9.999.999.999,99',
      });
    return valor;
  }

  private parseDate(value: string) {
    return parseDateOnly(value);
  }

  private today() {
    return hojeNoFusoDoNegocio();
  }

  private formatDate(value?: Date | null) {
    return value?.toISOString().slice(0, 10);
  }

  private onlyDigits(value: string) {
    return value.replace(/\D/g, '');
  }
}
