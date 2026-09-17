import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthUser } from './interfaces/auth-user.interface';
import { AuthService } from './auth.service';

@ApiTags('Autenticacao')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Realiza login e retorna token JWT' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna os dados do usuario autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o perfil completo do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil carregado com sucesso' })
  profile(@CurrentUser() user: AuthUser) {
    return this.authService.profile(user.sub);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Altera a senha do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Nova senha ou confirmação inválida',
  })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, changePasswordDto);
  }
}
