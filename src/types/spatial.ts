import type { InfrastructureProject, ProjectRiskLevel } from './project';

export type SpatialSensorMode = 'normal' | 'surveillance' | 'thermal' | 'retro' | 'noir' | 'snow';

export type SpatialMapStack = 'esri-imagery' | 'ion-aerial' | 'osm' | 'photoreal';

export type SpatialEntityType =
  | 'PROJECT'
  | 'SITE'
  | 'CORRIDOR'
  | 'FACILITY'
  | 'HUB'
  | 'LOCATION';

export type SpatialSeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SpatialTrailPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
}

export interface SpatialEntity {
  id: string;
  type: SpatialEntityType | string;
  name: string;
  identifier: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  heading?: number;
  speed?: number; // km/h or knots
  confidence: number;
  riskScore: number; // 0 to 100
  description: string;
  relatedEntityIds: string[];
  attributes: Record<string, string>;
  hasTelemetryTrail?: boolean;
  trailPoints?: SpatialTrailPoint[];
  lastActivity?: string;
  status?: string;

  // Infrastructure Project Metadata Extension
  projectData?: InfrastructureProject;
  sector?: string;
  physicalProgress?: number;
  financialProgress?: number;
  budget?: number;
  expenditure?: number;
  targetCompletionDate?: string;
  implementingAgency?: string;
  riskLevel?: ProjectRiskLevel | SpatialSeverityLevel;
}

export interface SpatialRelationship {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence?: number;
}

export interface SpatialEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  entityId: string;
  latitude?: number;
  longitude?: number;
  severity: SpatialSeverityLevel;
}

export interface SpatialIntelligenceDataset {
  entities: SpatialEntity[];
  relationships: SpatialRelationship[];
  events: SpatialEvent[];
}

export interface SpatialTelemetry {
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  pitch: number;
  roll: number;
  cameraRange: number;
  fov: number;
  mgrs: string;
}
