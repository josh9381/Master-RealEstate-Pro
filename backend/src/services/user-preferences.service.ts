/**
 * User Preferences Service (Phase 3)
 * Manages AI Composer user preferences and defaults
 * 
 * NOTE: For Phase 3 MVP, preferences are stored in-memory/localStorage
 * TODO Phase 4: Add preferences field to User model in schema
 */

export interface ComposerPreferences {
  defaultTone: string
  defaultLength: string
  defaultCTA: boolean
  defaultPersonalization: string
  autoGenerate: boolean
  showAdvanced: boolean
}

export const DEFAULT_PREFERENCES: ComposerPreferences = {
  defaultTone: 'professional',
  defaultLength: 'standard',
  defaultCTA: true,
  defaultPersonalization: 'standard',
  autoGenerate: true,
  showAdvanced: false
}

// In-memory storage for Phase 3 (will be replaced with database in Phase 4)
const preferencesCache = new Map<string, ComposerPreferences>()

/**
 * Save or update user's composer preferences
 */
export async function saveComposerPreferences(
  userId: string,
  preferences: Partial<ComposerPreferences>
): Promise<ComposerPreferences> {
  const existing = preferencesCache.get(userId) || DEFAULT_PREFERENCES
  
  const updated = {
    ...existing,
    ...preferences
  }
  
  preferencesCache.set(userId, updated)
  
  return updated
}

/**
 * Load user's composer preferences
 */
export async function loadComposerPreferences(
  userId: string
): Promise<ComposerPreferences> {
  return preferencesCache.get(userId) || DEFAULT_PREFERENCES
}

/**
 * Reset preferences to defaults
 */
export async function resetComposerPreferences(
  userId: string
): Promise<ComposerPreferences> {
  preferencesCache.set(userId, DEFAULT_PREFERENCES)
  return DEFAULT_PREFERENCES
}
