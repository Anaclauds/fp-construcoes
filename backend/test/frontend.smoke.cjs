const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const bcrypt = require('bcrypt');
const {
  getTestDatabaseUrl,
  prepareTestDatabase,
} = require('./test-database.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getTestDatabaseUrl()),
});
const children = [];
const prefix = `UI-${Date.now()}`;
const password = randomBytes(18).toString('hex');
const cpf = '52998224725';
const modules = [
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
let funcionarioId;
let usuarioId;
let materialId;
let caixaCriadoId;
let browser;

async function waitFor(url) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Servidor nao iniciou: ${url}`);
}

async function main() {
  await prepareTestDatabase();
  assert.equal(
    await prisma.usuario.count({ where: { login: cpf } }),
    0,
    'CPF de teste ja ocupado; nenhum registro existente sera alterado',
  );
  const funcionario = await prisma.funcionario.create({
    data: {
      nomeCompleto: prefix,
      cpf,
      dataNascimento: new Date('1990-01-01'),
      sexo: 'NAO_INFORMADO',
      celular: '69999998888',
      cep: '76920000',
      cidade: 'Ouro Preto do Oeste',
      estado: 'RO',
      rua: 'Rua de Teste',
      numero: '1',
      bairro: 'Centro',
      funcao: 'Teste de integracao',
      setorAtuacao: 'Qualidade',
      salario: 0,
      tipoContrato: 'TESTE',
      dataContratacao: new Date('2026-01-01'),
      contatoEmergencia: '69999998888',
      nomeContatoEmergencia: 'Teste',
      grauVinculo: 'Teste',
    },
  });
  funcionarioId = funcionario.id;
  const usuario = await prisma.usuario.create({
    data: {
      funcionarioId,
      login: cpf,
      senhaHash: await bcrypt.hash(password, 10),
      permissoes: {
        create: modules.map((modulo) => ({
          modulo,
          podeVisualizar: true,
          podeGerenciar: true,
        })),
      },
    },
  });
  usuarioId = usuario.id;
  children.push(
    spawn(process.execPath, ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: getTestDatabaseUrl(), PORT: '3031' },
      stdio: 'ignore',
      windowsHide: true,
    }),
  );
  const frontend = path.resolve('..', 'frontend');
  children.push(
    spawn(
      process.execPath,
      [
        path.join(frontend, 'node_modules/vite/bin/vite.js'),
        '--host',
        '127.0.0.1',
        '--port',
        '5174',
        '--strictPort',
      ],
      {
        cwd: frontend,
        env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:3031/api' },
        stdio: 'ignore',
        windowsHide: true,
      },
    ),
  );
  await Promise.all([
    waitFor('http://127.0.0.1:3031/api'),
    waitFor('http://127.0.0.1:5174'),
  ]);
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  const pendenciasFront = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1:3031/api'))
      requests.push({
        url: new URL(response.url()).pathname,
        status: response.status(),
      });
  });
  const directory = path.resolve('coverage', 'browser');
  await fs.mkdir(directory, { recursive: true });
  await page.goto('http://127.0.0.1:5174/login');
  await page.locator('#login-cpf').fill(cpf);
  await page.locator('#login-senha').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
  const totalArredondado = await page.evaluate(async () => {
    const { calcularResumo } = await import('/src/utils/orcamentos.ts');
    return calcularResumo(
      Array.from({ length: 3 }, () => ({
        quantidade: '0,33',
        valorUnitario: '0,05',
      })),
      [],
    ).total;
  });
  assert.ok(Number.isFinite(totalArredondado));
  if (totalArredondado !== 6)
    pendenciasFront.push({
      item: 'arredondamento-orcamento',
      observadoCentavos: totalArredondado,
      esperadoBackendCentavos: 6,
    });
  await page.screenshot({
    path: path.join(directory, 'home.png'),
    fullPage: true,
  });
  const routes = [
    '/clientes',
    '/funcionarios',
    '/usuarios',
    '/frequencia',
    '/orcamentos',
    '/cobrancas',
    '/projetos',
    '/servicos',
    '/materiais',
    '/estoque',
    '/equipamentos',
    '/fornecedores',
    '/despesas',
    '/caixa',
    '/clientes/novo',
    '/orcamentos/novo',
    '/relatorio-frequencia',
  ];
  for (const route of routes) {
    await page.goto(`http://127.0.0.1:5174${route}`);
    await page.waitForLoadState('networkidle');
    assert.notEqual(
      new URL(page.url()).pathname,
      '/login',
      `Sessao perdida em ${route}`,
    );
    assert.ok(
      (await page.locator('body').innerText()).trim().length > 50,
      `Tela vazia em ${route}`,
    );
  }
  await page.goto('http://127.0.0.1:5174/clientes/novo');
  await page.getByLabel(/^Nome completo:/).fill(`Cliente ${prefix}`);
  await page.getByLabel(/^CPF:/).fill('11144477735');
  await page.getByLabel(/^Data de Nascimento:/).fill('01/01/1990');
  await page.getByLabel(/^Sexo:/).selectOption({ index: 1 });
  await page.getByLabel(/^Celular:/).fill('69999998888');
  await page.getByLabel(/^CEP:/).fill('76920000');
  await page.getByLabel(/^Estado:/).selectOption('RO');
  const city = page.getByLabel(/^Cidade:/);
  try {
    await city.selectOption(
      { label: 'Ouro Preto do Oeste' },
      { timeout: 15000 },
    );
  } catch (error) {
    if (await city.evaluate((element) => element.tagName === 'INPUT'))
      await city.fill('Ouro Preto do Oeste');
    else throw error;
  }
  await page.getByLabel(/^Rua:/).fill('Rua de integracao');
  await page.getByLabel(/^Numero:|^Número:/).fill('100');
  await page.getByLabel(/^Bairro:/).fill('Centro');
  const saved = page.waitForResponse(
    (response) =>
      response.url() === 'http://127.0.0.1:3031/api/clientes' &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  assert.equal(
    (await saved).status(),
    201,
    'Cadastro pela tela deve persistir na API',
  );
  await page.waitForURL((url) => url.pathname === '/clientes');
  assert.equal(
    await prisma.cliente.count({ where: { nome: `Cliente ${prefix}` } }),
    1,
  );

  await page.goto('http://127.0.0.1:5174/estoque');
  await page
    .getByRole('button', { name: 'Novo Material', exact: true })
    .click();
  await page.getByLabel(/^Nome do Material:/).fill(`Material ${prefix}`);
  await page.getByLabel(/^Categoria:/).selectOption({ index: 1 });
  await page.getByLabel(/^Unidade de Medida:/).selectOption({ index: 1 });
  await page.getByLabel(/^Quantidade Inicial/).fill('3,5');
  const temPreco = await page.getByLabel(/^Preço de referência:/).count();
  if (temPreco) await page.getByLabel(/^Preço de referência:/).fill('12,50');
  const novoMaterial = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/estoque/materiais') &&
      response.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Cadastrar Material', exact: true })
    .click();
  const respostaMaterial = await novoMaterial;
  if (!temPreco) {
    assert.equal(
      respostaMaterial.status(),
      400,
      'API deve recusar material sem preco',
    );
    assert.equal(
      await prisma.material.count({ where: { nome: `Material ${prefix}` } }),
      0,
    );
    pendenciasFront.push({
      item: 'preco-obrigatorio-estoque',
      observado:
        'Formulario nao envia precoReferencia; API recusou com 400 sem gravar',
    });
  } else {
    assert.equal(respostaMaterial.status(), 201);
    const material = await prisma.material.findFirstOrThrow({
      where: { nome: `Material ${prefix}` },
      include: { estoque: true },
    });
    materialId = material.id;
    assert.equal(Number(material.precoReferencia), 12.5);
    assert.equal(Number(material.estoque.quantidadeAtual), 3.5);
  }

  await page.goto('http://127.0.0.1:5174/relatorio-frequencia');
  await page.getByLabel(/^Funcionário:/).selectOption(String(funcionarioId));
  await page.getByLabel(/^Data Inicial:/).fill('01/01/2020');
  await page.getByLabel(/^Data Final:/).fill('03/01/2020');
  await page
    .getByRole('button', { name: 'Gerar Relatório', exact: true })
    .click();
  let pdfServidorChamado = false;
  page.on('request', (request) => {
    if (request.url().includes('/api/frequencias/relatorio/pdf'))
      pdfServidorChamado = true;
  });
  await page.evaluate(() => {
    window.__impressaoTeste = false;
    window.print = () => {
      window.__impressaoTeste = true;
      window.dispatchEvent(new Event('afterprint'));
    };
  });
  await page.getByRole('button', { name: 'Baixar PDF', exact: true }).click();
  await page.waitForTimeout(400);
  if (!pdfServidorChamado) {
    assert.equal(await page.evaluate(() => window.__impressaoTeste), true);
    pendenciasFront.push({
      item: 'pdf-frequencia',
      observado: 'Botao abre impressao local; nao chama PDF da API',
    });
  }

  const competenciaAtual = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'America/Porto_Velho',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
  const [mesOuAno, anoOuMes] = competenciaAtual.split('-');
  const competenciaIso =
    mesOuAno.length === 4 ? competenciaAtual : `${anoOuMes}-${mesOuAno}`;
  const competenciaData = new Date(`${competenciaIso}-01T00:00:00.000Z`);
  const caixaExistente = await prisma.caixa.findUnique({
    where: { competencia: competenciaData },
  });
  await page.goto('http://127.0.0.1:5174/caixa');
  await page.waitForLoadState('networkidle');
  if (!caixaExistente) {
    assert.equal(
      await prisma.caixa.count({ where: { competencia: competenciaData } }),
      0,
      'Consultar a tela nao deve criar caixa',
    );
    await page
      .getByRole('button', { name: 'Definir valor inicial', exact: true })
      .click();
    await page.getByLabel(/^Valor inicial/).fill('10000');
    const abertura = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/financeiro/caixa/abrir') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    const resposta = await abertura;
    assert.equal(resposta.status(), 201);
    caixaCriadoId = (await resposta.json()).id;
    assert.ok(caixaCriadoId > 0);
    assert.equal(
      await page
        .getByRole('button', { name: 'Fechar Mês', exact: true })
        .isDisabled(),
      true,
    );
  }
  assert.deepEqual(errors, [], 'Erros JavaScript nas telas');
  assert.deepEqual(
    requests.filter(
      (item) =>
        item.status >= 400 &&
        !(
          item.url === '/api/estoque/materiais' &&
          item.status === 400 &&
          !temPreco
        ),
    ),
    [],
    'Requisicoes da API com erro',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5174/clientes');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: path.join(directory, 'clientes-mobile.png'),
    fullPage: true,
  });
  const result = {
    login: 'aprovado',
    cadastroClientePelaTela: 'aprovado',
    cadastroEstoqueComPreco: temPreco
      ? 'aprovado'
      : 'pendente no frontend da Ana',
    downloadPdfFrequencia: pdfServidorChamado
      ? 'chamado'
      : 'pendente de integracao com API; impressao local acionada',
    integracaoCompleta: pendenciasFront.length === 0,
    pendenciasFront,
    caixaConsultaEAbertura: caixaExistente
      ? 'consulta aprovada; abertura nao executada em caixa existente'
      : 'aprovado',
    telas: routes.length,
    chamadasApi: requests.length,
    errosJavaScript: errors,
    errosApi: requests.filter((item) => item.status >= 400),
  };
  await fs.writeFile(
    path.join(directory, 'resultado.json'),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    for (const child of children) child.kill();
    if (materialId) {
      await prisma.movimentacaoEstoque.deleteMany({ where: { materialId } });
      await prisma.estoqueMaterial.deleteMany({ where: { materialId } });
      await prisma.material.delete({ where: { id: materialId } });
    }
    if (caixaCriadoId)
      await prisma.caixa.delete({ where: { id: caixaCriadoId } });
    await prisma.cliente.deleteMany({ where: { nome: `Cliente ${prefix}` } });
    if (usuarioId) {
      await prisma.permissaoUsuario.deleteMany({ where: { usuarioId } });
      await prisma.usuario.delete({ where: { id: usuarioId } });
    }
    if (funcionarioId)
      await prisma.funcionario.delete({ where: { id: funcionarioId } });
    await prisma.$disconnect();
  });
