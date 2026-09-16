const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const bcrypt = require('bcrypt');
require('dotenv/config');

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL),
});

const ADMIN_CPF = process.env.SEED_ADMIN_CPF || '00000000000';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

async function main() {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.warn(
      'Administrador inicial ignorado: SEED_ADMIN_PASSWORD nao foi configurada.',
    );
  }

  if (ADMIN_PASSWORD && ADMIN_PASSWORD.length >= 8) {
    const funcionario = await prisma.funcionario.upsert({
    where: { cpf: ADMIN_CPF },
    update: {
      status: 'ATIVO',
    },
    create: {
      nomeCompleto: 'Administrador do Sistema',
      apelido: 'Admin',
      cpf: ADMIN_CPF,
      dataNascimento: new Date('1990-01-01T00:00:00.000Z'),
      sexo: 'NAO_INFORMADO',
      celular: '69999999999',
      cep: '76920000',
      cidade: 'Ouro Preto do Oeste',
      estado: 'RO',
      rua: 'Rua Para',
      numero: '47',
      bairro: 'Jardim Novo Estado',
      funcao: 'Administrador',
      setorAtuacao: 'Gestao',
      salario: '0',
      tipoContrato: 'ADMINISTRADOR',
      dataContratacao: new Date('2026-08-07T00:00:00.000Z'),
      contatoEmergencia: '69999999999',
      nomeContatoEmergencia: 'Contato Administrativo',
      grauVinculo: 'Institucional',
    },
  });

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { login: ADMIN_CPF },
    });

    const usuario = usuarioExistente
      ? await prisma.usuario.update({
          where: { login: ADMIN_CPF },
          data: { status: 'ATIVO' },
        })
      : await prisma.usuario.create({
          data: {
            funcionarioId: funcionario.id,
            login: ADMIN_CPF,
            senhaHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
          },
        });

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

    for (const modulo of modulos) {
      await prisma.permissaoUsuario.upsert({
        where: {
          usuarioId_modulo: {
            usuarioId: usuario.id,
            modulo,
          },
        },
        update: {
          podeVisualizar: true,
          podeGerenciar: true,
        },
        create: {
          usuarioId: usuario.id,
          modulo,
          podeVisualizar: true,
          podeGerenciar: true,
        },
      });
    }
  }

  const materiais = [
    {
      codigo: 'MAT-001',
      nome: 'Telha de Calha',
      categoria: 'Calhas e Rufos',
      unidadeMedida: 'UN',
      descricao: 'Material de referencia para testes de orcamento.',
      precoReferencia: '12.00',
    },
    {
      codigo: 'MAT-002',
      nome: 'Parafuso Autoatarraxante',
      categoria: 'Fixadores',
      unidadeMedida: 'UN',
      descricao: 'Material de referencia para testes de orcamento.',
      precoReferencia: '0.08',
    },
  ];

  for (const material of materiais) {
    const materialSalvo = await prisma.material.upsert({
      where: { codigo: material.codigo },
      update: { ...material, status: 'ATIVO' },
      create: material,
    });

    await prisma.estoqueMaterial.upsert({
      where: { materialId: materialSalvo.id },
      update: {},
      create: {
        materialId: materialSalvo.id,
        quantidadeAtual: '10000',
        quantidadeReservada: '0',
        atualizadoEm: new Date(),
      },
    });
  }

  const servicos = [
    {
      nome: 'Instalacao de calhas e rufos',
      categoria: 'CALHAS',
      descricao: 'Instalacao com mao de obra e ferramental.',
      valorReferencia: '4234.00',
      unidadeMedida: 'SERVICO',
    },
    {
      nome: 'Estrutura metalica',
      categoria: 'SERRALHERIA',
      descricao: 'Fabricacao e montagem de estrutura metalica.',
      valorReferencia: '5000.00',
      unidadeMedida: 'SERVICO',
    },
    {
      nome: 'Execucao de alvenaria',
      categoria: 'CONSTRUCAO_CIVIL',
      descricao: 'Execucao de alvenaria para etapas de construcao civil.',
      valorReferencia: '80.00',
      unidadeMedida: 'M2',
    },
  ];

  for (const servico of servicos) {
    const existente = await prisma.servico.findFirst({
      where: { nome: servico.nome },
    });

    if (existente) {
      await prisma.servico.update({
        where: { id: existente.id },
        data: { ...servico, status: 'ATIVO' },
      });
    } else {
      await prisma.servico.create({ data: servico });
    }
  }

  console.log('Catalogo inicial de materiais e servicos pronto.');
  if (ADMIN_PASSWORD && ADMIN_PASSWORD.length >= 8) {
    console.log(`Administrador inicial pronto. Login: ${ADMIN_CPF}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
