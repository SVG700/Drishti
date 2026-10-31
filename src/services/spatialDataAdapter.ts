/**
 * ==============================================================================
 * SIH26103: Web-Based Integrated Project Monitoring Platform
 * Spatial Data Adapter Service
 * ==============================================================================
 * Bridges infrastructure project models to 3D geospatial entities rendered on
 * the Cesium globe. Manages active selection, site focus, and corridor links.
 * Handles official PAIMANA central sector records with nullable coordinates.
 * ==============================================================================
 */

import type {
  SpatialEntity,
  SpatialRelationship,
  SpatialEvent,
  SpatialIntelligenceDataset
} from '../types/spatial';
import type { InfrastructureProject, ProjectFilterCriteria } from '../types/project';
import { SYNTHETIC_PROJECTS } from '../data/syntheticProjects';

/**
 * Transforms an InfrastructureProject record into a Cesium-compatible SpatialEntity
 */
export function projectToSpatialEntity(project: InfrastructureProject): SpatialEntity {
  const hasCoords = project.hasCoordinates && typeof project.latitude === 'number' && typeof project.longitude === 'number';

  return {
    id: project.id,
    type: 'PROJECT',
    name: project.name,
    identifier: `${project.code} • ${project.physicalProgress}%`,
    latitude: hasCoords ? project.latitude! : undefined,
    longitude: hasCoords ? project.longitude! : undefined,
    altitude: hasCoords ? (project.altitude || 25) : undefined,
    confidence: 100,
    riskScore: project.riskScore,
    status: project.status,
    riskLevel: project.riskLevel,
    sector: project.sector,
    physicalProgress: project.physicalProgress,
    financialProgress: project.financialProgress || undefined,
    budget: project.budget,
    expenditure: project.expenditure,
    targetCompletionDate: project.targetCompletionDate,
    implementingAgency: project.implementingAgency,
    projectData: project,
    description: project.description,
    relatedEntityIds: project.connectedProjectIds || [],
    attributes: {
      'Sector': project.sector,
      'Ministry': project.ministry || 'Central Government',
      'Physical Progress': `${project.physicalProgress}%`,
      'Financial Progress': project.financialProgress !== undefined && project.financialProgress !== null ? `${project.financialProgress}%` : 'Not Reported',
      'Budget': `₹${project.budget.toLocaleString()} Cr`,
      'Expenditure': `₹${project.expenditure.toLocaleString()} Cr`,
      'Implementing Agency': project.implementingAgency,
      'Contractor': project.contractor || 'N/A',
      'Location': `${project.district ? project.district + ', ' : ''}${project.state}`,
      'Target Date': project.targetCompletionDate,
      'Status': project.status,
      'Risk Rating': project.riskLevel,
      'Geocoding': project.hasCoordinates ? 'Verified Geospatial Marker' : 'Pending Verified Geocoding',
      'Last Audit Update': project.lastUpdated
    },
    lastActivity: project.lastUpdated
  };
}

/**
 * Builds the initial spatial dataset from infrastructure projects
 */
export function buildInfrastructureSpatialDataset(
  projects: InfrastructureProject[] = SYNTHETIC_PROJECTS
): SpatialIntelligenceDataset {
  const entities: SpatialEntity[] = projects.map(projectToSpatialEntity);

  // Generate 3D connection links for inter-connected infrastructure corridors
  const relationships: SpatialRelationship[] = [];
  const processedPairs = new Set<string>();

  projects.forEach(p => {
    if (p.connectedProjectIds && p.connectedProjectIds.length > 0) {
      p.connectedProjectIds.forEach(targetId => {
        const pairKey = [p.id, targetId].sort().join('<->');
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          relationships.push({
            id: `corridor-${pairKey}`,
            source: p.id,
            target: targetId,
            type: 'Corridor Connectivity',
            confidence: 95
          });
        }
      });
    }
  });

  return {
    entities,
    relationships,
    events: []
  };
}

export class SpatialDataService {
  private projects: InfrastructureProject[];
  private dataset: SpatialIntelligenceDataset;
  private listeners: Set<(data: SpatialIntelligenceDataset) => void> = new Set();
  private selectedProjectId: string | null = null;
  private onFocusCallbacks: Set<(id: string) => void> = new Set();

  constructor(initialProjects: InfrastructureProject[] = SYNTHETIC_PROJECTS) {
    this.projects = initialProjects;
    this.dataset = buildInfrastructureSpatialDataset(initialProjects);
  }

  /**
   * Replace or initialize the loaded infrastructure projects
   */
  public loadProjects(projects: InfrastructureProject[]): SpatialIntelligenceDataset {
    this.projects = projects;
    this.dataset = buildInfrastructureSpatialDataset(projects);
    this.notify();
    return this.dataset;
  }

  public getProjects(): InfrastructureProject[] {
    return [...this.projects];
  }

  public getProjectById(id: string): InfrastructureProject | undefined {
    return this.projects.find(p => p.id === id);
  }

  public getDataset(): SpatialIntelligenceDataset {
    return this.dataset;
  }

  public getSpatialEntitiesOnly(): SpatialEntity[] {
    return this.dataset.entities.filter(
      e => typeof e.latitude === 'number' && typeof e.longitude === 'number'
    );
  }

  public getEntityById(id: string): SpatialEntity | undefined {
    return this.dataset.entities.find(e => e.id === id);
  }

  public filterProjects(criteria: ProjectFilterCriteria): void {
    let filtered = [...this.projects];

    if (criteria.sector && criteria.sector !== 'ALL') {
      filtered = filtered.filter(p => p.sector === criteria.sector);
    }
    if (criteria.state && criteria.state !== 'ALL') {
      filtered = filtered.filter(p => p.state === criteria.state);
    }
    if (criteria.status && criteria.status !== 'ALL') {
      filtered = filtered.filter(p => p.status === criteria.status);
    }
    if (criteria.riskLevel && criteria.riskLevel !== 'ALL') {
      filtered = filtered.filter(p => p.riskLevel === criteria.riskLevel);
    }
    if (criteria.geocodingStatus && criteria.geocodingStatus !== 'ALL') {
      if (criteria.geocodingStatus === 'GEOLOCATED_ONLY') {
        filtered = filtered.filter(p => p.hasCoordinates);
      } else if (criteria.geocodingStatus === 'PENDING_GEOCODING') {
        filtered = filtered.filter(p => !p.hasCoordinates);
      }
    }
    if (criteria.searchQuery && criteria.searchQuery.trim()) {
      const q = criteria.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.ministry && p.ministry.toLowerCase().includes(q)) ||
        (p.legacyOcmsCode && p.legacyOcmsCode.toLowerCase().includes(q)) ||
        p.state.toLowerCase().includes(q) ||
        (p.district && p.district.toLowerCase().includes(q))
      );
    }

    this.dataset = buildInfrastructureSpatialDataset(filtered);
    this.notify();
  }

  public resetFilters(): void {
    this.dataset = buildInfrastructureSpatialDataset(this.projects);
    this.notify();
  }

  public selectProject(id: string | null): void {
    this.selectedProjectId = id;
    if (id) {
      this.onFocusCallbacks.forEach(cb => cb(id));
    }
  }

  public getSelectedProjectId(): string | null {
    return this.selectedProjectId;
  }

  public subscribe(listener: (data: SpatialIntelligenceDataset) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onProjectFocus(cb: (id: string) => void): () => void {
    this.onFocusCallbacks.add(cb);
    return () => this.onFocusCallbacks.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb(this.dataset));
  }
}

export const spatialDataService = new SpatialDataService();
