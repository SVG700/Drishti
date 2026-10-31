/**
 * ==============================================================================
 * SIH26103: Web-Based Integrated Project Monitoring Platform
 * PAIMANA (MoSPI) Data Provider Service
 * ==============================================================================
 * Loads, parses, and normalizes official PAIMANA Central Sector Flash Report datasets
 * (2,100 unique projects and 11,011 month-by-month historical progress records).
 * Integrates verified geospatial gazetteer coordinates and attaches time-series
 * histories to individual project models.
 * ==============================================================================
 */

import type {
  InfrastructureProject,
  ProjectHistoryObservation,
  ProjectStatus,
  ProjectRiskLevel
} from '../types/project';
import { SYNTHETIC_PROJECTS } from '../data/syntheticProjects';
import { getVerifiedProjectCoordinates } from './verifiedGeocoding';

export interface PaimanaDatasetResult {
  projects: InfrastructureProject[];
  historyByProjectId: Map<string, ProjectHistoryObservation[]>;
  totalProjects: number;
  geolocatedCount: number;
  pendingGeocodingCount: number;
  source: 'PAIMANA_CSV' | 'SYNTHETIC_FALLBACK';
  error: string | null;
  loadedAt: string;
}

// In-memory cache for parsed dataset
let cachedDataset: PaimanaDatasetResult | null = null;
let activeLoadPromise: Promise<PaimanaDatasetResult> | null = null;

/**
 * Fast RFC-4180 compliant CSV parser in zero-dependency TypeScript
 */
function parseCSV(csvText: string): Record<string, string>[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] !== undefined ? row[idx].trim() : '';
    });
    return obj;
  });
}

