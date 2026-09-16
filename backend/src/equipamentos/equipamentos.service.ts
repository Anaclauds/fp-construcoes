import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCadastro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipamentoDto } from './dto/create-equipamento.dto';
import { ListEquipamentosQueryDto } from './dto/list-equipamentos-query.dto';
import { UpdateEquipamentoDto } from './dto/update-equipamento.dto';

@Injectable()
export class EquipamentosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly detailsInclude = {
    fornecedor: {
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        status: true,
      },
    },
  } satisfies Prisma.EquipamentoInclude;

  async create(dto: CreateEquipamentoDto) {
    this.validateDataAquisicao(dto.dataAquisicao);
    if (dto.fornecedorId) {
      await this.ensureFornecedorAtivo(dto.fornecedorId);
    }

    return this.prisma.$transaction(async (tx) => {
      const codigoTemporario = `TMP-${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const equipamento = await tx.equipamento.create({
        data: {
          codigoPatrimonial: codigoTemporario,
          ...this.toCreateData(dto),
        },
      });
      const codigoPatrimonial = `EQP-${String(equipamento.id).padStart(3, '0')}`;

      return tx.equipamento.update({
        where: { id: equipamento.id },
        data: { codigoPatrimonial },
        include: this.detailsInclude,
      });
    });
  }

  async findAll(query: ListEquipamentosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.EquipamentoWhereInput = {
      tipo: query.tipo,
      status: query.status ?? StatusCadastro.ATIVO,
      OR: query.busca
        ? [
            { codigoPatrimonial: { contains: query.busca } },
            { nome: { contains: query.busca } },
            { tipo: { contains: query.busca } },
            { marca: { contains: query.busca } },
            { modelo: { contains: query.busca } },
            {
              fornecedor: {
                is: { nomeFantasia: { contains: query.busca } },
              },
            },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.equipamento.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: this.detailsInclude,
      }),
      this.prisma.equipamento.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const equipamento = await this.prisma.equipamento.findUnique({
      where: { id },
      include: this.detailsInclude,
    });
    if (!equipamento) {
      throw new NotFoundException('Equipamento nao encontrado');
    }
    return equipamento;
  }

  async update(id: number, dto: UpdateEquipamentoDto) {
    await this.findOne(id);
    this.validateDataAquisicao(dto.dataAquisicao);
    if (dto.fornecedorId) {
      await this.ensureFornecedorAtivo(dto.fornecedorId);
    }

    return this.prisma.equipamento.update({
      where: { id },
      data: this.toUpdateData(dto),
      include: this.detailsInclude,
    });
  }

  async updateStatus(id: number, status: StatusCadastro) {
    await this.findOne(id);
    return this.prisma.equipamento.update({
      where: { id },
      data: { status },
      include: this.detailsInclude,
    });
  }

  private toCreateData(dto: CreateEquipamentoDto) {
    return {
      nome: dto.nome.trim(),
      tipo: dto.tipo,
      marca: dto.marca.trim(),
      modelo: dto.modelo?.trim() || null,
      observacoes: dto.observacoes?.trim() || null,
      dataAquisicao: dto.dataAquisicao
        ? this.parseDate(dto.dataAquisicao)
        : null,
      valorAquisicao:
        dto.valorAquisicao === undefined
          ? null
          : new Prisma.Decimal(dto.valorAquisicao),
      fornecedorId: dto.fornecedorId,
    } satisfies Omit<
      Prisma.EquipamentoUncheckedCreateInput,
      'codigoPatrimonial'
    >;
  }

  private toUpdateData(dto: UpdateEquipamentoDto) {
    return {
      nome: dto.nome?.trim(),
      tipo: dto.tipo,
      marca: dto.marca?.trim(),
      modelo: dto.modelo === undefined ? undefined : dto.modelo.trim() || null,
      observacoes:
        dto.observacoes === undefined
          ? undefined
          : dto.observacoes.trim() || null,
      dataAquisicao: dto.dataAquisicao
        ? this.parseDate(dto.dataAquisicao)
        : undefined,
      valorAquisicao:
        dto.valorAquisicao === undefined
          ? undefined
          : new Prisma.Decimal(dto.valorAquisicao),
      fornecedorId: dto.fornecedorId,
    } satisfies Prisma.EquipamentoUncheckedUpdateInput;
  }

  private validateDataAquisicao(value?: string) {
    if (value && this.parseDate(value) > this.today()) {
      throw new BadRequestException(
        'Data de aquisicao nao pode estar no futuro',
      );
    }
  }

  private async ensureFornecedorAtivo(id: number) {
    const fornecedor = await this.prisma.fornecedor.findFirst({
      where: { id, status: StatusCadastro.ATIVO },
    });
    if (!fornecedor) {
      throw new NotFoundException('Fornecedor ativo nao encontrado');
    }
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
}
