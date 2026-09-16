import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusCadastro } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ListUsuariosQueryDto } from './dto/list-usuarios-query.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly usuarioSelect = {
    id: true,
    funcionarioId: true,
    login: true,
    status: true,
    ultimoAcesso: true,
    funcionario: {
      select: {
        id: true,
        nomeCompleto: true,
        cpf: true,
        celular: true,
        funcao: true,
        status: true,
      },
    },
    permissoes: {
      select: {
        id: true,
        modulo: true,
        podeVisualizar: true,
        podeGerenciar: true,
      },
      orderBy: { modulo: 'asc' as const },
    },
  };

  async create(createUsuarioDto: CreateUsuarioDto) {
    if (createUsuarioDto.senha !== createUsuarioDto.confirmarSenha) {
      throw new BadRequestException('Senha e confirmacao devem ser iguais');
    }

    const funcionario = await this.prisma.funcionario.findUnique({
      where: { id: createUsuarioDto.funcionarioId },
    });

    if (!funcionario) {
      throw new NotFoundException('Funcionario nao encontrado');
    }

    const usuarioExistente = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { funcionarioId: createUsuarioDto.funcionarioId },
          { login: funcionario.cpf },
        ],
      },
    });

    if (usuarioExistente) {
      throw new ConflictException('Funcionario ja possui usuario cadastrado');
    }

    const senhaHash = await bcrypt.hash(createUsuarioDto.senha, 10);

    return this.prisma.usuario.create({
      data: {
        funcionarioId: createUsuarioDto.funcionarioId,
        login: funcionario.cpf,
        senhaHash,
        permissoes: createUsuarioDto.permissoes?.length
          ? {
              create: createUsuarioDto.permissoes,
            }
          : undefined,
      },
      select: this.usuarioSelect,
    });
  }

  findAll(query: ListUsuariosQueryDto) {
    return this.prisma.usuario.findMany({
      where: {
        status: query.status,
        OR: query.busca
          ? [
              { login: { contains: query.busca } },
              { funcionario: { nomeCompleto: { contains: query.busca } } },
              { funcionario: { cpf: { contains: query.busca } } },
              { funcionario: { funcao: { contains: query.busca } } },
            ]
          : undefined,
      },
      orderBy: { funcionario: { nomeCompleto: 'asc' } },
      select: this.usuarioSelect,
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: this.usuarioSelect,
    });

    if (!usuario) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    await this.findOne(id);

    if (updateUsuarioDto.senha !== updateUsuarioDto.confirmarSenha) {
      throw new BadRequestException('Senha e confirmacao devem ser iguais');
    }

    const senhaHash = updateUsuarioDto.senha
      ? await bcrypt.hash(updateUsuarioDto.senha, 10)
      : undefined;

    await this.prisma.$transaction(async (prisma) => {
      await prisma.usuario.update({
        where: { id },
        data: {
          status: updateUsuarioDto.status,
          senhaHash,
        },
      });

      if (updateUsuarioDto.permissoes) {
        await prisma.permissaoUsuario.deleteMany({
          where: { usuarioId: id },
        });

        if (updateUsuarioDto.permissoes.length) {
          await prisma.permissaoUsuario.createMany({
            data: updateUsuarioDto.permissoes.map((permissao) => ({
              usuarioId: id,
              ...permissao,
            })),
          });
        }
      }
    });

    return this.findOne(id);
  }

  async desativar(id: number) {
    await this.findOne(id);

    return this.prisma.usuario.update({
      where: { id },
      data: { status: StatusCadastro.INATIVO },
      select: this.usuarioSelect,
    });
  }

  async reativar(id: number) {
    await this.findOne(id);

    return this.prisma.usuario.update({
      where: { id },
      data: { status: StatusCadastro.ATIVO },
      select: this.usuarioSelect,
    });
  }
}
