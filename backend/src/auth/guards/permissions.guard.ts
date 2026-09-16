import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
} from '../decorators/require-permission.decorator';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirements = this.reflector.getAllAndOverride<
      PermissionRequirement[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requirements?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    const autorizado = requirements.some((requirement) => {
      const permissao = user?.permissoes.find(
        (item) => item.modulo === requirement.modulo,
      );

      return requirement.acao === 'gerenciar'
        ? permissao?.podeGerenciar
        : permissao?.podeVisualizar || permissao?.podeGerenciar;
    });

    if (!autorizado) {
      throw new ForbiddenException('Usuario sem permissao para esta operacao');
    }

    return true;
  }
}
