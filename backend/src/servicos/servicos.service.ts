import { escaparLike } from '../common/utils/like.util';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, StatusCadastro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServicoDto } from './dto/create-servico.dto';
import { ListServicosQueryDto } from './dto/list-servicos-query.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServicoDto) {
    await this.validarNome(dto.nome.trim(), dto.categoria);
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
      status:
        query.status === 'TODOS'
          ? undefined
          : (query.status ?? StatusCadastro.ATIVO),
      OR: query.busca
        ? [
            { nome: { contains: escaparLike(query.busca) } },
            { descricao: { contains: escaparLike(query.busca) } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.servico.findMany({
        where,
        orderBy: [{ categoria: 'asc' }, { nome: 'asc' }, { id: 'asc' }],
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
      throw new NotFoundException({
        codigo: 'SERVICOS_FINDONE_NOTFOUND_01',
        message: 'Servico nao encontrado',
      });
    }
    return servico;
  }

  async update(id: number, dto: UpdateServicoDto) {
    const atual = await this.findOne(id);
    if (
      dto.categoria &&
      dto.categoria !== atual.categoria &&
      ((await this.prisma.orcamentoServico.count({
        where: { servicoId: id },
      })) ||
        (await this.prisma.etapaServico.count({ where: { servicoId: id } })) ||
        (await this.prisma.extraServico.count({ where: { servicoId: id } })))
    )
      throw new ConflictException({
        codigo: 'SERVICOS_UPDATE_CONFLICT_01',
        message: 'Servico ja utilizado: a categoria nao pode ser alterada',
      });
    if (
      dto.nome === null ||
      dto.categoria === null ||
      dto.valorReferencia === null ||
      dto.unidadeMedida === null
    )
      throw new BadRequestException({
        codigo: 'SERVICOS_UPDATE_BADREQUEST_01',
        message: 'Campos obrigatorios do servico nao podem ser nulos',
      });
    if (atual.status === 'ATIVO')
      await this.validarNome(
        dto.nome?.trim() ?? atual.nome,
        dto.categoria ?? atual.categoria,
        id,
      );
    return this.prisma.servico.update({
      where: { id },
      data: {
        nome: dto.nome?.trim(),
        categoria: dto.categoria,
        descricao:
          dto.descricao === undefined
            ? undefined
            : dto.descricao?.trim() || null,
        valorReferencia:
          dto.valorReferencia === undefined
            ? undefined
            : new Prisma.Decimal(dto.valorReferencia),
        unidadeMedida: dto.unidadeMedida?.trim(),
      },
    });
  }

  async updateStatus(id: number, status: StatusCadastro) {
    const atual = await this.findOne(id);
    if (status === 'ATIVO')
      await this.validarNome(atual.nome, atual.categoria, id);
    return this.prisma.servico.update({ where: { id }, data: { status } });
  }

  private async validarNome(
    nome: string,
    categoria: CreateServicoDto['categoria'],
    id?: number,
  ) {
    if (
      await this.prisma.servico.findFirst({
        where: {
          nome,
          categoria,
          status: 'ATIVO',
          id: id === undefined ? undefined : { not: id },
        },
      })
    )
      throw new ConflictException({
        codigo: 'SERVICOS_VALIDARNOME_CONFLICT_01',
        message: 'Ja existe servico ativo com este nome nesta categoria',
      });
  }
}
