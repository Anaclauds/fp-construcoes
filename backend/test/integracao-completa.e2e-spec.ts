/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EnderecosService } from '../src/enderecos/enderecos.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';

jest.setTimeout(120_000);

describe('Integracao completa da API', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let usuarioLimitadoToken: string;

  const execucao = Date.now().toString();
  const prefixo = `INT-${execucao}`;
  const senha = 'TesteIntegrado123';
  const modulos = [
    'GESTAO_USUARIOS',
    'GESTAO_FUNCIONARIOS',
    'FREQUENCIA',
    'CLIENTES',
    'ORCAMENTOS',
    'COBRANCAS',
    'PROJETOS',
    'SERVICOS',
    'MATERIAIS',
    'ESTOQUE',
    'EQUIPAMENTOS',
    'FORNECEDORES',
    'DESPESAS',
    'CAIXA',
  ];
  const anoCaixa = 2000 + (Number(execucao.slice(-2)) % 20);
  const mesCaixa = String((Number(execucao.slice(-4, -2)) % 12) + 1).padStart(
    2,
    '0',
  );
  const competencia = `${anoCaixa}-${mesCaixa}`;
  const dataFinanceira = `${competencia}-10`;
  const competenciaFormas = `202${Number(execucao.slice(-1)) % 4}-${mesCaixa}`;
  const dataFormasPagamento = `${competenciaFormas}-15`;

  const ids = {
    funcionarios: [] as number[],
    usuarios: [] as number[],
    clientes: [] as number[],
    fornecedores: [] as number[],
    materiais: [] as number[],
    servicos: [] as number[],
    equipamentos: [] as number[],
    orcamentos: [] as number[],
    projetos: [] as number[],
    despesas: [] as number[],
  };

  const api = () => request(app.getHttpServer());
  const autorizar = (token = adminToken) => `Bearer ${token}`;

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EnderecosService)
      .useValue({
        buscarPorCep: jest.fn((cep: string) => ({
          cep,
          logradouro: 'Rua retornada pela consulta de CEP',
          bairro: 'Centro',
          cidade: 'Ouro Preto do Oeste',
          estado: 'RO',
        })),
      })
      .compile();

    app = modulo.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');

    prisma = modulo.get(PrismaService);
    await prisma.categoriaCadastro.createMany({
      data: ['Insumos', 'Perfis'].map((nome) => ({
        tipo: 'MATERIAIS',
        nome,
        rotulo: nome,
      })),
      skipDuplicates: true,
    });
    const dadosFuncionario = funcionarioPayload(
      `Administrador ${prefixo}`,
      cpfTeste(1),
    );
    const funcionario = await prisma.funcionario.create({
      data: {
        ...dadosFuncionario,
        dataNascimento: new Date(
          `${dadosFuncionario.dataNascimento}T00:00:00.000Z`,
        ),
        dataContratacao: new Date(
          `${dadosFuncionario.dataContratacao}T00:00:00.000Z`,
        ),
      },
    });
    ids.funcionarios.push(funcionario.id);
    const usuario = await prisma.usuario.create({
      data: {
        funcionarioId: funcionario.id,
        login: funcionario.cpf,
        senhaHash: await bcrypt.hash(senha, 10),
        permissoes: {
          create: modulos.map((moduloNome) => ({
            modulo: moduloNome,
            podeVisualizar: true,
            podeGerenciar: true,
          })),
        },
      },
    });
    ids.usuarios.push(usuario.id);
  });

  afterAll(async () => {
    await limparDadosDeTeste();
    await app.close();
  });

  it('valida saude, login, JWT e credenciais invalidas', async () => {
    await api().get('/api').expect(200).expect('FP Construcoes API online');
    await api().get('/api/auth/me').expect(401);
    await api()
      .post('/api/auth/login')
      .send({ login: cpfTeste(1), senha: 'senha-incorreta' })
      .expect(401);

    const login = await api()
      .post('/api/auth/login')
      .send({ login: cpfTeste(1), senha })
      .expect(201);
    adminToken = login.body.accessToken as string;
    expect(adminToken).toBeTruthy();

    const me = await api()
      .get('/api/auth/me')
      .set('Authorization', autorizar())
      .expect(200);
    expect(me.body.login).toBe(cpfTeste(1));
    expect(me.body.permissoes).toHaveLength(modulos.length);
  });

  it('integra funcionarios, usuarios, permissoes e revogacao de acesso', async () => {
    const funcionario = await api()
      .post('/api/funcionarios')
      .set('Authorization', autorizar())
      .send(funcionarioPayload(`Funcionario ${prefixo}`, cpfTeste(2)))
      .expect(201);
    ids.funcionarios.push(funcionario.body.id as number);

    await api()
      .get(`/api/funcionarios?busca=${encodeURIComponent(prefixo)}`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.meta.total).toBeGreaterThanOrEqual(2));
    await api()
      .get(`/api/funcionarios/${funcionario.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/funcionarios/${funcionario.body.id}`)
      .set('Authorization', autorizar())
      .send({ apelido: 'Integrado' })
      .expect(200)
      .expect(({ body }) => expect(body.apelido).toBe('Integrado'));

    await api()
      .post('/api/usuarios')
      .set('Authorization', autorizar())
      .send({
        funcionarioId: funcionario.body.id,
        senha,
        confirmarSenha: 'confirmacao-diferente',
      })
      .expect(400);

    const usuario = await api()
      .post('/api/usuarios')
      .set('Authorization', autorizar())
      .send({
        funcionarioId: funcionario.body.id,
        senha,
        confirmarSenha: senha,
        permissoes: [
          {
            modulo: 'CLIENTES',
            podeVisualizar: true,
            podeGerenciar: false,
          },
        ],
      })
      .expect(201);
    ids.usuarios.push(usuario.body.id as number);

    await api()
      .get('/api/usuarios')
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/usuarios/${usuario.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);

    const loginLimitado = await api()
      .post('/api/auth/login')
      .send({ login: cpfTeste(2), senha })
      .expect(201);
    usuarioLimitadoToken = loginLimitado.body.accessToken as string;

    await api()
      .get('/api/clientes')
      .set('Authorization', autorizar(usuarioLimitadoToken))
      .expect(200);
    await api()
      .post('/api/clientes')
      .set('Authorization', autorizar(usuarioLimitadoToken))
      .send(clienteRapidoPayload(`Sem permissao ${prefixo}`))
      .expect(403);
    await api()
      .get('/api/usuarios')
      .set('Authorization', autorizar(usuarioLimitadoToken))
      .expect(403);

    await api()
      .patch(`/api/usuarios/${usuario.body.id}`)
      .set('Authorization', autorizar())
      .send({ senha: `${senha}X`, confirmarSenha: `${senha}X` })
      .expect(200);
    await api()
      .patch(`/api/usuarios/${usuario.body.id}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get('/api/auth/me')
      .set('Authorization', autorizar(usuarioLimitadoToken))
      .expect(401);
    await api()
      .post('/api/auth/login')
      .send({ login: cpfTeste(2), senha: `${senha}X` })
      .expect(401);
    await api()
      .patch(`/api/usuarios/${usuario.body.id}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);

    await api()
      .patch(`/api/funcionarios/${funcionario.body.id}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .post('/api/auth/login')
      .send({ login: cpfTeste(2), senha: `${senha}X` })
      .expect(401);
    await api()
      .patch(`/api/funcionarios/${funcionario.body.id}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);
  });

  it('salva, consulta e relata frequencia com justificativas', async () => {
    const funcionarioId = ids.funcionarios[1];
    const data = '2025-03-10';

    await api()
      .post('/api/frequencias')
      .set('Authorization', autorizar())
      .send({
        data,
        registros: [{ funcionarioId, status: 'FALTA_JUSTIFICADA' }],
      })
      .expect(400);

    const salvo = await api()
      .post('/api/frequencias')
      .set('Authorization', autorizar())
      .send({
        data,
        registros: [
          {
            funcionarioId,
            status: 'FALTA_JUSTIFICADA',
            observacao: 'Atestado medico do teste integrado.',
          },
        ],
      })
      .expect(201);
    expect(salvo.body.indicadores.naoRegistrados).toBeGreaterThan(0);
    const registro = salvo.body.registros.find(
      (item: { funcionarioId: number }) => item.funcionarioId === funcionarioId,
    );
    expect(registro.id).toBeTruthy();

    await api()
      .get(`/api/frequencias?data=${data}&funcionarioId=${funcionarioId}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/frequencias/${registro.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/frequencias/${registro.id}/observacao`)
      .set('Authorization', autorizar())
      .send({ observacao: 'Observacao atualizada no teste integrado.' })
      .expect(200);
    await api()
      .get(
        `/api/frequencias/relatorio?funcionarioId=${funcionarioId}&dataInicial=${data}&dataFinal=${data}`,
      )
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.registros).toHaveLength(1));

    for (const [indice, status] of [
      'PRESENTE',
      'MEIO_PERIODO',
      'FALTA_NAO_JUSTIFICADA',
    ].entries()) {
      await api()
        .post('/api/frequencias')
        .set('Authorization', autorizar())
        .send({
          data: `2025-03-${String(11 + indice).padStart(2, '0')}`,
          registros: [
            {
              funcionarioId,
              status,
              observacao:
                status === 'MEIO_PERIODO'
                  ? 'Justificativa para meio periodo.'
                  : undefined,
            },
          ],
        })
        .expect(201);
    }
  });

  it('cadastra e completa cliente, validando filtros e status', async () => {
    const criado = await api()
      .post('/api/clientes')
      .set('Authorization', autorizar())
      .send(clienteRapidoPayload(`Cliente ${prefixo}`))
      .expect(201);
    ids.clientes.push(criado.body.id as number);
    expect(criado.body.cadastroCompleto).toBe(false);

    for (const campos of [
      { cpfCnpj: '52998224724' },
      { telefone: '123' },
      { estado: 'ZZ' },
      { cep: '123' },
    ]) {
      await api()
        .patch(`/api/clientes/${criado.body.id}`)
        .set('Authorization', autorizar())
        .send(campos)
        .expect(400);
    }
    const semAlteracao = await api()
      .get(`/api/clientes/${criado.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    expect(semAlteracao.body.telefone).toBe(criado.body.telefone);
    expect(semAlteracao.body.estado).toBe(criado.body.estado);

    const atualizado = await api()
      .patch(`/api/clientes/${criado.body.id}`)
      .set('Authorization', autorizar())
      .send({
        tipo: 'PF',
        cpfCnpj: cpfTeste(3),
        email: `cliente.${execucao}@teste.local`,
        dataNascimento: '1992-06-15',
        sexo: 'NAO_INFORMADO',
        cep: '76920000',
        rua: 'Rua Integracao',
        numero: '100',
        bairro: 'Centro',
      })
      .expect(200);
    expect(atualizado.body.cadastroCompleto).toBe(true);

    await api()
      .get(`/api/clientes?busca=${encodeURIComponent(prefixo)}&tipo=PF`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.meta.total).toBe(1));
    await api()
      .get(`/api/clientes/${criado.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .post('/api/clientes')
      .set('Authorization', autorizar())
      .send({
        ...clienteRapidoPayload(`Duplicado ${prefixo}`),
        cpfCnpj: cpfTeste(3),
      })
      .expect(409);
    await api()
      .patch(`/api/clientes/${criado.body.id}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/clientes/${criado.body.id}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);

    const pessoaJuridica = await api()
      .post('/api/clientes')
      .set('Authorization', autorizar())
      .send({
        nome: `Empresa Cliente ${prefixo}`,
        telefone: '69999996666',
        cidade: 'Ouro Preto do Oeste',
        estado: 'RO',
        tipo: 'PJ',
        cpfCnpj: gerarCnpj(execucao.slice(-8).padStart(8, '2')),
        razaoSocial: `Empresa Cliente ${prefixo} Ltda`,
        nomeFantasia: `Cliente PJ ${prefixo}`,
        responsavel: 'Responsavel Cliente PJ',
        cargoResponsavel: 'Diretor',
        cep: '76920000',
        rua: 'Rua Pessoa Juridica',
        numero: '250',
        bairro: 'Centro',
      })
      .expect(201);
    ids.clientes.push(pessoaJuridica.body.id as number);
    expect(pessoaJuridica.body.tipo).toBe('PJ');
    expect(pessoaJuridica.body.cadastroCompleto).toBe(true);
  });

  it('integra fornecedor, materiais, estoque, servicos e equipamentos', async () => {
    const fornecedor = await api()
      .post('/api/fornecedores')
      .set('Authorization', autorizar())
      .send(fornecedorPayload())
      .expect(201);
    ids.fornecedores.push(fornecedor.body.id as number);

    await api()
      .get(`/api/fornecedores?busca=${encodeURIComponent(prefixo)}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get('/api/fornecedores/opcoes/ativos')
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/fornecedores/${fornecedor.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/fornecedores/${fornecedor.body.id}`)
      .set('Authorization', autorizar())
      .send({ complemento: 'Galpao de integracao' })
      .expect(200);
    await api()
      .patch(`/api/fornecedores/${fornecedor.body.id}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/fornecedores/${fornecedor.body.id}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);

    const material = await api()
      .post('/api/materiais')
      .set('Authorization', autorizar())
      .send({
        nome: `Cimento ${prefixo}`,
        categoria: 'Insumos',
        unidadeMedida: 'SC',
        descricao: 'Material do teste integrado.',
        precoReferencia: 10,
        fornecedorPreferencialId: fornecedor.body.id,
      })
      .expect(201);
    ids.materiais.push(material.body.id as number);

    await api()
      .post(`/api/estoque/${material.body.id}/ajustes`)
      .set('Authorization', autorizar())
      .send({
        tipo: 'AJUSTE_ENTRADA',
        quantidade: 100,
        justificativa: 'Saldo para testes integrados.',
      })
      .expect(201);
    await api()
      .get(`/api/materiais?busca=${encodeURIComponent(prefixo)}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/materiais/${material.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/materiais/${material.body.id}`)
      .set('Authorization', autorizar())
      .send({ precoReferencia: 11 })
      .expect(200);
    await api()
      .patch(`/api/materiais/${material.body.id}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/materiais/${material.body.id}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);

    const materialEstoque = await api()
      .post('/api/estoque/materiais')
      .set('Authorization', autorizar())
      .send({
        nome: `Tubo ${prefixo}`,
        categoria: 'Perfis',
        unidadeMedida: 'M',
        quantidadeInicial: 20,
        precoReferencia: 10,
        observacoes: 'Criado diretamente pelo estoque.',
      })
      .expect(201);
    ids.materiais.push(materialEstoque.body.id as number);
    await api()
      .post(`/api/estoque/${materialEstoque.body.id}/ajustes`)
      .set('Authorization', autorizar())
      .send({
        tipo: 'AJUSTE_SAIDA',
        quantidade: 2,
        justificativa: 'Saida controlada do teste integrado.',
      })
      .expect(201);
    await api()
      .get('/api/estoque?limit=100')
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/estoque/${materialEstoque.body.id}`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) =>
        expect(Number(body.saldo.quantidadeAtual)).toBe(18),
      );

    for (const categoria of ['CONSTRUCAO_CIVIL', 'CALHAS', 'SERRALHERIA']) {
      const servico = await api()
        .post('/api/servicos')
        .set('Authorization', autorizar())
        .send({
          nome: `Servico ${categoria} ${prefixo}`,
          categoria,
          descricao: 'Servico do teste integrado.',
          valorReferencia: categoria === 'CONSTRUCAO_CIVIL' ? 1000 : 300,
          unidadeMedida: 'SERVICO',
        })
        .expect(201);
      ids.servicos.push(servico.body.id as number);
    }
    const servicoId = ids.servicos[0];
    await api()
      .get(`/api/servicos?busca=${encodeURIComponent(prefixo)}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/servicos/${servicoId}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/servicos/${servicoId}`)
      .set('Authorization', autorizar())
      .send({ valorReferencia: 1050 })
      .expect(200);
    await api()
      .patch(`/api/servicos/${servicoId}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/servicos/${servicoId}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);

    const equipamento = await api()
      .post('/api/equipamentos')
      .set('Authorization', autorizar())
      .send({
        nome: `Betoneira ${prefixo}`,
        tipo: 'ELETRICO',
        marca: 'Teste',
        modelo: 'INT-1',
        dataAquisicao: '2025-01-10',
        valorAquisicao: 2500,
        fornecedorId: fornecedor.body.id,
      })
      .expect(201);
    ids.equipamentos.push(equipamento.body.id as number);
    expect(equipamento.body.codigoPatrimonial).toMatch(/^EQP-/);
    await api()
      .get(`/api/equipamentos?busca=${encodeURIComponent(prefixo)}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/equipamentos/${equipamento.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/equipamentos/${equipamento.body.id}`)
      .set('Authorization', autorizar())
      .send({ observacoes: 'Equipamento revisado.' })
      .expect(200);
    await api()
      .patch(`/api/equipamentos/${equipamento.body.id}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/equipamentos/${equipamento.body.id}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);
  });

  it('converte orcamento em projeto, reserva estoque e cria medicao', async () => {
    await api()
      .post('/api/financeiro/caixa/abrir')
      .set('Authorization', autorizar())
      .send({ competencia, valorInicial: 100 })
      .expect(201);
    await api()
      .post('/api/orcamentos')
      .set('Authorization', autorizar())
      .send({
        titulo: `Categorias incompatíveis ${prefixo}`,
        tipo: 'CONSTRUCAO_CIVIL',
        clienteId: ids.clientes[0],
        prazoEstimadoDias: 30,
        servicos: [
          { servicoId: ids.servicos[1], quantidade: 1, valorUnitario: 300 },
        ],
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'Todos os servicos devem pertencer ao mesmo tipo do orcamento',
        ),
      );

    const orcamento = await api()
      .post('/api/orcamentos')
      .set('Authorization', autorizar())
      .send({
        titulo: `Construcao ${prefixo}`,
        tipo: 'CONSTRUCAO_CIVIL',
        clienteId: ids.clientes[0],
        prazoEstimadoDias: 120,
        desconto: 0,
        modalidadePagamento: 'A_VISTA',
        materiais: [
          { materialId: ids.materiais[0], quantidade: 5, valorUnitario: 10 },
        ],
        servicos: [
          { servicoId: ids.servicos[0], quantidade: 1, valorUnitario: 1000 },
        ],
      })
      .expect(201);
    ids.orcamentos.push(orcamento.body.id as number);
    expect(Number(orcamento.body.valorTotal)).toBe(1050);

    await api()
      .patch(`/api/orcamentos/${orcamento.body.id}`)
      .set('Authorization', autorizar())
      .send({ tipo: 'CALHAS' })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'Todos os servicos devem pertencer ao mesmo tipo do orcamento',
        ),
      );

    await api()
      .get('/api/orcamentos/opcoes/materiais')
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get('/api/orcamentos/opcoes/servicos')
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/orcamentos?busca=${encodeURIComponent(prefixo)}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/orcamentos/${orcamento.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/orcamentos/${orcamento.body.id}`)
      .set('Authorization', autorizar())
      .send({ titulo: `Construcao atualizada ${prefixo}` })
      .expect(200);
    await api()
      .patch(`/api/orcamentos/${orcamento.body.id}/status`)
      .set('Authorization', autorizar())
      .send({ status: 'EM_ANALISE' })
      .expect(200);

    const aprovacao = await api()
      .patch(`/api/orcamentos/${orcamento.body.id}/aprovar`)
      .set('Authorization', autorizar())
      .send({
        responsavelId: ids.funcionarios[1],
        previsaoInicio: '2025-03-01',
        previsaoConclusao: '2025-12-01',
        cepObra: '76920-000',
        cidadeObra: 'Ouro Preto do Oeste',
        estadoObra: 'RO',
        ruaObra: 'Rua do teste integrado',
        numeroObra: '100',
        bairroObra: 'Centro',
      })
      .expect(200);
    const projetoId = aprovacao.body.projeto.id as number;
    ids.projetos.push(projetoId);
    await api()
      .patch(`/api/orcamentos/${orcamento.body.id}`)
      .set('Authorization', autorizar())
      .send({ titulo: 'Alteracao proibida' })
      .expect(400);

    await api()
      .get('/api/projetos/opcoes/materiais')
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get('/api/projetos/opcoes/servicos')
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/projetos?busca=${encodeURIComponent(prefixo)}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/projetos/${projetoId}`)
      .set('Authorization', autorizar())
      .expect(200);

    await api()
      .patch(`/api/projetos/${projetoId}/iniciar`)
      .set('Authorization', autorizar())
      .send({ dataInicio: '2025-03-01', previsaoConclusao: '2025-12-01' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('EM_EXECUCAO'));
    await api()
      .patch(`/api/materiais/${ids.materiais[0]}/desativar`)
      .set('Authorization', autorizar())
      .expect(409);

    await api()
      .post(`/api/projetos/${projetoId}/extras`)
      .set('Authorization', autorizar())
      .send({
        descricaoJustificativa: `Saldo insuficiente ${prefixo}`,
        dataRegistro: '2025-03-20',
        materiais: [
          {
            materialId: ids.materiais[0],
            quantidade: 10000,
            custoUnitarioEstimado: 11,
          },
        ],
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toContain('Estoque insuficiente'),
      );

    await api()
      .post(`/api/projetos/${projetoId}/extras`)
      .set('Authorization', autorizar())
      .send({
        descricaoJustificativa: `Extra ${prefixo}`,
        dataRegistro: dataFinanceira,
        materiais: [
          {
            materialId: ids.materiais[0],
            quantidade: 2,
            custoUnitarioEstimado: 11,
          },
        ],
        servicos: [
          {
            servicoId: ids.servicos[0],
            quantidade: 0.5,
            custoUnitarioEstimado: 500,
          },
        ],
      })
      .expect(201);

    const etapa = await api()
      .post(`/api/projetos/${projetoId}/etapas`)
      .set('Authorization', autorizar())
      .send({
        descricao: `Medicao ${prefixo}`,
        dataRegistro: '2025-05-01',
        valorCobrado: 500,
        formaPagamento: 'PIX',
        modalidadeCobranca: 'A_VISTA',
        servicos: [
          { servicoId: ids.servicos[0], quantidade: 0.5, valorUnitario: 1000 },
        ],
        materiaisCliente: [
          {
            nome: 'Areia fornecida pelo cliente',
            quantidade: 2,
            unidadeMedida: 'M3',
          },
        ],
      })
      .expect(201);
    expect(etapa.body.etapas[0].materiaisCliente).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nome: 'Areia fornecida pelo cliente' }),
      ]),
    );
    const cobrancaEtapa = etapa.body.cobrancas.find(
      (item: { etapaId: number | null }) => item.etapaId !== null,
    );
    expect(cobrancaEtapa).toBeTruthy();

    await api()
      .get(`/api/projetos/${projetoId}/historico`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.historico).toHaveLength(2));
  });

  it('gera cobrancas, recebimento, relatorio e entrada no caixa', async () => {
    const projetoId = ids.projetos[0];
    const projeto = await api()
      .get(`/api/projetos/${projetoId}`)
      .set('Authorization', autorizar())
      .expect(200);
    const cobrancaEtapa = projeto.body.cobrancas.find(
      (item: { etapaId: number | null }) => item.etapaId !== null,
    );

    await api()
      .get('/api/cobrancas?limit=100')
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .get(`/api/cobrancas/projetos/${projetoId}`)
      .set('Authorization', autorizar())
      .expect(200);
    const detalhes = await api()
      .get(`/api/cobrancas/${cobrancaEtapa.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    const parcela = detalhes.body.parcelas[0];

    await api()
      .post('/api/financeiro/caixa/abrir')
      .set('Authorization', autorizar())
      .send({ competencia, valorInicial: 100 })
      .expect(409);
    await api()
      .post(`/api/cobrancas/${cobrancaEtapa.id}/recebimentos`)
      .set('Authorization', autorizar())
      .send({
        parcelaId: parcela.id,
        valor: 501,
        dataRecebimento: dataFinanceira,
        formaPagamento: 'PIX',
      })
      .expect(400);
    await api()
      .post(`/api/cobrancas/${cobrancaEtapa.id}/recebimentos`)
      .set('Authorization', autorizar())
      .send({
        parcelaId: parcela.id,
        valor: 500,
        dataRecebimento: dataFinanceira,
        formaPagamento: 'PIX',
        observacoes: prefixo,
      })
      .expect(201);

    await api()
      .get(`/api/cobrancas/${cobrancaEtapa.id}`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('PAGO'));
    await api()
      .get(
        `/api/financeiro/relatorios/recebimentos?dataInicio=${competencia}-01&dataFim=${competencia}-28&projetoId=${projetoId}&formaPagamento=PIX`,
      )
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.meta.total).toBe(1));

    await api()
      .get(`/api/cobrancas/relatorios?clienteId=${ids.clientes[0]}`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.data.length).toBeGreaterThan(0));
    await api()
      .get('/api/cobrancas/relatorios/exportar/pdf')
      .set('Authorization', autorizar())
      .expect('Content-Type', /application\/pdf/)
      .expect(200);
    await api()
      .get('/api/cobrancas/relatorios/exportar/excel')
      .set('Authorization', autorizar())
      .expect(
        'Content-Type',
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
      )
      .expect(200);
  });

  it('integra despesas com estoque e saidas do caixa', async () => {
    const materialId = ids.materiais[0];
    const saldoAntes = await api()
      .get(`/api/estoque/${materialId}`)
      .set('Authorization', autorizar())
      .expect(200);

    const compra = await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'COMPRA_MATERIAL',
        categoria: 'COMPRA_MATERIAL',
        data: dataFinanceira,
        fornecedorId: ids.fornecedores[0],
        descricao: `Compra ${prefixo}`,
        materiais: [
          { materialId, quantidade: 3, unidadeMedida: 'SC', valorUnitario: 20 },
        ],
      })
      .expect(201);
    ids.despesas.push(compra.body.id as number);
    expect(Number(compra.body.valorTotal)).toBe(60);

    const compraEditada = await api()
      .patch(`/api/despesas/${compra.body.id}`)
      .set('Authorization', autorizar())
      .send({
        materiais: [
          { materialId, quantidade: 4, unidadeMedida: 'SC', valorUnitario: 20 },
        ],
      })
      .expect(200);
    expect(Number(compraEditada.body.valorTotal)).toBe(80);

    const saldoDepois = await api()
      .get(`/api/estoque/${materialId}`)
      .set('Authorization', autorizar())
      .expect(200);
    expect(Number(saldoDepois.body.saldo.quantidadeAtual)).toBe(
      Number(saldoAntes.body.saldo.quantidadeAtual) + 4,
    );

    const extraSomenteMaterial = await api()
      .post(`/api/projetos/${ids.projetos[0]}/extras`)
      .set('Authorization', autorizar())
      .send({
        descricaoJustificativa: `Material reservado ${prefixo}`,
        dataRegistro: dataFinanceira,
        materiais: [
          {
            materialId,
            quantidade: 3,
            custoUnitarioEstimado: 20,
          },
        ],
      })
      .expect(201);
    const extraMaterial = extraSomenteMaterial.body.extras.find(
      (item: { descricaoJustificativa: string }) =>
        item.descricaoJustificativa.includes('Material reservado'),
    );
    expect(extraMaterial.despesa).toBeNull();

    const diversa = await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'DIVERSA',
        categoria: 'MANUTENCAO',
        data: dataFinanceira,
        descricao: `Manutencao ${prefixo}`,
        valorTotal: 30,
      })
      .expect(201);
    ids.despesas.push(diversa.body.id as number);

    const diversaSemCategoria = await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'DIVERSA',
        data: dataFinanceira,
        descricao: `Despesa sem categoria ${prefixo}`,
        categoria: 'OUTROS',
        valorTotal: 10,
      })
      .expect(201);
    ids.despesas.push(diversaSemCategoria.body.id as number);
    expect(diversaSemCategoria.body.categoria).toBe('OUTROS');

    await api()
      .get(`/api/despesas?busca=${encodeURIComponent(prefixo)}&limit=100`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.meta.total).toBe(4));
    await api()
      .get(`/api/despesas/${diversa.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);

    const caixa = await api()
      .get(`/api/financeiro/caixa?competencia=${competencia}`)
      .set('Authorization', autorizar())
      .expect(200);
    expect(Number(caixa.body.resumo.totalEntradas)).toBe(500);
    expect(Number(caixa.body.resumo.totalSaidas)).toBe(370);
    expect(Number(caixa.body.resumo.saldoAtual)).toBe(230);
  });

  it('calcula e recebe cobrancas em todas as formas de pagamento', async () => {
    const projetoId = ids.projetos[0];
    const formasPagamento = [
      'PIX',
      'DINHEIRO',
      'TRANSFERENCIA',
      'CHEQUE',
      'CARTAO_CREDITO',
      'CARTAO_DEBITO',
      'BOLETO',
    ];
    const formasComAcrescimo = new Set([
      'CARTAO_CREDITO',
      'CARTAO_DEBITO',
      'BOLETO',
    ]);

    const anterior = await api()
      .get(`/api/financeiro/caixa?competencia=${competencia}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/financeiro/caixa/${anterior.body.id}/fechar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .post('/api/financeiro/caixa/abrir')
      .set('Authorization', autorizar())
      .send({ competencia: competenciaFormas, valorInicial: 0 })
      .expect(201);

    for (const formaPagamento of formasPagamento) {
      const percentualAcrescimo = formasComAcrescimo.has(formaPagamento)
        ? 2
        : 0;
      const valorEsperado = percentualAcrescimo ? 97 : 95;
      const cobranca = await api()
        .post('/api/cobrancas')
        .set('Authorization', autorizar())
        .send({
          projetoId,
          tipo: 'FINAL',
          modalidade: 'A_VISTA',
          formaPagamento,
          percentualDesconto: 5,
          percentualAcrescimo,
          valorBase: 100,
          primeiroVencimento: dataFormasPagamento,
        })
        .expect(201);
      expect(Number(cobranca.body.desconto)).toBe(5);
      expect(Number(cobranca.body.acrescimo)).toBe(percentualAcrescimo ? 2 : 0);
      expect(Number(cobranca.body.valorTotal)).toBe(valorEsperado);

      await api()
        .post(`/api/cobrancas/${cobranca.body.id}/recebimentos`)
        .set('Authorization', autorizar())
        .send({
          parcelaId: cobranca.body.parcelas[0].id,
          valor: valorEsperado,
          dataRecebimento: dataFormasPagamento,
          formaPagamento,
          observacoes: `Recebimento ${formaPagamento} ${prefixo}`,
        })
        .expect(201)
        .expect(({ body }) => expect(body.status).toBe('PAGO'));

      await api()
        .get(
          `/api/financeiro/relatorios/recebimentos?dataInicio=${competenciaFormas}-01&dataFim=${competenciaFormas}-28&formaPagamento=${formaPagamento}`,
        )
        .set('Authorization', autorizar())
        .expect(200)
        .expect(({ body }) => expect(body.meta.total).toBe(1));
    }

    const parceladaAutomatica = await api()
      .post('/api/cobrancas')
      .set('Authorization', autorizar())
      .send({
        projetoId,
        tipo: 'FINAL',
        modalidade: 'PARCELADO_AUTOMATICO',
        formaPagamento: 'CARTAO_CREDITO',
        valorBase: 100,
        numeroParcelas: 3,
        primeiroVencimento: dataFormasPagamento,
      })
      .expect(201);
    expect(parceladaAutomatica.body.parcelas).toHaveLength(3);
    expect(
      parceladaAutomatica.body.parcelas.reduce(
        (total: number, item: { valor: string }) => total + Number(item.valor),
        0,
      ),
    ).toBeCloseTo(100, 2);

    await api()
      .post('/api/cobrancas')
      .set('Authorization', autorizar())
      .send({
        projetoId,
        tipo: 'FINAL',
        modalidade: 'PARCELADO_MANUAL',
        formaPagamento: 'BOLETO',
        valorBase: 100,
        parcelas: [
          { numero: 1, vencimento: dataFormasPagamento, valor: 30 },
          { numero: 2, vencimento: `${competenciaFormas}-20`, valor: 70 },
        ],
      })
      .expect(201)
      .expect(({ body }) => expect(body.parcelas).toHaveLength(2));

    await api()
      .post('/api/cobrancas')
      .set('Authorization', autorizar())
      .send({
        projetoId,
        tipo: 'FINAL',
        modalidade: 'PARCELADO_MANUAL',
        formaPagamento: 'BOLETO',
        valorBase: 100,
        parcelas: [
          { numero: 1, vencimento: dataFormasPagamento, valor: 20 },
          { numero: 2, vencimento: `${competenciaFormas}-20`, valor: 70 },
        ],
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toContain('soma das parcelas'),
      );

    const caixa = await api()
      .get(`/api/financeiro/caixa?competencia=${competenciaFormas}`)
      .set('Authorization', autorizar())
      .expect(200);
    expect(Number(caixa.body.resumo.totalEntradas)).toBe(671);
    await api()
      .patch(`/api/financeiro/caixa/${caixa.body.id}/fechar`)
      .set('Authorization', autorizar())
      .expect(200);

    const cobrancaBloqueada = await api()
      .post('/api/cobrancas')
      .set('Authorization', autorizar())
      .send({
        projetoId,
        tipo: 'FINAL',
        modalidade: 'A_VISTA',
        formaPagamento: 'PIX',
        valorBase: 20,
        primeiroVencimento: dataFormasPagamento,
      })
      .expect(201);
    await api()
      .post(`/api/cobrancas/${cobrancaBloqueada.body.id}/recebimentos`)
      .set('Authorization', autorizar())
      .send({
        parcelaId: cobrancaBloqueada.body.parcelas[0].id,
        valor: 20,
        dataRecebimento: dataFormasPagamento,
        formaPagamento: 'PIX',
      })
      .expect(400);
  });

  it('testa projeto nao construtivo, cobranca direta e fechamento do caixa', async () => {
    const orcamentoSerralheria = await api()
      .post('/api/orcamentos')
      .set('Authorization', autorizar())
      .send({
        titulo: `Serralheria ${prefixo}`,
        tipo: 'SERRALHERIA',
        clienteId: ids.clientes[1],
        prazoEstimadoDias: 20,
        modalidadePagamento: 'A_VISTA',
        servicos: [
          { servicoId: ids.servicos[2], quantidade: 1, valorUnitario: 300 },
        ],
      })
      .expect(201);
    ids.orcamentos.push(orcamentoSerralheria.body.id as number);
    const projetoSerralheria = await api()
      .patch(`/api/orcamentos/${orcamentoSerralheria.body.id}/aprovar`)
      .set('Authorization', autorizar())
      .send(aprovacaoPayload(ids.funcionarios[1], '2067-01-01', '2067-02-01'))
      .expect(200);
    ids.projetos.push(projetoSerralheria.body.projeto.id as number);
    await api()
      .patch(`/api/projetos/${projetoSerralheria.body.projeto.id}/iniciar`)
      .set('Authorization', autorizar())
      .send({
        formaPagamento: 'CARTAO_CREDITO',
        modalidadeCobranca: 'A_VISTA',
        descontoPercentual: 5,
        acrescimoPercentual: 2,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.orcamento.tipo).toBe('SERRALHERIA');
        expect(Number(body.cobrancas[0].valorTotal)).toBe(291);
      });

    const orcamento = await api()
      .post('/api/orcamentos')
      .set('Authorization', autorizar())
      .send({
        titulo: `Calhas ${prefixo}`,
        tipo: 'CALHAS',
        clienteId: ids.clientes[0],
        prazoEstimadoDias: 15,
        modalidadePagamento: 'A_VISTA',
        servicos: [
          { servicoId: ids.servicos[1], quantidade: 1, valorUnitario: 300 },
        ],
      })
      .expect(201);
    ids.orcamentos.push(orcamento.body.id as number);
    const aprovado = await api()
      .patch(`/api/orcamentos/${orcamento.body.id}/aprovar`)
      .set('Authorization', autorizar())
      .send({
        responsavelId: ids.funcionarios[1],
        previsaoInicio: '2025-03-01',
        previsaoConclusao: '2025-04-01',
        cepObra: '76920-000',
        cidadeObra: 'Ouro Preto do Oeste',
        estadoObra: 'RO',
        ruaObra: 'Rua do teste integrado',
        numeroObra: '100',
        bairroObra: 'Centro',
      })
      .expect(200);
    const projetoId = aprovado.body.projeto.id as number;
    ids.projetos.push(projetoId);

    const iniciado = await api()
      .patch(`/api/projetos/${projetoId}/iniciar`)
      .set('Authorization', autorizar())
      .send({ formaPagamento: 'PIX', modalidadeCobranca: 'A_VISTA' })
      .expect(200);
    expect(iniciado.body.cobrancas).toHaveLength(1);

    const cobrancaDireta = await api()
      .post('/api/cobrancas')
      .set('Authorization', autorizar())
      .send({
        projetoId: ids.projetos[0],
        tipo: 'FINAL',
        modalidade: 'A_VISTA',
        formaPagamento: 'PIX',
        valorBase: 100,
        primeiroVencimento: dataFinanceira,
      })
      .expect(201);

    await api()
      .patch(`/api/projetos/${projetoId}/status`)
      .set('Authorization', autorizar())
      .send({ status: 'CANCELADO' })
      .expect(200);

    const caixa = await api()
      .get(`/api/financeiro/caixa?competencia=${competencia}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/financeiro/caixa/${caixa.body.id}/fechar`)
      .set('Authorization', autorizar())
      .expect(409);
    await api()
      .patch(`/api/financeiro/caixa/${caixa.body.id}/fechar`)
      .set('Authorization', autorizar())
      .expect(409);
    await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'DIVERSA',
        categoria: 'OUTROS',
        data: dataFinanceira,
        descricao: `Bloqueada ${prefixo}`,
        valorTotal: 10,
      })
      .expect(400);
    await api()
      .patch(`/api/despesas/${ids.despesas[0]}`)
      .set('Authorization', autorizar())
      .send({ descricao: 'Edicao bloqueada' })
      .expect(400);

    const cobranca = await api()
      .get(`/api/cobrancas/${cobrancaDireta.body.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .post(`/api/cobrancas/${cobrancaDireta.body.id}/recebimentos`)
      .set('Authorization', autorizar())
      .send({
        parcelaId: cobranca.body.parcelas[0].id,
        valor: 100,
        dataRecebimento: dataFinanceira,
        formaPagamento: 'PIX',
      })
      .expect(400);
  });

  it('consulta opcoes do orcamento com permissao restrita sem liberar o cadastro de clientes', async () => {
    const usuarioId = ids.usuarios[1];
    await prisma.permissaoUsuario.create({
      data: {
        usuarioId,
        modulo: 'ORCAMENTOS',
        podeVisualizar: true,
        podeGerenciar: false,
      },
    });
    try {
      await api()
        .get('/api/orcamentos/opcoes/clientes')
        .set('Authorization', autorizar(usuarioLimitadoToken))
        .expect(200);
      await api()
        .get(`/api/orcamentos/opcoes/clientes/${ids.clientes[0]}`)
        .set('Authorization', autorizar(usuarioLimitadoToken))
        .expect(200);
      await api()
        .get('/api/orcamentos/opcoes/responsaveis')
        .set('Authorization', autorizar(usuarioLimitadoToken))
        .expect(200);
      await api()
        .post('/api/clientes')
        .set('Authorization', autorizar(usuarioLimitadoToken))
        .send(clienteRapidoPayload('Sem acesso'))
        .expect(403);
    } finally {
      await prisma.permissaoUsuario.deleteMany({
        where: { usuarioId, modulo: 'ORCAMENTOS' },
      });
    }
  });

  it('libera somente as opcoes necessarias para registrar despesas', async () => {
    const usuarioId = ids.usuarios[1];
    await prisma.permissaoUsuario.create({
      data: {
        usuarioId,
        modulo: 'DESPESAS',
        podeVisualizar: true,
        podeGerenciar: false,
      },
    });
    try {
      await api()
        .get('/api/despesas/opcoes/materiais?limit=100')
        .set('Authorization', autorizar(usuarioLimitadoToken))
        .expect(200)
        .expect(({ body }) => expect(body.data.length).toBeGreaterThan(0));
      await api()
        .get('/api/fornecedores/opcoes/ativos')
        .set('Authorization', autorizar(usuarioLimitadoToken))
        .expect(200);
      await api()
        .get('/api/materiais')
        .set('Authorization', autorizar(usuarioLimitadoToken))
        .expect(403);
    } finally {
      await prisma.permissaoUsuario.deleteMany({
        where: { usuarioId, modulo: 'DESPESAS' },
      });
    }
  });

  it('recusa datas inexistentes, datas com hora e recebimentos futuros', async () => {
    await api()
      .get('/api/frequencias?data=2026-02-30')
      .set('Authorization', autorizar())
      .expect(400);
    await api()
      .get('/api/despesas?dataInicio=2026-10-14T12:00:00Z')
      .set('Authorization', autorizar())
      .expect(400);
    await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'DIVERSA',
        data: '2099-01-01',
        descricao: 'Futuro',
        valorTotal: 1,
      })
      .expect(400);
  });

  it('filtra cadastroCompleto=false sem converter a string em true', async () => {
    await api()
      .get('/api/clientes?cadastroCompleto=false&limit=100')
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) =>
        expect(
          body.data.every(
            (item: { cadastroCompleto: boolean }) => !item.cadastroCompleto,
          ),
        ).toBe(true),
      );
    await api()
      .get('/api/clientes?cadastroCompleto=abc')
      .set('Authorization', autorizar())
      .expect(400);
  });

  it('calcula vencimentos no ultimo dia do mes e rejeita parcelas zeradas', async () => {
    const projetoId = ids.projetos[0];
    const cobranca = await api()
      .post('/api/cobrancas')
      .set('Authorization', autorizar())
      .send({
        projetoId,
        tipo: 'ENTRADA',
        modalidade: 'PARCELADO_AUTOMATICO',
        formaPagamento: 'BOLETO',
        valorBase: 3,
        numeroParcelas: 3,
        primeiroVencimento: '2027-01-31',
      })
      .expect(201);
    expect(
      cobranca.body.parcelas.map((item: { vencimento: string }) =>
        item.vencimento.slice(0, 10),
      ),
    ).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
    await api()
      .post('/api/cobrancas')
      .set('Authorization', autorizar())
      .send({
        projetoId,
        tipo: 'ENTRADA',
        modalidade: 'PARCELADO_AUTOMATICO',
        formaPagamento: 'BOLETO',
        valorBase: 0.01,
        numeroParcelas: 60,
      })
      .expect(400);
    await api()
      .patch(`/api/cobrancas/${cobranca.body.id}/cancelar`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.valorRestante).toBe(0));
  });

  it('reabre caixa com auditoria e registra gasto avulso sem permitir alterar seu valor em despesas', async () => {
    const caixa = await api()
      .get(`/api/financeiro/caixa?competencia=${competenciaFormas}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/financeiro/caixa/${caixa.body.id}/reabrir`)
      .set('Authorization', autorizar())
      .expect(200);
    expect(
      await prisma.auditoriaCaixa.count({
        where: { caixaId: caixa.body.id, usuarioId: ids.usuarios[0] },
      }),
    ).toBe(1);
    const projeto = await api()
      .post(`/api/projetos/${ids.projetos[0]}/extras`)
      .set('Authorization', autorizar())
      .send({
        descricaoJustificativa: `Gasto avulso ${prefixo}`,
        dataRegistro: dataFormasPagamento,
        gastosAvulsos: [{ descricao: 'Aluguel', valor: 0.2 }],
      })
      .expect(201);
    const extra = projeto.body.extras.find(
      (item: { descricaoJustificativa: string }) =>
        item.descricaoJustificativa === `Gasto avulso ${prefixo}`,
    );
    expect(extra.gastosAvulsos).toHaveLength(1);
    expect(Number(extra.despesa.valorTotal)).toBe(0.2);
    await api()
      .patch(`/api/despesas/${extra.despesaId}`)
      .set('Authorization', autorizar())
      .send({ valorTotal: 100 })
      .expect(400);
    await api()
      .patch(`/api/projetos/${ids.projetos[0]}/extras/${extra.id}`)
      .set('Authorization', autorizar())
      .send({ dataRegistro: `${competencia}-11` })
      .expect(409);
  });

  it('conclui projeto, baixa reservas e valida erros gerais', async () => {
    const projetoId = ids.projetos[0];
    await api()
      .patch(`/api/projetos/${projetoId}/status`)
      .set('Authorization', autorizar())
      .send({ status: 'CONCLUIDO' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('CONCLUIDO'));
    await api()
      .patch(`/api/projetos/${projetoId}/status`)
      .set('Authorization', autorizar())
      .send({ status: 'CONCLUIDO' })
      .expect(409);

    await api()
      .patch(`/api/materiais/${ids.materiais[0]}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/materiais/${ids.materiais[0]}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);

    await api()
      .get('/api/clientes/999999999')
      .set('Authorization', autorizar())
      .expect(404);
    await api()
      .post('/api/clientes')
      .set('Authorization', autorizar())
      .send({
        ...clienteRapidoPayload(`Campo extra ${prefixo}`),
        campoInvalido: true,
      })
      .expect(400);
  });

  it('protege todas as listas contra requisicoes sem token ou token adulterado', async () => {
    for (const recurso of [
      'clientes',
      'funcionarios',
      'usuarios',
      'frequencias',
      'orcamentos',
      'cobrancas',
      'projetos',
      'servicos',
      'materiais',
      'estoque',
      'equipamentos',
      'fornecedores',
      'despesas',
      'financeiro/caixa',
    ]) {
      await api().get(`/api/${recurso}`).expect(401);
      await api()
        .get(`/api/${recurso}`)
        .set('Authorization', 'Bearer token-adulterado')
        .expect(401);
    }
  });

  it('altera senha sem expor hash e valida o perfil autenticado', async () => {
    const perfil = await api()
      .get('/api/auth/profile')
      .set('Authorization', autorizar())
      .expect(200);
    expect(perfil.body.login).toBe(cpfTeste(1));
    expect(JSON.stringify(perfil.body)).not.toContain('senhaHash');
    await api()
      .patch('/api/auth/password')
      .set('Authorization', autorizar())
      .send({
        senhaAtual: 'incorreta',
        novaSenha: `${senha}Nova`,
        confirmarNovaSenha: `${senha}Nova`,
      })
      .expect(401);
    await api()
      .patch('/api/auth/password')
      .set('Authorization', autorizar())
      .send({
        senhaAtual: senha,
        novaSenha: `${senha}Nova`,
        confirmarNovaSenha: `${senha}Nova`,
      })
      .expect(200);
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id: ids.usuarios[0] },
    });
    expect(await bcrypt.compare(`${senha}Nova`, usuario.senhaHash)).toBe(true);
    await api()
      .patch('/api/auth/password')
      .set('Authorization', autorizar())
      .send({
        senhaAtual: `${senha}Nova`,
        novaSenha: senha,
        confirmarNovaSenha: senha,
      })
      .expect(200);
  });

  it('gera PDF de frequencia e filtra dias sem registro pela API', async () => {
    const parametros = `funcionarioId=${ids.funcionarios[1]}&dataInicial=2025-03-10&dataFinal=2025-03-16`;
    const consulta = await api()
      .get(`/api/frequencias/relatorio?${parametros}&status=NAO_REGISTRADO`)
      .set('Authorization', autorizar())
      .expect(200);
    expect(consulta.body.dias.length).toBeGreaterThan(0);
    expect(
      consulta.body.dias.every(
        (dia: { status: unknown }) => dia.status === null,
      ),
    ).toBe(true);
    expect(consulta.body.indicadores.taxaPresenca).toBeNull();
    await api()
      .get(`/api/frequencias/relatorio/pdf?${parametros}`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect('Content-Type', /application\/pdf/)
      .expect('Content-Disposition', /attachment/);
  });

  it('mantem CPF unico com duas requisicoes simultaneas', async () => {
    const respostas = await Promise.all(
      [1, 2].map((numero) =>
        api()
          .post('/api/clientes')
          .set('Authorization', autorizar())
          .send({
            ...clienteRapidoPayload(`Concorrente ${prefixo} ${numero}`),
            cpfCnpj: cpfTeste(8),
          }),
      ),
    );
    expect(respostas.map((resposta) => resposta.status).sort()).toEqual([
      201, 409,
    ]);
    expect(
      await prisma.cliente.count({ where: { cpfCnpj: cpfTeste(8) } }),
    ).toBe(1);
  });

  it('preserva pelo menos um administrador em desativacoes simultaneas', async () => {
    await prisma.permissaoUsuario.upsert({
      where: {
        usuarioId_modulo: {
          usuarioId: ids.usuarios[1],
          modulo: 'GESTAO_USUARIOS',
        },
      },
      create: {
        usuarioId: ids.usuarios[1],
        modulo: 'GESTAO_USUARIOS',
        podeVisualizar: true,
        podeGerenciar: true,
      },
      update: { podeVisualizar: true, podeGerenciar: true },
    });
    try {
      const respostas = await Promise.all(
        ids.usuarios.slice(0, 2).map((id, indice) =>
          api()
            .patch(`/api/usuarios/${id}/desativar`)
            .set(
              'Authorization',
              autorizar(indice === 0 ? adminToken : usuarioLimitadoToken),
            ),
        ),
      );
      expect(respostas.map((resposta) => resposta.status).sort()).toEqual([
        200, 400,
      ]);
      expect(
        await prisma.usuario.count({
          where: { id: { in: ids.usuarios.slice(0, 2) }, status: 'ATIVO' },
        }),
      ).toBe(1);
    } finally {
      await prisma.usuario.updateMany({
        where: { id: { in: ids.usuarios.slice(0, 2) } },
        data: { status: 'ATIVO' },
      });
    }
  });

  it('oferece categorias cadastraveis e seletores com permissoes restritas', async () => {
    await api()
      .get('/api/usuarios?page=1&limit=1')
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.meta.total).toBeGreaterThan(1);
      });
    await api()
      .get('/api/usuarios')
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(Array.isArray(body)).toBe(true));
    await api()
      .get('/api/usuarios/opcoes/funcionarios')
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) =>
        expect(
          body.every(
            (item: { cpf: string; senhaHash?: string }) =>
              item.cpf && !item.senhaHash,
          ),
        ).toBe(true),
      );
    await prisma.permissaoUsuario.upsert({
      where: {
        usuarioId_modulo: { usuarioId: ids.usuarios[1], modulo: 'FREQUENCIA' },
      },
      create: {
        usuarioId: ids.usuarios[1],
        modulo: 'FREQUENCIA',
        podeVisualizar: true,
        podeGerenciar: false,
      },
      update: { podeVisualizar: true },
    });
    await api()
      .get('/api/frequencias/opcoes/funcionarios?status=TODOS')
      .set('Authorization', autorizar(usuarioLimitadoToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body.length).toBeGreaterThan(0);
        expect(body[0]).not.toHaveProperty('salario');
      });
    await api()
      .get('/api/frequencias/opcoes/funcionarios?status=ERRADO')
      .set('Authorization', autorizar())
      .expect(400);
    const nome = `Categoria ${prefixo}`;
    await api()
      .post('/api/categorias/materiais')
      .set('Authorization', autorizar())
      .send({ nome })
      .expect(201);
    await api()
      .post('/api/categorias/materiais')
      .set('Authorization', autorizar())
      .send({ nome })
      .expect(409);
    await api()
      .post('/api/categorias/despesas')
      .set('Authorization', autorizar())
      .send({ nome })
      .expect(201)
      .expect(({ body }) => expect(body.nome).toContain('CATEGORIA_INT'));
    await api()
      .get('/api/categorias/despesas')
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) =>
        expect(
          body.some((item: { nome: string }) => item.nome === 'FRETE'),
        ).toBe(true),
      );
    await api()
      .post('/api/materiais')
      .set('Authorization', autorizar())
      .send({
        nome: `Sem categoria ${prefixo}`,
        categoria: 'categoria nao cadastrada',
        unidadeMedida: 'UN',
        precoReferencia: 1,
      })
      .expect(400);
  });

  it('cancela etapas e extras, estorna despesas e preserva caixa, estoque e auditoria', async () => {
    const orcamento = await api()
      .post('/api/orcamentos')
      .set('Authorization', autorizar())
      .send({
        titulo: `Cancelamentos ${prefixo}`,
        tipo: 'CONSTRUCAO_CIVIL',
        clienteId: ids.clientes[0],
        prazoEstimadoDias: 30,
        servicos: [
          { servicoId: ids.servicos[0], quantidade: 5, valorUnitario: 1000 },
        ],
      })
      .expect(201);
    const aprovacao = await api()
      .patch(`/api/orcamentos/${orcamento.body.id}/aprovar`)
      .set('Authorization', autorizar())
      .send(
        aprovacaoPayload(
          ids.funcionarios[1],
          `${competenciaFormas}-01`,
          '2025-12-31',
        ),
      )
      .expect(200);
    const projetoId = aprovacao.body.projeto.id as number;
    ids.projetos.push(projetoId);
    await api()
      .patch(`/api/projetos/${projetoId}/iniciar`)
      .set('Authorization', autorizar())
      .send({ dataInicio: `${competenciaFormas}-01` })
      .expect(200);
    const etapa = await api()
      .post(`/api/projetos/${projetoId}/etapas`)
      .set('Authorization', autorizar())
      .send({
        descricao: 'Medicao a cancelar',
        dataRegistro: dataFormasPagamento,
        valorCobrado: 100,
        formaPagamento: 'PIX',
        modalidadeCobranca: 'A_VISTA',
        servicos: [
          { servicoId: ids.servicos[0], quantidade: 0.1, valorUnitario: 1000 },
        ],
      })
      .expect(201);
    const etapaId = etapa.body.etapas[0].id as number;
    const cancelada = await api()
      .patch(`/api/projetos/${projetoId}/etapas/${etapaId}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Medicao registrada incorretamente' })
      .expect(200);
    expect(cancelada.body.etapas[0].canceladoEm).toBeTruthy();
    expect(cancelada.body.etapas[0].cobranca.status).toBe('CANCELADO');
    expect(cancelada.body.medicoes.totalMedido).toBe(0);
    await api()
      .patch(`/api/projetos/${projetoId}/etapas/${etapaId}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Tentativa duplicada' })
      .expect(409);
    await api()
      .patch(`/api/projetos/${projetoId}/etapas/${etapaId}`)
      .set('Authorization', autorizar())
      .send({ descricao: 'Nao pode editar' })
      .expect(409);

    const material = await api()
      .post('/api/estoque/materiais')
      .set('Authorization', autorizar())
      .send({
        nome: `Material estorno ${prefixo}`,
        categoria: 'Insumos',
        unidadeMedida: 'UN',
        quantidadeInicial: 10,
        precoReferencia: 10,
      })
      .expect(201);
    const materialId = material.body.id as number;
    const extra = await api()
      .post(`/api/projetos/${projetoId}/extras`)
      .set('Authorization', autorizar())
      .send({
        descricaoJustificativa: `Extra a cancelar ${prefixo}`,
        dataRegistro: dataFormasPagamento,
        materiais: [{ materialId, quantidade: 2 }],
        gastosAvulsos: [{ descricao: 'Frete contratado', valor: 25 }],
      })
      .expect(201);
    const extraId = extra.body.extras[0].id as number;
    const despesaId = extra.body.extras[0].despesaId as number;
    await api()
      .patch(`/api/despesas/${despesaId}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Cancelamento pelo lugar errado' })
      .expect(409);
    await api()
      .patch(`/api/projetos/${projetoId}/extras/${extraId}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Extra deixou de ser necessario' })
      .expect(200);
    const saldo = await prisma.estoqueMaterial.findUniqueOrThrow({
      where: { materialId },
    });
    expect(Number(saldo.quantidadeAtual)).toBe(10);
    expect(Number(saldo.quantidadeReservada)).toBe(0);
    expect(
      (await prisma.despesa.findUniqueOrThrow({ where: { id: despesaId } }))
        .canceladoEm,
    ).toBeTruthy();
    const auditoria = await prisma.cancelamentoRegistro.findUniqueOrThrow({
      where: { tipo_registroId: { tipo: 'DESPESA', registroId: despesaId } },
      include: { movimentacao: true },
    });
    expect(auditoria.usuarioId).toBe(ids.usuarios[0]);
    expect(auditoria.movimentacao?.tipo).toBe('ENTRADA');
    expect(Number(auditoria.movimentacao?.valor)).toBe(25);
    await api()
      .patch(`/api/projetos/${projetoId}/extras/${extraId}`)
      .set('Authorization', autorizar())
      .send({ descricaoJustificativa: 'Edicao recusada' })
      .expect(409);

    const compra = await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'COMPRA_MATERIAL',
        fornecedorId: ids.fornecedores[0],
        data: dataFormasPagamento,
        descricao: `Compra estorno ${prefixo}`,
        materiais: [
          { materialId, quantidade: 3, unidadeMedida: 'UN', valorUnitario: 10 },
        ],
      })
      .expect(201);
    await api()
      .patch(`/api/despesas/${compra.body.id}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Compra devolvida ao fornecedor' })
      .expect(200);
    expect(
      Number(
        (
          await prisma.estoqueMaterial.findUniqueOrThrow({
            where: { materialId },
          })
        ).quantidadeAtual,
      ),
    ).toBe(10);
    await api()
      .patch(`/api/despesas/${compra.body.id}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Tentativa de estorno duplicado' })
      .expect(409);
    await api()
      .patch(`/api/despesas/${compra.body.id}`)
      .set('Authorization', autorizar())
      .send({ descricao: 'Edicao depois de estorno' })
      .expect(409);
    await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'DIVERSA',
        data: dataFormasPagamento,
        descricao: `Sem categoria ${prefixo}`,
        valorTotal: 1,
      })
      .expect(400);
    const avulsa = await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'DIVERSA',
        categoria: 'FRETE',
        fornecedorId: ids.fornecedores[0],
        data: dataFormasPagamento,
        descricao: `Frete ${prefixo}`,
        valorTotal: 1,
      })
      .expect(201);
    expect(avulsa.body.fornecedorId).toBe(ids.fornecedores[0]);
    await api()
      .patch(`/api/despesas/${avulsa.body.id}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Lancamento de teste' })
      .expect(200);

    const compraReservada = await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'COMPRA_MATERIAL',
        fornecedorId: ids.fornecedores[0],
        data: dataFormasPagamento,
        descricao: `Compra com reserva ${prefixo}`,
        materiais: [
          { materialId, quantidade: 1, unidadeMedida: 'UN', valorUnitario: 10 },
        ],
      })
      .expect(201);
    const reservado = await api()
      .post(`/api/projetos/${projetoId}/extras`)
      .set('Authorization', autorizar())
      .send({
        descricaoJustificativa: `Reserva para bloqueio ${prefixo}`,
        dataRegistro: dataFormasPagamento,
        materiais: [{ materialId, quantidade: 1 }],
      })
      .expect(201);
    const reservadoId = reservado.body.extras.find(
      (item: { descricaoJustificativa: string }) =>
        item.descricaoJustificativa.includes('Reserva para bloqueio'),
    ).id as number;
    await api()
      .patch(`/api/despesas/${compraReservada.body.id}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Deve bloquear por reserva ativa' })
      .expect(409);
    expect(
      await prisma.cancelamentoRegistro.count({
        where: { tipo: 'DESPESA', registroId: compraReservada.body.id },
      }),
    ).toBe(0);
    expect(
      (
        await prisma.despesa.findUniqueOrThrow({
          where: { id: compraReservada.body.id },
        })
      ).canceladoEm,
    ).toBeNull();
    await api()
      .patch(`/api/projetos/${projetoId}/extras/${reservadoId}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Liberar a reserva antes do estorno' })
      .expect(200);
    await api()
      .patch(`/api/despesas/${compraReservada.body.id}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Compra agora pode ser estornada' })
      .expect(200);

    const etapaRecebida = await api()
      .post(`/api/projetos/${projetoId}/etapas`)
      .set('Authorization', autorizar())
      .send({
        descricao: `Medicao recebida ${prefixo}`,
        dataRegistro: dataFormasPagamento,
        valorCobrado: 100,
        formaPagamento: 'PIX',
        modalidadeCobranca: 'A_VISTA',
        servicos: [
          { servicoId: ids.servicos[0], quantidade: 0.1, valorUnitario: 1000 },
        ],
      })
      .expect(201);
    const recebida = etapaRecebida.body.etapas.find(
      (item: { descricao: string }) =>
        item.descricao.includes('Medicao recebida'),
    );
    const cobrancaRecebida = await api()
      .get(`/api/cobrancas/${recebida.cobranca.id}`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .post(`/api/cobrancas/${recebida.cobranca.id}/recebimentos`)
      .set('Authorization', autorizar())
      .send({
        parcelaId: cobrancaRecebida.body.parcelas[0].id,
        valor: 100,
        dataRecebimento: dataFormasPagamento,
        formaPagamento: 'PIX',
      })
      .expect(201);
    await api()
      .patch(`/api/projetos/${projetoId}/etapas/${recebida.id}/cancelar`)
      .set('Authorization', autorizar())
      .send({ motivo: 'Nao pode cancelar etapa recebida' })
      .expect(409);
    expect(
      await prisma.cancelamentoRegistro.count({
        where: { tipo: 'ETAPA', registroId: recebida.id },
      }),
    ).toBe(0);
  });

  it('padroniza erros, filtros TODOS e simulacoes sem gravar', async () => {
    await api()
      .get('/api/rota-inexistente')
      .expect(404)
      .expect(({ body }) => expect(body.codigo).toBe('ROTA_INEXISTENTE'));
    await api()
      .post('/api/materiais')
      .set('Authorization', autorizar())
      .send({ nome: ' ' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.codigo).toBe('VALIDACAO');
        expect(
          body.erros.some((item: { campo: string }) => item.campo === 'nome'),
        ).toBe(true);
      });
    await api()
      .post('/api/materiais')
      .set('Authorization', autorizar())
      .send({ campoExtra: true })
      .expect(400)
      .expect(({ body }) => expect(body.codigo).toBe('CAMPO_NAO_ACEITO'));
    for (const recurso of ['materiais', 'equipamentos', 'fornecedores']) {
      await api()
        .get(`/api/${recurso}?status=TODOS`)
        .set('Authorization', autorizar())
        .expect(200);
      await api()
        .get(`/api/${recurso}?status=ERRADO`)
        .set('Authorization', autorizar())
        .expect(400);
    }
    await api()
      .patch(`/api/materiais/${ids.materiais[0]}`)
      .set('Authorization', autorizar())
      .send({ precoReferencia: null })
      .expect(400);
    await api()
      .get('/api/despesas?dataInicio=2025-02-02&dataFim=2025-01-01')
      .set('Authorization', autorizar())
      .expect(400)
      .expect(({ body }) => expect(body.codigo).toBe('PERIODO_INVALIDO'));
    await api()
      .get('/api/usuarios?page=1&limit=100')
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) =>
        expect(typeof body.data[0].acessoAtivo).toBe('boolean'),
      );
    const antes = await prisma.orcamento.count();
    await api()
      .patch(`/api/equipamentos/${ids.equipamentos[0]}`)
      .set('Authorization', autorizar())
      .send({ dataAquisicao: '', valorAquisicao: '' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.dataAquisicao).toBeNull();
        expect(body.valorAquisicao).toBeNull();
      });
    const previa = await api()
      .post('/api/orcamentos/simular')
      .set('Authorization', autorizar())
      .send({
        tipo: 'CONSTRUCAO_CIVIL',
        servicos: [
          {
            servicoId: ids.servicos[0],
            quantidade: 0.333,
            valorUnitario: 0.09,
          },
        ],
      })
      .expect(201);
    expect(Number(previa.body.valorTotal)).toBe(0.03);
    expect(await prisma.orcamento.count()).toBe(antes);
    await api()
      .get('/api/projetos/opcoes/formas-pagamento')
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => {
        expect(
          body
            .find(
              (item: { modalidade: string }) => item.modalidade === 'A_VISTA',
            )
            .formas.find((item: { valor: string }) => item.valor === 'PIX')
            .aceitaAcrescimo,
        ).toBe(false);
      });
    const antesCobrancas = await prisma.cobranca.count();
    const simular = await api()
      .post(`/api/projetos/${ids.projetos[0]}/cobranca/simular`)
      .set('Authorization', autorizar())
      .send({
        valorCobrado: 100,
        modalidadeCobranca: 'PARCELADO_AUTOMATICO',
        formaPagamento: 'BOLETO',
        numeroParcelas: 3,
        primeiroVencimento: '2025-01-31',
        descontoPercentual: 10,
        acrescimoPercentual: 5,
      })
      .expect(201);
    expect(simular.body.valorFinal).toBe(95);
    expect(simular.body.parcelas[1].vencimento.slice(0, 10)).toBe('2025-02-28');
    expect(await prisma.cobranca.count()).toBe(antesCobrancas);
    await api()
      .get(`/api/cobrancas?busca=${prefixo}&page=1&limit=1`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.data.length).toBeLessThanOrEqual(1));
    await api()
      .get('/api/cobrancas?busca=%25')
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => expect(body.meta.total).toBe(0));
  });

  it('protege saldo em ajustes concorrentes e retorno numerico do limite', async () => {
    const material = await api()
      .post('/api/estoque/materiais')
      .set('Authorization', autorizar())
      .send({
        nome: `Concorrencia saldo ${prefixo}`,
        categoria: 'Insumos',
        unidadeMedida: 'Metro Linear',
        precoReferencia: 1,
        quantidadeInicial: 10,
      })
      .expect(201);
    const resultados = await Promise.all(
      [1, 2].map(() =>
        api()
          .post(`/api/estoque/${material.body.id}/ajustes`)
          .set('Authorization', autorizar())
          .send({
            tipo: 'AJUSTE_SAIDA',
            quantidade: 7,
            justificativa: 'Saida simultanea de teste',
          }),
      ),
    );
    expect(resultados.map((item) => item.status).sort()).toEqual([201, 400]);
    expect(
      Number(
        (
          await prisma.estoqueMaterial.findUniqueOrThrow({
            where: { materialId: material.body.id },
          })
        ).quantidadeAtual,
      ),
    ).toBe(3);
    await api()
      .post(`/api/estoque/${material.body.id}/ajustes`)
      .set('Authorization', autorizar())
      .send({
        tipo: 'AJUSTE_ENTRADA',
        quantidade: 999999999.999,
        justificativa: 'Ultrapassa o limite acumulado',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.codigo).toBe('ESTOQUE_LIMITE_EXCEDIDO');
        expect(body.detalhes.maximoEntrada).toBe(999999996.999);
      });
    await api()
      .post('/api/estoque/materiais')
      .set('Authorization', autorizar())
      .send({
        nome: `Fracao UN ${prefixo}`,
        categoria: 'Insumos',
        unidadeMedida: 'UN',
        precoReferencia: 1,
        quantidadeInicial: 0.5,
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.codigo).toBe('QUANTIDADE_INTEIRA_OBRIGATORIA'),
      );
    await api()
      .get(`/api/estoque?busca=Concorrencia%20saldo%20${prefixo}`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) =>
        expect(body.indicadores).toMatchObject({
          materiaisCadastrados: 1,
          semReserva: 1,
          semSaldo: 0,
          disponiveis: 1,
        }),
      );
  });

  it('preserva historico inativo e impede estorno duplicado simultaneo', async () => {
    const compra = await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'COMPRA_MATERIAL',
        fornecedorId: ids.fornecedores[0],
        data: dataFormasPagamento,
        descricao: `Historico inativo ${prefixo}`,
        materiais: [
          {
            materialId: ids.materiais[0],
            quantidade: 1,
            unidadeMedida: (
              await prisma.material.findUniqueOrThrow({
                where: { id: ids.materiais[0] },
              })
            ).unidadeMedida,
            valorUnitario: 10,
          },
        ],
      })
      .expect(201);
    await api()
      .patch(`/api/fornecedores/${ids.fornecedores[0]}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/materiais/${ids.materiais[0]}/desativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/despesas/${compra.body.id}`)
      .set('Authorization', autorizar())
      .send({ descricao: `Historico preservado ${prefixo}` })
      .expect(200);
    await api()
      .patch(`/api/fornecedores/${ids.fornecedores[0]}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);
    await api()
      .patch(`/api/materiais/${ids.materiais[0]}/reativar`)
      .set('Authorization', autorizar())
      .expect(200);
    const avulsa = await api()
      .post('/api/despesas')
      .set('Authorization', autorizar())
      .send({
        tipo: 'DIVERSA',
        categoria: 'FRETE',
        data: dataFormasPagamento,
        descricao: `Estorno concorrente ${prefixo}`,
        valorTotal: 15,
      })
      .expect(201);
    const resultados = await Promise.all(
      [1, 2].map(() =>
        api()
          .patch(`/api/despesas/${avulsa.body.id}/cancelar`)
          .set('Authorization', autorizar())
          .send({ motivo: 'Estorno solicitado simultaneamente' }),
      ),
    );
    expect(resultados.map((item) => item.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.cancelamentoRegistro.count({
        where: { tipo: 'DESPESA', registroId: avulsa.body.id },
      }),
    ).toBe(1);
    const quantidadeCaixas = await prisma.caixa.count();
    await api()
      .get('/api/financeiro/caixas?page=1&limit=1')
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.total).toBe(quantidadeCaixas);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].resumo.saldoAtual).toBeDefined();
      });
    expect(await prisma.caixa.count()).toBe(quantidadeCaixas);
    await api()
      .get(`/api/financeiro/caixa?competencia=${competenciaFormas}`)
      .set('Authorization', autorizar())
      .expect(200)
      .expect(({ body }) => {
        expect(body.situacao).toBe('PENDENTE_FECHAMENTO');
        expect(body.competenciaMinima).toBeDefined();
        expect(
          body.saidas.some(
            (item: { fornecedor: { id: number } | null }) =>
              item.fornecedor?.id === ids.fornecedores[0],
          ),
        ).toBe(true);
      });
  });

  it('mantem integridade entre recebimento e cancelamento simultaneos e consultas em paralelo', async () => {
    const projetoId = ids.projetos[ids.projetos.length - 1];
    for (const rodada of [1, 2, 3]) {
      const criada = await api()
        .post(`/api/projetos/${projetoId}/etapas`)
        .set('Authorization', autorizar())
        .send({
          descricao: `Etapa concorrente ${rodada} ${prefixo}`,
          valorCobrado: 100,
          dataRegistro: dataFormasPagamento,
          modalidadeCobranca: 'A_VISTA',
          formaPagamento: 'PIX',
          servicos: [
            {
              servicoId: ids.servicos[0],
              quantidade: 0.1,
              valorUnitario: 1000,
            },
          ],
        })
        .expect(201);
      const etapa = criada.body.etapas.find(
        (item: { descricao: string }) =>
          item.descricao === `Etapa concorrente ${rodada} ${prefixo}`,
      );
      const cobranca = await api()
        .get(`/api/cobrancas/${etapa.cobranca.id}`)
        .set('Authorization', autorizar())
        .expect(200);
      const resultados = await Promise.all([
        api()
          .post(`/api/cobrancas/${etapa.cobranca.id}/recebimentos`)
          .set('Authorization', autorizar())
          .send({
            parcelaId: cobranca.body.parcelas[0].id,
            valor: 100,
            dataRecebimento: dataFormasPagamento,
            formaPagamento: 'PIX',
          }),
        api()
          .patch(`/api/projetos/${projetoId}/etapas/${etapa.id}/cancelar`)
          .set('Authorization', autorizar())
          .send({ motivo: 'Cancelamento concorrente com recebimento' }),
      ]);
      expect(
        resultados.every((item) => [200, 201, 400, 409].includes(item.status)),
      ).toBe(true);
      expect(resultados.filter((item) => item.status < 300)).toHaveLength(1);
      const final = await prisma.etapaProjeto.findUniqueOrThrow({
        where: { id: etapa.id },
        include: {
          cobranca: {
            include: { parcelas: { include: { recebimentos: true } } },
          },
        },
      });
      const quantidadeRecebimentos = final.cobranca!.parcelas.reduce(
        (soma, item) => soma + item.recebimentos.length,
        0,
      );
      expect(quantidadeRecebimentos).toBe(final.canceladoEm ? 0 : 1);
    }
    const caixasAntes = await prisma.caixa.count();
    const consultas = await Promise.all(
      Array.from({ length: 20 }, () =>
        api()
          .get(`/api/financeiro/caixa?competencia=${competenciaFormas}`)
          .set('Authorization', autorizar()),
      ),
    );
    expect(consultas.every((item) => item.status === 200)).toBe(true);
    expect(await prisma.caixa.count()).toBe(caixasAntes);
  });

  function funcionarioPayload(nomeCompleto: string, cpf: string) {
    return {
      nomeCompleto,
      apelido: 'Integracao',
      cpf,
      dataNascimento: '1990-01-01',
      sexo: 'NAO_INFORMADO',
      celular: '69999999999',
      cep: '76920000',
      cidade: 'Ouro Preto do Oeste',
      estado: 'RO',
      rua: 'Rua dos Testes',
      numero: '100',
      bairro: 'Centro',
      funcao: 'Testador',
      setorAtuacao: 'Qualidade',
      salario: 3000,
      tipoContrato: 'CLT',
      dataContratacao: '2026-01-01',
      contatoEmergencia: '69988887777',
      nomeContatoEmergencia: 'Contato Integrado',
      grauVinculo: 'Familiar',
    };
  }

  function clienteRapidoPayload(nome: string) {
    return {
      nome,
      telefone: '69999998888',
      cidade: 'Ouro Preto do Oeste',
      estado: 'RO',
    };
  }

  function fornecedorPayload() {
    return {
      razaoSocial: `Fornecedor ${prefixo} Ltda`,
      nomeFantasia: `Fornecedor ${prefixo}`,
      cnpj: gerarCnpj(execucao.slice(-8).padStart(8, '1')),
      contato: '69999997777',
      responsavel: 'Responsavel Integrado',
      cargoResponsavel: 'Gerente',
      cep: '76920000',
      cidade: 'Ouro Preto do Oeste',
      estado: 'RO',
      rua: 'Avenida Integracao',
      numero: '200',
      bairro: 'Industrial',
    };
  }

  function aprovacaoPayload(
    responsavelId: number,
    previsaoInicio: string,
    previsaoConclusao: string,
  ) {
    return {
      responsavelId,
      previsaoInicio,
      previsaoConclusao,
      cepObra: '76920-000',
      cidadeObra: 'Ouro Preto do Oeste',
      estadoObra: 'RO',
      ruaObra: 'Rua de Integracao',
      numeroObra: '100',
      bairroObra: 'Centro',
    };
  }

  function cpfTeste(sufixo: number) {
    const base = `${execucao.slice(-7)}${String(sufixo).padStart(2, '0')}`;
    const digito = (numero: string) => {
      const resto =
        [...numero].reduce(
          (soma, valor, indice) =>
            soma + Number(valor) * (numero.length + 1 - indice),
          0,
        ) % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const primeiro = digito(base);
    return `${base}${primeiro}${digito(`${base}${primeiro}`)}`;
  }

  function gerarCnpj(baseOitoDigitos: string) {
    const base = `${baseOitoDigitos}0001`.replace(/\D/g, '').slice(-12);
    const digito = (valor: string) => {
      let peso = valor.length - 7;
      const soma = [...valor].reduce((total, numero) => {
        const resultado = total + Number(numero) * peso;
        peso = peso === 2 ? 9 : peso - 1;
        return resultado;
      }, 0);
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const primeiro = digito(base);
    const segundo = digito(`${base}${primeiro}`);
    return `${base}${primeiro}${segundo}`;
  }

  async function limparDadosDeTeste() {
    if (!prisma) return;

    const projetos = await prisma.projeto.findMany({
      where: { orcamento: { titulo: { contains: prefixo } } },
      select: { id: true, orcamentoId: true },
    });
    const projetoIds = projetos.map((item) => item.id);
    const orcamentoIds = projetos.map((item) => item.orcamentoId);
    const materiais = await prisma.material.findMany({
      where: { nome: { contains: prefixo } },
      select: { id: true },
    });
    const materialIds = materiais.map((item) => item.id);
    const despesas = await prisma.despesa.findMany({
      where: { descricao: { contains: prefixo } },
      select: { id: true },
    });
    const despesaIds = despesas.map((item) => item.id);
    const funcionarios = await prisma.funcionario.findMany({
      where: { nomeCompleto: { contains: prefixo } },
      select: { id: true },
    });
    const funcionarioIds = funcionarios.map((item) => item.id);
    const usuarios = await prisma.usuario.findMany({
      where: { funcionarioId: { in: funcionarioIds } },
      select: { id: true },
    });
    const usuarioIds = usuarios.map((item) => item.id);
    const competenciasData = [competencia, competenciaFormas].map(
      (item) => new Date(`${item}-01T00:00:00.000Z`),
    );

    await prisma.cancelamentoRegistro.deleteMany({
      where: { usuarioId: { in: usuarioIds } },
    });
    await prisma.movimentacaoCaixa.deleteMany({
      where: { caixa: { competencia: { in: competenciasData } } },
    });
    await prisma.recebimento.deleteMany({
      where: { parcela: { cobranca: { projetoId: { in: projetoIds } } } },
    });
    await prisma.parcela.deleteMany({
      where: { cobranca: { projetoId: { in: projetoIds } } },
    });
    await prisma.cobranca.deleteMany({
      where: { projetoId: { in: projetoIds } },
    });
    await prisma.movimentacaoEstoque.deleteMany({
      where: { materialId: { in: materialIds } },
    });
    await prisma.reservaEstoque.deleteMany({
      where: { projetoId: { in: projetoIds } },
    });
    await prisma.etapaServico.deleteMany({
      where: { etapa: { projetoId: { in: projetoIds } } },
    });
    await prisma.etapaMaterialCliente.deleteMany({
      where: { etapa: { projetoId: { in: projetoIds } } },
    });
    await prisma.etapaProjeto.deleteMany({
      where: { projetoId: { in: projetoIds } },
    });
    await prisma.extraMaterial.deleteMany({
      where: { extra: { projetoId: { in: projetoIds } } },
    });
    await prisma.extraServico.deleteMany({
      where: { extra: { projetoId: { in: projetoIds } } },
    });
    await prisma.extraGastoAvulso.deleteMany({
      where: { extra: { projetoId: { in: projetoIds } } },
    });
    await prisma.auditoriaCaixa.deleteMany({
      where: { usuarioId: { in: usuarioIds } },
    });
    await prisma.extraProjeto.deleteMany({
      where: { projetoId: { in: projetoIds } },
    });
    await prisma.projeto.deleteMany({ where: { id: { in: projetoIds } } });
    await prisma.orcamentoMaterial.deleteMany({
      where: { orcamentoId: { in: orcamentoIds } },
    });
    await prisma.orcamentoServico.deleteMany({
      where: { orcamentoId: { in: orcamentoIds } },
    });
    await prisma.orcamento.deleteMany({ where: { id: { in: orcamentoIds } } });
    await prisma.despesaMaterial.deleteMany({
      where: { despesaId: { in: despesaIds } },
    });
    await prisma.despesa.deleteMany({ where: { id: { in: despesaIds } } });
    await prisma.equipamento.deleteMany({
      where: { nome: { contains: prefixo } },
    });
    await prisma.estoqueMaterial.deleteMany({
      where: { materialId: { in: materialIds } },
    });
    await prisma.material.deleteMany({ where: { id: { in: materialIds } } });
    await prisma.servico.deleteMany({ where: { nome: { contains: prefixo } } });
    await prisma.fornecedor.deleteMany({
      where: { nomeFantasia: { contains: prefixo } },
    });
    await prisma.frequencia.deleteMany({
      where: { funcionarioId: { in: funcionarioIds } },
    });
    await prisma.caixa.deleteMany({
      where: { competencia: { in: competenciasData } },
    });
    await prisma.permissaoUsuario.deleteMany({
      where: { usuarioId: { in: usuarioIds } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await prisma.funcionario.deleteMany({
      where: { id: { in: funcionarioIds } },
    });
    await prisma.cliente.deleteMany({ where: { nome: { contains: prefixo } } });
  }
});
