import { resumosSql, mapearResumo, ResumoSql } from './resumos.sql';
import {
  parseDateOnly,
  hojeNoFusoDoNegocio,
  somarMesesLimitandoDia,
} from '../common/utils/date.util';
import { caixaParaLancamento } from '../common/utils/caixa.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FormaPagamento,
  ModalidadeCobranca,
  Prisma,
  StatusCobranca,
  StatusParcela,
  StatusProjeto,
  TipoMovimentacaoCaixa,
} from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { CobrancaPersistenciaInput } from './dto/cobranca-persistencia.input';
import { CreateCobrancaDto } from './dto/create-cobranca.dto';
import { ListCobrancasQueryDto } from './dto/list-cobrancas-query.dto';
import { ParcelaManualDto } from './dto/parcela-manual.dto';
import { RegistrarRecebimentoDto } from './dto/registrar-recebimento.dto';

@Injectable()
export class CobrancasService {
  simularParcelas(dto: CobrancaPersistenciaInput) {
    const parcelas = this.buildParcelas(dto);
    return {
      subtotal: new Prisma.Decimal(dto.valorTotal)
        .plus(dto.desconto ?? 0)
        .minus(dto.acrescimo ?? 0),
      desconto: dto.desconto ?? 0,
      acrescimo: dto.acrescimo ?? 0,
      valorFinal: dto.valorTotal,
      parcelas,
    };
  }
  constructor(private readonly prisma: PrismaService) {}

