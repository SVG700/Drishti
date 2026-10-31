import type { InfrastructureProject } from '../../types/project';

/** Marker colour for a project: risk first, then status (same rules as God's Eye pins). */
export function riskColor(p: Pick<InfrastructureProject, 'status' | 'riskLevel'>): string {
  if (p.status === 'CRITICAL' || p.riskLevel === 'CRITICAL') return '#ef4444';
  if (p.status === 'DELAYED' || p.riskLevel === 'HIGH') return '#f97316';
  if (p.riskLevel === 'MEDIUM') return '#f59e0b';
  if (p.status === 'COMPLETED') return '#06b6d4';
  return '#10b981';
}