function parseNullableFloat(val: string | undefined): number | null {
  if (!val || val === '' || val === 'NA' || val === 'null' || val === '-') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function parseNullableString(val: string | undefined): string | null {
  if (!val || val === '' || val === 'NA' || val === 'null' || val === '-') return null;
  return val;
}

/**
 * Derives normalized status from PAIMANA reporting
 */
function normalizeStatus(statusRaw: string | undefined, progress: number, targetDoc: string | null, revisedDoc: string | null): ProjectStatus {
  const s = (statusRaw || '').toUpperCase();
  if (s.includes('COMPLETED') || progress >= 100) return 'COMPLETED';
  if (s.includes('DELAYED')) return 'DELAYED';
  if (s.includes('PLANNING')) return 'PLANNING';
  if (revisedDoc && targetDoc && revisedDoc > targetDoc) return 'DELAYED';
  return 'IN_PROGRESS';
}

/**
 * Calculates objective risk level from reported cost overrun and schedule delay
 */
function calculateRisk(costOverrunPct: number | null, timeOverrunMonths: number | null, status: ProjectStatus, progress: number): { riskLevel: ProjectRiskLevel; riskScore: number } {
  let score = 15; // Baseline healthy score

  if (costOverrunPct !== null && costOverrunPct > 0) {
    score += Math.min(40, costOverrunPct * 0.8);
  }

  if (timeOverrunMonths !== null && timeOverrunMonths > 0) {
    score += Math.min(40, timeOverrunMonths * 1.5);
  }

  if (status === 'DELAYED' && progress < 30) {
    score += 15;
  }

  score = Math.min(100, Math.round(score));

  let riskLevel: ProjectRiskLevel = 'LOW';
  if (score >= 75 || (costOverrunPct && costOverrunPct > 50) || (timeOverrunMonths && timeOverrunMonths > 24)) {
    riskLevel = 'CRITICAL';
  } else if (score >= 50 || (costOverrunPct && costOverrunPct > 20) || (timeOverrunMonths && timeOverrunMonths > 12)) {
    riskLevel = 'HIGH';
  } else if (score >= 30 || (costOverrunPct && costOverrunPct > 0) || (timeOverrunMonths && timeOverrunMonths > 0)) {
    riskLevel = 'MEDIUM';
  }

  return { riskLevel, riskScore: score };
}

/**
 * Loads and processes both PAIMANA CSV files
 */
export async function loadPaimanaDataset(forceRefresh = false): Promise<PaimanaDatasetResult> {
  if (cachedDataset && !forceRefresh) {
    return cachedDataset;
  }

  if (activeLoadPromise && !forceRefresh) {
    return activeLoadPromise;
  }

  activeLoadPromise = (async () => {
    try {
      // Fetch both CSV files concurrently from public data directory
      const [projRes, histRes] = await Promise.all([
        fetch('/data/paimana_projects.csv'),
        fetch('/data/paimana_history.csv')
      ]);

      if (!projRes.ok || !histRes.ok) {
        throw new Error(`Failed to load PAIMANA data: projects HTTP ${projRes.status}, history HTTP ${histRes.status}`);
      }

      const [projText, histText] = await Promise.all([
        projRes.text(),
        histRes.text()
      ]);

      const rawProjects = parseCSV(projText);
      const rawHistory = parseCSV(histText);

      // 1. Group historical observations by Project ID
      const historyByProjectId = new Map<string, ProjectHistoryObservation[]>();
      rawHistory.forEach(hRow => {
        const pid = hRow['project_id'];
        if (!pid) return;

        const obs: ProjectHistoryObservation = {
          reportMonth: hRow['report_month'] || hRow['report_month_key'],
          reportMonthKey: hRow['report_month_key'] || '',
          physicalProgress: parseNullableFloat(hRow['physical_progress_pct']),
          cumulativeExpenditure: parseNullableFloat(hRow['cumulative_expenditure_cr']),
          originalCost: parseNullableFloat(hRow['original_cost_cr']),
          revisedCost: parseNullableFloat(hRow['revised_cost_cr']),
          originalDoc: parseNullableString(hRow['original_doc']),
          revisedDoc: parseNullableString(hRow['revised_doc'])
        };

        if (!historyByProjectId.has(pid)) {
          historyByProjectId.set(pid, []);
        }
        historyByProjectId.get(pid)!.push(obs);
      });

      // Sort each project's history chronologically
      historyByProjectId.forEach(obsList => {
        obsList.sort((a, b) => a.reportMonthKey.localeCompare(b.reportMonthKey));
      });

      // 2. Map projects to InfrastructureProject interface
      let geolocatedCount = 0;
      let pendingGeocodingCount = 0;

      const projects: InfrastructureProject[] = rawProjects.map(pRow => {
        const pid = pRow['project_id'];
        const name = pRow['project_name'] || `Project #${pid}`;
        const agency = pRow['agency'] || 'Central Agency';
        const ministry = pRow['ministry'] || undefined;
        const sector = pRow['sector'] || 'Other Infrastructure';
        const state = pRow['state'] || 'Central Sector';
        const district = parseNullableString(pRow['district']);
        const legacyOcms = parseNullableString(pRow['legacy_ocms_code']);

        const originalCost = parseNullableFloat(pRow['original_cost_cr']) || 0;
        const revisedCost = parseNullableFloat(pRow['revised_cost_cr']);
        const expenditure = parseNullableFloat(pRow['cumulative_expenditure_cr']) || 0;
        const physicalProgress = parseNullableFloat(pRow['physical_progress_pct']) || 0;

        const targetCompletionDate = pRow['original_doc'] || pRow['revised_doc'] || 'Not Reported';
        const revisedCompletionDate = parseNullableString(pRow['revised_doc']);
        const approvalDate = parseNullableString(pRow['approval_date']);
        const startDate = parseNullableString(pRow['start_date']);

        const costOverrunCr = parseNullableFloat(pRow['cost_overrun_cr']);
        const costOverrunPct = parseNullableFloat(pRow['cost_overrun_pct']);
        const timeOverrunMonths = parseNullableFloat(pRow['time_overrun_months']);

        const status = normalizeStatus(pRow['derived_status'], physicalProgress, targetCompletionDate, revisedCompletionDate);
        const { riskLevel, riskScore } = calculateRisk(costOverrunPct, timeOverrunMonths, status, physicalProgress);

        // Check verified geocoding registry
        const verifiedCoords = getVerifiedProjectCoordinates(pid);
        let latitude: number | null = null;
        let longitude: number | null = null;
        let altitude: number | undefined = undefined;
        let hasCoordinates = false;

        if (verifiedCoords) {
          latitude = verifiedCoords.latitude;
          longitude = verifiedCoords.longitude;
          altitude = verifiedCoords.altitude;
          hasCoordinates = true;
          geolocatedCount++;
        } else {
          pendingGeocodingCount++;
        }

        const projectHistory = historyByProjectId.get(pid) || [];
        const monthsReportedCount = parseInt(pRow['months_reported_count'] || String(projectHistory.length || 1), 10);

        // Compute financial progress (expenditure / budget)
        let financialProgress: number | null = null;
        const effectiveBudget = revisedCost && revisedCost > 0 ? revisedCost : originalCost;
        if (effectiveBudget > 0 && expenditure >= 0) {
          financialProgress = Math.min(100, Math.round((expenditure / effectiveBudget) * 100));
        }

        return {
          id: pid,
          name,
          code: pid,
          legacyOcmsCode: legacyOcms,
          sector,
          ministry,
          state,
          district,
          latitude,
          longitude,
          altitude,
          hasCoordinates,
          physicalProgress,
          financialProgress,
          budget: originalCost,
          revisedCost,
          expenditure,
          approvalDate,
          startDate,
          targetCompletionDate,
          revisedCompletionDate,
          timeOverrunMonths,
          status,
          riskLevel,
          riskScore,
          costOverrunCr,
          costOverrunPct,
          implementingAgency: agency,
          description: `${name} is an active Central Sector infrastructure undertaking under the ${ministry || 'Government of India'} (${sector} sector in ${state}). Reported in official MoSPI PAIMANA Flash Reports.`,
          reportMonth: pRow['report_month'] || 'March 2026',
          reportMonthKey: pRow['report_month_key'] || '2026-03',
          monthsReportedCount,
          firstReportedMonth: pRow['first_reported_month'] || undefined,
          latestReportedMonth: pRow['latest_reported_month'] || undefined,
          history: projectHistory,
          lastUpdated: `Report of ${pRow['report_month'] || 'March 2026'}`,
          isSynthetic: false
        };
      });

      const result: PaimanaDatasetResult = {
        projects,
        historyByProjectId,
        totalProjects: projects.length,
        geolocatedCount,
        pendingGeocodingCount,
        source: 'PAIMANA_CSV',
        error: null,
        loadedAt: new Date().toISOString()
      };

      cachedDataset = result;
      return result;
    } catch (err: any) {
      console.warn('Failed to load official PAIMANA CSV dataset, falling back to benchmark dataset:', err);

      // Fallback: Map SYNTHETIC_PROJECTS as fallback
      const fallbackResult: PaimanaDatasetResult = {
        projects: SYNTHETIC_PROJECTS.map(p => ({ ...p, hasCoordinates: true, isSynthetic: true })),
        historyByProjectId: new Map(),
        totalProjects: SYNTHETIC_PROJECTS.length,
        geolocatedCount: SYNTHETIC_PROJECTS.length,
        pendingGeocodingCount: 0,
        source: 'SYNTHETIC_FALLBACK',
        error: err?.message || 'CSV loading unavailable',
        loadedAt: new Date().toISOString()
      };

      cachedDataset = fallbackResult;
      return fallbackResult;
    } finally {
      activeLoadPromise = null;
    }
  })();

  return activeLoadPromise;
}
