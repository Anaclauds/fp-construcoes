import { escaparLike } from '../common/utils/like.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusCadastro, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ListUsuariosQueryDto } from './dto/list-usuarios-query.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { protegerUltimoAdmin } from './ultimo-admin.util';

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
    this.validarPermissoes(createUsuarioDto.permissoes);
    if (createUsuarioDto.senha !== createUsuarioDto.confirmarSenha) {
      throw new BadRequestException({
        codigo: 'USUARIOS_CREATE_BADREQUEST_01',
        message: 'Senha e confirmacao devem ser iguais',
      });
    }

    const funcionario = await this.prisma.funcionario.findUnique({
      where: { id: createUsuarioDto.funcionarioId },
    });

    if (!funcionario) {
      throw new NotFoundException({
        codigo: 'USUARIOS_CREATE_NOTFOUND_01',
        message: 'Funcionario nao encontrado',
      });
    }

    if (funcionario.status !== StatusCadastro.ATIVO) {
      throw new BadRequestException({
        codigo: 'USUARIOS_CREATE_BADREQUEST_02',
        message: 'Reative o funcionario antes de criar seu usuario',
      });
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
      throw new ConflictException({
        codigo: 'USUARIOS_CREATE_CONFLICT_01',
        message: 'Funcionario ja possui usuario cadastrado',
      });
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

  async findAll(query: ListUsuariosQueryDto) {
    const where: Prisma.UsuarioWhereInput = {
      AND:
        query.status === 'ATIVO'
          ? [{ status: 'ATIVO', funcionario: { status: 'ATIVO' } }]
          : query.status === 'INATIVO'
            ? [
                {
                  OR: [
                    { status: 'INATIVO' },
                    { funcionario: { status: 'INATIVO' } },
                  ],
                },
              ]
            : undefined,
      OR: query.busca
        ? [
            { login: { contains: escaparLike(query.busca) } },
            {
              funcionario: {
                nomeCompleto: { contains: escaparLike(query.busca) },
              },
            },
            { funcionario: { cpf: { contains: escaparLike(query.busca) } } },
            {
              funcionario: { funcao: { contains: escaparLike(query.busca) } },
            },
          ]
        : undefined,
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const paginado = query.page !== undefined || query.limit !== undefined;
    const [registros, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        skip: paginado ? (page - 1) * limit : undefined,
        take: paginado ? limit : undefined,
        orderBy: [{ funcionario: { nomeCompleto: 'asc' } }, { id: 'asc' }],
        select: this.usuarioSelect,
      }),
      this.prisma.usuario.count({ where }),
    ]);
    const data = registros.map((usuario) => ({
      ...usuario,
      acessoAtivo:
        usuario.status === 'ATIVO' && usuario.funcionario.status === 'ATIVO',
    }));
    if (!paginado) return data;
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  opcoesFuncionarios() {
    return this.prisma.funcionario.findMany({
      where: { status: 'ATIVO', usuario: { is: null } },
      select: {
        id: true,
        nomeCompleto: true,
        cpf: true,
        funcao: true,
        setorAtuacao: true,
      },
      orderBy: [{ nomeCompleto: 'asc' }, { id: 'asc' }],
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: this.usuarioSelect,
    });

    if (!usuario) {
      throw new NotFoundException({
        codigo: 'USUARIOS_FINDONE_NOTFOUND_01',
        message: 'Usuario nao encontrado',
      });
    }

    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    const atual = await this.findOne(id);
    if (
      updateUsuarioDto.status === StatusCadastro.ATIVO &&
      atual.funcionario.status !== StatusCadastro.ATIVO
    ) {
      throw new BadRequestException({
        codigo: 'USUARIOS_UPDATE_BADREQUEST_01',
        message: 'Reative o funcionario antes de reativar seu usuario',
      });
    }
    this.validarPermissoes(updateUsuarioDto.permissoes);

    if (updateUsuarioDto.senha !== updateUsuarioDto.confirmarSenha) {
      throw new BadRequestException({
        codigo: 'USUARIOS_UPDATE_BADREQUEST_02',
        message: 'Senha e confirmacao devem ser iguais',
      });
    }

    const senhaHash = updateUsuarioDto.senha
      ? await bcrypt.hash(updateUsuarioDto.senha, 10)
      : undefined;

    await this.prisma.$transaction(async (prisma) => {
      if (
        updateUsuarioDto.status === StatusCadastro.INATIVO ||
        (updateUsuarioDto.permissoes &&
          !updateUsuarioDto.permissoes.some(
            (item) => item.modulo === 'GESTAO_USUARIOS' && item.podeGerenciar,
          ))
      ) {
        await protegerUltimoAdmin(prisma, id);
      }
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

    return this.prisma.$transaction(async (tx) => {
      await protegerUltimoAdmin(tx, id);
      return tx.usuario.update({
        where: { id },
        data: { status: StatusCadastro.INATIVO },
        select: this.usuarioSelect,
      });
    });
  }

  async reativar(id: number) {
    const atual = await this.findOne(id);
    if (atual.funcionario.status !== StatusCadastro.ATIVO) {
      throw new BadRequestException({
        codigo: 'USUARIOS_REATIVAR_BADREQUEST_01',
        message: 'Reative o funcionario antes de reativar seu usuario',
      });
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { status: StatusCadastro.ATIVO },
      select: this.usuarioSelect,
    });
  }

  private validarPermissoes(permissoes?: CreateUsuarioDto['permissoes']) {
    if (!permissoes) return;
    if (
      new Set(permissoes.map((item) => item.modulo)).size !== permissoes.length
    ) {
      throw new BadRequestException({
        codigo: 'USUARIOS_VALIDARPERMISSOES_BADREQUEST_01',
        message: 'Nao repita o mesmo modulo nas permissoes',
      });
    }
    for (const permissao of permissoes) {
      if (permissao.podeGerenciar) permissao.podeVisualizar = true;
    }
  }
}
