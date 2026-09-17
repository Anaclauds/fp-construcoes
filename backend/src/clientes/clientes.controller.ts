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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { ListClientesQueryDto } from './dto/list-clientes-query.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @RequirePermission({ modulo: 'CLIENTES', acao: 'gerenciar' })
  @ApiOperation({
    summary: 'Cadastra um cliente e completa o endereço pelo CEP',
    description:
      'Quando CEP, número e dados pessoais são enviados sem o endereço completo, a API consulta o CEP antes de validar e persistir o cliente.',
  })
  @ApiCreatedResponse({
    description: 'Cliente cadastrado com o endereço completo',
  })
  @ApiBadRequestResponse({ description: 'Dados do cliente ou CEP inválidos' })
  @ApiConflictResponse({ description: 'CPF/CNPJ já cadastrado' })
  @ApiServiceUnavailableResponse({
    description: 'Serviço de consulta de CEP temporariamente indisponível',
  })
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  @RequirePermission({ modulo: 'CLIENTES', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista clientes' })
  findAll(@Query() query: ListClientesQueryDto) {
    return this.clientesService.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ modulo: 'CLIENTES', acao: 'visualizar' })
  @ApiOperation({ summary: 'Busca um cliente pelo ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ modulo: 'CLIENTES', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Atualiza um cliente' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.clientesService.update(id, updateClienteDto);
  }

  @Patch(':id/desativar')
  @RequirePermission({ modulo: 'CLIENTES', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Desativa um cliente' })
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.desativar(id);
  }

  @Patch(':id/reativar')
  @RequirePermission({ modulo: 'CLIENTES', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Reativa um cliente' })
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.reativar(id);
  }
}
