import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Globe,
  Activity,
  FileSpreadsheet,
  BotMessageSquare,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  MapPin,
  X,
  History,
  CheckCircle2
} from 'lucide-react';
import type { InfrastructureProject } from '../../types/project';
import { Badge } from '../common/Badge';
import type { NavigationTab } from '../layout/AppShell';

interface ProjectsViewProps {
  projects: InfrastructureProject[];
  selectedProjectId: string | null;
  onSelectProject: (project: InfrastructureProject) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onInspectProject?: (project: InfrastructureProject) => void;
  isBackendOnline: boolean;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onNavigateTab,
  onInspectProject,
  isBackendOnline
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detailModalProject, setDetailModalProject] = useState<InfrastructureProject | null>(null);

  // Distinct dropdown lists
  const sectors = useMemo(() => {
    const s = new Set<string>();
    projects.forEach(p => {
      if (p.sector) s.add(p.sector);
    });
    return Array.from(s).sort();
  }, [projects]);

  const states = useMemo(() => {
    const s = new Set<string>();
    projects.forEach(p => {
      if (p.state) s.add(p.state);
    });
    return Array.from(s).sort();
  }, [projects]);

  // Filtering
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.implementingAgency && p.implementingAgency.toLowerCase().includes(q)) ||
        (p.ministry && p.ministry.toLowerCase().includes(q)) ||
        (p.district && p.district.toLowerCase().includes(q));

      const matchesSector = selectedSector === 'ALL' || p.sector === selectedSector;
      const matchesState = selectedState === 'ALL' || p.state === selectedState;
      const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
      const matchesRisk = selectedRisk === 'ALL' || p.riskLevel === selectedRisk;

      return matchesSearch && matchesSector && matchesState && matchesStatus && matchesRisk;
    });
  }, [projects, searchQuery, selectedSector, selectedState, selectedStatus, selectedRisk]);

  // Reset page when filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSector, selectedState, selectedStatus, selectedRisk, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + pageSize);

  const activeProject = detailModalProject || projects.find(p => p.id === selectedProjectId) || null;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10 font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0C1017] p-3.5 sm:p-4 rounded-xl border border-slate-800/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-tight">
              DRISHTI • PROJECTS EXPLORER
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
              {filteredProjects.length.toLocaleString()} of {projects.length.toLocaleString()} Projects
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Official MoSPI PAIMANA Flash Report Monitoring Repository
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2">
          {activeProject && (
            <button
              onClick={() => setDetailModalProject(activeProject)}
              className="px-2.5 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-cyan-300 text-xs font-mono font-medium border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dossier: #{activeProject.id}</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH STRIP */}
      <div className="bg-[#0C1017] p-3.5 rounded-xl border border-slate-800/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-2 flex items-center bg-[#121722] border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search by ID, name, agency, district..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-400 text-xs w-full font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white ml-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sector Selector */}
          <select
            value={selectedSector}
            onChange={e => setSelectedSector(e.target.value)}
            className="bg-[#121722] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none font-mono"
          >
            <option value="ALL">All Sectors ({sectors.length})</option>
            {sectors.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* State Selector */}
          <select
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            className="bg-[#121722] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none font-mono"
          >
            <option value="ALL">All States ({states.length})</option>
            {states.map(st => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-[#121722] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="DELAYED">Delayed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_SCHEDULE">On Schedule</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Secondary Filter Line (Risk Level & Page Size) */}
        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/60 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase">Risk Level:</span>
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setSelectedRisk(lvl)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                  selectedRisk === lvl
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="bg-[#121722] border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-300"
            >
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* PROJECTS TABLE */}
      <div className="bg-[#0C1017] rounded-xl border border-slate-800/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#090C12] border-b border-slate-800 text-slate-400 font-mono text-[10.5px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Project ID</th>
                <th className="py-2.5 px-3">Project Title & Agency</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Physical Progress</th>
                <th className="py-2.5 px-3">Budget / Exp. (₹ Cr)</th>
                <th className="py-2.5 px-3">Status & Risk</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                    No infrastructure undertakings match the active filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map(proj => {
                  const isSelected = selectedProjectId === proj.id;
                  return (
                    <tr
                      key={proj.id}
                      onClick={() => {
                        onSelectProject(proj);
                        setDetailModalProject(proj);
                      }}
                      className={`hover:bg-slate-850/70 transition group cursor-pointer ${
                        isSelected ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                        #{proj.id}
                      </td>
                      <td className="py-2.5 px-3 max-w-sm sm:max-w-md">
                        <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition truncate">
                          {proj.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {proj.implementingAgency || proj.ministry || 'Central Sector Agency'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="sector" sector={proj.sector} size="sm">
                          {proj.sector}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-300">
                        {proj.state || 'Central Sector'}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-cyan-400 font-bold">{proj.physicalProgress}%</span>
                          {proj.monthsReportedCount && (
                            <span className="text-[9.5px] text-slate-400">
                              {proj.monthsReportedCount} mos
                            </span>
                          )}
                        </div>
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${Math.min(100, proj.physicalProgress)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-300">
                        <div>₹{proj.budget?.toLocaleString() || 0} Cr</div>
                        <div className="text-[10px] text-emerald-400">
                          Exp: ₹{proj.expenditure?.toLocaleString() || 0} Cr
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="status" status={proj.status} size="sm">
                            {proj.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="risk" riskLevel={proj.riskLevel} size="sm">
                            {proj.riskLevel}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            if (onInspectProject) {
                              onInspectProject(proj);
                            } else {
                              onSelectProject(proj);
                              onNavigateTab('gods-eye');
                            }
                          }}
                          className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded font-mono text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                          title="Inspect on 3D Globe"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="p-3.5 bg-[#090C12] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div>
            Showing <strong className="text-slate-200">{startIndex + 1}</strong> to{' '}
            <strong className="text-slate-200">
              {Math.min(filteredProjects.length, startIndex + pageSize)}
            </strong>{' '}
            of <strong className="text-slate-200">{filteredProjects.length.toLocaleString()}</strong> projects
          </div>

          <div className="flex items-center gap-1.5 self-center">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded border border-slate-800 bg-[#121722] text-slate-300 disabled:opacity-40 hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded border border-slate-800 bg-[#121722] text-slate-300 disabled:opacity-40 hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-3 py-1 bg-[#121722] border border-slate-800 rounded font-bold text-slate-200">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-slate-800 bg-[#121722] text-slate-300 disabled:opacity-40 hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-slate-800 bg-[#121722] text-slate-300 disabled:opacity-40 hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PROJECT DETAIL MODAL / DRAWER */}
      {detailModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0C1017] border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-[#090C12] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold font-mono">
                  #{detailModalProject.id}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-sans line-clamp-1">
                    {detailModalProject.name}
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <span>{detailModalProject.sector}</span>
                    <span>•</span>
                    <span>{detailModalProject.state}</span>
                    {detailModalProject.district && <span>• {detailModalProject.district}</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDetailModalProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 text-xs font-mono">
              {/* Quick Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Project Status</span>
                  <div className="mt-1">
                    <Badge variant="status" status={detailModalProject.status}>
                      {detailModalProject.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Risk Assessment</span>
                  <div className="mt-1">
                    <Badge variant="risk" riskLevel={detailModalProject.riskLevel}>
                      {detailModalProject.riskLevel} (Score: {detailModalProject.riskScore || 0})
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Physical Progress</span>
                  <div className="text-base font-bold text-cyan-400 mt-1">
                    {detailModalProject.physicalProgress}%
                  </div>
                </div>

                <div className="p-3 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Financial Drawdown</span>
                  <div className="text-base font-bold text-emerald-400 mt-1">
                    {detailModalProject.financialProgress
                      ? `${detailModalProject.financialProgress}%`
                      : 'Calculated'}
                  </div>
                </div>
              </div>

              {/* Financial & Schedule Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost Parameters */}
                <div className="p-3.5 bg-[#121722] rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold border-b border-slate-800 pb-2">
                    <DollarSign className="w-4 h-4 text-cyan-400" />
                    <span>SANCTIONED BUDGET & EXPENDITURE</span>
                  </div>
                  <div className="space-y-1.5 pt-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Original Sanctioned Cost:</span>
                      <span className="text-slate-100 font-bold">
                        ₹{detailModalProject.budget?.toLocaleString() || 0} Cr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Revised / Anticipated Cost:</span>
                      <span className="text-amber-300 font-bold">
                        ₹{detailModalProject.revisedCost?.toLocaleString() || detailModalProject.budget?.toLocaleString() || 0} Cr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cumulative Expenditure:</span>
                      <span className="text-emerald-400 font-bold">
                        ₹{detailModalProject.expenditure?.toLocaleString() || 0} Cr
                      </span>
                    </div>
                    {detailModalProject.costOverrunCr !== undefined &&
                      detailModalProject.costOverrunCr !== null &&
                      detailModalProject.costOverrunCr > 0 && (
                        <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800/80 pt-1">
                          <span>Reported Cost Overrun:</span>
                          <span>
                            +₹{detailModalProject.costOverrunCr.toLocaleString()} Cr (+
                            {detailModalProject.costOverrunPct}%)
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Timeline Parameters */}
                <div className="p-3.5 bg-[#121722] rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold border-b border-slate-800 pb-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>TIMELINE & COMMISSIONING DATES</span>
                  </div>
                  <div className="space-y-1.5 pt-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Government Sanction Date:</span>
                      <span className="text-slate-200 font-bold">
                        {detailModalProject.approvalDate || 'Not Reported'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Work Commencement Date:</span>
                      <span className="text-slate-200 font-bold">
                        {detailModalProject.startDate || 'Not Reported'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Original Date of Commissioning (DoC):</span>
                      <span className="text-cyan-300 font-bold">
                        {detailModalProject.targetCompletionDate || 'Not Reported'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Anticipated Revised DoC:</span>
                      <span className="text-amber-300 font-bold">
                        {detailModalProject.revisedCompletionDate || 'Not Reported'}
                      </span>
                    </div>
                    {detailModalProject.timeOverrunMonths !== undefined &&
                      detailModalProject.timeOverrunMonths !== null &&
                      detailModalProject.timeOverrunMonths > 0 && (
                        <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800/80 pt-1">
                          <span>Reported Schedule Overrun:</span>
                          <span>+{detailModalProject.timeOverrunMonths} Months</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Administrative Details */}
              <div className="p-3.5 bg-[#121722] rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  ADMINISTRATIVE JURISDICTION & STAKEHOLDERS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Administrative Ministry:</span>
                    <span className="text-slate-200 font-medium">
                      {detailModalProject.ministry || 'Government of India'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Implementing Agency:</span>
                    <span className="text-slate-200 font-medium">
                      {detailModalProject.implementingAgency || 'Central Sector Agency'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Legacy Tracking Code:</span>
                    <span className="text-slate-200 font-medium font-mono">
                      {detailModalProject.legacyOcmsCode || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Historical Observations Snapshot */}
              {detailModalProject.history && detailModalProject.history.length > 0 && (
                <div className="p-3.5 bg-[#121722] rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                      <History className="w-4 h-4 text-cyan-400" />
                      <span>MONTHLY PROGRESS REPORTING HISTORY ({detailModalProject.history.length} snapshots)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">MoSPI Flash Reports</span>
                  </div>

                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-[#090C12] text-slate-400">
                        <tr>
                          <th className="py-1 px-2">Report Month</th>
                          <th className="py-1 px-2">Physical Progress</th>
                          <th className="py-1 px-2">Expenditure (₹ Cr)</th>
                          <th className="py-1 px-2">Anticipated DoC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {detailModalProject.history.map((obs, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-1 px-2 text-cyan-300">{obs.reportMonth || obs.reportMonthKey}</td>
                            <td className="py-1 px-2 font-bold text-slate-200">
                              {obs.physicalProgress !== null ? `${obs.physicalProgress}%` : 'N/A'}
                            </td>
                            <td className="py-1 px-2 text-emerald-400">
                              {obs.cumulativeExpenditure !== null ? `₹${obs.cumulativeExpenditure} Cr` : 'N/A'}
                            </td>
                            <td className="py-1 px-2 text-slate-300">
                              {obs.revisedDoc || obs.originalDoc || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#090C12] flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400">
                MoSPI Data Snapshot: {detailModalProject.lastUpdated}
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const target = detailModalProject;
                    setDetailModalProject(null);
                    if (onInspectProject) {
                      onInspectProject(target);
                    } else {
                      onSelectProject(target);
                      onNavigateTab('gods-eye');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Inspect in God's Eye (3D)</span>
                </button>
                <button
                  onClick={() => {
                    onSelectProject(detailModalProject);
                    setDetailModalProject(null);
                    onNavigateTab('analytics');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Run AI Forecast & Risk</span>
                </button>
                <button
                  onClick={() => {
                    onSelectProject(detailModalProject);
                    setDetailModalProject(null);
                    onNavigateTab('assistant');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                >
                  <BotMessageSquare className="w-3.5 h-3.5" />
                  <span>Ask Assistant</span>
                </button>
                <button
                  onClick={() => {
                    onSelectProject(detailModalProject);
                    setDetailModalProject(null);
                    onNavigateTab('reports');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Executive Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsView;
