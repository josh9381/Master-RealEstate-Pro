/**
 * User-scoped localStorage helpers.
 *
 * Keys are prefixed with `user_{userId}_` so that data from one
 * logged-in account never leaks to another on the same browser.
 *
 * All known user-scoped keys are listed in USER_SCOPED_KEYS so that
 * clearAuth() can remove them during logout.
 */

/** Canonical list of every user-scoped localStorage key (un-prefixed). */
export const USER_SCOPED_KEYS = [
  'emailSignature',
  'autoAppendSignature',
  'onboarding_wizard_dismissed',
  'onboarding_tour_completed',
  'onboarding_tour_step',
  'setup_wizard_completed',
  'notification_sound_settings',
  'recent_searches',
] as const;

function prefixed(userId: string, key: string): string {
  return `user_${userId}_${key}`;
}

/** Read a user-scoped value (returns null when missing or no userId). */
export function getUserItem(userId: string | undefined, key: string): string | null {
  if (!userId) return null;
  return localStorage.getItem(prefixed(userId, key));
}

/** Write a user-scoped value. No-op when userId is unavailable. */
export function setUserItem(userId: string | undefined, key: string, value: string): void {
  if (!userId) return;
  localStorage.setItem(prefixed(userId, key), value);
}

/** Remove a user-scoped value. No-op when userId is unavailable. */
export function removeUserItem(userId: string | undefined, key: string): void {
  if (!userId) return;
  localStorage.removeItem(prefixed(userId, key));
}

/**
 * Remove **all** known user-scoped keys for the given userId.
 * Called during logout before the auth state is cleared.
 * Also removes legacy un-prefixed keys from before the migration.
 */
export function clearUserStorage(userId: string | undefined): void {
  for (const key of USER_SCOPED_KEYS) {
    // Remove prefixed version
    if (userId) {
      localStorage.removeItem(prefixed(userId, key));
    }
    // Remove legacy un-prefixed version (one-time cleanup)
    localStorage.removeItem(key);
  }
}
