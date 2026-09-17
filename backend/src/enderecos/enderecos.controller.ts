import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnderecoCepDto } from './dto/endereco-cep.dto';
import { EnderecosService } from './enderecos.service';

@ApiTags('Endereços')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('enderecos')
export class EnderecosController {
  constructor(private readonly enderecosService: EnderecosService) {}

  @Get('cep/:cep')
  @ApiOperation({
    summary: 'Busca o endereço correspondente a um CEP',
    description:
      'Consulta um serviço público de CEP e retorna os dados normalizados para preenchimento de formulários.',
  })
  @ApiParam({ name: 'cep', example: '76900-058' })
  @ApiOkResponse({ type: EnderecoCepDto })
  @ApiBadRequestResponse({ description: 'CEP com formato inválido' })
  @ApiUnauthorizedResponse({ description: 'Token JWT ausente ou inválido' })
  @ApiNotFoundResponse({ description: 'CEP não encontrado' })
  @ApiServiceUnavailableResponse({
    description: 'Serviço externo indisponível ou tempo limite excedido',
  })
  buscarPorCep(@Param('cep') cep: string) {
    return this.enderecosService.buscarPorCep(cep);
  }
}
