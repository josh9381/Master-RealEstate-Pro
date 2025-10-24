import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Use a separate test database
const testDbPath = path.join(__dirname, '..', 'prisma', 'test.db');
process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-123';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-456';

const prisma = new PrismaClient();

// Clean up database before each test suite
beforeAll(async () => {
  // Remove old test database if it exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Run migrations to create fresh database
  execSync('npx prisma migrate deploy', { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: `file:${testDbPath}` }
  });
});

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Clean database between tests
afterEach(async () => {
  // Delete in reverse order of dependencies
  await prisma.task.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.note.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tag.deleteMany();
});
