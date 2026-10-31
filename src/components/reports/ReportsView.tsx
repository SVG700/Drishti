import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Search,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Globe
} from 'lucide-react';
import apiService from '../../services/apiService';
import type { ProjectExecutiveReportResponse } from '../../types/backend';
import type { InfrastructureProject } from '../../types/project';
import { Badge } from '../common/Badge';
import type { NavigationTab } from '../layout/AppShell';

interface ReportsViewProps {
  projects: InfrastructureProject[];
  selectedProject: InfrastructureProject | null;
  onSelectProject: (project: InfrastructureProject) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onInspectProject?: (project: InfrastructureProject) => void;
  isBackendOnline: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onNavigateTab,
  onInspectProject,
  isBackendOnline
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(
    selectedProject?.id || '400010'
  );
  const [searchProjectQuery, setSearchProjectQuery] = useState('');
  const [report, setReport] = useState<ProjectExecutiveReportResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Sync active project if prop changes
  useEffect(() => {
    if (selectedProject?.id && selectedProject.id !== activeProjectId) {
      setActiveProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  // Load report on project change
  useEffect(() => {
    if (!activeProjectId) return;

    let isMounted = true;
    setIsLoadingReport(true);
    setReportError(null);

    apiService
      .getProjectReport(activeProjectId)
      .then(res => {
        if (!isMounted) return;
        setReport(res);
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn('Failed to load project report:', err);
        setReport(null);
        setReportError(
          `Unable to generate executive report for project ${activeProjectId}. Please verify the FastAPI backend is running at ${apiService.getBaseUrl()}.`
        );
      })
      .finally(() => {
        if (isMounted) setIsLoadingReport(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeProjectId]);

  const matchingProjects = searchProjectQuery.trim()
    ? projects
        .filter(
          p =>
            p.id.toLowerCase().includes(searchProjectQuery.toLowerCase()) ||
            p.name.toLowerCase().includes(searchProjectQuery.toLowerCase())
        )
        .slice(0, 10)
    : [];

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PAIMANA-Executive-Report-${report.project_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12 font-sans">
      {/* HEADER & SELECTOR STRIP */}
      <div className="bg-[#0C1017] p-4 rounded-xl border border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-100 uppercase tracking-tight">
              <span className="text-gradient-drishti">DRISHTI</span> • Executive Project Briefs
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-semibold">
              MoSPI PAIMANA Brief
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            AI-Powered Senior Brief synthesizing progress forecasts, schedule risk, and anomaly checks
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="relative">
            <div className="flex items-center bg-[#121722] border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Select project ID..."
                value={searchProjectQuery}
                onChange={e => setSearchProjectQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-400 text-xs w-36"
              />
            </div>

            {searchProjectQuery && matchingProjects.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#121722] border border-slate-800 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto py-1">
                {matchingProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveProjectId(p.id);
                      onSelectProject(p);
                      setSearchProjectQuery('');
                    }}
                    className="px-3 py-1.5 hover:bg-slate-800 cursor-pointer border-b border-slate-800/50 text-[11px]"
                  >
                    <span className="font-bold text-cyan-400">#{p.id}</span>{' '}
                    <span className="text-slate-300">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {report && (
            <button
              onClick={() => {
                const targetProj = projects.find(p => p.id === report.project_id);
                if (targetProj) {
                  if (onInspectProject) {
                    onInspectProject(targetProj);
                  } else {
                    onSelectProject(targetProj);
                    onNavigateTab('gods-eye');
                  }
                }
              }}
              className="px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-800 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold"
              title="Inspect this project on 3D Globe"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inspect in 3D</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            disabled={!report}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={handleExportJSON}
            disabled={!report}
            className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-40 text-cyan-300 rounded-lg border border-cyan-800 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* OFFLINE NOTICE */}
      {!isBackendOnline && (
        <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-lg flex items-center justify-between text-xs font-mono text-amber-300 print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              AI Backend is offline. To generate executive briefs with real forecasting models, run{' '}
              <code className="bg-black/50 px-1 rounded text-amber-200">
                uvicorn app.main:app
              </code>
            </span>
          </div>
          <button
            onClick={() => setActiveProjectId(prev => prev)}
            className="px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded border border-amber-700"
          >
            Retry Report
          </button>
        </div>
      )}

      {/* LOADING INDICATOR */}
      {isLoadingReport && (
        <div className="bg-[#0C1017] p-8 rounded-xl border border-slate-800 text-center font-mono text-xs text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
          <div className="font-bold text-slate-200">
            COMPILING EXECUTIVE INTELLIGENCE REPORT FOR #{activeProjectId}...
          </div>
          <div>Aggregating historical milestones, delay risk factors, and financial anomalies</div>
        </div>
      )}

      {/* ERROR NOTICE */}
      {reportError && (
        <div className="bg-rose-950/30 border border-rose-800/80 p-4 rounded-xl text-xs font-mono text-rose-300 print:hidden">
          <div className="font-bold mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>REPORT GENERATION ERROR</span>
          </div>
          <div>{reportError}</div>
        </div>
      )}

      {/* REPORT DOCUMENT CONTAINER */}
      {report && (
        <div className="bg-[#0C1017] border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-xl text-slate-200 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
          {/* REPORT HEADER */}
          <div className="border-b border-slate-800 pb-5 space-y-3 print:border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                  DRISHTI (दृष्टि) • MoSPI PAIMANA
                </span>
                <span className="text-xs font-mono text-slate-400 print:text-slate-600">
                  REPORT ID: {report.report_id}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 print:text-slate-600">
                Generated: {new Date(report.generated_at).toLocaleString()} • {report.system_version}
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 font-sans tracking-tight print:text-black">
                {report.project_overview.project_name}
              </h2>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400 print:text-slate-600 mt-1 flex-wrap">
                <span>PROJECT ID: #{report.project_overview.project_id}</span>
                <span>•</span>
                <span>SECTOR: {report.project_overview.sector}</span>
                <span>•</span>
                <span>AGENCY: {report.project_overview.agency}</span>
                {report.project_overview.state && (
                  <>
                    <span>•</span>
                    <span>STATE: {report.project_overview.state}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 1: EXECUTIVE SYNTHESIS & HEALTH */}
          <div className="p-4 bg-[#121722] rounded-xl border border-slate-800 space-y-3 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                EXECUTIVE SYNTHESIS & OVERALL HEALTH
              </span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                  report.executive_summary.overall_health === 'Good' ||
                  report.executive_summary.overall_health === 'Satisfactory'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : report.executive_summary.overall_health === 'Watchlist'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                }`}
              >
                OVERALL HEALTH: {report.executive_summary.overall_health.toUpperCase()}
              </span>
            </div>

            <p className="text-xs font-sans leading-relaxed text-slate-300">
              {report.executive_summary.summary_text}
            </p>

            {/* Key Findings & Primary Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-cyan-400 uppercase">KEY FINDINGS:</span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {report.executive_summary.key_findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-cyan-400">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-rose-400 uppercase">PRIMARY RISKS:</span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {report.executive_summary.primary_risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 2: COST & PROGRESS PARAMETERS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#121722] rounded-lg border border-slate-800 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block">Original Budget</span>
              <div className="text-sm font-bold text-slate-100 print:text-black mt-1">
                ₹{report.project_overview.original_cost_cr?.toLocaleString() || 0} Cr
              </div>
            </div>

            <div className="p-3 bg-[#121722] rounded-lg border border-slate-800 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block">Revised Anticipated</span>
              <div className="text-sm font-bold text-amber-300 print:text-amber-800 mt-1">
                ₹{report.project_overview.revised_cost_cr?.toLocaleString() || 0} Cr
              </div>
            </div>

            <div className="p-3 bg-[#121722] rounded-lg border border-slate-800 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block">Reported Overrun</span>
              <div className="text-sm font-bold text-rose-400 print:text-rose-700 mt-1">
                {report.project_overview.official_cost_overrun_pct
                  ? `+${report.project_overview.official_cost_overrun_pct}%`
                  : '0.0%'}
              </div>
            </div>

            <div className="p-3 bg-[#121722] rounded-lg border border-slate-800 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block">Physical Progress</span>
              <div className="text-sm font-bold text-cyan-400 print:text-cyan-800 mt-1">
                {report.project_overview.latest_reported_physical_progress_pct || 0}%
              </div>
            </div>
          </div>

          {/* SECTION 3: PROGRESS FORECASTING TRAJECTORY */}
          <div className="p-4 bg-[#121722] rounded-xl border border-slate-800 space-y-3 text-xs font-mono print:bg-slate-50 print:border-slate-300 print:text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200 print:text-black uppercase">
                <TrendingUp className="w-4 h-4 text-cyan-400 print:text-slate-800" />
                <span>Progress Trajectory Forecast & Commissioning Projection</span>
              </div>
              <span className="text-[10px] text-slate-400 print:text-slate-600">
                Velocity: +{report.progress_assessment.estimated_monthly_velocity_pct || 0}%/mo
              </span>
            </div>

            <p className="text-slate-300 print:text-slate-800 leading-relaxed font-sans text-xs">
              {report.progress_assessment.assessment_notes}
            </p>

            {report.progress_assessment.trajectory &&
              report.progress_assessment.trajectory.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#090C12] text-slate-400 print:bg-slate-200 print:text-slate-800">
                      <tr>
                        <th className="py-1 px-2">Projected Horizon</th>
                        <th className="py-1 px-2">Predicted Progress</th>
                        <th className="py-1 px-2">80% Interval</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                      {report.progress_assessment.trajectory.map(pt => (
                        <tr key={pt.horizon_step}>
                          <td className="py-1 px-2 font-bold text-slate-200 print:text-black">
                            {pt.month_label} ({pt.month_key})
                          </td>
                          <td className="py-1 px-2 text-cyan-400 print:text-cyan-800 font-bold">
                            {pt.predicted_progress_pct}%
                          </td>
                          <td className="py-1 px-2 text-slate-400 print:text-slate-600">
                            [{pt.lower_bound_80_pct}% — {pt.upper_bound_80_pct}%]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          {/* SECTION 4: SCHEDULE DELAY RISK ASSESSMENT */}
          <div className="p-4 bg-[#121722] rounded-xl border border-slate-800 space-y-3 text-xs font-mono print:bg-slate-50 print:border-slate-300 print:text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200 print:text-black uppercase">
                <Clock className="w-4 h-4 text-amber-400 print:text-slate-800" />
                <span>Schedule Delay-Risk Assessment</span>
              </div>
              <Badge variant="risk" riskLevel={report.schedule_assessment.risk_level || 'LOW'}>
                RISK: {report.schedule_assessment.risk_level || 'LOW'}
              </Badge>
            </div>

            <p className="text-slate-300 print:text-slate-800 leading-relaxed font-sans text-xs">
              {report.schedule_assessment.assessment_notes}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 print:text-slate-600 block text-[10px]">Original DoC:</span>
                <span className="text-slate-200 print:text-black font-bold">
                  {report.schedule_assessment.original_doc || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-600 block text-[10px]">Revised Anticipated DoC:</span>
                <span className="text-amber-300 print:text-amber-800 font-bold">
                  {report.schedule_assessment.revised_doc || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-600 block text-[10px]">Official Time Overrun:</span>
                <span className="text-rose-400 print:text-rose-700 font-bold">
                  +{report.schedule_assessment.official_time_overrun_months || 0} Months
                </span>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-600 block text-[10px]">Status:</span>
                <span className="text-slate-200 print:text-black font-bold">
                  {report.schedule_assessment.official_derived_status || 'In Progress'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: RECOMMENDED FOLLOW-UP ACTIONS */}
          <div className="p-4 bg-[#121722] rounded-xl border border-slate-800 space-y-3 text-xs font-mono print:bg-slate-50 print:border-slate-300 print:text-slate-900">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 print:text-black uppercase border-b border-slate-800 print:border-slate-300 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 print:text-slate-800" />
              <span>Recommended Administrative & Monitoring Actions</span>
            </div>

            <div className="space-y-2">
              {report.recommended_actions.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#090C12] rounded-lg border border-slate-800 space-y-1 print:bg-white print:border-slate-300 print:text-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 print:text-cyan-900">{act.action}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                        {act.category}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          act.priority === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800 print:bg-rose-100 print:text-rose-800 print:border-rose-300'
                            : act.priority === 'HIGH'
                            ? 'bg-orange-950 text-orange-300 border border-orange-800 print:bg-orange-100 print:text-orange-800 print:border-orange-300'
                            : 'bg-slate-800 text-slate-300 border border-slate-700 print:bg-slate-100 print:text-slate-700 print:border-slate-300'
                        }`}
                      >
                        {act.priority}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-slate-400 print:text-slate-600">
                    <strong className="text-slate-300 print:text-slate-800">Rationale:</strong> {act.rationale}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DISCLAIMER & ATTRIBUTION */}
          <div className="text-[10px] text-slate-400 print:text-slate-600 font-mono border-t border-slate-800 print:border-slate-300 pt-4 leading-relaxed">
            <div className="font-bold uppercase mb-1">Official MoSPI Disclaimer:</div>
            <div>{report.general_disclaimer}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