  private readonly cobrancaInclude = {
    projeto: {
      include: {
        orcamento: {
          include: {
            cliente: {
              select: {
                id: true,
                nome: true,
                telefone: true,
                cidade: true,
                estado: true,
              },
            },
          },
        },
      },
    },
    etapa: true,
    parcelas: {
      orderBy: { numero: 'asc' as const },
      include: {
        recebimentos: {
          orderBy: [
            { dataRecebimento: 'asc' as const },
            { id: 'asc' as const },
          ],
          include: {
            registradoPorUsuario: {
              select: {
                id: true,
                login: true,
                funcionario: { select: { nomeCompleto: true } },
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.CobrancaInclude;

  async create(dto: CreateCobrancaDto) {
    const { valorBase, ...dados } = dto;
    const valores = this.calcularValores(
      valorBase,
      dto.percentualDesconto ?? 0,
      dto.percentualAcrescimo ?? 0,
      dto.formaPagamento,
    );
    return this.prisma.$transaction((tx) =>
      this.createInTransaction(tx, { ...dados, ...valores }),
    );
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    dto: CobrancaPersistenciaInput,
  ) {
    this.validarAcrescimo(dto.formaPagamento, dto.percentualAcrescimo ?? 0);
    await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${dto.projetoId} FOR UPDATE`;
    const projeto = await tx.projeto.findUnique({
      where: { id: dto.projetoId },
      include: { orcamento: true },
    });

    if (!projeto) {
      throw new NotFoundException({
        codigo: 'COBRANCAS_CREATEINTRANSACTION_NOTFOUND_01',
        message: 'Projeto nao encontrado',
      });
    }
    if (projeto.status === StatusProjeto.CANCELADO) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_CREATEINTRANSACTION_BADREQUEST_01',
        message: 'Projeto cancelado nao pode receber cobrancas',
      });
    }

    if (dto.etapaId) {
      const etapa = await tx.etapaProjeto.findFirst({
        where: { id: dto.etapaId, projetoId: dto.projetoId },
        include: { cobranca: true },
      });
      if (!etapa) {
        throw new NotFoundException({
          codigo: 'COBRANCAS_CREATEINTRANSACTION_NOTFOUND_02',
          message: 'Etapa nao encontrada neste projeto',
        });
      }
      if (etapa.cobranca) {
        throw new ConflictException({
          codigo: 'COBRANCAS_CREATEINTRANSACTION_CONFLICT_01',
          message: 'A etapa ja possui uma cobranca',
        });
      }
    }

    const parcelas = this.buildParcelas(dto);

    return tx.cobranca.create({
      data: {
        projetoId: dto.projetoId,
        etapaId: dto.etapaId,
        tipo: dto.tipo,
        modalidade: dto.modalidade,
        formaPagamento: dto.formaPagamento,
        percentualReferencia: dto.percentualReferencia,
        percentualDesconto: dto.percentualDesconto ?? 0,
        percentualAcrescimo: dto.percentualAcrescimo ?? 0,
        desconto: dto.desconto ?? 0,
        acrescimo: dto.acrescimo ?? 0,
        valorTotal: dto.valorTotal,
        parcelas: { create: parcelas },
      },
      include: this.cobrancaInclude,
    });
  }

  async findAll(query: ListCobrancasQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const base = resumosSql(query);
    const status = query.status
      ? Prisma.sql`WHERE status = ${query.status}`
      : Prisma.empty;
    const [data, totais, indicadores] = await this.prisma.$transaction([
      this.prisma.$queryRaw<ResumoSql[]>(
        Prisma.sql`${base} SELECT * FROM classificados ${status} ORDER BY projetoId DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      ),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`${base} SELECT COUNT(*) total FROM classificados ${status}`,
      ),
      this.prisma.$queryRaw<
        Array<{
          totalAReceber: Prisma.Decimal;
          totalRecebido: Prisma.Decimal;
          totalProjetos: bigint;
        }>
      >(
        Prisma.sql`${base} SELECT COALESCE(SUM(valorTotal),0) totalAReceber, COALESCE(SUM(valorRecebido),0) totalRecebido, COUNT(*) totalProjetos FROM classificados`,
      ),
    ]);
    const indicador = indicadores[0];
    const total = Number(totais[0].total);
    return {
      indicadores: {
        totalAReceber: Number(indicador.totalAReceber),
        totalRecebido: Number(indicador.totalRecebido),
        totalEmAberto: Number(
          new Prisma.Decimal(indicador.totalAReceber).minus(
            indicador.totalRecebido,
          ),
        ),
        totalProjetos: Number(indicador.totalProjetos),
      },
      data: data.map(mapearResumo),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async relatorio(query: ListCobrancasQueryDto) {
    const { filtrados } = await this.listarResumos(query);
    return {
      indicadores: this.calcularIndicadores(filtrados),
      data: filtrados,
      filtros: {
        tipo: query.tipo ?? null,
        status: query.status ?? null,
        clienteId: query.clienteId ?? null,
        dataInicio: query.dataInicio ?? null,
        dataFim: query.dataFim ?? null,
      },
    };
  }

  async exportarRelatorioExcel(query: ListCobrancasQueryDto) {
    const relatorio = await this.relatorio(query);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FP Construcoes';
    const sheet = workbook.addWorksheet('Cobrancas');
    sheet.columns = [
      { header: 'Projeto', key: 'numero', width: 14 },
      { header: 'Titulo', key: 'titulo', width: 34 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Tipo', key: 'tipo', width: 20 },
      { header: 'Valor total', key: 'valorTotal', width: 16 },
      { header: 'Recebido', key: 'valorRecebido', width: 16 },
      { header: 'Em aberto', key: 'valorRestante', width: 16 },
      { header: 'Status', key: 'status', width: 16 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF216B4E' },
    };
    for (const item of relatorio.data) {
      sheet.addRow({
        ...item,
        cliente: item.cliente.nome,
        tipo: this.rotuloRelatorio(item.tipo),
        status: this.rotuloRelatorio(item.status),
      });
    }
    for (const column of ['E', 'F', 'G']) {
      sheet.getColumn(column).numFmt = 'R$ #,##0.00';
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportarRelatorioPdf(query: ListCobrancasQueryDto) {
    const relatorio = await this.relatorio(query);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).fillColor('#216b4e').text('Relatorio de cobrancas');
      doc
        .moveDown(0.4)
        .fontSize(9)
        .fillColor('#444444')
        .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
      doc.moveDown();

      for (const item of relatorio.data) {
        if (doc.y > 750) {
          doc.addPage();
        }
        doc
          .fontSize(10)
          .fillColor('#111111')
          .text(`#${item.numero} - ${item.titulo}`, { continued: false });
        doc
          .fontSize(8)
          .fillColor('#555555')
          .text(
            `${item.cliente.nome} | ${this.rotuloRelatorio(item.tipo)} | ${this.rotuloRelatorio(item.status)} | Total: ${this.moeda(item.valorTotal)} | Recebido: ${this.moeda(item.valorRecebido)} | Aberto: ${this.moeda(item.valorRestante)}`,
          );
        doc.moveDown(0.6);
      }

      doc
        .moveDown()
        .fontSize(10)
        .fillColor('#216b4e')
        .text(
          `Total: ${this.moeda(relatorio.indicadores.totalAReceber)} | Recebido: ${this.moeda(relatorio.indicadores.totalRecebido)} | Em aberto: ${this.moeda(relatorio.indicadores.totalEmAberto)}`,
        );
      doc.end();
    });
  }

  private async listarResumos(query: ListCobrancasQueryDto) {
    const dataInicio = query.dataInicio
      ? this.parseDate(query.dataInicio)
      : undefined;
    const dataFim = query.dataFim ? this.endOfDay(query.dataFim) : undefined;
    if (dataInicio && dataFim && dataInicio > dataFim) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_LISTARRESUMOS_BADREQUEST_01',
        message: 'A data inicial nao pode ser posterior a data final',
      });
    }
    const registros = await this.prisma.$queryRaw<ResumoSql[]>(
      Prisma.sql`${resumosSql(query)} SELECT * FROM classificados ORDER BY projetoId DESC`,
    );
    const todos = registros.map(mapearResumo);
    const filtrados = todos.filter(
      (item) => !query.status || item.status === query.status,
    );
    return { todos, filtrados };
  }

  private calcularIndicadores(
    itens: Array<{ valorTotal: number; valorRecebido: number }>,
  ) {
    const totalAReceber = itens.reduce(
      (total, item) => total + this.toCents(item.valorTotal),
      0,
    );
    const totalRecebido = itens.reduce(
      (total, item) => total + this.toCents(item.valorRecebido),
      0,
    );

    return {
      totalAReceber: this.fromCents(totalAReceber),
      totalEmAberto: this.fromCents(totalAReceber - totalRecebido),
      totalRecebido: this.fromCents(totalRecebido),
      totalProjetos: itens.length,
    };
  }

  private rotuloRelatorio(valor: string) {
    const rotulos: Record<string, string> = {
      CONSTRUCAO_CIVIL: 'Constru\u00e7\u00e3o civil',
      SERRALHERIA: 'Serralheria',
      CALHAS_RUFOS: 'Calhas e rufos',
      EM_ABERTO: 'Em aberto',
      PARCIAL: 'Parcial',
      PAGO: 'Pago',
      CANCELADO: 'Cancelado',
    };
    return rotulos[valor] ?? valor.replaceAll('_', ' ');
  }

  async findProjeto(projetoId: number) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: projetoId },
      include: {
        orcamento: { include: { cliente: true } },
        cobrancas: {
          orderBy: { criadaEm: 'asc' },
          include: {
            etapa: true,
            parcelas: {
              orderBy: { numero: 'asc' },
              include: { recebimentos: true },
            },
          },
        },
      },
    });

