import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Use a separate test database
const testDbPath = path.join(__dirname, '..', 'prisma', 'test.db');

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
  // Delete in correct order to avoid foreign key constraint violations
  // 1. Delete junction tables first (if they exist)
  try {
    await prisma.$executeRaw`DELETE FROM _LeadToTag`;
  } catch (error) {
    // Table might not exist or be empty, ignore
  }
  
  // 2. Delete dependent records (those with foreign keys to users/leads/campaigns)
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.note.deleteMany();
  
  // 3. Delete parent records
  await prisma.campaign.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();
});
