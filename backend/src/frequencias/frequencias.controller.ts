import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ListFrequenciasQueryDto } from './dto/list-frequencias-query.dto';
import { RelatorioFrequenciaQueryDto } from './dto/relatorio-frequencia-query.dto';
import { SaveFrequenciaDto } from './dto/save-frequencia.dto';
import { UpdateObservacaoDto } from './dto/update-observacao.dto';
import { FrequenciasService } from './frequencias.service';

@ApiTags('Frequencias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('frequencias')
export class FrequenciasController {
  constructor(private readonly frequenciasService: FrequenciasService) {}

  @Get()
  @RequirePermission({ modulo: 'FREQUENCIA', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista a frequencia por data' })
  findAll(@Query() query: ListFrequenciasQueryDto) {
    return this.frequenciasService.findAll(query);
  }

  @Get('relatorio')
  @RequirePermission({ modulo: 'FREQUENCIA', acao: 'visualizar' })
  @ApiOperation({ summary: 'Gera dados do relatorio de frequencia' })
  relatorio(@Query() query: RelatorioFrequenciaQueryDto) {
    return this.frequenciasService.relatorio(query);
  }

  @Get(':id')
  @RequirePermission({ modulo: 'FREQUENCIA', acao: 'visualizar' })
  @ApiOperation({ summary: 'Busca um registro de frequencia pelo ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.frequenciasService.findOne(id);
  }

  @Post()
  @RequirePermission({ modulo: 'FREQUENCIA', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Salva a frequencia diaria em lote' })
  save(
    @Body() saveFrequenciaDto: SaveFrequenciaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.frequenciasService.save(saveFrequenciaDto, user.sub);
  }

  @Patch(':id/observacao')
  @RequirePermission({ modulo: 'FREQUENCIA', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Atualiza a observacao de um registro' })
  updateObservacao(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateObservacaoDto: UpdateObservacaoDto,
  ) {
    return this.frequenciasService.updateObservacao(id, updateObservacaoDto);
  }
}
