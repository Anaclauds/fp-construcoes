import { escaparLike } from '../common/utils/like.util';
import {
  validarEntradaEstoque,
  validarQuantidadeUnidade,
} from '../common/utils/quantidade.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusCadastro,
  StatusProjeto,
  StatusReservaEstoque,
  TipoMovimentacaoEstoque,
} from '@prisma/client';
import { MateriaisService } from '../materiais/materiais.service';
import { PrismaService } from '../prisma/prisma.service';
import { AjustarEstoqueDto } from './dto/ajustar-estoque.dto';
import { CreateMaterialEstoqueDto } from './dto/create-material-estoque.dto';
import { ListEstoqueQueryDto } from './dto/list-estoque-query.dto';

@Injectable()
export class EstoqueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly materiaisService: MateriaisService,
  ) {}

  createMaterial(dto: CreateMaterialEstoqueDto, usuarioId: number) {
    return this.materiaisService.createFromEstoque(dto, usuarioId);
  }

  async findAll(query: ListEstoqueQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.MaterialWhereInput = {
      status: StatusCadastro.ATIVO,
      categoria: query.categoria,
      OR: query.busca
        ? [
            { nome: { contains: escaparLike(query.busca) } },
            { codigo: { contains: escaparLike(query.busca) } },
            { categoria: { contains: escaparLike(query.busca) } },
          ]
        : undefined,
    };
    const [materiais, total, comReservaAtiva, disponiveis, semSaldo] =
      await this.prisma.$transaction([
        this.prisma.material.findMany({
          where,
          orderBy: [{ nome: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
          include: {
            estoque: true,
            reservas: {
              where: { status: StatusReservaEstoque.ATIVA },
              select: { projetoId: true },
            },
          },
        }),
        this.prisma.material.count({ where }),
        this.prisma.material.count({
          where: {
            ...where,
            estoque: { is: { quantidadeReservada: { gt: 0 } } },
          },
        }),
        this.prisma.estoqueMaterial.count({
          where: {
            material: where,
            quantidadeAtual: {
              gt: this.prisma.estoqueMaterial.fields.quantidadeReservada,
            },
          },
        }),
        this.prisma.material.count({
          where: {
            AND: [
              where,
              {
                OR: [
                  { estoque: { is: null } },
                  { estoque: { is: { quantidadeAtual: { lte: 0 } } } },
                ],
              },
            ],
          },
        }),
      ]);
    const data = materiais.map((material) => this.toEstoqueItem(material));

    return {
      indicadores: {
        materiaisCadastrados: total,
        comReservaAtiva,
        disponiveis,
        semReserva: total - comReservaAtiva,
        semSaldo,
      },
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(materialId: number) {
    const [compras, baixas] = await this.prisma.$transaction([
      this.prisma.movimentacaoEstoque.findMany({
        where: { materialId, tipo: 'ENTRADA_COMPRA' },
        orderBy: [{ dataHora: 'desc' }, { id: 'desc' }],
        take: 5,
        select: { id: true },
      }),
      this.prisma.movimentacaoEstoque.findMany({
        where: { materialId, tipo: 'BAIXA_PROJETO' },
        orderBy: [{ dataHora: 'desc' }, { id: 'desc' }],
        take: 5,
        select: { id: true },
      }),
    ]);
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      include: {
        estoque: true,
        fornecedorPreferencial: {
          select: { id: true, nomeFantasia: true, razaoSocial: true },
        },
        reservas: {
          where: { status: StatusReservaEstoque.ATIVA },
          orderBy: { criadaEm: 'desc' },
          include: {
            projeto: {
              include: {
                orcamento: {
                  select: {
                    id: true,
                    numero: true,
                    titulo: true,
                    cliente: { select: { id: true, nome: true } },
                  },
                },
              },
            },
          },
        },
        movimentacoes: {
          where: {
            id: { in: [...compras, ...baixas].map((item) => item.id) },
            tipo: {
              in: [
                TipoMovimentacaoEstoque.ENTRADA_COMPRA,
                TipoMovimentacaoEstoque.BAIXA_PROJETO,
              ],
            },
          },
          orderBy: [{ dataHora: 'desc' }, { id: 'desc' }],
          take: 10,
          include: {
            despesaMaterial: {
              select: {
                valorTotal: true,
                valorUnitario: true,
                despesa: { select: { data: true } },
              },
            },
            reservaEstoque: {
              select: {
                projeto: {
                  select: { orcamento: { select: { titulo: true } } },
                },
              },
            },
            registradoPorUsuario: {
              select: {
                id: true,
                funcionario: { select: { nomeCompleto: true } },
              },
            },
          },
        },
      },
    });
    if (!material) {
      throw new NotFoundException({
        codigo: 'ESTOQUE_FINDONE_NOTFOUND_01',
        message: 'Material nao encontrado',
      });
    }

    const { estoque, reservas, movimentacoes, ...dadosMaterial } = material;
    return {
      ...dadosMaterial,
      saldo: this.toSaldo(estoque),
      projetosUtilizando: reservas.map((reserva) => ({
        reservaId: reserva.id,
        projetoId: reserva.projetoId,
        projeto: reserva.projeto.orcamento.titulo,
        numeroOrcamento: reserva.projeto.orcamento.numero,
        cliente: reserva.projeto.orcamento.cliente.nome,
        quantidade: reserva.quantidade,
        criadaEm: reserva.criadaEm,
      })),
      ultimasCompras: movimentacoes
        .filter((item) => item.tipo === TipoMovimentacaoEstoque.ENTRADA_COMPRA)
        .slice(0, 5),
      ultimasBaixas: movimentacoes
        .filter((item) => item.tipo === TipoMovimentacaoEstoque.BAIXA_PROJETO)
        .slice(0, 5)
        .map((item) => ({
          ...item,
          projeto: item.reservaEstoque?.projeto.orcamento.titulo ?? null,
        })),
    };
  }

  async ajustar(materialId: number, dto: AjustarEstoqueDto, usuarioId: number) {
    if (!dto.justificativa.trim())
      throw new BadRequestException({
        codigo: 'ESTOQUE_AJUSTAR_BADREQUEST_01',
        message: 'Informe uma justificativa para o ajuste',
      });
    await this.prisma.$transaction(async (tx) => {
      const material = await tx.material.findFirst({
        where: { id: materialId, status: StatusCadastro.ATIVO },
      });
      if (!material) {
        throw new NotFoundException({
          codigo: 'MATERIAL_INATIVO',
          message: 'Material ativo nao encontrado',
        });
      }
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
      const estoque = await tx.estoqueMaterial.findUniqueOrThrow({
        where: { materialId },
      });
      const quantidade = this.decimal(dto.quantidade);
      validarQuantidadeUnidade(material.unidadeMedida, quantidade);
      const disponivel = this.decimal(estoque.quantidadeAtual).minus(
        estoque.quantidadeReservada,
      );
      if (
        dto.tipo === TipoMovimentacaoEstoque.AJUSTE_SAIDA &&
        quantidade.greaterThan(disponivel)
      ) {
        throw new BadRequestException({
          codigo: 'ESTOQUE_SAIDA_ACIMA_DO_DISPONIVEL',
          detalhes: { maximo: Number(disponivel) },
          message: `Quantidade maxima para saida: ${disponivel.toFixed(3)}`,
        });
      }

      if (dto.tipo === TipoMovimentacaoEstoque.AJUSTE_ENTRADA) {
        validarEntradaEstoque(materialId, estoque.quantidadeAtual, quantidade);
        await tx.estoqueMaterial.update({
          where: { materialId },
          data: {
            quantidadeAtual: { increment: quantidade },
            atualizadoEm: new Date(),
          },
        });
      } else {
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
            message:
              'O saldo disponivel foi alterado. Consulte o estoque e tente novamente',
          });
        }
      }
      await tx.movimentacaoEstoque.create({
        data: {
          materialId,
          tipo: dto.tipo,
          quantidade,
          justificativa: dto.justificativa.trim(),
          registradoPorUsuarioId: usuarioId,
        },
      });
    });

    return this.findOne(materialId);
  }

  async reservarOrcamento(
    tx: Prisma.TransactionClient,
    projetoId: number,
    orcamentoId: number,
    usuarioId: number,
  ) {
    const itens = await tx.orcamentoMaterial.findMany({
      where: { orcamentoId },
      include: { material: { include: { estoque: true } } },
    });

    for (const item of itens) {
      validarQuantidadeUnidade(item.material.unidadeMedida, item.quantidade);
      await this.reservarItem(tx, {
        projetoId,
        materialId: item.materialId,
        nomeMaterial: item.material.nome,
        quantidade: item.quantidade,
        orcamentoMaterialId: item.id,
        estoque: item.material.estoque,
        usuarioId,
      });
    }
  }

  async reservarExtra(
    tx: Prisma.TransactionClient,
    projetoId: number,
    extraId: number,
    usuarioId: number,
  ) {
    const itens = await tx.extraMaterial.findMany({
      where: { extraId },
      include: { material: { include: { estoque: true } } },
    });

    for (const item of itens) {
      validarQuantidadeUnidade(item.material.unidadeMedida, item.quantidade);
      await this.reservarItem(tx, {
        projetoId,
        materialId: item.materialId,
        nomeMaterial: item.material.nome,
        quantidade: item.quantidade,
        extraMaterialId: item.id,
        estoque: item.material.estoque,
        usuarioId,
      });
    }
  }

  async finalizarReservasProjeto(
    tx: Prisma.TransactionClient,
    projetoId: number,
    statusProjeto: StatusProjeto,
    usuarioId: number,
  ) {
    const reservas = await tx.reservaEstoque.findMany({
      where: { projetoId, status: StatusReservaEstoque.ATIVA },
    });
    const concluido = statusProjeto === StatusProjeto.CONCLUIDO;

    for (const reserva of reservas) {
      await tx.estoqueMaterial.update({
        where: { materialId: reserva.materialId },
        data: {
          quantidadeAtual: concluido
            ? { decrement: reserva.quantidade }
            : undefined,
          quantidadeReservada: { decrement: reserva.quantidade },
          atualizadoEm: new Date(),
        },
      });
      await tx.reservaEstoque.update({
        where: { id: reserva.id },
        data: {
          status: concluido
            ? StatusReservaEstoque.CONSUMIDA
            : StatusReservaEstoque.CANCELADA,
        },
      });
      await tx.movimentacaoEstoque.create({
        data: {
          materialId: reserva.materialId,
          tipo: concluido
            ? TipoMovimentacaoEstoque.BAIXA_PROJETO
            : TipoMovimentacaoEstoque.LIBERACAO_RESERVA,
          quantidade: reserva.quantidade,
          justificativa: concluido
            ? `Consumo na conclusao do projeto ${projetoId}`
            : `Liberacao pelo cancelamento do projeto ${projetoId}`,
          reservaEstoqueId: reserva.id,
          registradoPorUsuarioId: usuarioId,
        },
      });
    }
  }

  private async reservarItem(
    tx: Prisma.TransactionClient,
    item: {
      projetoId: number;
      materialId: number;
      nomeMaterial: string;
      quantidade: Prisma.Decimal;
      orcamentoMaterialId?: number;
      extraMaterialId?: number;
      estoque: {
        quantidadeAtual: Prisma.Decimal;
        quantidadeReservada: Prisma.Decimal;
      } | null;
      usuarioId: number;
    },
  ) {
    const atual = this.decimal(item.estoque?.quantidadeAtual ?? 0);
    const reservado = this.decimal(item.estoque?.quantidadeReservada ?? 0);
    const disponivel = atual.minus(reservado);
    if (item.quantidade.greaterThan(disponivel)) {
      throw new BadRequestException({
        codigo: 'ESTOQUE_INSUFICIENTE',
        detalhes: {
          materiais: [
            {
              id: item.materialId,
              nome: item.nomeMaterial,
              necessario: Number(item.quantidade),
              disponivel: Number(disponivel),
            },
          ],
        },
        message: `Estoque insuficiente para ${item.nomeMaterial}. Disponivel: ${disponivel.toFixed(3)}`,
      });
    }
    const reserva = await tx.reservaEstoque.create({
      data: {
        projetoId: item.projetoId,
        materialId: item.materialId,
        orcamentoMaterialId: item.orcamentoMaterialId,
        extraMaterialId: item.extraMaterialId,
        quantidade: item.quantidade,
      },
    });
    const alterados = await tx.$executeRaw`
      UPDATE estoque_material
      SET quantidade_reservada = quantidade_reservada + ${item.quantidade},
          atualizado_em = ${new Date()}
      WHERE material_id = ${item.materialId}
        AND quantidade_atual - quantidade_reservada >= ${item.quantidade}
    `;
    if (alterados !== 1) {
      throw new ConflictException({
        codigo: 'ESTOQUE_SALDO_ALTERADO',
        message: `O saldo de ${item.nomeMaterial} foi alterado. Consulte o estoque e tente novamente`,
      });
    }
    await tx.movimentacaoEstoque.create({
      data: {
        materialId: item.materialId,
        tipo: TipoMovimentacaoEstoque.RESERVA,
        quantidade: item.quantidade,
        justificativa: `Reserva para o projeto ${item.projetoId}`,
        reservaEstoqueId: reserva.id,
        registradoPorUsuarioId: item.usuarioId,
      },
    });
  }

  private toEstoqueItem(material: {
    id: number;
    codigo: string;
    nome: string;
    categoria: string;
    unidadeMedida: string;
    estoque: {
      quantidadeAtual: Prisma.Decimal;
      quantidadeReservada: Prisma.Decimal;
      atualizadoEm: Date;
    } | null;
    reservas: Array<{ projetoId: number }>;
  }) {
    return {
      id: material.id,
      codigo: material.codigo,
      nome: material.nome,
      categoria: material.categoria,
      unidadeMedida: material.unidadeMedida,
      ...this.toSaldo(material.estoque),
      projetosComReserva: new Set(
        material.reservas.map((reserva) => reserva.projetoId),
      ).size,
    };
  }

  private toSaldo(
    estoque: {
      quantidadeAtual: Prisma.Decimal;
      quantidadeReservada: Prisma.Decimal;
      atualizadoEm: Date;
    } | null,
  ) {
    const quantidadeAtual = this.decimal(estoque?.quantidadeAtual ?? 0);
    const quantidadeReservada = this.decimal(estoque?.quantidadeReservada ?? 0);
    return {
      quantidadeAtual,
      quantidadeReservada,
      quantidadeDisponivel: quantidadeAtual.minus(quantidadeReservada),
      atualizadoEm: estoque?.atualizadoEm ?? null,
    };
  }

  private decimal(value: Prisma.Decimal.Value) {
    return new Prisma.Decimal(value).toDecimalPlaces(3);
  }
}
