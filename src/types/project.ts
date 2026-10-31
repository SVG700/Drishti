/**
 * ==============================================================================
 * SIH26103: Web-Based Integrated Project Monitoring Platform
 * Infrastructure Project Data Model
 * ==============================================================================
 * Defines strongly typed models for monitoring public and private infrastructure
 * projects, tracking physical/financial progress, delays, budget, and geospatial sites.
 * Supports official MoSPI PAIMANA central sector datasets & time-series history.
 * ==============================================================================
 */

export type ProjectSector =
  | 'Roads & Highways'
  | 'Railways & Metro'
  | 'Ports & Shipping'
  | 'Energy & Power'
  | 'Water Resources'
  | 'Urban Development'
  | 'Aviation & Logistics'
  | 'Coal'
  | 'Power'
  | 'Transmission & Distribution'
  | 'Aviation & Aviation Infrastructure'
  | 'Railways'
  | 'Telecommunication'
  | 'Urban Public Transport'
  | 'Oil & Gas'
  | 'Energy Storage'
  | 'Real Estate'
  | 'Education'
  | 'Healthcare'
  | 'Construction'
  | 'Inland Waterways'
  | 'Metals & Mining'
  | 'Shipping'
  | 'Steel'
  | 'Sports'
  | string;

export type ProjectStatus =
  | 'ON_SCHEDULE'
  | 'DELAYED'
  | 'CRITICAL'
  | 'COMPLETED'
  | 'PLANNING'
  | 'IN_PROGRESS';

export type ProjectRiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export interface ProjectMilestone {
  id: string;
  title: string;
  targetDate: string;
  completedDate?: string;
  completed: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
}

export interface ProjectHistoryObservation {
  reportMonth: string; // e.g. "August 2025"
  reportMonthKey: string; // e.g. "2025-08"
  physicalProgress: number | null; // e.g. 71.0
  cumulativeExpenditure: number | null; // e.g. 434.79
  originalCost: number | null; // e.g. 480.0
  revisedCost: number | null; // e.g. 640.0
  originalDoc: string | null; // e.g. "2021-09"
  revisedDoc: string | null; // e.g. "2026-07"
}

export interface InfrastructureProject {
  id: string; // e.g. "400010"
  name: string; // e.g. "Construction of Terminal Building & Associated works at Leh Airport, Ladakh"
  code: string; // Short code / Project Code
  legacyOcmsCode?: string | null; // e.g. "N04000078"
  sector: ProjectSector;
  ministry?: string; // e.g. "Ministry of Civil Aviation"
  state: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number; // Meters above ground/sea level
  hasCoordinates: boolean; // True if verified latitude/longitude coordinates exist

  // Progress metrics
  physicalProgress: number; // 0 to 100 percentage
  financialProgress?: number | null; // 0 to 100 percentage
  budget: number; // In Crores INR (₹) - Original Cost
  revisedCost?: number | null; // In Crores INR (₹)
  expenditure: number; // In Crores INR (₹) - Cumulative Expenditure

  // Timeline
  approvalDate?: string | null;
  startDate?: string | null;
  targetCompletionDate: string; // Original DoC (YYYY-MM or string)
  revisedCompletionDate?: string | null; // Revised DoC (YYYY-MM or string)
  timeOverrunMonths?: number | null;

  // Status & Risk Assessment
  status: ProjectStatus;
  riskLevel: ProjectRiskLevel;
  riskScore: number; // 0 to 100 calculated risk score
  costOverrunCr?: number | null;
  costOverrunPct?: number | null;

  // Stakeholders
  implementingAgency: string; // e.g. "NHAI", "Airport Authority of India [AAI]"
  contractor?: string;
  nodalOfficer?: string;

  // Qualitative context
  description: string;
  delayReasons?: string[];
  milestones?: ProjectMilestone[];
  connectedProjectIds?: string[]; // IDs of linked infrastructure corridors

  // PAIMANA Tracking Metadata
  reportMonth?: string;
  reportMonthKey?: string;
  monthsReportedCount?: number;
  firstReportedMonth?: string;
  latestReportedMonth?: string;
  history?: ProjectHistoryObservation[];

  lastUpdated: string;
  isSynthetic?: boolean;
}

export interface ProjectFilterCriteria {
  sector?: string | 'ALL';
  state?: string | 'ALL';
  status?: ProjectStatus | 'ALL';
  riskLevel?: ProjectRiskLevel | 'ALL';
  geocodingStatus?: 'ALL' | 'GEOLOCATED_ONLY' | 'PENDING_GEOCODING';
  searchQuery?: string;
}
