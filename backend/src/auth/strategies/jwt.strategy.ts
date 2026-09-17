import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { StatusCadastro } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AuthUser): Promise<AuthUser> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        funcionario: true,
        permissoes: { orderBy: { modulo: 'asc' } },
      },
    });

    if (
      !usuario ||
      usuario.status !== StatusCadastro.ATIVO ||
      usuario.funcionario.status !== StatusCadastro.ATIVO
    ) {
      throw new UnauthorizedException('Usuario inativo ou inexistente');
    }

    return {
      sub: usuario.id,
      login: usuario.login,
      funcionarioId: usuario.funcionarioId,
      nomeCompleto: usuario.funcionario.nomeCompleto,
      permissoes: usuario.permissoes.map((permissao) => ({
        modulo: permissao.modulo,
        podeVisualizar: permissao.podeVisualizar,
        podeGerenciar: permissao.podeGerenciar,
      })),
    };
  }
}
