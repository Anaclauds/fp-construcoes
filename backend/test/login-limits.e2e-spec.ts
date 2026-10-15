import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Limites do login', () => {
  let app: INestApplication<App>;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('limita cinco tentativas por CPF e informa Retry-After', async () => {
    for (let index = 0; index < 5; index++) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ login: '111.444.777-35', senha: 'SenhaIncorretaDeTeste' })
        .expect(401);
    }
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: '11144477735', senha: 'SenhaIncorretaDeTeste' })
      .expect(429)
      .expect('Retry-After', '60');
  });

  it('limita o IP mesmo quando os CPFs e X-Forwarded-For mudam', async () => {
    for (let index = 0; index < 10; index++) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', `192.0.2.${index + 1}`)
        .send({
          login: `9999999${String(index).padStart(4, '0')}`,
          senha: 'SenhaIncorretaDeTeste',
        })
        .expect(401);
    }
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', '192.0.2.200')
      .send({ login: '99999990020', senha: 'SenhaIncorretaDeTeste' })
      .expect(429);
  });
});
