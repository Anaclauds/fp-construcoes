import { ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Retry-After', '60');
    return Promise.reject(
      new HttpException(
        'Muitas tentativas de login. Aguarde um minuto e tente novamente',
        429,
      ),
    );
  }
}
