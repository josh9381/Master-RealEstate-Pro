// Global test lifecycle hooks
import { prismaMock } from './mocks/prisma'

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks()
})

// Make prisma mock available globally
beforeEach(() => {
  // Reset all prisma mock return values
  jest.clearAllMocks()
})

// Extend expect with custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    return {
      pass,
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
    }
  },
})
