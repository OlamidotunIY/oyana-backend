require('dotenv/config');
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: 'prisma/',
  migrations: {
    path: 'prisma/migrations',
    seed: 'prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
