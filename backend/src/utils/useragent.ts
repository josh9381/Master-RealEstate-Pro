/**
 * User Agent Parser Utility
 * Phase 8.9 — Parse user-agent strings from webhook events
 * to determine device type (Desktop, Mobile, Tablet)
 */

import UAParser from 'ua-parser-js';

export interface DeviceInfo {
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  browser: string;
  os: string;
}

/**
 * Parse a user-agent string into device info
 */
export function parseUserAgent(ua: string | undefined | null): DeviceInfo {
  if (!ua) {
    return { deviceType: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  }

  const parser = new (UAParser as any)(ua);
  const result = parser.getResult();

  // Determine device type
  let deviceType: DeviceInfo['deviceType'] = 'Desktop';
  const type = result.device?.type?.toLowerCase();
  if (type === 'mobile' || type === 'wearable') {
    deviceType = 'Mobile';
  } else if (type === 'tablet') {
    deviceType = 'Tablet';
  } else if (type === 'console' || type === 'smarttv' || type === 'embedded') {
    deviceType = 'Unknown';
  }
  // If no device type is detected, it's likely a desktop browser
  // ua-parser-js doesn't set type for desktop browsers

  const browser = result.browser?.name || 'Unknown';
  const os = result.os?.name || 'Unknown';

  return { deviceType, browser, os };
}
