/**
 * Mock Data Configuration
 * Control whether the app uses mock data fallbacks
 * Set USE_MOCK_DATA to false to use only real database data
 */

export const MOCK_DATA_CONFIG = {
  // Set to false to disable mock data fallbacks
  // When false, the app will only use real database data
  USE_MOCK_DATA: false,
  
  // Show zeros instead of null/undefined when no data
  SHOW_ZERO_FOR_EMPTY: true,
} as const

export const useMockData = () => MOCK_DATA_CONFIG.USE_MOCK_DATA
export const showZeroForEmpty = () => MOCK_DATA_CONFIG.SHOW_ZERO_FOR_EMPTY

/**
 * Helper function to return empty values when mock data is disabled
 */
export const getMockDataOrEmpty = <T>(mockData: T, emptyValue: T): T => {
  return MOCK_DATA_CONFIG.USE_MOCK_DATA ? mockData : emptyValue
}
