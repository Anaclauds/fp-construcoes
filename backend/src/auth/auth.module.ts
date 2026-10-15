import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'ip', ttl: 60000, limit: 10 },
      {
        name: 'cpf',
        ttl: 60000,
        limit: 5,
        skipIf: (context) => {
          const login = context
            .switchToHttp()
            .getRequest<{ body?: { login?: unknown } }>().body?.login;
          return (
            typeof login !== 'string' ||
            !/^\d{11}$/.test(login.replace(/\D/g, ''))
          );
        },
        getTracker: (req: { body?: { login?: unknown } }) =>
          typeof req.body?.login === 'string'
            ? req.body.login.replace(/\D/g, '')
            : '',
      },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: 8 * 60 * 60,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionsGuard, LoginThrottlerGuard],
  exports: [AuthService, JwtModule, PermissionsGuard],
})
export class AuthModule {}
