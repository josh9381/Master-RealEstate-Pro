import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import {
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
  DEFAULT_FEATURE_TOGGLES,
  saveComposerPreferences,
} from '../../src/services/user-preferences.service'

describe('DEFAULT_PREFERENCES', () => {
  it('has expected default values', () => {
    expect(DEFAULT_PREFERENCES.defaultTone).toBe('professional')
    expect(DEFAULT_PREFERENCES.defaultLength).toBe('standard')
    expect(DEFAULT_PREFERENCES.defaultCTA).toBe(true)
    expect(DEFAULT_PREFERENCES.autoGenerate).toBe(true)
    expect(DEFAULT_PREFERENCES.showAdvanced).toBe(false)
  })
})

describe('DEFAULT_PROFILE', () => {
  it('has expected default values', () => {
    expect(DEFAULT_PROFILE.defaultEmailStructure).toBe('professional')
    expect(DEFAULT_PROFILE.enhancementLevel).toBe('moderate')
    expect(DEFAULT_PROFILE.brandGuidelines).toBeNull()
  })
})

describe('DEFAULT_FEATURE_TOGGLES', () => {
  it('enables all features by default', () => {
    expect(DEFAULT_FEATURE_TOGGLES.enableLeadScoring).toBe(true)
    expect(DEFAULT_FEATURE_TOGGLES.enableCompose).toBe(true)
    expect(DEFAULT_FEATURE_TOGGLES.enableContentGen).toBe(true)
    expect(DEFAULT_FEATURE_TOGGLES.enableInsights).toBe(true)
  })
})

describe('saveComposerPreferences', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
  })

  it('upserts preferences with provided values', async () => {
    const mockRecord = {
      composerDefaultTone: 'friendly',
      composerDefaultLength: 'brief',
      composerDefaultCTA: false,
      composerDefaultPersonalization: 'high',
      composerAutoGenerate: false,
      composerShowAdvanced: true,
    }
    mockPrisma.userAIPreferences.upsert.mockResolvedValue(mockRecord as any)

    const result = await saveComposerPreferences(
      'user-1',
      { defaultTone: 'friendly', defaultLength: 'brief', defaultCTA: false },
      'org-1'
    )

    expect(mockPrisma.userAIPreferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      })
    )
    expect(result.defaultTone).toBe('friendly')
  })

  it('looks up organizationId from user when not provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ organizationId: 'org-99' } as any)
    mockPrisma.userAIPreferences.upsert.mockResolvedValue({
      composerDefaultTone: 'professional',
      composerDefaultLength: 'standard',
      composerDefaultCTA: true,
      composerDefaultPersonalization: 'standard',
      composerAutoGenerate: true,
      composerShowAdvanced: false,
    } as any)

    await saveComposerPreferences('user-1', {})

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { organizationId: true },
    })
  })
})
