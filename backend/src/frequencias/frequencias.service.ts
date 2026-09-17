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
import { UpdateObservacaoDto } from './dto/update-observacao.dto';

@Injectable()
export class FrequenciasService {
  constructor(private readonly prisma: PrismaService) {}

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
      throw new NotFoundException('Registro de frequencia nao encontrado');
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
      throw new NotFoundException(
        'Usuario responsavel pelo registro nao encontrado',
      );
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

  async updateObservacao(id: number, updateObservacaoDto: UpdateObservacaoDto) {
    await this.findOne(id);

    return this.prisma.frequencia.update({
      where: { id },
      data: { observacao: updateObservacaoDto.observacao },
      select: this.frequenciaSelect,
    });
  }

  async relatorio(query: RelatorioFrequenciaQueryDto) {
    const dataInicial = this.parseDate(query.dataInicial);
    const dataFinal = this.parseDate(query.dataFinal);

    if (dataInicial > dataFinal) {
      throw new BadRequestException(
        'Data inicial deve ser menor ou igual a data final',
      );
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
      throw new NotFoundException('Funcionario nao encontrado');
    }

    const registros = await this.prisma.frequencia.findMany({
      where: {
        funcionarioId: query.funcionarioId,
        data: {
          gte: dataInicial,
          lte: dataFinal,
        },
        status: query.status,
      },
      orderBy: { data: 'asc' },
      select: this.frequenciaSelect,
    });

    const total = registros.length;
    const presentes = registros.filter(
      (r) => r.status === StatusFrequencia.PRESENTE,
    ).length;
    const taxaPresenca = total ? Math.round((presentes / total) * 100) : 0;

    return {
      funcionario,
      periodo: {
        dataInicial,
        dataFinal,
      },
      tipoRelatorio: query.tipoRelatorio ?? 'DETALHADO_POR_DIA',
      indicadores: {
        ...this.calcularIndicadores(registros),
        taxaPresenca,
      },
      registros,
    };
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
      throw new BadRequestException(
        'Todos os funcionarios devem existir e estar ativos',
      );
    }
  }

  private calcularIndicadores(
    registros: Array<{ status: StatusFrequencia | null }>,
  ) {
    return {
      funcionariosAtivos: registros.length,
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
    return new Date().toISOString().slice(0, 10);
  }

  private parseDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