    if (!projeto) {
      throw new NotFoundException({
        codigo: 'COBRANCAS_FINDPROJETO_NOTFOUND_01',
        message: 'Projeto nao encontrado',
      });
    }

    return {
      ...this.toProjetoResumo(projeto),
      cobrancas: projeto.cobrancas.map((cobranca, index) => ({
        ...cobranca,
        descricao:
          cobranca.etapa?.descricao ??
          `${this.tipoLabel(cobranca.tipo)} ${index + 1}`,
        valorRecebido: this.fromCents(this.recebidoCobranca(cobranca)),
        valorRestante: this.fromCents(
          cobranca.status === StatusCobranca.CANCELADO
            ? 0
            : this.toCents(cobranca.valorTotal) -
                this.recebidoCobranca(cobranca),
        ),
        parcelas: cobranca.parcelas.map((parcela) => ({
          ...parcela,
          vencida:
            (parcela.status === StatusParcela.EM_ABERTO ||
              parcela.status === StatusParcela.PARCIAL) &&
            parcela.vencimento < this.today(),
        })),
      })),
    };
  }

  async findOne(id: number) {
    const cobranca = await this.prisma.cobranca.findUnique({
      where: { id },
      include: this.cobrancaInclude,
    });

    if (!cobranca) {
      throw new NotFoundException({
        codigo: 'COBRANCAS_FINDONE_NOTFOUND_01',
        message: 'Cobranca nao encontrada',
      });
    }

    const valorRecebido = this.recebidoCobranca(cobranca);
    return {
      ...cobranca,
      valorRecebido: this.fromCents(valorRecebido),
      valorRestante: this.fromCents(
        cobranca.status === StatusCobranca.CANCELADO
          ? 0
          : this.toCents(cobranca.valorTotal) - valorRecebido,
      ),
      parcelas: cobranca.parcelas.map((parcela) => {
        const recebido = parcela.recebimentos.reduce(
          (total, item) => total + this.toCents(item.valor),
          0,
        );
        return {
          ...parcela,
          valorRecebido: this.fromCents(recebido),
          valorRestante: this.fromCents(
            parcela.status === StatusParcela.CANCELADA
              ? 0
              : this.toCents(parcela.valor) - recebido,
          ),
          vencida:
            (parcela.status === StatusParcela.EM_ABERTO ||
              parcela.status === StatusParcela.PARCIAL) &&
            parcela.vencimento < this.today(),
        };
      }),
    };
  }

  async registrarRecebimento(
    cobrancaId: number,
    dto: RegistrarRecebimentoDto,
    usuarioId: number,
  ) {
    const referencia = await this.prisma.cobranca.findUnique({
      where: { id: cobrancaId },
      select: { projetoId: true },
    });
    if (!referencia)
      throw new NotFoundException({
        codigo: 'COBRANCAS_RECEBIMENTO_INEXISTENTE',
        message: 'Cobranca nao encontrada',
      });
    await this.prisma.$transaction(
      async (tx) => {
        // Mesma ordem de cancelar/editar etapa: projeto antes da cobranca.
        await tx.$queryRaw`SELECT id FROM projeto WHERE id = ${referencia.projetoId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM cobranca WHERE id = ${cobrancaId} FOR UPDATE`;
        const cobranca = await tx.cobranca.findUnique({
          where: { id: cobrancaId },
          include: {
            etapa: { select: { descricao: true } },
            projeto: { include: { orcamento: true } },
            parcelas: { include: { recebimentos: true } },
          },
        });

        if (!cobranca) {
          throw new NotFoundException({
            codigo: 'COBRANCAS_REGISTRARRECEBIMENTO_NOTFOUND_01',
            message: 'Cobranca nao encontrada',
          });
        }
        if (
          cobranca.status === StatusCobranca.PAGO ||
          cobranca.status === StatusCobranca.CANCELADO
        ) {
          throw new BadRequestException({
            codigo: 'COBRANCAS_REGISTRARRECEBIMENTO_BADREQUEST_01',
            message: 'Cobranca paga ou cancelada nao aceita recebimentos',
          });
        }

        const parcela = cobranca.parcelas.find(
          (item) => item.id === dto.parcelaId,
        );
        if (!parcela) {
          throw new BadRequestException({
            codigo: 'COBRANCAS_REGISTRARRECEBIMENTO_BADREQUEST_02',
            message: 'A parcela informada nao pertence a esta cobranca',
          });
        }
        if (
          parcela.status === StatusParcela.PAGA ||
          parcela.status === StatusParcela.CANCELADA
        ) {
          throw new BadRequestException({
            codigo: 'PARCELA_PAGA_OU_CANCELADA',
            message: 'Parcela paga ou cancelada nao aceita recebimentos',
          });
        }

        const recebidoParcela = parcela.recebimentos.reduce(
          (total, item) => total + this.toCents(item.valor),
          0,
        );
        const valorRecebido = this.toCents(dto.valor);
        const restanteParcela = this.toCents(parcela.valor) - recebidoParcela;
        if (valorRecebido > restanteParcela) {
          throw new BadRequestException({
            codigo: 'RECEBIMENTO_ACIMA_DO_RESTANTE',
            campo: 'valor',
            detalhes: { restante: this.fromCents(restanteParcela) },
            message: `Valor superior ao restante da parcela: R$ ${this.fromCents(restanteParcela).toFixed(2)}`,
          });
        }

        const dataRecebimento = this.parseDate(dto.dataRecebimento);
        const caixa = await caixaParaLancamento(tx, dataRecebimento);
        const recebimento = await tx.recebimento.create({
          data: {
            parcelaId: parcela.id,
            valor: dto.valor,
            dataRecebimento,
            formaPagamento: dto.formaPagamento,
            observacoes: dto.observacoes?.trim() || undefined,
            registradoPorUsuarioId: usuarioId,
          },
        });

        const novoRecebidoParcela = recebidoParcela + valorRecebido;
        await tx.parcela.update({
          where: { id: parcela.id },
          data: {
            status:
              novoRecebidoParcela === this.toCents(parcela.valor)
                ? StatusParcela.PAGA
                : StatusParcela.PARCIAL,
          },
        });

        const recebidoCobrancaAntes = this.recebidoCobranca(cobranca);
        const recebidoCobrancaDepois = recebidoCobrancaAntes + valorRecebido;
        await tx.cobranca.update({
          where: { id: cobranca.id },
          data: {
            status:
              recebidoCobrancaDepois === this.toCents(cobranca.valorTotal)
                ? StatusCobranca.PAGO
                : StatusCobranca.PARCIAL,
          },
        });

        await tx.movimentacaoCaixa.create({
          data: {
            caixaId: caixa.id,
            tipo: TipoMovimentacaoCaixa.ENTRADA,
            data: dataRecebimento,
            descricao:
              `Recebimento do projeto ${cobranca.projeto.orcamento.numero}, ${cobranca.etapa?.descricao ?? this.tipoLabel(cobranca.tipo)}, parcela ${parcela.numero}`.slice(
                0,
                255,
              ),
            categoria: 'RECEBIMENTO_CLIENTE',
            valor: dto.valor,
            recebimentoId: recebimento.id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.findOne(cobrancaId);
  }

  async cancelar(id: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cobranca WHERE id = ${id} FOR UPDATE`;
      const cobranca = await tx.cobranca.findUnique({
        where: { id },
        include: { parcelas: { include: { recebimentos: true } } },
      });
      if (!cobranca)
        throw new NotFoundException({
          codigo: 'COBRANCAS_CANCELAR_NOTFOUND_01',
          message: 'Cobranca nao encontrada',
        });
      if (cobranca.status === StatusCobranca.CANCELADO)
        throw new ConflictException({
          codigo: 'COBRANCAS_CANCELAR_CONFLICT_01',
          message: 'Cobranca ja esta cancelada',
        });
      if (cobranca.parcelas.some((parcela) => parcela.recebimentos.length))
        throw new BadRequestException({
          codigo: 'COBRANCAS_CANCELAR_BADREQUEST_01',
          message: 'Cobranca com recebimento nao pode ser cancelada',
        });
      await tx.parcela.updateMany({
        where: { cobrancaId: id },
        data: { status: StatusParcela.CANCELADA },
      });
      await tx.cobranca.update({
        where: { id },
        data: { status: StatusCobranca.CANCELADO },
      });
    });
    return this.findOne(id);
  }

  private buildParcelas(dto: CobrancaPersistenciaInput) {
    const total = this.toCents(dto.valorTotal);

    if (dto.modalidade === ModalidadeCobranca.PARCELADO_MANUAL) {
      return this.buildParcelasManuais(dto.parcelas, total);
    }

    const quantidade =
      dto.modalidade === ModalidadeCobranca.A_VISTA ? 1 : dto.numeroParcelas;
    if (!quantidade || quantidade < 1) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_BUILDPARCELAS_BADREQUEST_01',
        message: 'Informe a quantidade de parcelas',
      });
    }
    if (
      dto.modalidade === ModalidadeCobranca.PARCELADO_AUTOMATICO &&
      quantidade < 2
    ) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_BUILDPARCELAS_BADREQUEST_02',
        message: 'O parcelamento automatico deve ter ao menos duas parcelas',
      });
    }

    const primeiroVencimento = dto.primeiroVencimento
      ? this.parseDate(dto.primeiroVencimento)
      : this.today();
    const valorBase = Math.floor(total / quantidade);
    if (valorBase < 1) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_BUILDPARCELAS_BADREQUEST_03',
        message: 'Cada parcela precisa ter ao menos R$ 0,01',
      });
    }
    let distribuido = 0;

    return Array.from({ length: quantidade }, (_, index) => {
      const ultimo = index === quantidade - 1;
      const valor = ultimo ? total - distribuido : valorBase;
      distribuido += valor;
      return {
        numero: index + 1,
        vencimento: this.addMonths(primeiroVencimento, index),
        valor: this.fromCents(valor),
      };
    });
  }

  private buildParcelasManuais(
    parcelas: ParcelaManualDto[] | undefined,
    valorTotal: number,
  ) {
    if (!parcelas?.length) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_BUILDPARCELASMANUAIS_BADREQUEST_01',
        message: 'Informe as parcelas manuais da cobranca',
      });
    }
    if (new Set(parcelas.map((item) => item.numero)).size !== parcelas.length) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_BUILDPARCELASMANUAIS_BADREQUEST_02',
        message: 'Os numeros das parcelas nao podem se repetir',
      });
    }

    const soma = parcelas.reduce(
      (total, parcela) => total + this.toCents(parcela.valor),
      0,
    );
    if (soma !== valorTotal) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_BUILDPARCELASMANUAIS_BADREQUEST_03',
        message:
          'A soma das parcelas deve ser igual ao valor total da cobranca',
      });
    }

    return parcelas
      .map((parcela) => ({
        numero: parcela.numero,
        vencimento: this.parseDate(parcela.vencimento),
        valor: parcela.valor,
      }))
      .sort((a, b) => a.numero - b.numero);
  }

  private toProjetoResumo(projeto: {
    id: number;
    orcamento: {
      numero: string;
      titulo: string;
      tipo: string;
      cliente: { id: number; nome: string };
    };
    cobrancas: Array<{
      status: StatusCobranca;
      valorTotal: Prisma.Decimal;
      parcelas: Array<{
        recebimentos: Array<{ valor: Prisma.Decimal }>;
      }>;
    }>;
  }) {
    const cobrancasAtivas = projeto.cobrancas.filter(
      (item) => item.status !== StatusCobranca.CANCELADO,
    );
    const valorTotal = cobrancasAtivas.reduce(
      (total, item) => total + this.toCents(item.valorTotal),
      0,
    );
    const valorRecebido = cobrancasAtivas.reduce(
      (total, item) => total + this.recebidoCobranca(item),
      0,
    );

    return {
      projetoId: projeto.id,
      numero: projeto.orcamento.numero,
      titulo: projeto.orcamento.titulo,
      cliente: projeto.orcamento.cliente,
      tipo: projeto.orcamento.tipo,
      quantidadeCobrancas: cobrancasAtivas.length,
      valorTotal: this.fromCents(valorTotal),
      valorRecebido: this.fromCents(valorRecebido),
      valorRestante: this.fromCents(valorTotal - valorRecebido),
      status:
        valorTotal > 0 && valorRecebido === valorTotal
          ? StatusCobranca.PAGO
          : valorRecebido > 0
            ? StatusCobranca.PARCIAL
            : StatusCobranca.EM_ABERTO,
    };
  }

  private recebidoCobranca(cobranca: {
    parcelas: Array<{
      recebimentos: Array<{ valor: Prisma.Decimal }>;
    }>;
  }) {
    return cobranca.parcelas.reduce(
      (total, parcela) =>
        total +
        parcela.recebimentos.reduce(
          (subtotal, item) => subtotal + this.toCents(item.valor),
          0,
        ),
      0,
    );
  }

  private tipoLabel(tipo: string) {
    return (
      {
        ENTRADA: 'Entrada',
        FINAL: 'Cobranca final',
        MEDICAO: 'Medicao',
      }[tipo] ?? tipo
    );
  }

  private toCents(value: Prisma.Decimal | number) {
    return Math.round(Number(value) * 100);
  }

  private validarAcrescimo(
    formaPagamento: FormaPagamento | undefined,
    percentualAcrescimo: number,
  ) {
    if (!percentualAcrescimo) {
      return;
    }

    const formasPermitidas: FormaPagamento[] = [
      FormaPagamento.CARTAO_CREDITO,
      FormaPagamento.CARTAO_DEBITO,
      FormaPagamento.BOLETO,
    ];
    if (!formaPagamento || !formasPermitidas.includes(formaPagamento)) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_VALIDARACRESCIMO_BADREQUEST_01',
        message:
          'Acrescimo permitido somente para cartao de credito, cartao de debito ou boleto',
      });
    }
  }

  private calcularValores(
    valorBase: number,
    percentualDesconto: number,
    percentualAcrescimo: number,
    formaPagamento: FormaPagamento | undefined,
  ) {
    this.validarAcrescimo(formaPagamento, percentualAcrescimo);
    const valorBaseCentavos = this.toCents(valorBase);
    const descontoCentavos = Math.round(
      (valorBaseCentavos * percentualDesconto) / 100,
    );
    const acrescimoCentavos = Math.round(
      (valorBaseCentavos * percentualAcrescimo) / 100,
    );
    const valorFinalCentavos =
      valorBaseCentavos - descontoCentavos + acrescimoCentavos;
    if (valorFinalCentavos <= 0) {
      throw new BadRequestException({
        codigo: 'COBRANCAS_CALCULARVALORES_BADREQUEST_01',
        message: 'O desconto nao pode zerar o valor da cobranca',
      });
    }

    return {
      desconto: this.fromCents(descontoCentavos),
      acrescimo: this.fromCents(acrescimoCentavos),
      valorTotal: this.fromCents(valorFinalCentavos),
    };
  }

  private fromCents(value: number) {
    return Number((value / 100).toFixed(2));
  }

  private parseDate(value: string) {
    return parseDateOnly(value);
  }

  private endOfDay(value: string) {
    return new Date(`${value}T23:59:59.999Z`);
  }

  private moeda(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  private today() {
    return hojeNoFusoDoNegocio();
  }

  private addMonths(value: Date, months: number) {
    return somarMesesLimitandoDia(value, months);
  }
}
