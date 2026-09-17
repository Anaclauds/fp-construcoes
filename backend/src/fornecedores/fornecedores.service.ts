import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCadastro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';
import { ListFornecedoresQueryDto } from './dto/list-fornecedores-query.dto';
import { UpdateFornecedorDto } from './dto/update-fornecedor.dto';

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly detailsInclude = {
    materiaisPreferenciais: {
      select: { id: true, codigo: true, nome: true, status: true },
      orderBy: { nome: 'asc' as const },
    },
    equipamentos: {
      select: { id: true, codigoPatrimonial: true, nome: true, status: true },
      orderBy: { nome: 'asc' as const },
    },
  } satisfies Prisma.FornecedorInclude;

  async create(dto: CreateFornecedorDto) {
    const cnpj = this.normalizeCnpj(dto.cnpj);
    await this.ensureCnpjDisponivel(cnpj);

    return this.prisma.fornecedor.create({
      data: this.toData(dto, cnpj),
      include: this.detailsInclude,
    });
  }

  async findAll(query: ListFornecedoresQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const buscaNumerica = query.busca?.replace(/\D/g, '');
    const where: Prisma.FornecedorWhereInput = {
      status: query.status ?? StatusCadastro.ATIVO,
      OR: query.busca
        ? [
            { razaoSocial: { contains: query.busca } },
            { nomeFantasia: { contains: query.busca } },
            { cnpj: { contains: buscaNumerica || query.busca } },
            { contato: { contains: buscaNumerica || query.busca } },
            { cidade: { contains: query.busca } },
            { responsavel: { contains: query.busca } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.fornecedor.findMany({
        where,
        orderBy: { razaoSocial: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.fornecedor.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  findAtivos() {
    return this.prisma.fornecedor.findMany({
      where: { status: StatusCadastro.ATIVO },
      orderBy: { nomeFantasia: 'asc' },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
      },
    });
  }

  async findOne(id: number) {
    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: { id },
      include: this.detailsInclude,
    });
    if (!fornecedor) {
      throw new NotFoundException('Fornecedor nao encontrado');
    }
    return fornecedor;
  }

  async update(id: number, dto: UpdateFornecedorDto) {
    await this.findOne(id);
    const cnpj = dto.cnpj ? this.normalizeCnpj(dto.cnpj) : undefined;
    if (cnpj) {
      await this.ensureCnpjDisponivel(cnpj, id);
    }

    return this.prisma.fornecedor.update({
      where: { id },
      data: this.toData(dto, cnpj),
      include: this.detailsInclude,
    });
  }

  async updateStatus(id: number, status: StatusCadastro) {
    await this.findOne(id);
    return this.prisma.fornecedor.update({
      where: { id },
      data: { status },
      include: this.detailsInclude,
    });
  }

  private toData(
    dto: CreateFornecedorDto | UpdateFornecedorDto,
    cnpj?: string,
  ): Prisma.FornecedorUncheckedCreateInput {
    const cep = dto.cep?.replace(/\D/g, '');
    if (cep !== undefined && cep.length !== 8) {
      throw new BadRequestException('CEP deve conter 8 digitos');
    }

    return {
      razaoSocial: dto.razaoSocial?.trim(),
      nomeFantasia: dto.nomeFantasia?.trim(),
      cnpj,
      contato: dto.contato?.replace(/\D/g, ''),
      responsavel: dto.responsavel?.trim(),
      cargoResponsavel: dto.cargoResponsavel?.trim(),
      cep,
      cidade: dto.cidade?.trim(),
      estado: dto.estado?.toUpperCase(),
      rua: dto.rua?.trim(),
      numero: dto.numero?.trim(),
      bairro: dto.bairro?.trim(),
      complemento:
        dto.complemento === undefined
          ? undefined
          : dto.complemento.trim() || null,
    } as Prisma.FornecedorUncheckedCreateInput;
  }

  private normalizeCnpj(value: string) {
    const cnpj = value.replace(/\D/g, '');
    if (!this.isCnpjValido(cnpj)) {
      throw new BadRequestException('CNPJ invalido');
    }
    return cnpj;
  }

  private isCnpjValido(cnpj: string) {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
      return false;
    }
    const calcularDigito = (base: string) => {
      let peso = base.length - 7;
      const soma = [...base].reduce((total, digito) => {
        const resultado = total + Number(digito) * peso;
        peso = peso === 2 ? 9 : peso - 1;
        return resultado;
      }, 0);
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const primeiro = calcularDigito(cnpj.slice(0, 12));
    const segundo = calcularDigito(`${cnpj.slice(0, 12)}${primeiro}`);
    return cnpj.endsWith(`${primeiro}${segundo}`);
  }

  private async ensureCnpjDisponivel(cnpj: string, ignoreId?: number) {
    const existente = await this.prisma.fornecedor.findFirst({
      where: { cnpj, id: ignoreId ? { not: ignoreId } : undefined },
    });
    if (existente) {
      throw new ConflictException('CNPJ ja cadastrado para outro fornecedor');
    }
  }
}
