/**
 * Lightweight local coordinate-to-sector resolver for NEXORA God's Eye HUD
 * No external API dependencies. Resolves coordinates to known tactical metropolitan
 * sectors, regional maritime/continental zones, or precise coordinate fallbacks.
 */

interface MetroZone {
  name: string;
  lat: number;
  lon: number;
  radiusDeg: number;
}

const METRO_ZONES: MetroZone[] = [
  { name: 'MUMBAI METRO SECTOR', lat: 19.076, lon: 72.877, radiusDeg: 0.65 },
  { name: 'DELHI METRO SECTOR', lat: 28.614, lon: 77.209, radiusDeg: 0.75 },
  { name: 'BENGALURU METRO SECTOR', lat: 12.972, lon: 77.594, radiusDeg: 0.65 },
  { name: 'CHENNAI METRO SECTOR', lat: 13.083, lon: 80.270, radiusDeg: 0.65 },
  { name: 'HYDERABAD METRO SECTOR', lat: 17.385, lon: 78.486, radiusDeg: 0.65 },
  { name: 'KOLKATA METRO SECTOR', lat: 22.573, lon: 88.364, radiusDeg: 0.65 },
  { name: 'PUNE METRO SECTOR', lat: 18.520, lon: 73.857, radiusDeg: 0.5 },
  { name: 'AHMEDABAD METRO SECTOR', lat: 23.023, lon: 72.571, radiusDeg: 0.5 },
  { name: 'DUBAI METRO SECTOR', lat: 25.204, lon: 55.270, radiusDeg: 0.65 },
  { name: 'LONDON METRO SECTOR', lat: 51.507, lon: -0.128, radiusDeg: 0.65 },
  { name: 'NEW YORK METRO SECTOR', lat: 40.713, lon: -74.006, radiusDeg: 0.65 }
];

export function resolveSector(lat?: number, lon?: number): string {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return 'UNKNOWN SECTOR';
  }

  // 1. Check known metropolitan sectors
  for (const metro of METRO_ZONES) {
    const dLat = lat - metro.lat;
    const cosLat = Math.cos((metro.lat * Math.PI) / 180);
    const dLon = (lon - metro.lon) * cosLat;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);
    if (dist <= metro.radiusDeg) {
      return metro.name;
    }
  }

  // 2. Regional Maritime & Continental Zones
  // Arabian Sea: 8°N to 26°N, 54°E to 72.6°E
  if (lat >= 8 && lat <= 26 && lon >= 54 && lon <= 72.6) {
    return 'ARABIAN SEA SECTOR';
  }
  // Bay of Bengal: 8°N to 23°N, 80.5°E to 95°E
  if (lat >= 8 && lat <= 23 && lon >= 80.5 && lon <= 95) {
    return 'BAY OF BENGAL SECTOR';
  }
  // Indian Ocean: -50° to 8°N, 40°E to 110°E
  if (lat >= -50 && lat < 8 && lon >= 40 && lon <= 110) {
    return 'INDIAN OCEAN SECTOR';
  }
  // North Atlantic: 15°N to 65°N, -75°W to -10°W
  if (lat >= 15 && lat <= 65 && lon >= -75 && lon <= -10) {
    return 'NORTH ATLANTIC SECTOR';
  }
  // European: 35°N to 70°N, -10°E to 40°E
  if (lat >= 35 && lat <= 70 && lon >= -10 && lon <= 40) {
    return 'EUROPEAN SECTOR';
  }
  // Middle East: 15°N to 35°N, 35°E to 60°E
  if (lat >= 15 && lat <= 35 && lon >= 35 && lon <= 60) {
    return 'MIDDLE EAST SECTOR';
  }
  // North America: 25°N to 60°N, -130°W to -65°W
  if (lat >= 25 && lat <= 60 && lon >= -130 && lon <= -65) {
    return 'NORTH AMERICAN SECTOR';
  }
  // Asia-Pacific: -10° to 45°N, 95°E to 150°E
  if (lat >= -10 && lat <= 45 && lon >= 95 && lon <= 150) {
    return 'ASIA-PACIFIC SECTOR';
  }
  // Indian Subcontinent inland fallback
  if (lat >= 8 && lat <= 35 && lon >= 68 && lon <= 90) {
    return 'INDIAN SUBCONTINENT SECTOR';
  }

  // 3. Exact Coordinate Fallback (e.g. "18.94°N / 72.84°E SECTOR")
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} / ${lonStr} SECTOR`;
}
