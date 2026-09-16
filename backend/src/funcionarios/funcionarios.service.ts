import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCadastro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFuncionarioDto } from './dto/create-funcionario.dto';
import { ListFuncionariosQueryDto } from './dto/list-funcionarios-query.dto';
import { UpdateFuncionarioDto } from './dto/update-funcionario.dto';

@Injectable()
export class FuncionariosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly funcionarioSelect = {
    id: true,
    nomeCompleto: true,
    apelido: true,
    cpf: true,
    dataNascimento: true,
    sexo: true,
    celular: true,
    cep: true,
    cidade: true,
    estado: true,
    rua: true,
    numero: true,
    bairro: true,
    complemento: true,
    funcao: true,
    setorAtuacao: true,
    salario: true,
    tipoContrato: true,
    dataContratacao: true,
    contatoEmergencia: true,
    nomeContatoEmergencia: true,
    grauVinculo: true,
    status: true,
    usuario: {
      select: {
        id: true,
        login: true,
        status: true,
      },
    },
  };

  async create(createFuncionarioDto: CreateFuncionarioDto) {
    const data = this.toPrismaData(createFuncionarioDto);

    const funcionarioExistente = await this.prisma.funcionario.findUnique({
      where: { cpf: data.cpf },
    });

    if (funcionarioExistente) {
      throw new ConflictException('CPF ja cadastrado para outro funcionario');
    }

    return this.prisma.funcionario.create({
      data,
      select: this.funcionarioSelect,
    });
  }

  async findAll(query: ListFuncionariosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.FuncionarioWhereInput = {
      status: query.status,
      OR: query.busca
        ? [
            { nomeCompleto: { contains: query.busca } },
            { apelido: { contains: query.busca } },
            { cpf: { contains: this.onlyDigits(query.busca) || query.busca } },
            { celular: { contains: query.busca } },
            { funcao: { contains: query.busca } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.funcionario.findMany({
        where,
        orderBy: { nomeCompleto: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: this.funcionarioSelect,
      }),
      this.prisma.funcionario.count({ where }),
    ]);

    return {
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
    const funcionario = await this.prisma.funcionario.findUnique({
      where: { id },
      select: this.funcionarioSelect,
    });

    if (!funcionario) {
      throw new NotFoundException('Funcionario nao encontrado');
    }

    return funcionario;
  }

  async update(id: number, updateFuncionarioDto: UpdateFuncionarioDto) {
    await this.findOne(id);
    const data = this.toPrismaData(updateFuncionarioDto);

    if (data.cpf) {
      const funcionarioExistente = await this.prisma.funcionario.findFirst({
        where: {
          cpf: data.cpf,
          id: { not: id },
        },
      });

      if (funcionarioExistente) {
        throw new ConflictException('CPF ja cadastrado para outro funcionario');
      }
    }

    return this.prisma.funcionario.update({
      where: { id },
      data,
      select: this.funcionarioSelect,
    });
  }

  async desativar(id: number) {
    await this.findOne(id);

    return this.prisma.funcionario.update({
      where: { id },
      data: { status: StatusCadastro.INATIVO },
      select: this.funcionarioSelect,
    });
  }

  async reativar(id: number) {
    await this.findOne(id);

    return this.prisma.funcionario.update({
      where: { id },
      data: { status: StatusCadastro.ATIVO },
      select: this.funcionarioSelect,
    });
  }

  private toPrismaData(
    dto: CreateFuncionarioDto | UpdateFuncionarioDto,
  ): Prisma.FuncionarioUncheckedCreateInput {
    return {
      ...dto,
      cpf: dto.cpf ? this.onlyDigits(dto.cpf) : undefined,
      celular: dto.celular ? this.onlyDigits(dto.celular) : undefined,
      cep: dto.cep ? this.onlyDigits(dto.cep) : undefined,
      estado: dto.estado?.toUpperCase(),
      salario: dto.salario,
      contatoEmergencia: dto.contatoEmergencia
        ? this.onlyDigits(dto.contatoEmergencia)
        : undefined,
      dataNascimento: dto.dataNascimento
        ? this.parseDate(dto.dataNascimento)
        : undefined,
      dataContratacao: dto.dataContratacao
        ? this.parseDate(dto.dataContratacao)
        : undefined,
    } as Prisma.FuncionarioUncheckedCreateInput;
  }

  private onlyDigits(value: string) {
    return value.replace(/\D/g, '');
  }

  private parseDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
