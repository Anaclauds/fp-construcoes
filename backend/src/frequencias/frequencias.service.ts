import { parseDateOnly, hojeNoFusoDoNegocio } from '../common/utils/date.util';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusCadastro, StatusFrequencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListFrequenciasQueryDto } from './dto/list-frequencias-query.dto';
import { RelatorioFrequenciaQueryDto } from './dto/relatorio-frequencia-query.dto';
import { SaveFrequenciaDto } from './dto/save-frequencia.dto';
import PDFDocument from 'pdfkit';
import { UpdateObservacaoDto } from './dto/update-observacao.dto';

@Injectable()
export class FrequenciasService {
  constructor(private readonly prisma: PrismaService) {}

  opcoesFuncionarios(status?: 'ATIVO' | 'INATIVO' | 'TODOS') {
    return this.prisma.funcionario.findMany({
      where: { status: status === 'TODOS' ? undefined : status },
      select: {
        id: true,
        nomeCompleto: true,
        apelido: true,
        funcao: true,
        status: true,
      },
      orderBy: [{ nomeCompleto: 'asc' }, { id: 'asc' }],
    });
  }

  private readonly frequenciaSelect = {
    id: true,
    funcionarioId: true,
    data: true,
    status: true,
    observacao: true,
    registradoPorUsuarioId: true,
    funcionario: {
      select: {
        id: true,
        nomeCompleto: true,
        apelido: true,
        funcao: true,
        status: true,
      },
    },
  };

  async findAll(query: ListFrequenciasQueryDto) {
    const data = this.parseDate(query.data ?? this.today());
    const funcionarios = await this.prisma.funcionario.findMany({
      where: {
        status: StatusCadastro.ATIVO,
        id: query.funcionarioId,
      },
      orderBy: { nomeCompleto: 'asc' },
      select: {
        id: true,
        nomeCompleto: true,
        apelido: true,
        funcao: true,
        status: true,
        frequencias: {
          where: {
            data,
            status: query.status,
          },
          select: {
            id: true,
            data: true,
            status: true,
            observacao: true,
            registradoPorUsuarioId: true,
          },
        },
      },
    });

    const registros = funcionarios
      .map((funcionario) => {
        const frequencia = funcionario.frequencias[0];
        const status = frequencia?.status ?? null;

        if (query.status && status !== query.status) {
          return null;
        }

        return {
          id: frequencia?.id ?? null,
          funcionarioId: funcionario.id,
          data,
          status,
          observacao: frequencia?.observacao ?? null,
          registradoPorUsuarioId: frequencia?.registradoPorUsuarioId ?? null,
          funcionario: {
            id: funcionario.id,
            nomeCompleto: funcionario.nomeCompleto,
            apelido: funcionario.apelido,
            funcao: funcionario.funcao,
            status: funcionario.status,
          },
        };
      })
      .filter((registro) => registro !== null);

    return {
      data,
      indicadores: this.calcularIndicadores(registros),
      registros,
    };
  }

  async findOne(id: number) {
    const frequencia = await this.prisma.frequencia.findUnique({
      where: { id },
      select: this.frequenciaSelect,
    });

    if (!frequencia) {
      throw new NotFoundException({
        codigo: 'FREQUENCIAS_FINDONE_NOTFOUND_01',
        message: 'Registro de frequencia nao encontrado',
      });
    }

    return frequencia;
  }

  async save(saveFrequenciaDto: SaveFrequenciaDto, usuarioId: number) {
    const data = this.parseDate(saveFrequenciaDto.data);
    this.validarJustificativas(saveFrequenciaDto.registros);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException({
        codigo: 'FREQUENCIAS_SAVE_NOTFOUND_01',
        message: 'Usuario responsavel pelo registro nao encontrado',
      });
    }

    await this.validarFuncionarios(
      saveFrequenciaDto.registros.map((r) => r.funcionarioId),
    );

