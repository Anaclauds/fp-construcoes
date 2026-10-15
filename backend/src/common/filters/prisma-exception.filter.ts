import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const errors: Record<string, [number, string]> = {
      P2002: [409, 'Ja existe um registro com esses dados unicos'],
      P2000: [400, 'Um dos campos ultrapassa o tamanho permitido'],
      P2003: [400, 'O registro informado nao existe ou possui vinculos'],
      P2025: [404, 'Registro nao encontrado'],
      P2034: [409, 'Conflito com outra operacao em andamento. Tente novamente'],
      P2020: [400, 'Um dos valores ultrapassa o limite permitido'],
    };
    const concorrencia =
      exception.code === 'P2010' &&
      ['1205', '1213'].includes(String(exception.meta?.code));
    const [statusCode, message] = (concorrencia
      ? errors.P2034
      : errors[exception.code]) ?? [
      500,
      'Nao foi possivel concluir a operacao',
    ];
    this.logger.warn({
      code: exception.code,
      modelName: exception.meta?.modelName,
      target: exception.meta?.target,
    });
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({
        statusCode,
        message,
        codigo: concorrencia ? 'P2034' : exception.code,
      });
  }
}
