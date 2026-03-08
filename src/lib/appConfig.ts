/**
 * App-wide configuration constants.
 * Values are drawn from Vite env vars at build time, with sensible defaults.
 */

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Master RealEstate Pro';
export const APP_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;

/** Placeholder shown when the user's email is not yet loaded */
export const FALLBACK_EMAIL = '';
/** Placeholder shown when the user's name is not yet loaded */
export const FALLBACK_NAME = 'User';
