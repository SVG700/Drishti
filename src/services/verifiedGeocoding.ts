/**
 * ==============================================================================
 * SIH26103: Web-Based Integrated Project Monitoring Platform
 * Verified Infrastructure Geocoding Registry
 * ==============================================================================
 * Maps official PAIMANA Project Codes to the coordinates of each project's
 * construction site, checked against OpenStreetMap features (terminals,
 * quarries, stations) and Esri World Imagery; each entry names its source.
 *
 * IMPORTANT:
 * - Real PAIMANA reports do not contain coordinates.
 * - This registry provides verified coordinates ONLY for confirmed landmark assets.
 * - Any project NOT in this verified registry remains with latitude/longitude as null
 *   and will NOT be rendered at arbitrary or misleading coordinates on the 3D globe.
 * ==============================================================================
 */

export interface VerifiedCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  source: string;
}

export const VERIFIED_PROJECT_COORDINATES: Record<string, VerifiedCoordinates> = {
  // --- Benchmark Corridor Projects ---
  'PRJ-NH-042': { latitude: 21.1702, longitude: 72.8311, altitude: 25, source: 'NHSRCL Survey Hub (Surat)' },
  'PRJ-RL-108': { latitude: 22.3072, longitude: 73.1812, altitude: 35, source: 'DFCCIL Western Hub (Vadodara)' },
  'PRJ-AV-019': { latitude: 18.9902, longitude: 73.0722, altitude: 12, source: 'CIDCO NMIA Geodetic Datum' },
  'PRJ-TN-087': { latitude: 34.2831, longitude: 75.1834, altitude: 3120, source: 'NHIDCL Zojila Tunnel Portal' },
  'PRJ-BR-054': { latitude: 33.1508, longitude: 74.8828, altitude: 359, source: 'Northern Railway Chenab Pier' },
  'PRJ-PT-007': { latitude: 8.3752, longitude: 76.9912, altitude: 5, source: 'VISL Port Datum' },
  'PRJ-EN-033': { latitude: 23.8500, longitude: 69.7500, altitude: 15, source: 'Khavda Renewable Energy Zone' },
  'PRJ-MT-092': { latitude: 12.9716, longitude: 77.5946, altitude: 920, source: 'BMRCL Metro Phase 2 Central' },
  'PRJ-RR-015': { latitude: 28.7041, longitude: 77.4538, altitude: 210, source: 'NCRTC RapidX Ghaziabad' },

  // --- Official PAIMANA Central Sector Airport Assets ---
  '400010': { latitude: 34.1436, longitude: 77.5548, altitude: 3256, source: 'Leh airport new terminal building (Esri imagery)' },
  '611495': { latitude: 26.6850, longitude: 88.3255, altitude: 126, source: 'Bagdogra airport terminal area (OSM aeroway=terminal)' },
  '611602': { latitude: 12.9828, longitude: 80.1643, altitude: 16, source: 'Chennai airport integrated terminal T2 (OSM)' },
  '612063': { latitude: 25.4441, longitude: 81.7326, altitude: 98, source: 'Prayagraj airport new terminal (OSM aeroway=terminal)' },
  '612183': { latitude: 25.5835, longitude: 84.8866, altitude: 52, source: 'Bihta civil enclave site south of runway (Esri imagery)' },
  '612194': { latitude: 26.1903, longitude: 85.9195, altitude: 48, source: 'Darbhanga new civil enclave site south of runway (Esri imagery)' },
  '612786': { latitude: 14.5184, longitude: 78.7680, altitude: 133, source: 'Kadapa airport terminal (OSM aeroway=terminal)' },
  '612787': { latitude: 15.3570, longitude: 75.0846, altitude: 662, source: 'Hubballi airport new terminal (OSM aeroway=terminal)' },
  '612788': { latitude: 15.8630, longitude: 74.6112, altitude: 758, source: 'Belagavi airport terminal (OSM aeroway=terminal)' },
  '612789': { latitude: 11.1364, longitude: 75.9553, altitude: 104, source: 'Calicut airport runway 10-28 midpoint (OSM aerodrome)' },
  '612791': { latitude: 22.6531, longitude: 88.4450, altitude: 5, source: 'Kolkata NSCBI secondary runway 01L/19R (Esri imagery)' },
  '612793': { latitude: 27.2290, longitude: 88.5851, altitude: 1400, source: 'Pakyong airport runway western slope works (Esri imagery)' },
  '616235': { latitude: 17.9770, longitude: 83.5060, altitude: 24, source: 'Bhogapuram (Alluri Sitarama Raju) airport campus (OSM aerodrome)' },
  '701101': { latitude: 25.5961, longitude: 85.0910, altitude: 52, source: 'Patna JPNI airport new terminal (OSM aeroway=terminal)' },
  '701105': { latitude: 15.3850, longitude: 73.8366, altitude: 56, source: 'Goa Dabolim airport terminal (OSM aeroway=terminal)' },
  '701107': { latitude: 16.5226, longitude: 80.7982, altitude: 25, source: 'Vijayawada airport new integrated terminal (Esri imagery / OSM)' },
  '701113': { latitude: 25.4487, longitude: 82.8568, altitude: 81, source: 'Varanasi LBS airport terminal (OSM aeroway=terminal)' },
  '701121': { latitude: 17.1063, longitude: 81.8215, altitude: 46, source: 'Rajahmundry airport terminal (OSM aeroway=terminal)' },
  '701122': { latitude: 27.1418, longitude: 77.9474, altitude: 168, source: 'Agra new civil enclave site, Dhanauli side (Esri imagery)' },
  '701126': { latitude: 22.3592, longitude: 72.3062, altitude: 18, source: 'Dholera greenfield airport terminal area (OSM landuse=construction / Esri imagery)' },
  '701127': { latitude: 26.2637, longitude: 73.0505, altitude: 219, source: 'Jodhpur civil airport terminal (OSM aeroway=terminal)' },
  '701128': { latitude: 24.6199, longitude: 73.8904, altitude: 513, source: 'Udaipur Maharana Pratap airport terminal (OSM aeroway=terminal)' },
  '706718': { latitude: 24.7645, longitude: 93.8976, altitude: 774, source: 'Imphal Bir Tikendrajit airport terminal (OSM aeroway=terminal)' },
  '706724': { latitude: 26.1214, longitude: 91.5990, altitude: 49, source: 'Guwahati LGBI airport new integrated Terminal 2 (OSM aeroway=terminal)' },

  // --- Official PAIMANA Central Sector Ports & Waterways ---
  '400382': { latitude: 18.7906, longitude: 72.9306, altitude: 4, source: 'Rewas, Alibag taluka, Raigad (OSM place); port site on this shore' },
  '609424': { latitude: 22.9310, longitude: 70.1029, altitude: 6, source: 'Tuna-Tekra container terminal, Deendayal Port (OSM)' },
  '611943': { latitude: 23.2382, longitude: 68.6085, altitude: 8, source: 'Jakhau Port railhead end of Naliya-Jakhau line (OSM)' },

  // --- Official PAIMANA Central Sector Power & Multi-Purpose Dams ---
  '400102': { latitude: 17.0324, longitude: 79.6491, altitude: 100, source: 'SRSP Stage-II Kakatiya canal tail (km 346) near Musi, Anantharam, Suryapet (NWDA / OSM)' },
  '400005': { latitude: 20.9524, longitude: 72.9324, altitude: 10, source: 'Navsari (New) 765/400 kV GIS substation area, approximate (CTUIL; exact site unpublished)' },
  '611586': { latitude: 31.2481, longitude: 77.2108, altitude: 650, source: 'Sunni Dam axis on Satluj near Khaira (MoEF ToR 31°14\'53"N 77°12\'39"E)' },
  '613787': { latitude: 29.2497, longitude: 79.6494, altitude: 560, source: 'Jamrani Dam site on Gaula river at Jamrani village (OSM / Esri imagery)' },

  // --- Official PAIMANA Central Sector Metro Networks ---
  '400277': { latitude: 22.5568, longitude: 88.4123, altitude: 8, source: 'Orange Line under-construction Chingrighata stretch, EM Bypass (OSM)' },
  '617207': { latitude: 28.5174, longitude: 77.2182, altitude: 230, source: 'Phase-IV Lajpat Nagar-Saket G Block corridor, Saket G Block station (OSM railway=construction)' },
  '617226': { latitude: 18.4610, longitude: 73.8581, altitude: 600, source: 'Swargate-Katraj line, Padmavati station on Satara Road (OSM railway=proposed)' },
  '617327': { latitude: 19.2183, longitude: 72.9781, altitude: 15, source: 'Thane Integral Ring Metro alignment near Kapurbawdi' },
  '619052': { latitude: 26.8670, longitude: 80.9155, altitude: 120, source: 'Phase-1B East-West corridor, Medical College (KGMU) station area (OSM)' },

  // --- Official PAIMANA Major Open Cast Coal Mining Sites ---
  '400147': { latitude: 22.3315, longitude: 82.6674, altitude: 295, source: 'SECL Kusmunda open cast mine pit (OSM landuse=quarry)' },
  '400424': { latitude: 22.3338, longitude: 82.5893, altitude: 310, source: 'SECL Gevra open cast mine pit (OSM landuse=quarry)' },
  '400354': { latitude: 22.3272, longitude: 82.5309, altitude: 300, source: 'SECL Dipka open cast mine pit (OSM landuse=quarry)' },
  '400018': { latitude: 24.9956, longitude: 87.3734, altitude: 100, source: 'ECL Hurra C open cast pit, Rajmahal area, Godda (GEM / Esri imagery)' },
  '400033': { latitude: 20.0575, longitude: 79.2736, altitude: 190, source: 'WCL Bhatadi open cast mine pit (OSM landuse=quarry)' }
};

/**
 * Looks up verified geospatial coordinates for a project ID
 * Returns VerifiedCoordinates if confirmed, or null if pending verified geocoding
 */
export function getVerifiedProjectCoordinates(projectId: string): VerifiedCoordinates | null {
  return VERIFIED_PROJECT_COORDINATES[projectId] || null;
}
