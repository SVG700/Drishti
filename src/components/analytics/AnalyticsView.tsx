import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Search,
  AlertCircle,
  RefreshCw,
  Globe,
  FileSpreadsheet
} from 'lucide-react';
import apiService from '../../services/apiService';
import type {
  ProjectForecastResponse,
  ProjectDelayRiskResponse,
  ProjectAnomalyResponse
} from '../../types/backend';
import type { InfrastructureProject } from '../../types/project';
import { Badge } from '../common/Badge';
import type { NavigationTab } from '../layout/AppShell';

interface AnalyticsViewProps {
  projects: InfrastructureProject[];
  selectedProject: InfrastructureProject | null;
  onSelectProject: (project: InfrastructureProject) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onInspectProject?: (project: InfrastructureProject) => void;
  isBackendOnline: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
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
  const [horizonMonths, setHorizonMonths] = useState<number>(6);

  // Analytical results state
  const [forecast, setForecast] = useState<ProjectForecastResponse | null>(null);
  const [delayRisk, setDelayRisk] = useState<ProjectDelayRiskResponse | null>(null);
  const [anomalies, setAnomalies] = useState<ProjectAnomalyResponse | null>(null);

  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Sync active project if prop changes
  useEffect(() => {
    if (selectedProject?.id && selectedProject.id !== activeProjectId) {
      setActiveProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  // Fetch analytical data whenever activeProjectId or horizon changes
  useEffect(() => {
    if (!activeProjectId) return;

    let isMounted = true;
    setIsLoadingAnalytics(true);
    setAnalyticsError(null);

    Promise.allSettled([
      apiService.getProjectForecast(activeProjectId, horizonMonths),
      apiService.getProjectDelayRisk(activeProjectId),
      apiService.getProjectAnomalies(activeProjectId)
    ])
      .then(([forecastRes, riskRes, anomalyRes]) => {
        if (!isMounted) return;

        if (forecastRes.status === 'fulfilled') {
          setForecast(forecastRes.value);
        } else {
          console.warn('Forecast endpoint error:', forecastRes.reason);
          setForecast(null);
        }

        if (riskRes.status === 'fulfilled') {
          setDelayRisk(riskRes.value);
        } else {
          console.warn('Delay risk endpoint error:', riskRes.reason);
          setDelayRisk(null);
        }

        if (anomalyRes.status === 'fulfilled') {
          setAnomalies(anomalyRes.value);
        } else {
          console.warn('Anomaly endpoint error:', anomalyRes.reason);
          setAnomalies(null);
        }

        if (
          forecastRes.status === 'rejected' &&
          riskRes.status === 'rejected' &&
          anomalyRes.status === 'rejected'
        ) {
          setAnalyticsError(
            `Unable to retrieve analytical modules for project ${activeProjectId}. Verify AI Backend is running at ${apiService.getBaseUrl()}.`
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingAnalytics(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeProjectId, horizonMonths]);

  // Search filtered candidates
  const matchingProjects = searchProjectQuery.trim()
    ? projects
        .filter(
          p =>
            p.id.toLowerCase().includes(searchProjectQuery.toLowerCase()) ||
            p.name.toLowerCase().includes(searchProjectQuery.toLowerCase())
        )
        .slice(0, 10)
    : [];

  const currentProjectModel = projects.find(p => p.id === activeProjectId);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10 font-sans">
      {/* HEADER & PROJECT SELECTOR */}
      <div className="bg-[#0C1017] p-4 rounded-xl border border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-100 uppercase tracking-tight">
              <span className="text-gradient-drishti">DRISHTI</span> • Predictive Analytics & Insights
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-semibold">
              MoSPI PAIMANA Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            AI-Powered Trajectories • Delay Risk Classification • Expenditure Anomaly Detection
          </p>
        </div>

        {/* Project Selector Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="relative">
            <div className="flex items-center bg-[#121722] border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Switch project ID / name..."
                value={searchProjectQuery}
                onChange={e => setSearchProjectQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-400 text-xs w-44"
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

          {currentProjectModel && (
            <div className="px-2.5 py-1.5 bg-cyan-950/60 text-cyan-300 border border-cyan-800 rounded-lg font-bold flex items-center gap-1.5">
              <span>Active: #{currentProjectModel.id}</span>
            </div>
          )}
        </div>
      </div>

      {/* BACKEND STATUS NOTICE */}
      {!isBackendOnline && (
        <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-lg flex items-center justify-between text-xs font-mono text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              AI Backend is offline. To compute real-time forecasts and anomaly checks, run{' '}
              <code className="bg-black/50 px-1 rounded text-amber-200">
                uvicorn app.main:app
              </code>
            </span>
          </div>
          <button
            onClick={() => setActiveProjectId(prev => prev)}
            className="px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded border border-amber-700 cursor-pointer"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* CURRENT PROJECT DOSSIER BAR */}
      {currentProjectModel && (
        <div className="bg-[#0C1017] p-3.5 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="space-y-0.5 min-w-0">
            <div className="text-[10px] text-slate-400 uppercase">Selected Undertaking</div>
            <h2 className="text-sm font-bold text-slate-100 truncate">{currentProjectModel.name}</h2>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
              <span>{currentProjectModel.sector}</span>
              <span>•</span>
              <span>{currentProjectModel.state}</span>
              <span>•</span>
              <span>Budget: ₹{currentProjectModel.budget?.toLocaleString()} Cr</span>
              <span>•</span>
              <span className="text-cyan-400 font-bold">
                Progress: {currentProjectModel.physicalProgress}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onInspectProject) {
                  onInspectProject(currentProjectModel);
                } else {
                  onSelectProject(currentProjectModel);
                  onNavigateTab('gods-eye');
                }
              }}
              className="px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 rounded border border-cyan-800 flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inspect in 3D</span>
            </button>
            <button
              onClick={() => onNavigateTab('reports')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Executive Report</span>
            </button>
          </div>
        </div>
      )}

      {/* LOADING SPINNER */}
      {isLoadingAnalytics && (
        <div className="bg-[#0C1017] p-8 rounded-xl border border-slate-800 text-center font-mono text-xs text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
          <div className="font-bold text-slate-200">
            RUNNING STATISTICAL FORECAST & ANOMALY INFERENCE...
          </div>
          <div>Evaluating Bayesian run-rate shrinkage, schedule slippage, and budget breaches</div>
        </div>
      )}

      {/* ERROR NOTICE */}
      {analyticsError && (
        <div className="bg-rose-950/30 border border-rose-800/80 p-4 rounded-xl text-xs font-mono text-rose-300">
          <div className="font-bold mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>ANALYTICAL MODULE EXECUTION ERROR</span>
          </div>
          <div>{analyticsError}</div>
        </div>
      )}

      {/* ANALYTICAL TILES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* MODULE 1: PROGRESS FORECASTING */}
        <div className="lg:col-span-2 bg-[#0C1017] rounded-xl border border-slate-800/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase font-mono">
                Progress Trajectory Forecast
              </h2>
            </div>

            {/* Horizon Selector Slider */}
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <span>Horizon:</span>
              <select
                value={horizonMonths}
                onChange={e => setHorizonMonths(Number(e.target.value))}
                className="bg-[#121722] border border-slate-800 rounded px-2 py-0.5 text-cyan-300 font-bold"
              >
                <option value={3}>3 Months Ahead</option>
                <option value={6}>6 Months Ahead</option>
                <option value={12}>12 Months Ahead</option>
                <option value={24}>24 Months Ahead</option>
              </select>
            </div>
          </div>

          {forecast ? (
            <div className="space-y-4 text-xs font-mono">
              {/* Forecast Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Forecast Velocity</span>
                  <span className="text-base font-bold text-cyan-400 mt-0.5 block">
                    {forecast.model_metadata.estimated_monthly_velocity_pct > 0
                      ? `+${Number(forecast.model_metadata.estimated_monthly_velocity_pct).toFixed(2)}%/mo`
                      : '0.0%/mo'}
                  </span>
                </div>

                <div className="p-2.5 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Sector Prior Velocity</span>
                  <span className="text-base font-bold text-slate-200 mt-0.5 block">
                    +{Number(forecast.model_metadata.sector_prior_velocity_pct).toFixed(2)}%/mo
                  </span>
                </div>

                <div className="p-2.5 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Projected Completion</span>
                  <span className="text-sm font-bold text-amber-300 mt-1 block">
                    {forecast.forecasted_completion_doc || 'Stalled'}
                  </span>
                </div>

                <div className="p-2.5 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Projected Slippage</span>
                  <span
                    className={`text-sm font-bold mt-1 block ${
                      forecast.projected_slippage_months && forecast.projected_slippage_months > 0
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {forecast.projected_slippage_months !== null &&
                    forecast.projected_slippage_months !== undefined
                      ? `${forecast.projected_slippage_months > 0 ? '+' : ''}${
                          forecast.projected_slippage_months
                        } Mos`
                      : 'None'}
                  </span>
                </div>
              </div>

              {/* Trajectory Table / Chart */}
              <div className="p-3 bg-[#121722] rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  MONTHLY PROJECTED PROGRESS & 80% PREDICTION INTERVALS
                </span>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#090C12] text-slate-400">
                      <tr>
                        <th className="py-1.5 px-2">Month</th>
                        <th className="py-1.5 px-2">Predicted Progress</th>
                        <th className="py-1.5 px-2">80% Interval (Lower - Upper)</th>
                        <th className="py-1.5 px-2">Naive Baseline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {forecast.trajectory.map(pt => (
                        <tr key={pt.horizon_step} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-2 font-bold text-slate-200">
                            {pt.month_label} ({pt.month_key})
                          </td>
                          <td className="py-1.5 px-2 font-bold text-cyan-400">
                            {pt.predicted_progress_pct}%
                          </td>
                          <td className="py-1.5 px-2 text-slate-300">
                            [{pt.lower_bound_80_pct}% — {pt.upper_bound_80_pct}%]
                          </td>
                          <td className="py-1.5 px-2 text-slate-400">
                            {pt.baseline_persistence_pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Model Methodology & Disclaimers Accordion */}
              <details className="text-[10px] text-slate-400 bg-[#080B10] p-2.5 rounded-lg border border-slate-800/60 group">
                <summary className="font-bold text-slate-300 uppercase cursor-pointer hover:text-cyan-300 transition list-none flex items-center justify-between">
                  <span>Model Grounding & Methodology ({forecast.model_metadata.model_name})</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    Details
                  </span>
                </summary>
                <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="text-slate-300">
                    Model: <span className="text-cyan-400 font-bold">{forecast.model_metadata.model_name}</span> (Empirical Bayesian Shrinkage)
                  </div>
                  {forecast.limitations_and_disclaimers.map((d, i) => (
                    <div key={i} className="italic text-slate-400">
                      • {d}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 font-mono text-xs">
              {isLoadingAnalytics ? 'Computing forecast...' : 'Forecast data not available for this project.'}
            </div>
          )}
        </div>

        {/* MODULE 2: DELAY RISK DETECTION */}
        <div className="bg-[#0C1017] rounded-xl border border-slate-800/80 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase font-mono">
                Schedule Delay-Risk Assessment
              </h2>
            </div>
          </div>

          {delayRisk ? (
            <div className="space-y-4 text-xs font-mono">
              {/* Score Display */}
              <div className="p-3.5 bg-[#121722] rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Composite Risk Score</span>
                  <div className="text-2xl font-extrabold text-amber-400 mt-0.5">
                    {Math.round(delayRisk.risk_score * 100)} / 100
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">Evaluated Risk</span>
                  <div className="mt-1">
                    <Badge variant="risk" riskLevel={delayRisk.risk_level}>
                      {delayRisk.risk_level.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Schedule Indicators */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  TRIGGERED DELAY INDICATORS
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {delayRisk.risk_indicators.map((ind, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded border text-[10.5px] ${
                        ind.triggered
                          ? 'bg-rose-950/20 border-rose-800/50 text-rose-300'
                          : 'bg-[#121722] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-0.5">
                        <span>{ind.name}</span>
                        <span className="text-[9px] px-1 rounded bg-black/40">
                          {ind.triggered ? 'TRIGGERED' : 'PASSED'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300">{ind.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation & Recommendations */}
              <div className="p-2.5 bg-[#080B10] rounded border border-slate-800/80 space-y-2 text-[10px]">
                <div>
                  <span className="text-slate-400 font-bold block uppercase mb-0.5">
                    Assessment Explanation:
                  </span>
                  <p className="text-slate-300 leading-relaxed">{delayRisk.explanation}</p>
                </div>

                {delayRisk.actionable_recommendations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-amber-400 font-bold block uppercase mb-1">
                      Actionable Recommendations:
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {delayRisk.actionable_recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 font-mono text-xs">
              {isLoadingAnalytics ? 'Evaluating delay risk...' : 'Delay-risk analysis not available.'}
            </div>
          )}
        </div>

        {/* MODULE 3: ANOMALY DETECTION (Full Row) */}
        <div className="lg:col-span-3 bg-[#0C1017] rounded-xl border border-slate-800/80 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase font-mono">
                Expenditure & Progress Anomalies
              </h2>
            </div>
            {anomalies && (
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Anomaly Status: <strong className="text-rose-400">{anomalies.anomaly_status}</strong>
              </span>
            )}
          </div>

          {anomalies ? (
            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Composite Anomaly Score</span>
                  <div className="text-xl font-bold text-rose-400 mt-1">
                    {Math.round(anomalies.composite_anomaly_score * 100)} / 100
                  </div>
                </div>

                <div className="p-3 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Observations Analyzed</span>
                  <div className="text-xl font-bold text-slate-200 mt-1">
                    {anomalies.data_sufficiency.observations_analyzed} Months
                  </div>
                </div>

                <div className="p-3 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Financial Drawdown</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {anomalies.official_financials.financial_progress_pct
                      ? `${anomalies.official_financials.financial_progress_pct}%`
                      : 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-[#121722] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Reported Cost Overrun</span>
                  <div className="text-xl font-bold text-amber-400 mt-1">
                    {anomalies.official_financials.official_cost_overrun_pct
                      ? `+${anomalies.official_financials.official_cost_overrun_pct}%`
                      : '0.0%'}
                  </div>
                </div>
              </div>

              {/* Anomaly Indicators Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {anomalies.indicators.map((ind, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-[10.5px] ${
                      ind.triggered
                        ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                        : 'bg-[#121722] border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span>{ind.dimension}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-black/40">
                        {ind.triggered ? 'ALERT' : 'NORMAL'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-200">{ind.name}</div>
                    <div className="text-[9.5px] text-slate-400 mt-1">{ind.description}</div>
                  </div>
                ))}
              </div>

              {/* Monthly Anomalies List if any */}
              {anomalies.monthly_anomalies && anomalies.monthly_anomalies.length > 0 && (
                <div className="p-3 bg-[#121722] rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] text-rose-400 uppercase font-bold block">
                    IDENTIFIED REPORTING DISCREPANCIES ({anomalies.monthly_anomalies.length})
                  </span>
                  <div className="space-y-1.5">
                    {anomalies.monthly_anomalies.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#080B10] rounded border border-rose-900/40 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <span className="font-bold text-cyan-300">{m.month_key}:</span>{' '}
                          <span className="text-slate-200">{m.description}</span>
                        </div>
                        <span className="text-[9.5px] text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800">
                          {m.anomaly_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 font-mono text-xs">
              {isLoadingAnalytics ? 'Running anomaly detection...' : 'Anomaly analysis not available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
