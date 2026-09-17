import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusCadastro,
  StatusReservaEstoque,
  TipoMovimentacaoEstoque,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListMateriaisQueryDto } from './dto/list-materiais-query.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

interface NovoMaterialEstoque {
  nome: string;
  categoria: string;
  unidadeMedida: string;
  quantidadeInicial: number;
  observacoes?: string;
}

@Injectable()
export class MateriaisService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly detailsInclude = {
    fornecedorPreferencial: {
      select: { id: true, nomeFantasia: true, razaoSocial: true, status: true },
    },
    estoque: true,
  } satisfies Prisma.MaterialInclude;

  async create(dto: CreateMaterialDto) {
    if (dto.fornecedorPreferencialId) {
      await this.ensureFornecedorAtivo(dto.fornecedorPreferencialId);
    }

    return this.prisma.$transaction((tx) =>
      this.createInTransaction(tx, {
        nome: dto.nome,
        categoria: dto.categoria,
        unidadeMedida: dto.unidadeMedida,
        descricao: dto.descricao,
        precoReferencia: dto.precoReferencia,
        fornecedorPreferencialId: dto.fornecedorPreferencialId,
        quantidadeInicial: 0,
      }),
    );
  }

  async createFromEstoque(dto: NovoMaterialEstoque, usuarioId: number) {
    return this.prisma.$transaction((tx) =>
      this.createInTransaction(tx, {
        nome: dto.nome,
        categoria: dto.categoria,
        unidadeMedida: dto.unidadeMedida,
        descricao: dto.observacoes,
        precoReferencia: 0,
        quantidadeInicial: dto.quantidadeInicial,
        usuarioId,
      }),
    );
  }

  async findAll(query: ListMateriaisQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.MaterialWhereInput = {
      categoria: query.categoria,
      status: query.status ?? StatusCadastro.ATIVO,
      OR: query.busca
        ? [
            { codigo: { contains: query.busca } },
            { nome: { contains: query.busca } },
            { categoria: { contains: query.busca } },
            { descricao: { contains: query.busca } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.material.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: this.detailsInclude,
      }),
      this.prisma.material.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: this.detailsInclude,
    });
    if (!material) {
      throw new NotFoundException('Material nao encontrado');
    }
    return material;
  }

  async update(id: number, dto: UpdateMaterialDto) {
    await this.findOne(id);
    if (dto.fornecedorPreferencialId) {
      await this.ensureFornecedorAtivo(dto.fornecedorPreferencialId);
    }

    return this.prisma.material.update({
      where: { id },
      data: {
        nome: dto.nome?.trim(),
        categoria: dto.categoria?.trim(),
        unidadeMedida: dto.unidadeMedida?.trim(),
        descricao:
          dto.descricao === undefined
            ? undefined
            : dto.descricao.trim() || null,
        precoReferencia:
          dto.precoReferencia === undefined
            ? undefined
            : new Prisma.Decimal(dto.precoReferencia),
        fornecedorPreferencialId: dto.fornecedorPreferencialId,
      },
      include: this.detailsInclude,
    });
  }

  async updateStatus(id: number, status: StatusCadastro) {
    await this.findOne(id);
    if (status === StatusCadastro.INATIVO) {
      const reservasAtivas = await this.prisma.reservaEstoque.count({
        where: { materialId: id, status: StatusReservaEstoque.ATIVA },
      });
      if (reservasAtivas) {
        throw new ConflictException(
          'Material com reserva ativa nao pode ser desativado',
        );
      }
    }

    return this.prisma.material.update({
      where: { id },
      data: { status },
      include: this.detailsInclude,
    });
  }

  private async createInTransaction(
    tx: Prisma.TransactionClient,
    data: {
      nome: string;
      categoria: string;
      unidadeMedida: string;
      descricao?: string;
      precoReferencia: number;
      fornecedorPreferencialId?: number;
      quantidadeInicial: number;
      usuarioId?: number;
    },
  ) {
    const codigoTemporario = `TMP-${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const material = await tx.material.create({
      data: {
        codigo: codigoTemporario,
        nome: data.nome.trim(),
        categoria: data.categoria.trim(),
        unidadeMedida: data.unidadeMedida.trim(),
        descricao: data.descricao?.trim() || null,
        precoReferencia: new Prisma.Decimal(data.precoReferencia),
        fornecedorPreferencialId: data.fornecedorPreferencialId,
      },
    });
    const codigo = `MAT-${String(material.id).padStart(3, '0')}`;
    const quantidade = new Prisma.Decimal(data.quantidadeInicial);

    await tx.estoqueMaterial.create({
      data: {
        materialId: material.id,
        quantidadeAtual: quantidade,
        quantidadeReservada: 0,
        atualizadoEm: new Date(),
      },
    });
    if (quantidade.greaterThan(0) && data.usuarioId) {
      await tx.movimentacaoEstoque.create({
        data: {
          materialId: material.id,
          tipo: TipoMovimentacaoEstoque.AJUSTE_ENTRADA,
          quantidade,
          justificativa: 'Quantidade inicial informada no cadastro',
          registradoPorUsuarioId: data.usuarioId,
        },
      });
    }

    return tx.material.update({
      where: { id: material.id },
      data: { codigo },
      include: this.detailsInclude,
    });
  }

  private async ensureFornecedorAtivo(id: number) {
    const fornecedor = await this.prisma.fornecedor.findFirst({
      where: { id, status: StatusCadastro.ATIVO },
    });
    if (!fornecedor) {
      throw new NotFoundException('Fornecedor preferencial nao encontrado');
    }
  }
}
