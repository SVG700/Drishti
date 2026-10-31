import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
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
  Activity,
  Box,
  List,
  MousePointerClick
} from 'lucide-react';
import type { InfrastructureProject } from '../../types/project';
import { Badge } from '../common/Badge';
import type { NavigationTab } from '../layout/AppShell';
import apiService from '../../services/apiService';
import { AnimatedNumber } from '../motion/AnimatedNumber';
import { TiltCard } from '../motion/TiltCard';
import { SectorTowers3D } from '../three/SectorTowers3D';
import { riskColor } from '../three/riskColor';

const PortfolioGlobe3D = lazy(() => import('../three/PortfolioGlobe3D'));

const GLOBE_LEGEND: { label: string; color: string }[] = [
  { label: 'Critical', color: '#ef4444' },
  { label: 'Delayed / High', color: '#f97316' },
  { label: 'Medium', color: '#f59e0b' },
  { label: 'On track', color: '#10b981' },
  { label: 'Completed', color: '#06b6d4' }
];
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
  const [sectorView, setSectorView] = useState<'3d' | 'list'>('3d');
  const [focusedProject, setFocusedProject] = useState<InfrastructureProject | null>(null);

  const mappedProjects = useMemo(() => projects.filter(p => p.hasCoordinates), [projects]);
  const mappedStats = useMemo(() => {
    const atRisk = mappedProjects.filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH').length;
    const avg = mappedProjects.length
      ? mappedProjects.reduce((sum, p) => sum + Math.min(100, p.physicalProgress || 0), 0) / mappedProjects.length
      : 0;
    return { atRisk, avg };
  }, [mappedProjects]);

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
      <div className="gradient-border bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight">
              <span className="text-gradient-drishti">DRISHTI</span> <span className="text-slate-100">• EXECUTIVE OVERVIEW</span>
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

      {/* 1b. LIVE 3D PORTFOLIO GLOBE */}
      <div className="bg-[#0C1017] rounded-xl border border-slate-800/80 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-center gap-4">
            <span className="self-start flex items-center gap-2 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
              <span className="status-ping w-1.5 h-1.5 rounded-full bg-cyan-400 text-cyan-400" />
              Live 3D Portfolio Globe
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
              <span className="text-slate-100">India&apos;s infrastructure,</span>
              <br />
              <span className="text-gradient-drishti">seen from orbit.</span>
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed max-w-md">
              Every light beam is a geocoded PAIMANA construction site: its colour is the risk level and its
              height the physical progress. Data arcs trace each site back to the New Delhi command hub.
            </p>

            <div className="grid grid-cols-3 gap-2 max-w-md">
              <div className="p-2.5 rounded-lg bg-[#10141D] border border-slate-800">
                <div className="text-xl font-extrabold font-mono text-cyan-400"><AnimatedNumber value={mappedProjects.length} /></div>
                <div className="text-[9.5px] font-mono uppercase text-slate-400">Sites in 3D</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#10141D] border border-slate-800">
                <div className="text-xl font-extrabold font-mono text-rose-400"><AnimatedNumber value={mappedStats.atRisk} /></div>
                <div className="text-[9.5px] font-mono uppercase text-slate-400">High risk</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#10141D] border border-slate-800">
                <div className="text-xl font-extrabold font-mono text-emerald-400"><AnimatedNumber value={mappedStats.avg} decimals={1} suffix="%" /></div>
                <div className="text-[9.5px] font-mono uppercase text-slate-400">Avg progress</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
              {GLOBE_LEGEND.map(item => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                  {item.label}
                </span>
              ))}
            </div>

            {focusedProject ? (
              <div className="max-w-md p-3 rounded-lg bg-[#10141D] border border-cyan-500/40 shadow-[0_0_24px_-10px_rgba(34,211,238,0.7)] space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: riskColor(focusedProject) }} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 line-clamp-2">{focusedProject.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {focusedProject.state} • {focusedProject.sector} • {focusedProject.physicalProgress}% complete
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleInspect(focusedProject)}
                  className="w-full py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" /> FLY THERE IN GOD&apos;S EYE
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                <MousePointerClick className="w-3.5 h-3.5 text-cyan-400 float-soft" />
                Drag the globe to spin it. Click any beam to focus a project.
              </div>
            )}
          </div>

          <div className="relative h-[340px] sm:h-[420px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08),transparent_65%)]">
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border border-cyan-500/30 border-t-cyan-400 animate-spin" />
                </div>
              }
            >
              <PortfolioGlobe3D
                projects={mappedProjects}
                selectedProjectId={focusedProject?.id ?? null}
                onSelectProject={p => {
                  setFocusedProject(p);
                  onSelectProject(p);
                }}
              />
            </Suspense>
            <div className="absolute bottom-2 right-3 text-[9px] font-mono uppercase tracking-wider text-slate-500 pointer-events-none">
              Drag to rotate • Click a beam
            </div>
          </div>
        </div>
      </div>

      {/* 2. CORE EXECUTIVE KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Undertakings */}
        <TiltCard className="group bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-2 overflow-hidden">
          <span className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-cyan-400 to-indigo-400 transition-transform duration-500 group-hover:scale-x-100" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Total Undertakings
            </span>
            <div className="w-6 h-6 rounded transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6 bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FolderGit2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono">
              <AnimatedNumber value={metrics.total} />
            </div>
            <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
              {projects.filter(p => p.hasCoordinates).length.toLocaleString()} 3D Mapped Sites
            </div>
          </div>
        </TiltCard>

        {/* Metric 2: Delayed Projects */}
        <TiltCard className="group bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-2 overflow-hidden">
          <span className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-amber-400 to-orange-500 transition-transform duration-500 group-hover:scale-x-100" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Delayed Projects
            </span>
            <div className="w-6 h-6 rounded transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              <AnimatedNumber value={metrics.delayedCount} />
            </div>
            <div className="text-[11px] text-amber-300 font-mono mt-0.5">
              {metrics.delayedPct}% of monitored portfolio
            </div>
          </div>
        </TiltCard>

        {/* Metric 3: Critical & High Risk */}
        <TiltCard className="group bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-2 overflow-hidden">
          <span className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-rose-400 to-fuchsia-500 transition-transform duration-500 group-hover:scale-x-100" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              High Risk Projects
            </span>
            <div className="w-6 h-6 rounded transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6 bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
              <AnimatedNumber value={metrics.criticalRiskCount} />
            </div>
            <div className="text-[11px] text-rose-300 font-mono mt-0.5">
              Requires administrative intervention
            </div>
          </div>
        </TiltCard>

        {/* Metric 4: Total Capital Commitment */}
        <TiltCard className="group bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-2 overflow-hidden">
          <span className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-emerald-400 to-cyan-400 transition-transform duration-500 group-hover:scale-x-100" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Portfolio Cost & Drawdown
            </span>
            <div className="w-6 h-6 rounded transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono">
              <AnimatedNumber value={metrics.totalRevisedCost} prefix="₹" suffix=" Cr" />
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Exp: ₹{metrics.totalExpenditure.toLocaleString()} Cr</span>
              <span className="text-emerald-400 font-bold">{metrics.drawdownPct}%</span>
            </div>
          </div>
        </TiltCard>
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
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#10141D] border border-slate-800 rounded-md p-0.5">
                {(['3d', 'list'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSectorView(mode)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer ${
                      sectorView === mode ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={mode === '3d' ? '3D towers' : 'List'}
                  >
                    {mode === '3d' ? <Box className="w-3 h-3" /> : <List className="w-3 h-3" />}
                    {mode === '3d' ? '3D' : 'LIST'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onNavigateTab('projects')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
              >
                <span>Explore All</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {sectorView === '3d' ? (
            <SectorTowers3D sectors={metrics.topSectors} />
          ) : (
          <div className="space-y-2.5 pt-0.5">
            {metrics.topSectors.map((sec, idx) => {
              const maxCost = metrics.topSectors[0]?.cost || 1;
              const barWidth = Math.round((sec.cost / maxCost) * 100);
              return (
                <div key={sec.name} className="group/sector space-y-1 font-mono text-xs rounded-md -mx-1.5 px-1.5 py-0.5 transition-colors hover:bg-cyan-500/5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-medium truncate max-w-[200px] sm:max-w-xs transition-colors group-hover/sector:text-cyan-300">
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
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-400"
                      style={{ width: `${barWidth}%`, animationDelay: `${0.3 + idx * 0.1}s` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          )}
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
            <TiltCard max={16} className="relative group p-2.5 rounded-lg bg-[#10141D] border border-slate-800 transition-colors duration-300 hover:border-cyan-500/40 hover:shadow-[0_12px_28px_-12px_rgba(34,211,238,0.55)]">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Avg Progress</div>
              <div className="text-lg sm:text-xl font-extrabold text-cyan-400 mt-0.5">
                <AnimatedNumber value={Number(metrics.avgProgress)} decimals={1} suffix="%" />
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">Physical Completion</div>
            </TiltCard>

            <TiltCard max={16} className="relative group p-2.5 rounded-lg bg-[#10141D] border border-slate-800 transition-colors duration-300 hover:border-cyan-500/40 hover:shadow-[0_12px_28px_-12px_rgba(34,211,238,0.55)]">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Slippage Rate</div>
              <div className="text-lg sm:text-xl font-extrabold text-amber-400 mt-0.5">
                <AnimatedNumber value={Number(metrics.delayedPct)} decimals={1} suffix="%" />
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">Over Time Horizon</div>
            </TiltCard>

            <TiltCard max={16} className="relative group p-2.5 rounded-lg bg-[#10141D] border border-slate-800 transition-colors duration-300 hover:border-cyan-500/40 hover:shadow-[0_12px_28px_-12px_rgba(34,211,238,0.55)]">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Drawdown</div>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-0.5">
                <AnimatedNumber value={Number(metrics.drawdownPct)} decimals={1} suffix="%" />
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">Expenditure Ratio</div>
            </TiltCard>
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
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-400"
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
