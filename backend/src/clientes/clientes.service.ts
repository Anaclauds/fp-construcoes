import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCadastro, TipoCliente } from '@prisma/client';
import { EnderecosService } from '../enderecos/enderecos.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { ListClientesQueryDto } from './dto/list-clientes-query.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

type ClienteData = {
  nome?: string | null;
  telefone: string;
  cidade?: string | null;
  estado?: string | null;
  tipo?: TipoCliente | null;
  cpfCnpj?: string | null;
  email?: string | null;
  apelido?: string | null;
  dataNascimento?: string | Date | null;
  sexo?: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  responsavel?: string | null;
  cargoResponsavel?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  complemento?: string | null;
  status?: StatusCadastro;
};

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enderecosService: EnderecosService,
  ) {}

  private readonly clienteSelect = {
    id: true,
    nome: true,
    telefone: true,
    cidade: true,
    estado: true,
    tipo: true,
    cpfCnpj: true,
    email: true,
    apelido: true,
    dataNascimento: true,
    sexo: true,
    razaoSocial: true,
    nomeFantasia: true,
    responsavel: true,
    cargoResponsavel: true,
    cep: true,
    rua: true,
    numero: true,
    bairro: true,
    complemento: true,
    cadastroCompleto: true,
    status: true,
  };

  async create(createClienteDto: CreateClienteDto) {
    const clienteComEndereco =
      await this.preencherEnderecoPorCep(createClienteDto);

    this.validateCliente(clienteComEndereco);
    const data = this.toPrismaData(clienteComEndereco);

    if (data.cpfCnpj) {
      await this.ensureCpfCnpjDisponivel(data.cpfCnpj);
    }

    return this.prisma.cliente.create({
      data,
      select: this.clienteSelect,
    });
  }

  async findAll(query: ListClientesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const buscaDigits = query.busca ? this.onlyDigits(query.busca) : undefined;
    const where: Prisma.ClienteWhereInput = {
      tipo: query.tipo,
      status: query.status,
      cadastroCompleto: query.cadastroCompleto,
      OR: query.busca
        ? [
            { nome: { contains: query.busca } },
            { razaoSocial: { contains: query.busca } },
            { nomeFantasia: { contains: query.busca } },
            { responsavel: { contains: query.busca } },
            { cpfCnpj: { contains: buscaDigits || query.busca } },
            { telefone: { contains: buscaDigits || query.busca } },
            { cidade: { contains: query.busca } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.cliente.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: this.clienteSelect,
      }),
      this.prisma.cliente.count({ where }),
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
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: this.clienteSelect,
    });

    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    return cliente;
  }

  async update(id: number, updateClienteDto: UpdateClienteDto) {
    const clienteAtual = await this.findOne(id);
    const cepFoiAlterado = Boolean(
      updateClienteDto.cep &&
      this.onlyDigits(updateClienteDto.cep) !== clienteAtual.cep,
    );
    const mergedCliente: ClienteData = {
      ...clienteAtual,
      ...updateClienteDto,
      ...(cepFoiAlterado
        ? {
            rua: updateClienteDto.rua,
            bairro: updateClienteDto.bairro,
            cidade: updateClienteDto.cidade,
            estado: updateClienteDto.estado,
          }
        : {}),
    };
    const clienteComEndereco =
      await this.preencherEnderecoPorCep(mergedCliente);

    this.validateCliente(clienteComEndereco);
    const data = this.toPrismaData(clienteComEndereco);

    if (data.cpfCnpj) {
      await this.ensureCpfCnpjDisponivel(data.cpfCnpj, id);
    }

    return this.prisma.cliente.update({
      where: { id },
      data,
      select: this.clienteSelect,
    });
  }

  async desativar(id: number) {
    await this.findOne(id);

    return this.prisma.cliente.update({
      where: { id },
      data: { status: StatusCadastro.INATIVO },
      select: this.clienteSelect,
    });
  }

  async reativar(id: number) {
    await this.findOne(id);

    return this.prisma.cliente.update({
      where: { id },
      data: { status: StatusCadastro.ATIVO },
      select: this.clienteSelect,
    });
  }

  private async ensureCpfCnpjDisponivel(cpfCnpj: string, ignoreId?: number) {
    const clienteExistente = await this.prisma.cliente.findFirst({
      where: {
        cpfCnpj,
        id: ignoreId ? { not: ignoreId } : undefined,
      },
    });

    if (clienteExistente) {
      throw new ConflictException('CPF/CNPJ ja cadastrado para outro cliente');
    }
  }

  private validateCliente(dto: ClienteData) {
    const nomePrincipal = dto.nome || dto.razaoSocial || dto.nomeFantasia;

    if (!nomePrincipal) {
      throw new BadRequestException(
        'Informe o nome do cliente ou a razao social',
      );
    }

    if (!dto.cidade || !dto.estado) {
      throw new BadRequestException(
        'Informe cidade e estado ou utilize um CEP válido para preenchimento automático',
      );
    }

    if (!dto.tipo) {
      return;
    }

    const camposComuns: Array<[string, unknown]> = [
      ['cpfCnpj', dto.cpfCnpj],
      ['cep', dto.cep],
      ['rua', dto.rua],
      ['numero', dto.numero],
      ['bairro', dto.bairro],
    ];
    const camposPorTipo: Array<[string, unknown]> =
      dto.tipo === TipoCliente.PF
        ? [
            ['dataNascimento', dto.dataNascimento],
            ['sexo', dto.sexo],
          ]
        : [
            ['razaoSocial', dto.razaoSocial],
            ['nomeFantasia', dto.nomeFantasia],
            ['responsavel', dto.responsavel],
            ['cargoResponsavel', dto.cargoResponsavel],
          ];
    const campoFaltando = [...camposComuns, ...camposPorTipo].find(
      ([, value]) => !value,
    );

    if (campoFaltando) {
      throw new BadRequestException(
        `Campo obrigatorio para cliente ${dto.tipo}: ${campoFaltando[0]}`,
      );
    }
  }

  private toPrismaData(dto: ClienteData): Prisma.ClienteUncheckedCreateInput {
    const nome = dto.nome || dto.razaoSocial || dto.nomeFantasia;
    const cadastroCompleto = this.isCadastroCompleto(dto);

    if (!nome) {
      throw new BadRequestException(
        'Informe o nome do cliente ou a razao social',
      );
    }

    if (!dto.cidade || !dto.estado) {
      throw new BadRequestException('Cidade e estado são obrigatórios');
    }

    return {
      nome,
      telefone: this.onlyDigits(dto.telefone),
      cidade: dto.cidade,
      estado: dto.estado?.toUpperCase(),
      tipo: dto.tipo,
      cpfCnpj: dto.cpfCnpj ? this.onlyDigits(dto.cpfCnpj) : undefined,
      email: dto.email,
      apelido: dto.tipo === TipoCliente.PF ? dto.apelido : undefined,
      dataNascimento:
        dto.tipo === TipoCliente.PF && dto.dataNascimento
          ? this.parseDate(dto.dataNascimento)
          : undefined,
      sexo: dto.tipo === TipoCliente.PF ? dto.sexo : undefined,
      razaoSocial: dto.tipo === TipoCliente.PJ ? dto.razaoSocial : undefined,
      nomeFantasia: dto.tipo === TipoCliente.PJ ? dto.nomeFantasia : undefined,
      responsavel: dto.tipo === TipoCliente.PJ ? dto.responsavel : undefined,
      cargoResponsavel:
        dto.tipo === TipoCliente.PJ ? dto.cargoResponsavel : undefined,
      cep: dto.cep ? this.onlyDigits(dto.cep) : undefined,
      rua: dto.rua,
      numero: dto.numero,
      bairro: dto.bairro,
      complemento: dto.complemento,
      cadastroCompleto,
      status: dto.status,
    } as Prisma.ClienteUncheckedCreateInput;
  }

  private isCadastroCompleto(dto: ClienteData) {
    if (
      !dto.tipo ||
      !dto.cpfCnpj ||
      !dto.cep ||
      !dto.rua ||
      !dto.numero ||
      !dto.bairro
    ) {
      return false;
    }

    if (dto.tipo === TipoCliente.PF) {
      return Boolean(dto.dataNascimento && dto.sexo);
    }

    return Boolean(
      dto.razaoSocial &&
      dto.nomeFantasia &&
      dto.responsavel &&
      dto.cargoResponsavel,
    );
  }

  private async preencherEnderecoPorCep(
    dto: ClienteData,
  ): Promise<ClienteData> {
    if (!dto.cep || (dto.rua && dto.bairro && dto.cidade && dto.estado)) {
      return dto;
    }

    const endereco = await this.enderecosService.buscarPorCep(dto.cep);

    return {
      ...dto,
      cep: endereco.cep,
      rua: dto.rua || endereco.logradouro,
      bairro: dto.bairro || endereco.bairro,
      cidade: dto.cidade || endereco.cidade,
      estado: dto.estado || endereco.estado,
    };
  }

  private onlyDigits(value?: string) {
    return value?.replace(/\D/g, '');
  }

  private parseDate(value: string | Date) {
    if (value instanceof Date) {
      return value;
    }

    return new Date(`${value}T00:00:00.000Z`);
  }
}
