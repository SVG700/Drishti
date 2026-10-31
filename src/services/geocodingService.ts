/**
 * NEXORA Tactical Geocoding Service
 * Provides forward geocoding for geographic locations, defense sectors, and airports.
 * Features an instant offline tactical directory combined with resilient OpenStreetMap
 * Nominatim resolution via the NEXORA API proxy architecture.
 */

export interface GeocodedLocation {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type?: string;
  boundingBox?: [number, number, number, number];
}

// Curated high-priority tactical and metropolitan directory for instant 0ms offline matching
const TACTICAL_DIRECTORY: Array<{
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  keywords: string[];
}> = [
  {
    name: 'Yelahanka',
    displayName: 'Yelahanka, Bengaluru, Karnataka, India',
    latitude: 13.1007,
    longitude: 77.5963,
    type: 'suburb',
    keywords: ['yelahanka', 'yelhanka', 'bengaluru north']
  },
  {
    name: 'Yelahanka Air Force Station',
    displayName: 'Aero India Defense Base, Yelahanka, Bengaluru, Karnataka',
    latitude: 13.1355,
    longitude: 77.6061,
    type: 'military_airfield',
    keywords: ['yelahanka air force', 'yelahanka afs', 'aero india']
  },
  {
    name: 'Kempegowda International Airport',
    displayName: 'BLR / VOBL, Devanahalli, Bengaluru, Karnataka, India',
    latitude: 13.1986,
    longitude: 77.7066,
    type: 'aerodrome',
    keywords: ['kempegowda', 'blr', 'bangalore airport', 'bengaluru airport', 'kia']
  },
  {
    name: 'Bengaluru',
    displayName: 'Bengaluru, Karnataka, India',
    latitude: 12.9716,
    longitude: 77.5946,
    type: 'city',
    keywords: ['bengaluru', 'bangalore', 'blr']
  },
  {
    name: 'Koramangala',
    displayName: 'Koramangala, Bengaluru, Karnataka, India',
    latitude: 12.9352,
    longitude: 77.6245,
    type: 'suburb',
    keywords: ['koramangala', 'kora']
  },
  {
    name: 'Whitefield',
    displayName: 'Whitefield, Bengaluru, Karnataka, India',
    latitude: 12.9698,
    longitude: 77.7500,
    type: 'suburb',
    keywords: ['whitefield', 'itpl']
  },
  {
    name: 'Indiranagar',
    displayName: 'Indiranagar, Bengaluru, Karnataka, India',
    latitude: 12.9784,
    longitude: 77.6408,
    type: 'suburb',
    keywords: ['indiranagar']
  },
  {
    name: 'Mumbai',
    displayName: 'Mumbai, Maharashtra, India',
    latitude: 19.0760,
    longitude: 72.8777,
    type: 'city',
    keywords: ['mumbai', 'bombay', 'bom']
  },
  {
    name: 'Chhatrapati Shivaji Maharaj International Airport',
    displayName: 'BOM / VABB, Sahar, Mumbai, Maharashtra, India',
    latitude: 19.0896,
    longitude: 72.8656,
    type: 'aerodrome',
    keywords: ['csmi', 'bom airport', 'mumbai airport', 'sahar', 'santa cruz airport']
  },
  {
    name: 'Delhi',
    displayName: 'Delhi, National Capital Territory, India',
    latitude: 28.6139,
    longitude: 77.2090,
    type: 'city',
    keywords: ['delhi', 'new delhi', 'del', 'ncr']
  },
  {
    name: 'Indira Gandhi International Airport',
    displayName: 'DEL / VIDP, Palam, New Delhi, India',
    latitude: 28.5562,
    longitude: 77.1000,
    type: 'aerodrome',
    keywords: ['igi', 'delhi airport', 'del airport', 'palam']
  },
  {
    name: 'Chennai',
    displayName: 'Chennai, Tamil Nadu, India',
    latitude: 13.0827,
    longitude: 80.2707,
    type: 'city',
    keywords: ['chennai', 'madras', 'maa']
  },
  {
    name: 'Chennai International Airport',
    displayName: 'MAA / VOMM, Meenambakkam, Chennai, Tamil Nadu, India',
    latitude: 12.9941,
    longitude: 80.1709,
    type: 'aerodrome',
    keywords: ['chennai airport', 'maa airport', 'meenambakkam']
  },
  {
    name: 'Hyderabad',
    displayName: 'Hyderabad, Telangana, India',
    latitude: 17.3850,
    longitude: 78.4867,
    type: 'city',
    keywords: ['hyderabad', 'hyd']
  },
  {
    name: 'Rajiv Gandhi International Airport',
    displayName: 'HYD / VOHS, Shamshabad, Hyderabad, Telangana, India',
    latitude: 17.2403,
    longitude: 78.4294,
    type: 'aerodrome',
    keywords: ['rgia', 'hyderabad airport', 'hyd airport', 'shamshabad']
  },
  {
    name: 'Kolkata',
    displayName: 'Kolkata, West Bengal, India',
    latitude: 22.5726,
    longitude: 88.3639,
    type: 'city',
    keywords: ['kolkata', 'calcutta', 'ccu']
  },
  {
    name: 'Netaji Subhash Chandra Bose International Airport',
    displayName: 'CCU / VECC, Dum Dum, Kolkata, West Bengal, India',
    latitude: 22.6547,
    longitude: 88.4467,
    type: 'aerodrome',
    keywords: ['dum dum airport', 'kolkata airport', 'ccu airport']
  },
  {
    name: 'Pune',
    displayName: 'Pune, Maharashtra, India',
    latitude: 18.5204,
    longitude: 73.8567,
    type: 'city',
    keywords: ['pune', 'poona', 'pnq']
  },
  {
    name: 'Ahmedabad',
    displayName: 'Ahmedabad, Gujarat, India',
    latitude: 23.0225,
    longitude: 72.5714,
    type: 'city',
    keywords: ['ahmedabad', 'amd']
  },
  {
    name: 'Dubai',
    displayName: 'Dubai, United Arab Emirates',
    latitude: 25.2048,
    longitude: 55.2708,
    type: 'city',
    keywords: ['dubai', 'dxb', 'uae']
  },
  {
    name: 'Dubai International Airport',
    displayName: 'DXB / OMDB, Garhoud, Dubai, United Arab Emirates',
    latitude: 25.2532,
    longitude: 55.3657,
    type: 'aerodrome',
    keywords: ['dxb airport', 'dubai airport']
  },
  {
    name: 'London',
    displayName: 'London, Greater London, England, United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    type: 'city',
    keywords: ['london', 'lon', 'uk']
  },
  {
    name: 'London Heathrow Airport',
    displayName: 'LHR / EGLL, Hillingdon, London, United Kingdom',
    latitude: 51.4700,
    longitude: -0.4543,
    type: 'aerodrome',
    keywords: ['heathrow', 'lhr', 'lhr airport']
  },
  {
    name: 'New York',
    displayName: 'New York City, New York, United States',
    latitude: 40.7128,
    longitude: -74.0060,
    type: 'city',
    keywords: ['new york', 'nyc', 'manhattan']
  },
  {
    name: 'John F. Kennedy International Airport',
    displayName: 'JFK / KJFK, Queens, New York, United States',
    latitude: 40.6413,
    longitude: -73.7781,
    type: 'aerodrome',
    keywords: ['jfk', 'jfk airport', 'kennedy airport']
  }
];

