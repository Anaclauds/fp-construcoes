import { escaparLike } from '../common/utils/like.util';
import {
  validarEntradaEstoque,
  validarQuantidadeUnidade,
} from '../common/utils/quantidade.util';
import { exigirCategoria } from '../common/utils/categoria.util';
import { estornarDespesa } from '../common/utils/estorno.util';
import { parseDateOnly } from '../common/utils/date.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusCadastro,
  StatusCaixa,
  TipoDespesa,
  TipoMovimentacaoCaixa,
  TipoMovimentacaoEstoque,
} from '@prisma/client';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDespesaDto } from './dto/create-despesa.dto';
import { ListDespesasQueryDto } from './dto/list-despesas-query.dto';
import { UpdateDespesaDto } from './dto/update-despesa.dto';
import { ListMateriaisQueryDto } from '../materiais/dto/list-materiais-query.dto';

interface MaterialPreparado {
  materialId: number;
  quantidade: Prisma.Decimal;
  unidadeMedida: string;
  valorUnitario: Prisma.Decimal;
  valorTotal: Prisma.Decimal;
}

interface DespesaPreparada {
  tipo: TipoDespesa;
  categoria: string | null;
  data: Date;
  fornecedorId: number | null;
  descricao: string;
  valorTotal: Prisma.Decimal;
  materiais: MaterialPreparado[];
}

