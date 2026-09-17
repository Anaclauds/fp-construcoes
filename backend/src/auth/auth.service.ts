import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StatusCadastro } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './interfaces/auth-user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { login: this.onlyDigits(loginDto.login) || loginDto.login },
      include: {
        funcionario: true,
        permissoes: {
          orderBy: { modulo: 'asc' },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Login ou senha invalidos');
    }

    if (
      usuario.status !== StatusCadastro.ATIVO ||
      usuario.funcionario.status !== StatusCadastro.ATIVO
    ) {
      throw new UnauthorizedException('Usuario inativo');
    }

    const senhaValida = await bcrypt.compare(loginDto.senha, usuario.senhaHash);

    if (!senhaValida) {
      throw new UnauthorizedException('Login ou senha invalidos');
    }

    const payload: AuthUser = {
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

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcesso: new Date() },
    });

    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: payload,
    };
  }

  async profile(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        login: true,
        funcionario: {
          select: {
            id: true,
            nomeCompleto: true,
            funcao: true,
            setorAtuacao: true,
            celular: true,
            cpf: true,
            contatoEmergencia: true,
            nomeContatoEmergencia: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return {
      usuarioId: usuario.id,
      login: usuario.login,
      ...usuario.funcionario,
    };
  }

  async changePassword(
    usuarioId: number,
    changePasswordDto: ChangePasswordDto,
  ) {
    if (changePasswordDto.novaSenha !== changePasswordDto.confirmarNovaSenha) {
      throw new BadRequestException(
        'A nova senha e a confirmação devem ser iguais',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { senhaHash: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const senhaAtualValida = await bcrypt.compare(
      changePasswordDto.senhaAtual,
      usuario.senhaHash,
    );

    if (!senhaAtualValida) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const senhaHash = await bcrypt.hash(changePasswordDto.novaSenha, 10);

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  private onlyDigits(value: string) {
    return value.replace(/\D/g, '');
  }
}
