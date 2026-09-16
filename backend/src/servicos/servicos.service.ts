import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusCadastro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServicoDto } from './dto/create-servico.dto';
import { ListServicosQueryDto } from './dto/list-servicos-query.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateServicoDto) {
    return this.prisma.servico.create({
      data: {
        nome: dto.nome.trim(),
        categoria: dto.categoria,
        descricao: dto.descricao?.trim() || null,
        valorReferencia: new Prisma.Decimal(dto.valorReferencia),
        unidadeMedida: dto.unidadeMedida.trim(),
      },
    });
  }

  async findAll(query: ListServicosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.ServicoWhereInput = {
      categoria: query.categoria,
      status: query.status ?? StatusCadastro.ATIVO,
      OR: query.busca
        ? [
            { nome: { contains: query.busca } },
            { descricao: { contains: query.busca } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.servico.findMany({
        where,
        orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.servico.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const servico = await this.prisma.servico.findUnique({ where: { id } });
    if (!servico) {
      throw new NotFoundException('Servico nao encontrado');
    }
    return servico;
  }

  async update(id: number, dto: UpdateServicoDto) {
    await this.findOne(id);
    return this.prisma.servico.update({
      where: { id },
      data: {
        nome: dto.nome?.trim(),
        categoria: dto.categoria,
        descricao:
          dto.descricao === undefined
            ? undefined
            : dto.descricao.trim() || null,
        valorReferencia:
          dto.valorReferencia === undefined
            ? undefined
            : new Prisma.Decimal(dto.valorReferencia),
        unidadeMedida: dto.unidadeMedida?.trim(),
      },
    });
  }

  async updateStatus(id: number, status: StatusCadastro) {
    await this.findOne(id);
    return this.prisma.servico.update({ where: { id }, data: { status } });
  }
}
