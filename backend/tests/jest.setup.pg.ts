// Jest setup for regression tests — uses real PostgreSQL (not SQLite override)
// Reads DATABASE_URL from backend/.env

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load backend/.env to get the real PostgreSQL DATABASE_URL
dotenv.config({ path: path.join(__dirname, '..', '.env') });

process.env.NODE_ENV = 'test';

// JWT secrets for token generation in tests
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_32_characters_minimum_for_security';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_characters_minimum_for_security';
}

export {};
