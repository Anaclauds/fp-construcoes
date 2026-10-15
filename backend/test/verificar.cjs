const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const mariadb = require('mariadb');
require('dotenv').config({ quiet: true });

const backend = path.resolve(__dirname, '..');
const frontend = path.resolve(backend, '..', 'frontend');
const origem = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
if (!origem) throw new Error('Configure DATABASE_URL no ambiente local');
const url = new URL(origem);
const nome = `fp_verificacao_test_${randomBytes(8).toString('hex')}`;
url.pathname = `/${nome}`;
const env = { ...process.env, DATABASE_URL_TEST: url.toString() };
const passos = [];

function executar(nomePasso, arquivo, argumentos, cwd = backend) {
  console.log(`\nVerificando: ${nomePasso}`);
  const inicio = Date.now();
  const resultado = spawnSync(process.execPath, [arquivo, ...argumentos], {
    cwd,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  passos.push({
    etapa: nomePasso,
    aprovado: resultado.status === 0,
    duracaoMs: Date.now() - inicio,
  });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) throw new Error(`Falha em ${nomePasso}`);
}

async function main() {
  try {
    if (!process.env.npm_execpath)
      throw new Error('Execute com npm run test:verificar');
    executar('Auditoria de dependencias do backend', process.env.npm_execpath, [
      'audit',
      '--audit-level=low',
    ]);
    executar(
      'Auditoria de dependencias do frontend',
      process.env.npm_execpath,
      ['audit', '--audit-level=low'],
      frontend,
    );
    executar('Prisma Client', 'node_modules/prisma/build/index.js', [
      'generate',
    ]);
    executar('Build do backend', 'node_modules/@nestjs/cli/bin/nest.js', [
      'build',
    ]);
    executar(
      'Tipos do frontend',
      'node_modules/vue-tsc/bin/vue-tsc.js',
      ['-b'],
      frontend,
    );
    executar(
      'Build do frontend',
      'node_modules/vite/bin/vite.js',
      ['build'],
      frontend,
    );
    executar('Analise estatica', 'node_modules/eslint/bin/eslint.js', [
      '{src,test}/**/*.ts',
    ]);
    executar('Testes unitarios', 'node_modules/jest/bin/jest.js', [
      '--runInBand',
    ]);
    executar('Integracao HTTP e cobertura', 'node_modules/jest/bin/jest.js', [
      '--config',
      'test/jest-e2e.json',
      '--runInBand',
      '--coverage',
      '--coverageDirectory',
      'coverage/verificacao',
      '--coverageReporters=json-summary',
      '--coverageReporters=lcov',
      '--coverageReporters=text-summary',
    ]);
    executar('Navegador e persistencia', 'test/frontend.smoke.cjs', []);
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
  } finally {
    // Somente o banco aleatorio desta execucao pode ser removido.
    if (
      !/^fp_verificacao_test_[a-f0-9]{16}$/.test(nome) ||
      url.pathname !== `/${nome}`
    )
      throw new Error('Nome inseguro para limpeza do banco temporario');
    let conexao;
    try {
      conexao = await mariadb.createConnection({
        host: url.hostname,
        port: Number(url.port || 3306),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        allowPublicKeyRetrieval:
          url.searchParams.get('allowPublicKeyRetrieval') === 'true',
      });
      await conexao.query(`DROP DATABASE IF EXISTS \`${nome}\``);
    } catch (erro) {
      console.error(
        `Falha ao limpar o banco temporario: ${erro.code || 'erro de conexao'}`,
      );
      process.exitCode = 1;
    } finally {
      if (conexao) await conexao.end();
    }
    const pasta = path.join(backend, 'coverage', 'verificacao');
    fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(
      path.join(pasta, 'execucao.json'),
      JSON.stringify(
        {
          data: new Date().toISOString(),
          aprovado: !process.exitCode,
          escopo:
            'Verificacoes executadas; nao significa integracao completa do front. Consultar pendenciasFront em coverage/browser/resultado.json.',
          etapas: passos,
        },
        null,
        2,
      ),
    );
  }
}
main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
