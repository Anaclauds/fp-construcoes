import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    const body =
      typeof response === 'string' ? { message: response } : response;
    const codigos: Record<number, string> = {
      400: 'DADOS_INVALIDOS',
      401: 'AUTENTICACAO_NECESSARIA',
      403: 'PERMISSAO_NEGADA',
      404: 'REGISTRO_NAO_ENCONTRADO',
      409: 'CONFLITO',
      429: 'LIMITE_DE_TENTATIVAS',
      503: 'SERVICO_INDISPONIVEL',
    };
    const rotaInexistente =
      statusCode === 404 &&
      'message' in body &&
      typeof body.message === 'string' &&
      /^Cannot (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS) /.test(body.message);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({
        statusCode,
        codigo: rotaInexistente
          ? 'ROTA_INEXISTENTE'
          : (codigos[statusCode] ?? 'ERRO_HTTP'),
        ...body,
      });
  }
}
