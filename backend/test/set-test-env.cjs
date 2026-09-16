const { getTestDatabaseUrl } = require('./test-database.cjs');

process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-exclusivo-dos-testes';