@Injectable()
export class DespesasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeiroService: FinanceiroService,
  ) {}

  private readonly detailsInclude = {
    fornecedor: {
      select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true },
    },
    registradoPorUsuario: {
      select: {
        id: true,
        login: true,
        funcionario: { select: { nomeCompleto: true } },
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
    movimentacaoCaixa: { include: { caixa: { select: { status: true } } } },
    extraProjeto: { select: { id: true, projetoId: true } },
  } satisfies Prisma.DespesaInclude;

  async create(dto: CreateDespesaDto, usuarioId: number) {
    const id = await this.prisma.$transaction(async (tx) => {
      const preparada = await this.prepare(tx, dto);
      await this.financeiroService.ensureOpenCash(tx, preparada.data);
      const despesa = await tx.despesa.create({
        data: {
          tipo: preparada.tipo,
          categoria: preparada.categoria,
          data: preparada.data,
          fornecedorId: preparada.fornecedorId,
          descricao: preparada.descricao,
          valorTotal: preparada.valorTotal,
          registradoPorUsuarioId: usuarioId,
          materiais: {
            create: preparada.materiais.map((item) => ({
              materialId: item.materialId,
              quantidade: item.quantidade,
              unidadeMedida: item.unidadeMedida,
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal,
            })),
          },
        },
        include: { materiais: true },
      });

      for (const item of despesa.materiais) {
        await this.incrementStock(tx, item.materialId, item.quantidade);
        await tx.movimentacaoEstoque.create({
          data: {
            materialId: item.materialId,
            tipo: TipoMovimentacaoEstoque.ENTRADA_COMPRA,
            quantidade: item.quantidade,
            justificativa: `Compra registrada na despesa ${despesa.id}`,
            despesaMaterialId: item.id,
            registradoPorUsuarioId: usuarioId,
          },
        });
      }
      await this.financeiroService.registrarSaidaDespesa(tx, {
        id: despesa.id,
        data: despesa.data,
        descricao: despesa.descricao,
        categoria: despesa.categoria ?? 'SEM_CATEGORIA',
        valor: despesa.valorTotal,
      });
      return despesa.id;
    });

    return this.findOne(id);
  }

  async findAll(query: ListDespesasQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);
    const [data, total, valores] = await this.prisma.$transaction([
      this.prisma.despesa.findMany({
        where,
        orderBy: [{ data: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: this.detailsInclude,
      }),
      this.prisma.despesa.count({ where }),
      this.prisma.despesa.groupBy({
        where: { ...where, canceladoEm: null },
        by: ['tipo'],
        orderBy: { tipo: 'asc' },
        _sum: { valorTotal: true },
      }),
    ]);
    const totalDespesas = valores.reduce(
      (soma, item) => soma.plus(item._sum?.valorTotal ?? 0),
      new Prisma.Decimal(0),
    );
    const totalComprasMateriais = valores
      .filter((item) => item.tipo === TipoDespesa.COMPRA_MATERIAL)
      .reduce(
        (soma, item) => soma.plus(item._sum?.valorTotal ?? 0),
        new Prisma.Decimal(0),
      );

    return {
      indicadores: {
        totalDespesas,
        totalComprasMateriais,
        totalOutrasDespesas: totalDespesas.minus(totalComprasMateriais),
      },
      data: data.map((item) => this.comEdicao(item)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const despesa = await this.prisma.despesa.findUnique({
      where: { id },
      include: this.detailsInclude,
    });
    if (!despesa) {
      throw new NotFoundException({
        codigo: 'DESPESAS_FINDONE_NOTFOUND_01',
        message: 'Despesa nao encontrada',
      });
    }
    return this.comEdicao(despesa);
  }

  private comEdicao<
    T extends {
      canceladoEm: Date | null;
      extraProjeto: unknown;
      movimentacaoCaixa: { caixa: { status: StatusCaixa } } | null;
    },
  >(despesa: T) {
    return {
      ...despesa,
      editavel:
        !despesa.canceladoEm &&
        !despesa.extraProjeto &&
        despesa.movimentacaoCaixa?.caixa.status !== 'FECHADO',
    };
  }

  async opcoesMateriais(query: ListMateriaisQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const where: Prisma.MaterialWhereInput = {
      status: StatusCadastro.ATIVO,
      nome: query.busca ? { contains: escaparLike(query.busca) } : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.material.findMany({
        where,
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          codigo: true,
          nome: true,
          unidadeMedida: true,
          precoReferencia: true,
          estoque: {
            select: { quantidadeAtual: true, quantidadeReservada: true },
          },
        },
      }),
      this.prisma.material.count({ where }),
    ]);
    return {
      data: data.map((item) => ({
        ...item,
        quantidadeAtual: Number(item.estoque?.quantidadeAtual ?? 0),
        quantidadeReservada: Number(item.estoque?.quantidadeReservada ?? 0),
        saldoDisponivel:
          Number(item.estoque?.quantidadeAtual ?? 0) -
          Number(item.estoque?.quantidadeReservada ?? 0),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: number, dto: UpdateDespesaDto, usuarioId: number) {
    if (
      dto.data === null ||
      dto.descricao === null ||
      dto.valorTotal === null ||
      dto.categoria === null
    )
      throw new BadRequestException({
        codigo: 'DESPESAS_UPDATE_BADREQUEST_01',
        message: 'Campos obrigatorios da despesa nao podem ser nulos',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM despesa WHERE id = ${id} FOR UPDATE`;
      const existente = await tx.despesa.findUnique({
        where: { id },
        include: {
          materiais: true,
          movimentacaoCaixa: { include: { caixa: true } },
          extraProjeto: { select: { id: true, projetoId: true } },
        },
      });
      if (!existente) {
        throw new NotFoundException({
          codigo: 'DESPESAS_UPDATE_NOTFOUND_01',
          message: 'Despesa nao encontrada',
        });
      }
      if (existente.canceladoEm)
        throw new ConflictException({
          codigo: 'DESPESAS_UPDATE_CONFLICT_01',
          message: 'Despesa estornada nao pode ser editada',
        });
      if (
        existente.extraProjeto &&
        ((dto.valorTotal !== undefined &&
          !existente.valorTotal.equals(dto.valorTotal)) ||
          (dto.data !== undefined &&
            this.parseDate(dto.data).getTime() !== existente.data.getTime()))
      ) {
        throw new BadRequestException({
          codigo: 'DESPESAS_UPDATE_BADREQUEST_02',
          message:
            'Valor e data desta despesa vem do extra do projeto e nao podem ser alterados aqui',
        });
      }
      if (dto.tipo && dto.tipo !== existente.tipo) {
        throw new BadRequestException({
          codigo: 'DESPESAS_UPDATE_BADREQUEST_03',
          message: 'O tipo da despesa nao pode ser alterado depois do cadastro',
        });
      }
      if (existente.movimentacaoCaixa?.caixa.status === StatusCaixa.FECHADO) {
        throw new BadRequestException({
          codigo: 'DESPESA_CAIXA_FECHADO',
          message: 'Despesa de caixa fechado nao pode ser editada',
        });
      }

      const mesclada: CreateDespesaDto = {
        tipo: existente.tipo,
        categoria: dto.categoria ?? existente.categoria ?? undefined,
        data: dto.data ?? existente.data.toISOString().slice(0, 10),
        fornecedorId:
          dto.fornecedorId === undefined
            ? (existente.fornecedorId ?? undefined)
            : dto.fornecedorId,
        descricao: dto.descricao ?? existente.descricao,
        valorTotal: dto.valorTotal ?? Number(existente.valorTotal),
        materiais:
          dto.materiais ??
          existente.materiais.map((item) => ({
            materialId: item.materialId,
            quantidade: Number(item.quantidade),
            unidadeMedida: item.unidadeMedida,
            valorUnitario: Number(item.valorUnitario),
          })),
      };
      const preparada = await this.prepare(tx, mesclada, existente);
      const caixaDestino = await this.financeiroService.ensureOpenCash(
        tx,
        preparada.data,
      );

      if (existente.tipo === TipoDespesa.COMPRA_MATERIAL) {
        await this.reconcileMaterials(
          tx,
          existente.id,
          existente.materiais,
          preparada.materiais,
          usuarioId,
        );
      }

      await tx.despesa.update({
        where: { id },
        data: {
          categoria: preparada.categoria,
          data: preparada.data,
          fornecedorId: preparada.fornecedorId,
          descricao: preparada.descricao,
          valorTotal: preparada.valorTotal,
        },
      });

      if (existente.movimentacaoCaixa) {
        await tx.movimentacaoCaixa.update({
          where: { id: existente.movimentacaoCaixa.id },
          data: {
            caixaId: caixaDestino.id,
            tipo: TipoMovimentacaoCaixa.SAIDA,
            data: preparada.data,
            descricao: preparada.descricao.slice(0, 255),
            categoria: existente.extraProjeto
              ? 'EXTRA_PROJETO'
              : (preparada.categoria ?? 'SEM_CATEGORIA'),
            valor: preparada.valorTotal,
          },
        });
      } else {
        await this.financeiroService.registrarSaidaDespesa(tx, {
          id,
          data: preparada.data,
          descricao: preparada.descricao,
          categoria: preparada.categoria ?? 'SEM_CATEGORIA',
          valor: preparada.valorTotal,
        });
      }
    });

    return this.findOne(id);
  }

  async cancelar(id: number, usuarioId: number, motivo: string) {
    await this.prisma.$transaction((tx) =>
      estornarDespesa(tx, id, usuarioId, motivo),
    );
    return this.findOne(id);
  }

  private async prepare(
    tx: Prisma.TransactionClient,
    dto: CreateDespesaDto,
    historico?: {
      fornecedorId: number | null;
      materiais: Array<{
        materialId: number;
        quantidade: Prisma.Decimal;
        valorUnitario: Prisma.Decimal;
        unidadeMedida: string;
      }>;
    },
  ): Promise<DespesaPreparada> {
    await exigirCategoria(
      tx,
      'DESPESAS',
      dto.tipo === TipoDespesa.COMPRA_MATERIAL
        ? 'COMPRA_MATERIAL'
        : dto.categoria,
    );
    const data = this.parseDate(dto.data);
    const descricao = dto.descricao.trim();
    if (!descricao)
      throw new BadRequestException({
        codigo: 'DESPESAS_PREPARE_BADREQUEST_01',
        message: 'Informe a descricao da despesa',
      });

    if (dto.tipo === TipoDespesa.COMPRA_MATERIAL) {
      if (dto.categoria && dto.categoria !== 'COMPRA_MATERIAL') {
        throw new BadRequestException({
          codigo: 'DESPESAS_PREPARE_BADREQUEST_02',
          message: 'Compra de material deve usar a categoria COMPRA_MATERIAL',
        });
      }
      if (!dto.fornecedorId) {
        throw new BadRequestException({
          codigo: 'DESPESAS_PREPARE_BADREQUEST_03',
          message: 'Informe o fornecedor da compra de material',
        });
      }
      if (!dto.materiais?.length) {
        throw new BadRequestException({
          codigo: 'DESPESAS_PREPARE_BADREQUEST_04',
          message: 'Informe ao menos um material adquirido',
        });
      }
      if (
        new Set(dto.materiais.map((item) => item.materialId)).size !==
        dto.materiais.length
      ) {
        throw new BadRequestException({
          codigo: 'DESPESAS_PREPARE_BADREQUEST_05',
          message: 'O mesmo material nao pode aparecer duas vezes na compra',
        });
      }
      const fornecedor = await tx.fornecedor.findFirst({
        where: {
          id: dto.fornecedorId,
          status:
            dto.fornecedorId === historico?.fornecedorId
              ? undefined
              : StatusCadastro.ATIVO,
        },
      });
      if (!fornecedor) {
        throw new NotFoundException({
          codigo: 'FORNECEDOR_INATIVO',
          message: 'Fornecedor ativo nao encontrado',
        });
      }
      const materiaisAtivos = await tx.material.findMany({
        where: {
          id: { in: dto.materiais.map((item) => item.materialId) },
          OR: [
            { status: StatusCadastro.ATIVO },
            {
              id: {
                in:
                  historico?.materiais
                    .filter((antigo) =>
                      dto.materiais?.some(
                        (novo) =>
                          antigo.materialId === novo.materialId &&
                          antigo.quantidade.equals(novo.quantidade) &&
                          antigo.valorUnitario.equals(novo.valorUnitario) &&
                          antigo.unidadeMedida === novo.unidadeMedida,
                      ),
                    )
                    .map((item) => item.materialId) ?? [],
              },
            },
          ],
        },
        select: { id: true, unidadeMedida: true },
      });
      if (materiaisAtivos.length !== dto.materiais.length) {
        throw new NotFoundException({
          codigo: 'DESPESAS_PREPARE_NOTFOUND_02',
          message: 'Um ou mais materiais ativos nao foram encontrados',
        });
      }
      const materiais = dto.materiais.map((item) => {
        if (
          materiaisAtivos
            .find((material) => material.id === item.materialId)
            ?.unidadeMedida.trim()
            .toLowerCase() !== item.unidadeMedida.trim().toLowerCase()
        )
          throw new BadRequestException({
            codigo: 'DESPESAS_PREPARE_BADREQUEST_06',
            message:
              'A compra deve usar a unidade de medida cadastrada para o material',
          });
        const quantidade = new Prisma.Decimal(item.quantidade).toDecimalPlaces(
          3,
        );
        validarQuantidadeUnidade(item.unidadeMedida, quantidade);
        const valorUnitario = new Prisma.Decimal(
          item.valorUnitario,
        ).toDecimalPlaces(2);
        return {
          materialId: item.materialId,
          quantidade,
          unidadeMedida: item.unidadeMedida.trim(),
          valorUnitario,
          valorTotal: quantidade.mul(valorUnitario).toDecimalPlaces(2),
        };
      });
      return {
        tipo: dto.tipo,
        categoria: 'COMPRA_MATERIAL',
        data,
        fornecedorId: dto.fornecedorId,
        descricao,
        valorTotal: materiais.reduce(
          (soma, item) => soma.plus(item.valorTotal),
          new Prisma.Decimal(0),
        ),
        materiais,
      };
    }

    if (dto.categoria === 'COMPRA_MATERIAL') {
      throw new BadRequestException({
        codigo: 'DESPESAS_PREPARE_BADREQUEST_07',
        message: 'Despesa diversa nao pode usar a categoria COMPRA_MATERIAL',
      });
    }
    if (!dto.valorTotal) {
      throw new BadRequestException({
        codigo: 'DESPESAS_PREPARE_BADREQUEST_08',
        message: 'Informe o valor da despesa diversa',
      });
    }
    if (dto.materiais?.length)
      throw new BadRequestException({
        codigo: 'DESPESAS_PREPARE_BADREQUEST_09',
        message: 'Despesa diversa nao aceita itens de compra',
      });
    if (
      dto.fornecedorId &&
      !(await tx.fornecedor.findFirst({
        where: {
          id: dto.fornecedorId,
          status:
            dto.fornecedorId === historico?.fornecedorId
              ? undefined
              : StatusCadastro.ATIVO,
        },
      }))
    )
      throw new NotFoundException({
        codigo: 'FORNECEDOR_INATIVO',
        message: 'Fornecedor ativo nao encontrado',
      });
    return {
      tipo: dto.tipo,
      categoria: dto.categoria ?? null,
      data,
      fornecedorId: dto.fornecedorId ?? null,
      descricao,
      valorTotal: new Prisma.Decimal(dto.valorTotal).toDecimalPlaces(2),
      materiais: [],
    };
  }

  private async reconcileMaterials(
    tx: Prisma.TransactionClient,
    despesaId: number,
    existentes: Array<{
      id: number;
      materialId: number;
      quantidade: Prisma.Decimal;
    }>,
    novos: MaterialPreparado[],
    usuarioId: number,
  ) {
    const novosPorMaterial = new Map(
      novos.map((item) => [item.materialId, item]),
    );
    const existentesPorMaterial = new Map(
      existentes.map((item) => [item.materialId, item]),
    );

    for (const existente of existentes) {
      const novo = novosPorMaterial.get(existente.materialId);
      if (!novo) {
        await this.decrementStock(
          tx,
          existente.materialId,
          existente.quantidade,
        );
        await tx.movimentacaoEstoque.updateMany({
          where: { despesaMaterialId: existente.id },
          data: { despesaMaterialId: null },
        });
        await tx.despesaMaterial.delete({ where: { id: existente.id } });
        await tx.movimentacaoEstoque.create({
          data: {
            materialId: existente.materialId,
            tipo: TipoMovimentacaoEstoque.AJUSTE_SAIDA,
            quantidade: existente.quantidade,
            justificativa: `Estorno de item removido da despesa ${despesaId}`,
            registradoPorUsuarioId: usuarioId,
          },
        });
        continue;
      }

      const diferenca = novo.quantidade.minus(existente.quantidade);
      if (diferenca.greaterThan(0)) {
        await this.incrementStock(tx, existente.materialId, diferenca);
      } else if (diferenca.lessThan(0)) {
        await this.decrementStock(tx, existente.materialId, diferenca.abs());
      }
      await tx.despesaMaterial.update({
        where: { id: existente.id },
        data: {
          quantidade: novo.quantidade,
          unidadeMedida: novo.unidadeMedida,
          valorUnitario: novo.valorUnitario,
          valorTotal: novo.valorTotal,
        },
      });
      if (!diferenca.equals(0)) {
        await tx.movimentacaoEstoque.create({
          data: {
            materialId: existente.materialId,
            tipo: diferenca.greaterThan(0)
              ? TipoMovimentacaoEstoque.ENTRADA_COMPRA
              : TipoMovimentacaoEstoque.AJUSTE_SAIDA,
            quantidade: diferenca.abs(),
            justificativa: `Ajuste pela edicao da despesa ${despesaId}`,
            despesaMaterialId: existente.id,
            registradoPorUsuarioId: usuarioId,
          },
        });
      }
    }

    for (const novo of novos) {
      if (existentesPorMaterial.has(novo.materialId)) {
        continue;
      }
      const item = await tx.despesaMaterial.create({
        data: {
          despesaId,
          materialId: novo.materialId,
          quantidade: novo.quantidade,
          unidadeMedida: novo.unidadeMedida,
          valorUnitario: novo.valorUnitario,
          valorTotal: novo.valorTotal,
        },
      });
      await this.incrementStock(tx, novo.materialId, novo.quantidade);
      await tx.movimentacaoEstoque.create({
        data: {
          materialId: novo.materialId,
          tipo: TipoMovimentacaoEstoque.ENTRADA_COMPRA,
          quantidade: novo.quantidade,
          justificativa: `Item incluido pela edicao da despesa ${despesaId}`,
          despesaMaterialId: item.id,
          registradoPorUsuarioId: usuarioId,
        },
      });
    }
  }

  private async incrementStock(
    tx: Prisma.TransactionClient,
    materialId: number,
    quantidade: Prisma.Decimal,
  ) {
    await tx.estoqueMaterial.upsert({
      where: { materialId },
      create: {
        materialId,
        quantidadeAtual: 0,
        quantidadeReservada: 0,
        atualizadoEm: new Date(),
      },
      update: {},
    });
    await tx.$queryRaw`SELECT material_id FROM estoque_material WHERE material_id = ${materialId} FOR UPDATE`;
    const saldo = await tx.estoqueMaterial.findUniqueOrThrow({
      where: { materialId },
    });
    validarEntradaEstoque(materialId, saldo.quantidadeAtual, quantidade);
    await tx.estoqueMaterial.update({
      where: { materialId },
      data: {
        quantidadeAtual: { increment: quantidade },
        atualizadoEm: new Date(),
      },
    });
  }

  private async decrementStock(
    tx: Prisma.TransactionClient,
    materialId: number,
    quantidade: Prisma.Decimal,
  ) {
    const alterados = await tx.$executeRaw`
      UPDATE estoque_material
      SET quantidade_atual = quantidade_atual - ${quantidade},
          atualizado_em = ${new Date()}
      WHERE material_id = ${materialId}
        AND quantidade_atual - quantidade_reservada >= ${quantidade}
    `;
    if (alterados !== 1) {
      throw new BadRequestException({
        codigo: 'ESTOQUE_SALDO_ALTERADO',
        message: 'Nao ha saldo disponivel para reduzir esta compra no estoque',
      });
    }
  }

  private buildWhere(query: ListDespesasQueryDto): Prisma.DespesaWhereInput {
    if (query.dataInicio && query.dataFim && query.dataInicio > query.dataFim)
      throw new BadRequestException({
        codigo: 'PERIODO_INVALIDO',
        message: 'A data inicial nao pode ser posterior a data final',
      });
    return {
      tipo: query.tipo,
      fornecedorId: query.fornecedorId,
      categoria: query.categoria === 'SEM_CATEGORIA' ? null : query.categoria,
      data:
        query.dataInicio || query.dataFim
          ? {
              gte: query.dataInicio
                ? this.parseDate(query.dataInicio)
                : undefined,
              lte: query.dataFim ? this.parseDate(query.dataFim) : undefined,
            }
          : undefined,
      OR: query.busca
        ? [
            { descricao: { contains: escaparLike(query.busca) } },
            {
              fornecedor: {
                nomeFantasia: { contains: escaparLike(query.busca) },
              },
            },
            {
              fornecedor: {
                razaoSocial: { contains: escaparLike(query.busca) },
              },
            },
            {
              materiais: {
                some: {
                  material: { nome: { contains: escaparLike(query.busca) } },
                },
              },
            },
          ]
        : undefined,
    };
  }

  private parseDate(value: string) {
    return parseDateOnly(value);
  }
}
