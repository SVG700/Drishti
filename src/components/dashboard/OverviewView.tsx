import React, { useState, useMemo, useEffect } from 'react';
import {
  FolderGit2,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  Globe,
  BotMessageSquare,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Building2,
  ExternalLink,
  Layers,
  Activity
} from 'lucide-react';
import type { InfrastructureProject } from '../../types/project';
import { Badge } from '../common/Badge';
import type { NavigationTab } from '../layout/AppShell';
import apiService from '../../services/apiService';
import type { AnalyticsSummaryResponse } from '../../types/backend';

interface OverviewViewProps {
  projects: InfrastructureProject[];
  onSelectProject: (project: InfrastructureProject) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onInspectProject?: (project: InfrastructureProject) => void;
  isBackendOnline: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  projects,
  onSelectProject,
  onNavigateTab,
  onInspectProject,
  isBackendOnline
}) => {
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummaryResponse | null>(null);

  // Load backend summary if online
  useEffect(() => {
    if (isBackendOnline) {
      apiService
        .getAnalyticsSummary()
        .then(summary => setAnalyticsSummary(summary))
        .catch(err => console.warn('Backend analytics summary error:', err));
    }
  }, [isBackendOnline]);

  // Aggregate executive metrics directly from the live dataset
  const metrics = useMemo(() => {
    const total = projects.length;
    let delayedCount = 0;
    let criticalRiskCount = 0;
    let totalOriginalCost = 0;
    let totalRevisedCost = 0;
    let totalExpenditure = 0;
    let totalProgressSum = 0;
    let validProgressCount = 0;

    const sectorCounts: Record<string, { count: number; cost: number; delayed: number }> = {};
    const riskCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const statusCounts = { DELAYED: 0, IN_PROGRESS: 0, ON_SCHEDULE: 0, COMPLETED: 0 };

    projects.forEach(p => {
      totalOriginalCost += p.budget || 0;
      totalRevisedCost += p.revisedCost || p.budget || 0;
      totalExpenditure += p.expenditure || 0;

      if (p.physicalProgress > 0) {
        totalProgressSum += p.physicalProgress;
        validProgressCount++;
      }

      // Delay detection
      if (p.status === 'DELAYED' || (p.timeOverrunMonths && p.timeOverrunMonths > 0)) {
        delayedCount++;
        statusCounts.DELAYED++;
      } else if (p.status === 'COMPLETED' || p.physicalProgress >= 100) {
        statusCounts.COMPLETED++;
      } else if (p.status === 'ON_SCHEDULE') {
        statusCounts.ON_SCHEDULE++;
      } else {
        statusCounts.IN_PROGRESS++;
      }

      // Risk tiers
      const r = p.riskLevel in riskCounts ? p.riskLevel : 'MEDIUM';
      riskCounts[r]++;
      if (r === 'CRITICAL' || r === 'HIGH') {
        criticalRiskCount++;
      }

      // Sector tally
      const sec = p.sector || 'Other Infrastructure';
      if (!sectorCounts[sec]) {
        sectorCounts[sec] = { count: 0, cost: 0, delayed: 0 };
      }
      sectorCounts[sec].count++;
      sectorCounts[sec].cost += p.revisedCost || p.budget || 0;
      if (p.status === 'DELAYED') sectorCounts[sec].delayed++;
    });

    const topSectors = Object.entries(sectorCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    const avgProgress = validProgressCount > 0 ? (totalProgressSum / validProgressCount).toFixed(1) : '0.0';
    const delayedPct = total > 0 ? ((delayedCount / total) * 100).toFixed(1) : '0';
    const drawdownPct = totalRevisedCost > 0 ? ((totalExpenditure / totalRevisedCost) * 100).toFixed(1) : '0';

    return {
      total,
      delayedCount,
      delayedPct,
      criticalRiskCount,
      totalOriginalCost: Math.round(totalOriginalCost),
      totalRevisedCost: Math.round(totalRevisedCost),
      totalExpenditure: Math.round(totalExpenditure),
      drawdownPct,
      avgProgress,
      riskCounts,
      statusCounts,
      topSectors
    };
  }, [projects]);

  // Curated High-Priority Watchlist (top 6 critical undertakings requiring immediate intervention)
  const priorityWatchlist = useMemo(() => {
    return [...projects]
      .filter(p => p.riskLevel === 'CRITICAL' || (p.timeOverrunMonths && p.timeOverrunMonths >= 12))
      .sort((a, b) => {
        const timeA = a.timeOverrunMonths || 0;
        const timeB = b.timeOverrunMonths || 0;
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [projects]);

  const handleInspect = (proj: InfrastructureProject) => {
    if (onInspectProject) {
      onInspectProject(proj);
    } else {
      onSelectProject(proj);
      onNavigateTab('gods-eye');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans">
      {/* 1. EXECUTIVE HEADER */}
      <div className="bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-tight">
              DRISHTI • EXECUTIVE OVERVIEW
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              MoSPI PAIMANA
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            AI-Powered Infrastructure Intelligence • Central Sector Flash Report Analysis
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('gods-eye')}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-slate-950" />
            <span>3D GOD'S EYE</span>
          </button>
          <button
            onClick={() => onNavigateTab('assistant')}
            className="px-3 py-1.5 rounded-lg bg-[#141A26] hover:bg-[#1C2436] text-slate-200 border border-slate-700 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <BotMessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span>AI ASSISTANT</span>
          </button>
        </div>
      </div>

      {/* 2. CORE EXECUTIVE KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Undertakings */}
        <div className="bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Total Undertakings
            </span>
            <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FolderGit2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono">
              {metrics.total.toLocaleString()}
            </div>
            <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
              {projects.filter(p => p.hasCoordinates).length.toLocaleString()} 3D Mapped Sites
            </div>
          </div>
        </div>

        {/* Metric 2: Delayed Projects */}
        <div className="bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Delayed Projects
            </span>
            <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {metrics.delayedCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-300 font-mono mt-0.5">
              {metrics.delayedPct}% of monitored portfolio
            </div>
          </div>
        </div>

        {/* Metric 3: Critical & High Risk */}
        <div className="bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              High Risk Projects
            </span>
            <div className="w-6 h-6 rounded bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
              {metrics.criticalRiskCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-300 font-mono mt-0.5">
              Requires administrative intervention
            </div>
          </div>
        </div>

        {/* Metric 4: Total Capital Commitment */}
        <div className="bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Portfolio Cost & Drawdown
            </span>
            <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono">
              ₹{metrics.totalRevisedCost.toLocaleString()} Cr
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Exp: ₹{metrics.totalExpenditure.toLocaleString()} Cr</span>
              <span className="text-emerald-400 font-bold">{metrics.drawdownPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TWO STRATEGIC INSIGHT PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel A: Sector Capital Allocation */}
        <div className="bg-[#0C1017] p-4 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wide">
                TOP SECTORS BY CAPITAL ALLOCATION
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('projects')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5 pt-0.5">
            {metrics.topSectors.map((sec, idx) => {
              const maxCost = metrics.topSectors[0]?.cost || 1;
              const barWidth = Math.round((sec.cost / maxCost) * 100);
              return (
                <div key={sec.name} className="space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-medium truncate max-w-[200px] sm:max-w-xs">
                      {idx + 1}. {sec.name}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-400 text-[11px]">{sec.count} projects</span>
                      <span className="font-bold text-slate-100">
                        ₹{Math.round(sec.cost).toLocaleString()} Cr
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel B: Execution Status & Milestone Health */}
        <div className="bg-[#0C1017] p-4 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wide">
                PORTFOLIO EXECUTION HEALTH
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              <span>Analytics</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* 3 Executive Health Metrics */}
          <div className="grid grid-cols-3 gap-2.5 pt-0.5 text-center font-mono">
            <div className="p-2.5 rounded-lg bg-[#10141D] border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Avg Progress</div>
              <div className="text-lg sm:text-xl font-extrabold text-cyan-400 mt-0.5">
                {metrics.avgProgress}%
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">Physical Completion</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#10141D] border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Slippage Rate</div>
              <div className="text-lg sm:text-xl font-extrabold text-amber-400 mt-0.5">
                {metrics.delayedPct}%
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">Over Time Horizon</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#10141D] border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Drawdown</div>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-0.5">
                {metrics.drawdownPct}%
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">Expenditure Ratio</div>
            </div>
          </div>

          {/* Status Breakdown Segment */}
          <div className="p-3 bg-[#10141D] rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-300 text-[11px]">
              <span>Delayed: <strong className="text-amber-400">{metrics.statusCounts.DELAYED}</strong></span>
              <span>In Progress: <strong className="text-cyan-400">{metrics.statusCounts.IN_PROGRESS}</strong></span>
              <span>Completed: <strong className="text-emerald-400">{metrics.statusCounts.COMPLETED}</strong></span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${(metrics.statusCounts.DELAYED / metrics.total) * 100}%` }}
                title={`Delayed: ${metrics.statusCounts.DELAYED}`}
              />
              <div
                className="h-full bg-cyan-500"
                style={{ width: `${(metrics.statusCounts.IN_PROGRESS / metrics.total) * 100}%` }}
                title={`In Progress: ${metrics.statusCounts.IN_PROGRESS}`}
              />
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${(metrics.statusCounts.COMPLETED / metrics.total) * 100}%` }}
                title={`Completed: ${metrics.statusCounts.COMPLETED}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. EXECUTIVE ATTENTION WATCHLIST */}
      <div className="bg-[#0C1017] rounded-xl border border-slate-800/80 overflow-hidden shadow-sm">
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 font-sans tracking-tight">
              PROJECTS REQUIRING IMMEDIATE ATTENTION
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              High-priority undertakings with severe schedule overruns
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('projects')}
            className="px-2.5 py-1 bg-[#141A26] hover:bg-[#1E273A] text-cyan-400 text-xs font-mono font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>All {projects.length.toLocaleString()} Projects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#090C12] border-b border-slate-800 text-slate-400 font-mono text-[10.5px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Project ID</th>
                <th className="py-2.5 px-3">Project Title & Implementing Agency</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3">Physical Progress</th>
                <th className="py-2.5 px-3">Delay</th>
                <th className="py-2.5 px-3">Risk</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {priorityWatchlist.map(proj => (
                <tr
                  key={proj.id}
                  className="hover:bg-slate-850/60 transition group cursor-pointer"
                  onClick={() => onSelectProject(proj)}
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                    #{proj.id}
                  </td>
                  <td className="py-2.5 px-3 max-w-sm">
                    <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition truncate">
                      {proj.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {proj.implementingAgency || proj.ministry || 'Central Agency'} • {proj.state || 'Central Sector'}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="sector" sector={proj.sector} size="sm">
                      {proj.sector}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-cyan-400 font-bold">{proj.physicalProgress}%</span>
                    </div>
                    <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${Math.min(100, proj.physicalProgress)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-rose-400 font-bold">
                    +{proj.timeOverrunMonths || 0} Mos
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="risk" riskLevel={proj.riskLevel} size="sm">
                      {proj.riskLevel}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleInspect(proj)}
                      className="px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-800/80 rounded font-mono text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                      title="Inspect this project directly in God's Eye (3D Globe)"
                    >
                      <Globe className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
