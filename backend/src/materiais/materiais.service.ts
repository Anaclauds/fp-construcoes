import { escaparLike } from '../common/utils/like.util';
import { validarQuantidadeUnidade } from '../common/utils/quantidade.util';
import { exigirCategoria } from '../common/utils/categoria.util';
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
  precoReferencia: number;
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
    await this.validarNome(dto.nome.trim());
    await exigirCategoria(this.prisma, 'MATERIAIS', dto.categoria);
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
    await this.validarNome(dto.nome.trim());
    await exigirCategoria(this.prisma, 'MATERIAIS', dto.categoria);
    return this.prisma.$transaction((tx) =>
      this.createInTransaction(tx, {
        nome: dto.nome,
        categoria: dto.categoria,
        unidadeMedida: dto.unidadeMedida,
        descricao: dto.observacoes,
        precoReferencia: dto.precoReferencia,
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
      status:
        query.status === 'TODOS'
          ? undefined
          : (query.status ?? StatusCadastro.ATIVO),
      OR: query.busca
        ? [
            { codigo: { contains: escaparLike(query.busca) } },
            { nome: { contains: escaparLike(query.busca) } },
            { categoria: { contains: escaparLike(query.busca) } },
            { descricao: { contains: escaparLike(query.busca) } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.material.findMany({
        where,
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
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
      throw new NotFoundException({
        codigo: 'MATERIAIS_FINDONE_NOTFOUND_01',
        message: 'Material nao encontrado',
      });
    }
    return material;
  }

  async update(id: number, dto: UpdateMaterialDto) {
    if (dto.categoria !== undefined)
      await exigirCategoria(this.prisma, 'MATERIAIS', dto.categoria);
    const atual = await this.findOne(id);
    if (atual.status === 'ATIVO')
      await this.validarNome(dto.nome?.trim() ?? atual.nome, id);
    if (
      dto.fornecedorPreferencialId &&
      dto.fornecedorPreferencialId !== atual.fornecedorPreferencialId
    ) {
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
            : dto.descricao?.trim() || null,
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
    const atual = await this.findOne(id);
    if (status === 'ATIVO') await this.validarNome(atual.nome, id);
    if (status === StatusCadastro.INATIVO) {
      const reservasAtivas = await this.prisma.reservaEstoque.count({
        where: { materialId: id, status: StatusReservaEstoque.ATIVA },
      });
      if (reservasAtivas) {
        throw new ConflictException({
          codigo: 'MATERIAIS_UPDATESTATUS_CONFLICT_01',
          message: 'Material com reserva ativa nao pode ser desativado',
        });
      }
    }

    return this.prisma.material.update({
      where: { id },
      data: { status },
      include: this.detailsInclude,
    });
  }

  listarCategorias() {
    return this.prisma.categoriaCadastro
      .findMany({ where: { tipo: 'MATERIAIS' }, orderBy: { rotulo: 'asc' } })
      .then((categorias) =>
        categorias.map((categoria) => ({
          valor: categoria.nome,
          rotulo: categoria.rotulo,
        })),
      );
  }

  async listarUnidades() {
    const materiais = await this.prisma.material.findMany({
      select: { unidadeMedida: true },
      distinct: ['unidadeMedida'],
    });
    const unidades = new Set([
      'Unidade',
      'Metro Linear',
      'Metro Quadrado (m²)',
      'Metro Cúbico (m³)',
      'Quilograma (kg)',
      'Litro (L)',
      'Barra',
      'Peça',
      'Caixa',
      'Rolo',
      'Saco (20kg)',
      'Cento',
      'Lata (3,6L)',
      ...materiais.map((item) => item.unidadeMedida),
    ]);
    return [...unidades].sort().map((valor) => ({ valor, rotulo: valor }));
  }

  private async validarNome(nome: string, id?: number) {
    if (
      await this.prisma.material.findFirst({
        where: {
          nome,
          status: 'ATIVO',
          id: id === undefined ? undefined : { not: id },
        },
      })
    )
      throw new ConflictException({
        codigo: 'MATERIAIS_VALIDARNOME_CONFLICT_01',
        message: 'Ja existe material ativo com este nome',
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
    validarQuantidadeUnidade(data.unidadeMedida, quantidade);

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
      throw new NotFoundException({
        codigo: 'MATERIAIS_ENSUREFORNECEDORATIVO_NOTFOUND_01',
        message: 'Fornecedor preferencial nao encontrado',
      });
    }
  }
}
