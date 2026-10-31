import React, { useState } from 'react';
import { Calendar, TrendingUp, DollarSign, AlertCircle, BarChart3, Info } from 'lucide-react';
import type { ProjectHistoryObservation } from '../../types/project';

interface ProjectHistoryChartProps {
  history?: ProjectHistoryObservation[];
  projectName?: string;
  projectId?: string;
}

export const ProjectHistoryChart: React.FC<ProjectHistoryChartProps> = ({
  history = [],
  projectName = 'Project',
  projectId = ''
}) => {
  const [activeMetric, setActiveMetric] = useState<'PROGRESS' | 'EXPENDITURE'>('PROGRESS');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="p-3 bg-[#070A0F] rounded-lg border border-slate-800/90 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-slate-400">HISTORICAL TIME-SERIES</span>
        </div>
        <p className="text-[10px] text-slate-500">
          No historical observation records available for this project in the PAIMANA repository.
        </p>
      </div>
    );
  }

  if (history.length === 1) {
    const single = history[0];
    return (
      <div className="p-3 bg-[#070A0F] rounded-lg border border-slate-800/90 text-xs font-mono">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1.5">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>HISTORICAL OBSERVATIONS</span>
          </span>
          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/70">
            SINGLE OBSERVATION
          </span>
        </div>
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[10.5px] text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">REPORTED IN:</span>
            <span className="text-slate-200 font-bold">{single.reportMonth}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">REPORTED PROGRESS:</span>
            <span className="text-cyan-400 font-bold">
              {single.physicalProgress !== null ? `${single.physicalProgress}%` : 'Not Reported'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">EXPENDITURE:</span>
            <span className="text-emerald-400 font-bold">
              {single.cumulativeExpenditure !== null ? `₹${single.cumulativeExpenditure.toLocaleString()} Cr` : 'Not Reported'}
            </span>
          </div>
        </div>
        <p className="text-[9.5px] text-slate-500 mt-2 italic flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Historical tracking data is limited. This project appears in 1 monthly report. Multi-month trends will populate as subsequent reports are onboarded.</span>
        </p>
      </div>
    );
  }

  // Multi-month historical data
  const months = history.map(h => h.reportMonthKey);
  const progressValues = history.map(h => h.physicalProgress);
  const expenditureValues = history.map(h => h.cumulativeExpenditure);

  const validProgress = progressValues.filter((v): v is number => v !== null);
  const validExp = expenditureValues.filter((v): v is number => v !== null);

  const maxProg = Math.max(100, ...(validProgress.length > 0 ? validProgress : [100]));
  const maxExp = Math.max(10, ...(validExp.length > 0 ? validExp : [10]));

  // SVG Chart dimensions
  const svgWidth = 320;
  const svgHeight = 110;
  const padLeft = 32;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 22;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const getX = (idx: number) => {
    if (history.length <= 1) return padLeft;
    return padLeft + (idx / (history.length - 1)) * chartWidth;
  };

  const getY = (val: number | null, maxVal: number) => {
    if (val === null || isNaN(val)) return padTop + chartHeight;
    const ratio = Math.max(0, Math.min(1, val / maxVal));
    return padTop + chartHeight - ratio * chartHeight;
  };

  // Generate SVG Path
  const points = history.map((h, i) => {
    const val = activeMetric === 'PROGRESS' ? h.physicalProgress : h.cumulativeExpenditure;
    const maxVal = activeMetric === 'PROGRESS' ? maxProg : maxExp;
    return {
      x: getX(i),
      y: getY(val, maxVal),
      val,
      month: h.reportMonth,
      monthKey: h.reportMonthKey
    };
  });

  const validPoints = points.filter(p => p.val !== null);
  const polylineStr = validPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Fill area under curve
  const areaPathStr = validPoints.length > 1
    ? `M ${validPoints[0].x},${padTop + chartHeight} ` +
      validPoints.map(p => `L ${p.x},${p.y}`).join(' ') +
      ` L ${validPoints[validPoints.length - 1].x},${padTop + chartHeight} Z`
    : '';

  // Check for progress drop anomalies in reported data
  const hasProgressDrop = history.some((h, idx) => {
    if (idx === 0) return false;
    const prev = history[idx - 1].physicalProgress;
    const curr = h.physicalProgress;
    return prev !== null && curr !== null && curr < prev;
  });

  return (
    <div className="p-2.5 bg-[#070A0F] rounded-lg border border-slate-800/90 font-mono text-xs space-y-2">
      {/* Header & Metric Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="font-bold text-[10.5px] uppercase text-slate-200">
            HISTORICAL TRAJECTORY ({history.length} MONTHS)
          </span>
        </div>

        <div className="flex items-center bg-[#0C1017] rounded border border-slate-800 p-0.5 text-[9px]">
          <button
            onClick={() => setActiveMetric('PROGRESS')}
            className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
              activeMetric === 'PROGRESS'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            PROGRESS %
          </button>
          <button
            onClick={() => setActiveMetric('EXPENDITURE')}
            className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
              activeMetric === 'EXPENDITURE'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EXPENDITURE ₹
          </button>
        </div>
      </div>

      {/* SVG Time-Series Chart */}
      <div className="relative bg-[#0A0E15]/90 rounded border border-slate-800/80 p-1 overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Grid lines */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={svgWidth - padRight}
            y2={padTop}
            stroke="#1e293b"
            strokeDasharray="2 3"
          />
          <line
            x1={padLeft}
            y1={padTop + chartHeight / 2}
            x2={svgWidth - padRight}
            y2={padTop + chartHeight / 2}
            stroke="#1e293b"
            strokeDasharray="2 3"
          />
          <line
            x1={padLeft}
            y1={padTop + chartHeight}
            x2={svgWidth - padRight}
            y2={padTop + chartHeight}
            stroke="#334155"
          />

          {/* Y-Axis Labels */}
          <text
            x={padLeft - 4}
            y={padTop + 3}
            textAnchor="end"
            fontSize="8"
            fill="#64748b"
          >
            {activeMetric === 'PROGRESS' ? '100%' : `₹${Math.round(maxExp)}`}
          </text>
          <text
            x={padLeft - 4}
            y={padTop + chartHeight / 2 + 3}
            textAnchor="end"
            fontSize="8"
            fill="#64748b"
          >
            {activeMetric === 'PROGRESS' ? '50%' : `₹${Math.round(maxExp / 2)}`}
          </text>
          <text
            x={padLeft - 4}
            y={padTop + chartHeight + 2}
            textAnchor="end"
            fontSize="8"
            fill="#64748b"
          >
            0
          </text>

          {/* Area Gradient fill */}
          {areaPathStr && (
            <path
              d={areaPathStr}
              fill={activeMetric === 'PROGRESS' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(16, 185, 129, 0.12)'}
            />
          )}

          {/* Line curve */}
          {polylineStr && (
            <polyline
              points={polylineStr}
              fill="none"
              stroke={activeMetric === 'PROGRESS' ? '#06b6d4' : '#10b981'}
              strokeWidth="2.0"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => {
            if (pt.val === null) return null;
            const isHovered = hoveredIdx === i;
            const isDrop = i > 0 && points[i - 1].val !== null && pt.val < (points[i - 1].val || 0);

            return (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 4.5 : 2.5}
                  fill={isDrop ? '#ef4444' : isHovered ? '#ffffff' : activeMetric === 'PROGRESS' ? '#06b6d4' : '#10b981'}
                  stroke="#070A0F"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}

          {/* X-Axis Month Labels */}
          {points.map((pt, i) => {
            // Show every other label if many points
            if (history.length > 5 && i % 2 !== 0 && i !== history.length - 1) return null;
            const shortMonth = pt.monthKey.slice(5); // "07", "08", etc.
            return (
              <text
                key={i}
                x={pt.x}
                y={padTop + chartHeight + 14}
                textAnchor="middle"
                fontSize="8"
                fill="#64748b"
              >
                {shortMonth}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div className="mt-1 px-2 py-1 bg-slate-900/95 border border-slate-700 rounded text-[9.5px] text-slate-200 flex items-center justify-between">
            <span className="text-cyan-400 font-bold">{points[hoveredIdx].month}:</span>
            <span>
              {activeMetric === 'PROGRESS'
                ? `Physical Progress: ${points[hoveredIdx].val !== null ? `${points[hoveredIdx].val}%` : 'N/A'}`
                : `Expenditure: ₹${points[hoveredIdx].val !== null ? points[hoveredIdx].val?.toLocaleString() : 'N/A'} Cr`}
            </span>
          </div>
        )}
      </div>

      {/* Trajectory Highlights & Anomalies Note */}
      <div className="flex items-center justify-between text-[9.5px] text-slate-400 pt-0.5">
        <span>Baseline: <strong className="text-slate-200">{history[0]?.reportMonthKey}</strong></span>
        <span>Latest: <strong className="text-cyan-400">{history[history.length - 1]?.reportMonthKey}</strong></span>
      </div>

      {hasProgressDrop && activeMetric === 'PROGRESS' && (
        <div className="flex items-start gap-1 p-1.5 rounded bg-amber-950/40 border border-amber-800/50 text-[9px] text-amber-300">
          <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
          <span>Notice: Red node indicates a scope recalibration or progress retraction reported by implementing agency. Data preserved verbatim without smoothing.</span>
        </div>
      )}
    </div>
  );
};