    await this.prisma.$transaction(
      saveFrequenciaDto.registros.map((registro) =>
        this.prisma.frequencia.upsert({
          where: {
            funcionarioId_data: {
              funcionarioId: registro.funcionarioId,
              data,
            },
          },
          update: {
            status: registro.status,
            observacao: registro.observacao,
            registradoPorUsuarioId: usuarioId,
          },
          create: {
            funcionarioId: registro.funcionarioId,
            data,
            status: registro.status,
            observacao: registro.observacao,
            registradoPorUsuarioId: usuarioId,
          },
        }),
      ),
    );

    return this.findAll({ data: saveFrequenciaDto.data });
  }

  async updateObservacao(
    id: number,
    updateObservacaoDto: UpdateObservacaoDto,
    usuarioId: number,
  ) {
    const atual = await this.findOne(id);
    this.validarJustificativas([
      {
        funcionarioId: atual.funcionarioId,
        status: atual.status,
        observacao: updateObservacaoDto.observacao,
      },
    ]);

    return this.prisma.frequencia.update({
      where: { id },
      data: {
        observacao: updateObservacaoDto.observacao,
        registradoPorUsuarioId: usuarioId,
      },
      select: this.frequenciaSelect,
    });
  }

  async relatorio(query: RelatorioFrequenciaQueryDto) {
    const dataInicial = this.parseDate(query.dataInicial);
    const dataFinal = this.parseDate(query.dataFinal);

    if (dataInicial > dataFinal) {
      throw new BadRequestException({
        codigo: 'FREQUENCIAS_RELATORIO_BADREQUEST_01',
        message: 'Data inicial deve ser menor ou igual a data final',
      });
    }

    const funcionario = await this.prisma.funcionario.findUnique({
      where: { id: query.funcionarioId },
      select: {
        id: true,
        nomeCompleto: true,
        apelido: true,
        funcao: true,
      },
    });

    if (!funcionario) {
      throw new NotFoundException({
        codigo: 'FREQUENCIAS_RELATORIO_NOTFOUND_01',
        message: 'Funcionario nao encontrado',
      });
    }

    const registros = await this.prisma.frequencia.findMany({
      where: {
        funcionarioId: query.funcionarioId,
        data: {
          gte: dataInicial,
          lte: dataFinal,
        },
      },
      orderBy: { data: 'asc' },
      select: this.frequenciaSelect,
    });

    const limite =
      dataFinal < hojeNoFusoDoNegocio() ? dataFinal : hojeNoFusoDoNegocio();
    if ((limite.getTime() - dataInicial.getTime()) / 86400000 > 3660)
      throw new BadRequestException({
        codigo: 'FREQUENCIAS_RELATORIO_BADREQUEST_02',
        message: 'O relatorio deve abranger no maximo dez anos',
      });
    const porDia = new Map(
      registros.map((registro) => [
        registro.data.toISOString().slice(0, 10),
        registro,
      ]),
    );
    const dias: Array<{
      data: Date;
      diaSemana: number;
      status: StatusFrequencia | null;
      observacao: string | null;
    }> = [];
    for (
      let dia = new Date(dataInicial);
      dia <= limite;
      dia = new Date(dia.getTime() + 86400000)
    ) {
      const registro = porDia.get(dia.toISOString().slice(0, 10));
      dias.push({
        data: dia,
        diaSemana: dia.getUTCDay(),
        status: registro?.status ?? null,
        observacao: registro?.observacao ?? null,
      });
    }
    const presentes = dias.filter(
      (dia) => dia.status === StatusFrequencia.PRESENTE,
    ).length;
    const taxaPresenca = query.status
      ? null
      : dias.length
        ? Math.round((presentes / dias.length) * 100)
        : 0;
    const corresponde = (status: StatusFrequencia | null) =>
      !query.status ||
      status === (query.status === 'NAO_REGISTRADO' ? null : query.status);

    return {
      funcionario,
      periodo: {
        dataInicial,
        dataFinal,
      },
      tipoRelatorio: query.tipoRelatorio ?? 'DETALHADO_POR_DIA',
      indicadores: {
        ...this.calcularIndicadores(dias),
        totalDias: dias.length,
        taxaPresenca,
      },
      registros: registros.filter(
        (registro) => registro.data <= limite && corresponde(registro.status),
      ),
      dias: dias.filter((dia) => corresponde(dia.status)),
    };
  }

  async relatorioPdf(query: RelatorioFrequenciaQueryDto): Promise<Buffer> {
    const relatorio = await this.relatorio(query);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const partes: Buffer[] = [];
      doc.on('data', (parte: Buffer) => partes.push(parte));
      doc.on('end', () => resolve(Buffer.concat(partes)));
      doc.on('error', reject);
      doc.fontSize(18).text('Relatorio de frequencia');
      doc.moveDown().fontSize(11).text(relatorio.funcionario.nomeCompleto);
      doc.text(`Periodo: ${query.dataInicial} a ${query.dataFinal}`);
      doc.text(
        `Dias: ${relatorio.indicadores.totalDias} | Presencas: ${relatorio.indicadores.presentes} | Taxa: ${relatorio.indicadores.taxaPresenca === null ? '-' : `${relatorio.indicadores.taxaPresenca}%`}`,
      );
      doc.moveDown();
      for (const dia of relatorio.dias) {
        if (doc.y > 745) doc.addPage();
        doc
          .fontSize(9)
          .text(
            `${dia.data.toISOString().slice(0, 10)} | ${(dia.status ?? 'NAO_REGISTRADO').replace(/_/g, ' ')}${dia.observacao ? ` | ${dia.observacao}` : ''}`,
          );
      }
      if (!relatorio.dias.length)
        doc.text('Nenhum dia corresponde aos filtros informados.');
      doc.end();
    });
  }

  private validarJustificativas(registros: SaveFrequenciaDto['registros']) {
    const pendentes = registros.filter(
      (registro) =>
        (registro.status === StatusFrequencia.MEIO_PERIODO ||
          registro.status === StatusFrequencia.FALTA_JUSTIFICADA) &&
        !registro.observacao?.trim(),
    );

    if (pendentes.length) {
      throw new BadRequestException({
        codigo: 'FREQUENCIAS_VALIDARJUSTIFICATIVAS_BADREQUEST_01',
        message: 'Existem funcionarios com justificativa pendente',
        funcionariosPendentes: pendentes.map(
          (registro) => registro.funcionarioId,
        ),
      });
    }
  }

  private async validarFuncionarios(funcionarioIds: number[]) {
    const idsUnicos = [...new Set(funcionarioIds)];
    const total = await this.prisma.funcionario.count({
      where: {
        id: { in: idsUnicos },
        status: StatusCadastro.ATIVO,
      },
    });

    if (total !== idsUnicos.length) {
      throw new BadRequestException({
        codigo: 'FREQUENCIAS_VALIDARFUNCIONARIOS_BADREQUEST_01',
        message: 'Todos os funcionarios devem existir e estar ativos',
      });
    }
  }

  private calcularIndicadores(
    registros: Array<{ status: StatusFrequencia | null }>,
  ) {
    return {
      funcionariosAtivos: registros.length,
      totalRegistros: registros.length,
      naoRegistrados: registros.filter((r) => r.status === null).length,
      presentes: registros.filter((r) => r.status === StatusFrequencia.PRESENTE)
        .length,
      meioPeriodo: registros.filter(
        (r) => r.status === StatusFrequencia.MEIO_PERIODO,
      ).length,
      faltasJustificadas: registros.filter(
        (r) => r.status === StatusFrequencia.FALTA_JUSTIFICADA,
      ).length,
      faltasNaoJustificadas: registros.filter(
        (r) => r.status === StatusFrequencia.FALTA_NAO_JUSTIFICADA,
      ).length,
    };
  }

  private today() {
    return hojeNoFusoDoNegocio().toISOString().slice(0, 10);
  }

  private parseDate(value: string) {
    return parseDateOnly(value);
  }
}
