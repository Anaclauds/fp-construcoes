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
  StatusCaixa,
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
    const projeto = await tx.projeto.findUnique({
      where: { id: dto.projetoId },
      include: { orcamento: true },
    });

    if (!projeto) {
      throw new NotFoundException('Projeto nao encontrado');
    }
    if (projeto.status === StatusProjeto.CANCELADO) {
      throw new BadRequestException(
        'Projeto cancelado nao pode receber cobrancas',
      );
    }

    if (dto.etapaId) {
      const etapa = await tx.etapaProjeto.findFirst({
        where: { id: dto.etapaId, projetoId: dto.projetoId },
        include: { cobranca: true },
      });
      if (!etapa) {
        throw new NotFoundException('Etapa nao encontrada neste projeto');
      }
      if (etapa.cobranca) {
        throw new ConflictException('A etapa ja possui uma cobranca');
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
    const { todos, filtrados } = await this.listarResumos(query);
    const inicio = (page - 1) * limit;
    const indicadores = this.calcularIndicadores(todos);

    return {
      indicadores,
      data: filtrados.slice(inicio, inicio + limit),
      meta: {
        total: filtrados.length,
        page,
        limit,
        totalPages: Math.ceil(filtrados.length / limit),
      },
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
      sheet.addRow({ ...item, cliente: item.cliente.nome });
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
            `${item.cliente.nome} | ${item.tipo} | ${item.status} | Total: ${this.moeda(item.valorTotal)} | Recebido: ${this.moeda(item.valorRecebido)} | Aberto: ${this.moeda(item.valorRestante)}`,
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
      throw new BadRequestException(
        'A data inicial nao pode ser posterior a data final',
      );
    }
    const projetos = await this.prisma.projeto.findMany({
      where: {
        orcamento: {
          clienteId: query.clienteId,
          tipo: query.tipo,
        },
        cobrancas: {
          some: {
            criadaEm:
              dataInicio || dataFim
                ? { gte: dataInicio, lte: dataFim }
                : undefined,
          },
        },
      },
      orderBy: { id: 'desc' },
      include: {
        orcamento: { include: { cliente: true } },
        cobrancas: {
          where: {
            criadaEm:
              dataInicio || dataFim
                ? { gte: dataInicio, lte: dataFim }
                : undefined,
          },
          include: {
            parcelas: { include: { recebimentos: true } },
          },
        },
      },
    });

    const todos = projetos.map((projeto) => this.toProjetoResumo(projeto));
    const busca = query.busca?.toLocaleLowerCase('pt-BR');
    const filtrados = todos.filter((item) => {
      const atendeBusca =
        !busca ||
        item.titulo.toLocaleLowerCase('pt-BR').includes(busca) ||
        item.numero
          .toLocaleLowerCase('pt-BR')
          .includes(busca.replace('#', '')) ||
        item.cliente.nome.toLocaleLowerCase('pt-BR').includes(busca);
      return (
        atendeBusca &&
        (!query.tipo || item.tipo === query.tipo) &&
        (!query.status || item.status === query.status)
      );
    });
    return { todos, filtrados };
  }

  private calcularIndicadores(
    itens: ReturnType<CobrancasService['toProjetoResumo']>[],
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

    if (!projeto || !projeto.cobrancas.length) {
      throw new NotFoundException('Projeto com cobrancas nao encontrado');
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
          this.toCents(cobranca.valorTotal) - this.recebidoCobranca(cobranca),
        ),
      })),
    };
  }

  async findOne(id: number) {
    const cobranca = await this.prisma.cobranca.findUnique({
      where: { id },
      include: this.cobrancaInclude,
    });

    if (!cobranca) {
      throw new NotFoundException('Cobranca nao encontrada');
    }

    const valorRecebido = this.recebidoCobranca(cobranca);
    return {
      ...cobranca,
      valorRecebido: this.fromCents(valorRecebido),
      valorRestante: this.fromCents(
        this.toCents(cobranca.valorTotal) - valorRecebido,
      ),
      parcelas: cobranca.parcelas.map((parcela) => {
        const recebido = parcela.recebimentos.reduce(
          (total, item) => total + this.toCents(item.valor),
          0,
        );
        return {
          ...parcela,
          valorRecebido: this.fromCents(recebido),
          valorRestante: this.fromCents(this.toCents(parcela.valor) - recebido),
        };
      }),
    };
  }

  async registrarRecebimento(
    cobrancaId: number,
    dto: RegistrarRecebimentoDto,
    usuarioId: number,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const cobranca = await tx.cobranca.findUnique({
          where: { id: cobrancaId },
          include: {
            projeto: { include: { orcamento: true } },
            parcelas: { include: { recebimentos: true } },
          },
        });

        if (!cobranca) {
          throw new NotFoundException('Cobranca nao encontrada');
        }
        if (
          cobranca.status === StatusCobranca.PAGO ||
          cobranca.status === StatusCobranca.CANCELADO
        ) {
          throw new BadRequestException(
            'Cobranca paga ou cancelada nao aceita recebimentos',
          );
        }

        const parcela = cobranca.parcelas.find(
          (item) => item.id === dto.parcelaId,
        );
        if (!parcela) {
          throw new BadRequestException(
            'A parcela informada nao pertence a esta cobranca',
          );
        }
        if (
          parcela.status === StatusParcela.PAGA ||
          parcela.status === StatusParcela.CANCELADA
        ) {
          throw new BadRequestException(
            'Parcela paga ou cancelada nao aceita recebimentos',
          );
        }

        const recebidoParcela = parcela.recebimentos.reduce(
          (total, item) => total + this.toCents(item.valor),
          0,
        );
        const valorRecebido = this.toCents(dto.valor);
        const restanteParcela = this.toCents(parcela.valor) - recebidoParcela;
        if (valorRecebido > restanteParcela) {
          throw new BadRequestException(
            `Valor superior ao restante da parcela: R$ ${this.fromCents(restanteParcela).toFixed(2)}`,
          );
        }

        const dataRecebimento = this.parseDate(dto.dataRecebimento);
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

        const competencia = new Date(
          Date.UTC(
            dataRecebimento.getUTCFullYear(),
            dataRecebimento.getUTCMonth(),
            1,
          ),
        );
        const caixa = await tx.caixa.upsert({
          where: { competencia },
          update: {},
          create: {
            competencia,
            valorInicial: 0,
          },
        });
        if (caixa.status === StatusCaixa.FECHADO) {
          throw new BadRequestException(
            'O caixa da competencia do recebimento esta fechado',
          );
        }

        await tx.movimentacaoCaixa.create({
          data: {
            caixaId: caixa.id,
            tipo: TipoMovimentacaoCaixa.ENTRADA,
            data: dataRecebimento,
            descricao: `Recebimento do projeto ${cobranca.projeto.orcamento.numero}, parcela ${parcela.numero}`,
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

  private buildParcelas(dto: CobrancaPersistenciaInput) {
    const total = this.toCents(dto.valorTotal);

    if (dto.modalidade === ModalidadeCobranca.PARCELADO_MANUAL) {
      return this.buildParcelasManuais(dto.parcelas, total);
    }

    const quantidade =
      dto.modalidade === ModalidadeCobranca.A_VISTA ? 1 : dto.numeroParcelas;
    if (!quantidade || quantidade < 1) {
      throw new BadRequestException('Informe a quantidade de parcelas');
    }
    if (
      dto.modalidade === ModalidadeCobranca.PARCELADO_AUTOMATICO &&
      quantidade < 2
    ) {
      throw new BadRequestException(
        'O parcelamento automatico deve ter ao menos duas parcelas',
      );
    }

    const primeiroVencimento = dto.primeiroVencimento
      ? this.parseDate(dto.primeiroVencimento)
      : this.today();
    const valorBase = Math.floor(total / quantidade);
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
      throw new BadRequestException('Informe as parcelas manuais da cobranca');
    }
    if (new Set(parcelas.map((item) => item.numero)).size !== parcelas.length) {
      throw new BadRequestException(
        'Os numeros das parcelas nao podem se repetir',
      );
    }

    const soma = parcelas.reduce(
      (total, parcela) => total + this.toCents(parcela.valor),
      0,
    );
    if (soma !== valorTotal) {
      throw new BadRequestException(
        'A soma das parcelas deve ser igual ao valor total da cobranca',
      );
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
      throw new BadRequestException(
        'Acrescimo permitido somente para cartao de credito, cartao de debito ou boleto',
      );
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
      throw new BadRequestException(
        'O desconto nao pode zerar o valor da cobranca',
      );
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
    return new Date(`${value}T00:00:00.000Z`);
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
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private addMonths(value: Date, months: number) {
    const date = new Date(value);
    date.setUTCMonth(date.getUTCMonth() + months);
    return date;
  }
}
