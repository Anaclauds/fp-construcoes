const path = require('node:path');
const { spawnSync } = require('node:child_process');
const mariadb = require('mariadb');
require('dotenv').config();

function getTestDatabaseUrl() {
  const source = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  if (!source) {
    throw new Error('Defina DATABASE_URL ou DATABASE_URL_TEST para os testes');
  }

  const url = new URL(source);
  if (!process.env.DATABASE_URL_TEST) {
    const originalName = url.pathname.replace(/^\//, '');
    url.pathname = `/${originalName}_test`;
  }

  const databaseName = url.pathname.replace(/^\//, '');
  if (!/(^|_)test($|_)/i.test(databaseName)) {
    throw new Error(
      `O banco de testes deve conter "test" no nome. Recebido: ${databaseName}`,
    );
  }

  return url.toString();
}

async function prepareTestDatabase() {
  const testUrl = new URL(getTestDatabaseUrl());
  const databaseName = testUrl.pathname.replace(/^\//, '');
  const connection = await mariadb.createConnection({
    host: testUrl.hostname,
    port: Number(testUrl.port || 3306),
    user: decodeURIComponent(testUrl.username),
    password: decodeURIComponent(testUrl.password),
    allowPublicKeyRetrieval:
      testUrl.searchParams.get('allowPublicKeyRetrieval') === 'true',
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName.replace(/`/g, '``')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await connection.end();
  }

  const prismaCli = path.join(
    process.cwd(),
    'node_modules',
    'prisma',
    'build',
    'index.js',
  );
  const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(
      `Falha ao preparar migrations do banco de testes:\n${result.error || ''}\n${result.stdout || ''}\n${result.stderr || ''}`,
    );
  }
}

module.exports = { getTestDatabaseUrl, prepareTestDatabase };
