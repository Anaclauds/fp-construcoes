const { prepareTestDatabase } = require('./test-database.cjs');

module.exports = async () => {
  await prepareTestDatabase();
};
