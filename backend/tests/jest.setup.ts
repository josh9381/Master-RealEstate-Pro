// Jest global setup - runs before ALL tests
// Sets environment variables that will be used by all modules

const path = require('path');
const dbPath = path.join(__dirname, '..', 'prisma', 'test.db');
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-123';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-456';

export {};
