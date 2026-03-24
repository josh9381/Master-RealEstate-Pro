import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Track organizations created by tests so we can clean ONLY test data
export const testOrgIds: string[] = [];

// Verify database connection before tests
beforeAll(async () => {
  await prisma.$connect();
});

// Clean up after all tests — ONLY delete data created during tests
// Uses CASCADE via organization deletion to avoid wiping production data
afterAll(async () => {
  if (testOrgIds.length > 0) {
    // Deleting test organizations cascades to all related records
    // (users, leads, tasks, notes, messages, etc.)
    await prisma.organization.deleteMany({
      where: { id: { in: testOrgIds } },
    }).catch(() => {});
  }

  await prisma.$disconnect();
});
