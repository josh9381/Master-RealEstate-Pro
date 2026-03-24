// Jest global setup - runs before ALL tests
// Sets environment variables that will be used by all modules
// DATABASE_URL is loaded from .env by dotenv (configured in jest.config.js)

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_32_characters_minimum_for_security';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_characters_minimum_for_security';

export {};
