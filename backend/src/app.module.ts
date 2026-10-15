import { Module } from '@nestjs/common';
import { CategoriasController } from './common/categorias.controller';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DadosValidationPipe } from './common/validators/validation.pipe';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CobrancasModule } from './cobrancas/cobrancas.module';
import { ClientesModule } from './clientes/clientes.module';
import { DespesasModule } from './despesas/despesas.module';
import { EnderecosModule } from './enderecos/enderecos.module';
import { EquipamentosModule } from './equipamentos/equipamentos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { FrequenciasModule } from './frequencias/frequencias.module';
import { FornecedoresModule } from './fornecedores/fornecedores.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';
import { MateriaisModule } from './materiais/materiais.module';
import { OrcamentosModule } from './orcamentos/orcamentos.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjetosModule } from './projetos/projetos.module';
import { ServicosModule } from './servicos/servicos.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    FuncionariosModule,
    FrequenciasModule,
    ClientesModule,
    EnderecosModule,
    DespesasModule,
    CobrancasModule,
    ProjetosModule,
    OrcamentosModule,
    ServicosModule,
    MateriaisModule,
    EstoqueModule,
    EquipamentosModule,
    FornecedoresModule,
    FinanceiroModule,
  ],
  controllers: [AppController, CategoriasController],
  providers: [
    AppService,
    { provide: APP_PIPE, useClass: DadosValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
