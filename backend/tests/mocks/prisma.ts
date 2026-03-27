import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>()

// Reset between tests
beforeEach(() => {
  mockReset(prismaMock)
})

export type MockPrismaClient = DeepMockProxy<PrismaClient>
