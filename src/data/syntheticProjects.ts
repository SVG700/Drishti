/**
 * ==============================================================================
 * SIH26103: Web-Based Integrated Project Monitoring Platform
 * Synthetic Infrastructure Projects Dataset
 * ==============================================================================
 * NOTICE:
 * THIS IS A SYNTHETIC DEMONSTRATION DATASET CREATED EXCLUSIVELY FOR
 * PROTOTYPING AND TESTING THE SIH26103 PROJECT MONITORING PLATFORM.
 * IT DOES NOT REPRESENT REAL GOVERNMENT DATA, OFFICIAL BUDGETS, OR LIVE PROGRESS.
 * ==============================================================================
 */

import type { InfrastructureProject } from '../types/project';

export const SYNTHETIC_DATA_BANNER = {
  isSynthetic: true,
  environment: 'SIH26103 PROTOTYPE ENVIRONMENT',
  disclaimer: 'SYNTHETIC DEMO DATASET — FOR SYSTEM EVALUATION ONLY. NOT OFFICIAL GOVERNMENT STATISTICS.'
};

export const SYNTHETIC_PROJECTS: InfrastructureProject[] = [
  {
    id: 'PRJ-NH-042',
    name: 'Delhi-Mumbai Expressway (Pkg 14 Vadodara Spur)',
    code: 'DME-PKG-14',
    sector: 'Roads & Highways',
    state: 'Gujarat',
    district: 'Vadodara',
    latitude: 22.3072,
    longitude: 73.1812,
    altitude: 40,
    physicalProgress: 84,
    financialProgress: 81,
    budget: 3450, // ₹3,450 Cr
    expenditure: 2794,
    startDate: '2022-04-15',
    targetCompletionDate: '2026-12-31',
    status: 'ON_SCHEDULE',
    riskLevel: 'LOW',
    riskScore: 18,
    implementingAgency: 'NHAI',
    contractor: 'Larsen & Toubro Ltd',
    nodalOfficer: 'Chief Project Engineer, NHAI Vadodara',
    description: 'Eight-lane access-controlled greenfield expressway section providing high-speed freight connectivity to Vadodara and JNPT corridor.',
    delayReasons: [],
    connectedProjectIds: ['PRJ-DF-502'],
    milestones: [
      { id: 'M1', title: 'Land Acquisition & Forest Clearance', targetDate: '2022-08-30', completed: true, status: 'COMPLETED' },
      { id: 'M2', title: 'Earthwork & Sub-base Formation', targetDate: '2023-11-15', completed: true, status: 'COMPLETED' },
      { id: 'M3', title: 'PQC Paving (Km 0 to 42)', targetDate: '2025-06-30', completed: true, status: 'COMPLETED' },
      { id: 'M4', title: 'Toll Plaza & Smart Highway ITS Installation', targetDate: '2026-10-31', completed: false, status: 'IN_PROGRESS' }
    ],
    hasCoordinates: true,
    isSynthetic: true,
    lastUpdated: '2026-09-20'
  },
  {
    id: 'PRJ-RR-108',
    name: 'Bengaluru Suburban Rail (Corridor 2: Mallige Line)',
    code: 'BSRP-C2',
    sector: 'Railways & Metro',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    latitude: 13.0358,
    longitude: 77.5654,
    altitude: 920,
    physicalProgress: 42,
    financialProgress: 49,
    budget: 4950, // ₹4,950 Cr
    expenditure: 2425,
    startDate: '2022-10-01',
    targetCompletionDate: '2027-03-31',
    revisedCompletionDate: '2027-11-30',
    status: 'DELAYED',
    riskLevel: 'MEDIUM',
    riskScore: 58,
    implementingAgency: 'K-RIDE',
    contractor: 'L&T Infrastructure',
    nodalOfficer: 'Executive Director (Rolling Stock & Civil), K-RIDE',
    description: '25.2 km suburban commuter rail corridor linking Baiyappanahalli to Chikkabanavara with 14 elevated and at-grade stations.',
    delayReasons: ['Defense land parcel transfer approvals', 'Utility shifting along Yeshwantpur-Lottegollahalli chord'],
    connectedProjectIds: [],
    milestones: [
      { id: 'M1', title: 'Detailed Project Report & Tendering', targetDate: '2022-12-31', completed: true, status: 'COMPLETED' },
      { id: 'M2', title: 'Viaduct Pier Casting (Phase 1)', targetDate: '2024-08-30', completed: true, status: 'COMPLETED' },
      { id: 'M3', title: 'Track Laying & Ballastless Trackbed', targetDate: '2026-04-15', completed: false, status: 'IN_PROGRESS' },
      { id: 'M4', title: '25kV Traction Substation & Signalling', targetDate: '2026-12-31', completed: false, status: 'PENDING' }
    ],
    hasCoordinates: true,
    isSynthetic: true,
    lastUpdated: '2026-09-24'
  },
  {
    id: 'PRJ-MR-204',
    name: 'Mumbai Coastal Road (South Section: Marine Drive to Worli)',
    code: 'MCRP-SOUTH',
    sector: 'Urban Development',
    state: 'Maharashtra',
    district: 'Mumbai City',
    latitude: 18.9610,
    longitude: 72.8050,
    altitude: 12,
    physicalProgress: 94,
    financialProgress: 92,
    budget: 12721, // ₹12,721 Cr
    expenditure: 11703,
    startDate: '2018-12-01',
    targetCompletionDate: '2026-11-15',
    status: 'ON_SCHEDULE',
    riskLevel: 'LOW',
    riskScore: 22,
    implementingAgency: 'Brihanmumbai Municipal Corporation (BMC)',
    contractor: 'Hindustan Construction Co. & L&T',
    nodalOfficer: 'Chief Engineer (Coastal Road Project), BMC',
    description: '10.58 km high-speed arterial coastal freeway including undersea twin tunnels from Priyadarshini Park to Marine Drive and elevated Worli connector.',
    delayReasons: [],
    connectedProjectIds: ['PRJ-DF-502'],
    milestones: [
      { id: 'M1', title: 'Undersea TBM Tunnel Boring (Both Tubes)', targetDate: '2023-05-31', completed: true, status: 'COMPLETED' },
      { id: 'M2', title: 'Marine Drive Interchange Southbound Arm', targetDate: '2024-03-11', completed: true, status: 'COMPLETED' },
      { id: 'M3', title: 'Sea Link Bowstring Bridge Arch Launch', targetDate: '2025-09-30', completed: true, status: 'COMPLETED' },
      { id: 'M4', title: 'Promenade Landscaping & Final Commissioning', targetDate: '2026-11-15', completed: false, status: 'IN_PROGRESS' }
    ],
    hasCoordinates: true,
    isSynthetic: true,
    lastUpdated: '2026-09-27'
  },
  {
    id: 'PRJ-EN-301',
    name: 'Rewa Ultra Mega Solar Park Expansion (Phase II)',
    code: 'RUMSL-PH2',
    sector: 'Energy & Power',
    state: 'Madhya Pradesh',
    district: 'Rewa',
    latitude: 24.4812,
    longitude: 81.3324,
    altitude: 310,
    physicalProgress: 36,
    financialProgress: 52,
    budget: 1850, // ₹1,850 Cr
    expenditure: 962,
    startDate: '2023-02-10',
    targetCompletionDate: '2026-08-30',
    revisedCompletionDate: '2027-06-30',
    status: 'CRITICAL',
    riskLevel: 'CRITICAL',
    riskScore: 88,
    implementingAgency: 'Rewa Ultra Mega Solar Ltd (RUMSL)',
    contractor: 'Mahindra Susten / Solis Power JV',
    nodalOfficer: 'Superintending Engineer, RUMSL Bhopal',
    description: '500 MW utility-scale solar photovoltaic grid power generation expansion with grid evacuation to PGCIL 400kV inter-state substation.',
    delayReasons: [
      'Substation power transformer manufacturing backlog',
      'Right of way disputes along 220kV transmission line tower foundation sites',
      'Supply chain delay for bifacial PV modules'
    ],
    connectedProjectIds: [],
    milestones: [
      { id: 'M1', title: 'Grid Connectivity Agreement & Land Survey', targetDate: '2023-06-30', completed: true, status: 'COMPLETED' },
      { id: 'M2', title: 'Civil Foundations & Tracker Pile Installation', targetDate: '2024-12-15', completed: true, status: 'COMPLETED' },
      { id: 'M3', title: 'Inverter Transformer Station Commissioning', targetDate: '2026-03-31', completed: false, status: 'DELAYED' },
      { id: 'M4', title: 'Commercial Operation Date (COD)', targetDate: '2026-08-30', completed: false, status: 'DELAYED' }
    ],
    hasCoordinates: true,
    isSynthetic: true,
    lastUpdated: '2026-09-15'
  },
  {
    id: 'PRJ-WR-405',
    name: 'Polavaram Multipurpose Irrigation Main Right Canal',
    code: 'POL-RC-405',
    sector: 'Water Resources',
    state: 'Andhra Pradesh',
    district: 'Eluru',
    latitude: 17.2514,
    longitude: 81.6508,
    altitude: 48,
    physicalProgress: 68,
    financialProgress: 74,
    budget: 6800, // ₹6,800 Cr
    expenditure: 5032,
    startDate: '2019-06-01',
    targetCompletionDate: '2026-06-30',
    revisedCompletionDate: '2027-03-31',
    status: 'DELAYED',
    riskLevel: 'HIGH',
    riskScore: 74,
    implementingAgency: 'Polavaram Project Authority (PPA)',
    contractor: 'Megha Engineering & Infrastructures Ltd',
    nodalOfficer: 'Chief Engineer, Godavari Delta Command',
    description: '174 km lined irrigation canal transferring surplus Godavari flood waters to the Krishna River basin to irrigate 7.2 lakh acres.',
    delayReasons: [
      'Monsoon flood damage to diaphragm wall in downstream reach',
      'Rehabilitation and Resettlement (R&R) compensation package approvals'
    ],
    connectedProjectIds: [],
    milestones: [
      { id: 'M1', title: 'Canal Deep Excavation & Embankment', targetDate: '2022-12-31', completed: true, status: 'COMPLETED' },
      { id: 'M2', title: 'Concrete Bed and Slope Lining (Km 0 to 120)', targetDate: '2024-05-30', completed: true, status: 'COMPLETED' },
      { id: 'M3', title: 'Aqueduct and Syphon Cross Drainage Structures', targetDate: '2025-12-31', completed: true, status: 'COMPLETED' },
      { id: 'M4', title: 'Discharge Regulator Gate Testing', targetDate: '2026-06-30', completed: false, status: 'IN_PROGRESS' }
    ],
    hasCoordinates: true,
    isSynthetic: true,
    lastUpdated: '2026-09-18'
  },
  {
    id: 'PRJ-DF-502',
    name: 'Western Dedicated Freight Corridor (JNPT to Vaitarna Section)',
    code: 'WDFC-JNPT',
    sector: 'Railways & Metro',
    state: 'Maharashtra',
    district: 'Raigad / Palghar',
    latitude: 19.4200,
    longitude: 72.8400,
    altitude: 18,
    physicalProgress: 79,
    financialProgress: 76,
    budget: 8200, // ₹8,200 Cr
    expenditure: 6232,
    startDate: '2020-03-01',
    targetCompletionDate: '2027-01-31',
    status: 'ON_SCHEDULE',
    riskLevel: 'LOW',
    riskScore: 26,
    implementingAgency: 'DFCCIL',
    contractor: 'Soojitz-L&T Consortium',
    nodalOfficer: 'General Manager (Coordination), DFCCIL Mumbai',
    description: 'Double-line electrified heavy-haul freight railway enabling 100 km/h double-stack container transport directly from JNPT to Northern hinterland.',
    delayReasons: [],
    connectedProjectIds: ['PRJ-NH-042', 'PRJ-MR-204'],
    milestones: [
      { id: 'M1', title: 'Land Acquisition & CRZ Clearances', targetDate: '2021-12-31', completed: true, status: 'COMPLETED' },
      { id: 'M2', title: 'Major River Bridges over Ulhas & Vaitarna', targetDate: '2024-04-30', completed: true, status: 'COMPLETED' },
      { id: 'M3', title: 'Automated Track Laying (NTC Machine)', targetDate: '2025-10-31', completed: true, status: 'COMPLETED' },
      { id: 'M4', title: '2x25kV Overhead Electrification & Signalling', targetDate: '2026-11-30', completed: false, status: 'IN_PROGRESS' }
    ],
    hasCoordinates: true,
    isSynthetic: true,
    lastUpdated: '2026-09-22'
  },
  {
    id: 'PRJ-RL-601',
    name: 'Chenab Bridge & USBRL Rail Link (Katra to Banihal)',
    code: 'USBRL-CHENAB',
    sector: 'Railways & Metro',
    state: 'Jammu & Kashmir',
    district: 'Reasi',
    latitude: 33.1517,
    longitude: 74.8794,
    altitude: 359,
    physicalProgress: 97,
    financialProgress: 99,
    budget: 1480, // ₹1,480 Cr
    expenditure: 1465,
    startDate: '2016-08-01',
    targetCompletionDate: '2026-10-30',
    status: 'COMPLETED',
    riskLevel: 'LOW',
    riskScore: 12,
    implementingAgency: 'Northern Railway / Konkan Railway Corporation',
    contractor: 'Afcons Infrastructure',
    nodalOfficer: 'Chief Administrative Officer (USBRL), Northern Railway',
    description: 'World highest railway arch bridge (359m above Chenab riverbed), completing the all-weather rail link between Kashmir Valley and the national rail grid.',
    delayReasons: [],
    connectedProjectIds: [],
    milestones: [
      { id: 'M1', title: 'Deep Pylon Foundation in Himalayan Dolomite', targetDate: '2019-10-31', completed: true, status: 'COMPLETED' },
      { id: 'M2', title: 'Steel Arch Closure Ribbon', targetDate: '2021-04-05', completed: true, status: 'COMPLETED' },
      { id: 'M3', title: 'Track Work & Blast Load Defense Plates', targetDate: '2024-06-30', completed: true, status: 'COMPLETED' },
      { id: 'M4', title: 'CRS Trial Run Inspection & Speed Validation', targetDate: '2026-08-20', completed: true, status: 'COMPLETED' }
    ],
    hasCoordinates: true,
    isSynthetic: true,
    lastUpdated: '2026-09-25'
  },
  {
    id: 'PRJ-PT-703',
    name: 'Vizhinjam International Transshipment Deepwater Seaport',
    code: 'VIZHINJAM-PORT',
    sector: 'Ports & Shipping',
    state: 'Kerala',
    district: 'Thiruvananthapuram',
    latitude: 8.3688,
    longitude: 76.9922,
    altitude: 8,
    physicalProgress: 89,
    financialProgress: 86,
    budget: 7700, // ₹7,700 Cr
    expenditure: 6622,
    startDate: '2015-12-05',
    targetCompletionDate: '2026-12-31',
    status: 'ON_SCHEDULE',
    riskLevel: 'MEDIUM',
    riskScore: 44,
    implementingAgency: 'Vizhinjam International Seaport Ltd (VISL)',
    contractor: 'Adani Ports and SEZ Ltd',
    nodalOfficer: 'Managing Director, VISL Thiruvananthapuram',
    description: 'Deepwater container transshipment port with 20m natural draft, situated within 10 nautical miles of the primary East-West international shipping channel.',
    delayReasons: ['Breakwater armor rock boulder supply constraints during rough sea weather'],
    connectedProjectIds: [],
    milestones: [
      { id: 'M1', title: 'Breakwater Construction (3.1 km length)', targetDate: '2024-03-31', completed: true, status: 'COMPLETED' },
      { id: 'M2', title: 'Berth 800m Container Quay Wall', targetDate: '2024-09-30', completed: true, status: 'COMPLETED' },
      { id: 'M3', title: 'Automated Ship-to-Shore (STS) Crane Commissioning', targetDate: '2025-11-30', completed: true, status: 'COMPLETED' },
      { id: 'M4', title: 'Final Phase 1 Commercial Operations Launch', targetDate: '2026-12-31', completed: false, status: 'IN_PROGRESS' }
    ],
    hasCoordinates: true,
    isSynthetic: true,
    lastUpdated: '2026-09-26'
  },
  {
    id: 'PRJ-AI-805',
    name: 'Noida International Greenfield Airport (Jewar Phase 1)',
    code: 'DXN-JEWAR',
    sector: 'Aviation & Logistics',
    state: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar',
    latitude: 28.1633,
    longitude: 77.6200,
    altitude: 205,
    physicalProgress: 74,
    financialProgress: 71,
    budget: 5730, // ₹5,730 Cr
    expenditure: 4068,
    startDate: '2021-08-01',
    targetCompletionDate: '2026-04-30',
    revisedCompletionDate: '2026-12-31',
    status: 'DELAYED',
    riskLevel: 'MEDIUM',
    riskScore: 52,
    implementingAgency: 'NIAL (Noida International Airport Ltd)',
    contractor: 'Tata Projects / Zurich Airport International',
    nodalOfficer: 'Chief Executive Officer, NIAL',
    description: 'Single-runway greenfield international airport designed for 12 million annual passengers, serving the National Capital Region (NCR).',
    delayReasons: ['Baggage Handling System (BHS) and NavAids calibration scheduling with DGCA'],
    connectedProjectIds: [],
    milestones: [
      { id: 'M1', title: 'Runway 10/28 Asphalt & Concrete Surfacing', targetDate: '2024-02-28', completed: true, status: 'COMPLETED' },
      { id: 'M2', title: 'ATC Tower Structural Completion', targetDate: '2024-08-31', completed: true, status: 'COMPLETED' },
      { id: 'M3', title: 'Passenger Terminal Building Glass Facade & Roofing', targetDate: '2025-06-30', completed: true, status: 'COMPLETED' },
      { id: 'M4', title: 'Full Flight Operations Validation & DGCA Licensing', targetDate: '2026-12-31', completed: false, status: 'IN_PROGRESS' }
    ],
    hasCoordinates: true,
    isSynthetic: true,
    lastUpdated: '2026-09-23'
  }
];
