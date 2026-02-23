/**
 * GeoIP Lookup Utility
 * Phase 8.9 — Look up geographic location from IP addresses
 * in SendGrid webhook event data
 */

import geoip from 'geoip-lite';

export interface GeoInfo {
  country: string;
  region: string;
  city: string;
  ll: [number, number] | null; // [latitude, longitude]
}

/**
 * Look up geographic info from an IP address
 */
export function lookupGeo(ip: string | undefined | null): GeoInfo {
  if (!ip) {
    return { country: 'Unknown', region: 'Unknown', city: 'Unknown', ll: null };
  }

  // Strip IPv6-mapped IPv4 prefix
  const cleanIp = ip.replace(/^::ffff:/, '');

  // Skip private/localhost IPs
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('172.16.') ||
    cleanIp.startsWith('172.17.') ||
    cleanIp.startsWith('172.18.') ||
    cleanIp.startsWith('172.19.') ||
    cleanIp.startsWith('172.2') ||
    cleanIp.startsWith('172.3')
  ) {
    return { country: 'Local', region: 'Local', city: 'Local', ll: null };
  }

  const geo = geoip.lookup(cleanIp);
  if (!geo) {
    return { country: 'Unknown', region: 'Unknown', city: 'Unknown', ll: null };
  }

  return {
    country: geo.country || 'Unknown',
    region: geo.region || 'Unknown',
    city: geo.city || 'Unknown',
    ll: geo.ll || null,
  };
}
