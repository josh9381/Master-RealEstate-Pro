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
// Note: We do NOT clean between individual tests to allow integration tests
// to maintain state and test workflows across multiple operations
afterAll(async () => {
  // Delete in correct order to avoid foreign key constraint violations
  // 1. Delete junction tables first (if they exist)
  try {
    await prisma.$executeRaw`DELETE FROM _LeadToTag`;
  } catch (error) {
    // Table might not exist or be empty, ignore
  }
  
  // 2. Delete dependent records (those with foreign keys to users/leads/campaigns)
  await prisma.activity.deleteMany().catch(() => {});
  await prisma.task.deleteMany().catch(() => {});
  await prisma.note.deleteMany().catch(() => {});
  await prisma.appointment.deleteMany().catch(() => {});
  await prisma.message.deleteMany().catch(() => {});
  await prisma.emailTemplate.deleteMany().catch(() => {});
  await prisma.sMSTemplate.deleteMany().catch(() => {});
  await prisma.workflow.deleteMany().catch(() => {});
  await prisma.workflowExecution.deleteMany().catch(() => {});
  
  // 3. Delete parent records
  await prisma.campaign.deleteMany().catch(() => {});
  await prisma.lead.deleteMany().catch(() => {});
  await prisma.tag.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  
  // Disconnect from database
  await prisma.$disconnect();
});
