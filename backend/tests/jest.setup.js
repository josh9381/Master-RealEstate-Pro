"use strict";
// Jest global setup - runs before ALL tests
// Sets environment variables that will be used by all modules
Object.defineProperty(exports, "__esModule", { value: true });
const path = require('path');
const dbPath = path.join(__dirname, '..', 'prisma', 'test.db');
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_32_characters_minimum_for_security';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_characters_minimum_for_security';
