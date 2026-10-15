import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AparaTexto } from './validators/texto.transformer';

class NovaCategoriaDto {
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;
}

@ApiTags('Categorias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('materiais')
  @RequirePermission(
    { modulo: 'MATERIAIS', acao: 'visualizar' },
    { modulo: 'ESTOQUE', acao: 'visualizar' },
    { modulo: 'DESPESAS', acao: 'visualizar' },
  )
  materiais() {
    return this.listar('MATERIAIS');
  }
  @Get('despesas')
  @RequirePermission({ modulo: 'DESPESAS', acao: 'visualizar' })
  despesas() {
    return this.listar('DESPESAS');
  }
  @Post('materiais')
  @RequirePermission(
    { modulo: 'MATERIAIS', acao: 'gerenciar' },
    { modulo: 'ESTOQUE', acao: 'gerenciar' },
  )
  criarMaterial(@Body() dto: NovaCategoriaDto) {
    return this.criar('MATERIAIS', dto.nome);
  }
  @Post('despesas')
  @RequirePermission({ modulo: 'DESPESAS', acao: 'gerenciar' })
  criarDespesa(@Body() dto: NovaCategoriaDto) {
    return this.criar('DESPESAS', dto.nome);
  }
  private listar(tipo: string) {
    return this.prisma.categoriaCadastro.findMany({
      where: { tipo },
      orderBy: [{ rotulo: 'asc' }, { id: 'asc' }],
    });
  }
  private criar(tipo: string, rotulo: string) {
    const nome =
      tipo === 'DESPESAS'
        ? rotulo
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
        : rotulo;
    return this.prisma.categoriaCadastro.create({
      data: { tipo, nome: nome || rotulo, rotulo },
    });
  }
}
