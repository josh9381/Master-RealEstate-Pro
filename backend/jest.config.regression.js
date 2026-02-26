/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/critical-regressions.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Use the real DATABASE_URL from backend/.env (PostgreSQL)
  // Do NOT use jest.setup.ts which overrides DATABASE_URL with SQLite
  setupFiles: ['<rootDir>/tests/jest.setup.pg.ts'],
  testTimeout: 30000,
  verbose: true,
};
