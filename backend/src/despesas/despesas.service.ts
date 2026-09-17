import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoriaDespesa,
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

interface MaterialPreparado {
  materialId: number;
  quantidade: Prisma.Decimal;
  unidadeMedida: string;
  valorUnitario: Prisma.Decimal;
  valorTotal: Prisma.Decimal;
}

interface DespesaPreparada {
  tipo: TipoDespesa;
  categoria: CategoriaDespesa | null;
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
    movimentacaoCaixa: true,
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
      this.prisma.despesa.findMany({
        where,
        select: { tipo: true, valorTotal: true },
      }),
    ]);
    const totalDespesas = valores.reduce(
      (soma, item) => soma.plus(item.valorTotal),
      new Prisma.Decimal(0),
    );
    const totalComprasMateriais = valores
      .filter((item) => item.tipo === TipoDespesa.COMPRA_MATERIAL)
      .reduce(
        (soma, item) => soma.plus(item.valorTotal),
        new Prisma.Decimal(0),
      );

    return {
      indicadores: {
        totalDespesas,
        totalComprasMateriais,
        totalOutrasDespesas: totalDespesas.minus(totalComprasMateriais),
      },
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const despesa = await this.prisma.despesa.findUnique({
      where: { id },
      include: this.detailsInclude,
    });
    if (!despesa) {
      throw new NotFoundException('Despesa nao encontrada');
    }
    return despesa;
  }

  async update(id: number, dto: UpdateDespesaDto, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const existente = await tx.despesa.findUnique({
        where: { id },
        include: {
          materiais: true,
          movimentacaoCaixa: { include: { caixa: true } },
        },
      });
      if (!existente) {
        throw new NotFoundException('Despesa nao encontrada');
      }
      if (dto.tipo && dto.tipo !== existente.tipo) {
        throw new BadRequestException(
          'O tipo da despesa nao pode ser alterado depois do cadastro',
        );
      }
      if (existente.movimentacaoCaixa?.caixa.status === StatusCaixa.FECHADO) {
        throw new BadRequestException(
          'Despesa de caixa fechado nao pode ser editada',
        );
      }

      const mesclada: CreateDespesaDto = {
        tipo: existente.tipo,
        categoria: dto.categoria ?? existente.categoria ?? undefined,
        data: dto.data ?? existente.data.toISOString().slice(0, 10),
        fornecedorId: dto.fornecedorId ?? existente.fornecedorId ?? undefined,
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
      const preparada = await this.prepare(tx, mesclada);
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
            categoria: preparada.categoria ?? 'SEM_CATEGORIA',
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

  private async prepare(
    tx: Prisma.TransactionClient,
    dto: CreateDespesaDto,
  ): Promise<DespesaPreparada> {
    const data = this.parseDate(dto.data);
    const descricao = dto.descricao.trim();

    if (dto.tipo === TipoDespesa.COMPRA_MATERIAL) {
      if (dto.categoria && dto.categoria !== CategoriaDespesa.COMPRA_MATERIAL) {
        throw new BadRequestException(
          'Compra de material deve usar a categoria COMPRA_MATERIAL',
        );
      }
      if (!dto.fornecedorId) {
        throw new BadRequestException(
          'Informe o fornecedor da compra de material',
        );
      }
      if (!dto.materiais?.length) {
        throw new BadRequestException('Informe ao menos um material adquirido');
      }
      if (
        new Set(dto.materiais.map((item) => item.materialId)).size !==
        dto.materiais.length
      ) {
        throw new BadRequestException(
          'O mesmo material nao pode aparecer duas vezes na compra',
        );
      }
      const fornecedor = await tx.fornecedor.findFirst({
        where: { id: dto.fornecedorId, status: StatusCadastro.ATIVO },
      });
      if (!fornecedor) {
        throw new NotFoundException('Fornecedor ativo nao encontrado');
      }
      const materiaisAtivos = await tx.material.findMany({
        where: {
          id: { in: dto.materiais.map((item) => item.materialId) },
          status: StatusCadastro.ATIVO,
        },
        select: { id: true },
      });
      if (materiaisAtivos.length !== dto.materiais.length) {
        throw new NotFoundException(
          'Um ou mais materiais ativos nao foram encontrados',
        );
      }
      const materiais = dto.materiais.map((item) => {
        const quantidade = new Prisma.Decimal(item.quantidade).toDecimalPlaces(
          3,
        );
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
        categoria: CategoriaDespesa.COMPRA_MATERIAL,
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

    if (dto.categoria === CategoriaDespesa.COMPRA_MATERIAL) {
      throw new BadRequestException(
        'Despesa diversa nao pode usar a categoria COMPRA_MATERIAL',
      );
    }
    if (!dto.valorTotal) {
      throw new BadRequestException('Informe o valor da despesa diversa');
    }
    return {
      tipo: dto.tipo,
      categoria: dto.categoria ?? null,
      data,
      fornecedorId: null,
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
        quantidadeAtual: quantidade,
        quantidadeReservada: 0,
        atualizadoEm: new Date(),
      },
      update: {
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
      throw new BadRequestException(
        'Nao ha saldo disponivel para reduzir esta compra no estoque',
      );
    }
  }

  private buildWhere(query: ListDespesasQueryDto): Prisma.DespesaWhereInput {
    return {
      tipo: query.tipo,
      categoria: query.categoria,
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
            { descricao: { contains: query.busca } },
            { fornecedor: { nomeFantasia: { contains: query.busca } } },
            { fornecedor: { razaoSocial: { contains: query.busca } } },
            {
              materiais: {
                some: { material: { nome: { contains: query.busca } } },
              },
            },
          ]
        : undefined,
    };
  }

  private parseDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