// In-memory query cache to avoid repeated HTTP requests
const queryCache = new Map<string, GeocodedLocation[]>();

/**
 * Searches local directory and remote geocoding service.
 * Resilient, fast, and does not require third-party frontend API keys.
 */
export async function searchLocations(
  query: string,
  signal?: AbortSignal
): Promise<GeocodedLocation[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (cleanQuery.length < 2) return [];

  if (queryCache.has(cleanQuery)) {
    return queryCache.get(cleanQuery)!;
  }

  const results: GeocodedLocation[] = [];
  const seenCoords = new Set<string>();

  // 1. Search Curated Tactical Directory (Instant 0ms lookup with priority scoring)
  const scoredLocal: Array<{ location: GeocodedLocation; score: number }> = [];

  for (const entry of TACTICAL_DIRECTORY) {
    const nameLower = entry.name.toLowerCase();
    const displayLower = entry.displayName.toLowerCase();
    const matchesKeyword = entry.keywords.some(k => k === cleanQuery || k.startsWith(cleanQuery));

    let score = 0;
    if (nameLower === cleanQuery) {
      score = 100;
    } else if (nameLower.startsWith(cleanQuery)) {
      score = 80;
    } else if (matchesKeyword) {
      score = 70;
    } else if (nameLower.includes(cleanQuery)) {
      score = 50;
    } else if (displayLower.includes(cleanQuery)) {
      score = 30;
    }

    if (score > 0) {
      scoredLocal.push({
        score,
        location: {
          id: `tactical-loc-${entry.name.replace(/\s+/g, '-').toLowerCase()}`,
          name: entry.name,
          displayName: entry.displayName,
          latitude: entry.latitude,
          longitude: entry.longitude,
          type: entry.type
        }
      });
    }
  }

  scoredLocal.sort((a, b) => b.score - a.score);
  for (const item of scoredLocal) {
    const coordKey = `${item.location.latitude.toFixed(3)},${item.location.longitude.toFixed(3)}`;
    if (!seenCoords.has(coordKey)) {
      seenCoords.add(coordKey);
      results.push(item.location);
    }
  }

  // 2. Query OpenStreetMap Nominatim via proxy / direct fallback
  try {
    const isBrowser = typeof window !== 'undefined';
    const proxyUrl = isBrowser ? `/api/nominatim/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1` : null;
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;

    let response: Response | null = null;

    if (proxyUrl) {
      try {
        response = await fetch(proxyUrl, {
          headers: { Accept: 'application/json' },
          signal
        });
        if (!response.ok) {
          response = null;
        }
      } catch {
        response = null;
      }
    }

    if (!response) {
      try {
        response = await fetch(fallbackUrl, {
          headers: {
            Accept: 'application/json'
          },
          signal
        });
      } catch {
        response = null;
      }
    }

    if (response && response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          if (isNaN(lat) || isNaN(lon)) continue;

          const coordKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
          if (seenCoords.has(coordKey)) continue;
          seenCoords.add(coordKey);

          let bBox: [number, number, number, number] | undefined;
          if (Array.isArray(item.boundingbox) && item.boundingbox.length === 4) {
            bBox = [
              parseFloat(item.boundingbox[0]),
              parseFloat(item.boundingbox[1]),
              parseFloat(item.boundingbox[2]),
              parseFloat(item.boundingbox[3])
            ];
          }

          results.push({
            id: `osm-${item.place_id || item.osm_id || Math.random()}`,
            name: item.name || item.display_name?.split(',')[0] || query,
            displayName: item.display_name,
            latitude: lat,
            longitude: lon,
            type: item.type || item.class,
            boundingBox: bBox
          });
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    // Non-blocking: fall back gracefully to local directory results
  }

  // Cache results
  queryCache.set(cleanQuery, results);
  if (queryCache.size > 100) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey) queryCache.delete(firstKey);
  }

  return results;
}
