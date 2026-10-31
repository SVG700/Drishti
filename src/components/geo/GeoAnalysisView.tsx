import React, { useState, useEffect, Suspense } from 'react';
import { 
  Map, 
  MapPin, 
  Globe, 
  Radio,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Layers,
  Database
} from 'lucide-react';
import type { InfrastructureProject } from '../../types/project';
import { SYNTHETIC_PROJECTS } from '../../data/syntheticProjects';
import { SpatialErrorBoundary } from '../spatial/SpatialErrorBoundary';
import { Badge } from '../common/Badge';
import { GodsEyeFrame } from './GodsEyeFrame';

const SpatialIntelligenceView = React.lazy(() => import('../spatial/SpatialIntelligenceView'));

interface GeoAnalysisViewProps {
  projects?: InfrastructureProject[];
  selectedProjectId?: string | null;
  onSelectProject?: (project: InfrastructureProject) => void;
  onNavigateTab?: (tab: string) => void;
  activeDatasetMode?: 'PAIMANA' | 'SYNTHETIC';
  onToggleDatasetMode?: () => void;
  isDatasetLoading?: boolean;
}

export const GeoAnalysisView: React.FC<GeoAnalysisViewProps> = ({ 
  projects = SYNTHETIC_PROJECTS, 
  selectedProjectId: initialSelectedId,
  onSelectProject,
  onNavigateTab,
  activeDatasetMode = 'PAIMANA',
  onToggleDatasetMode,
  isDatasetLoading = false
}) => {
  // GODS_EYE: the new gods-eye-view globe; 3D_GLOBE: the classic Cesium globe.
  const [activeGeoMode, setActiveGeoMode] = useState<'GODS_EYE' | '3D_GLOBE' | '2D_GRID'>('GODS_EYE');
  const [selectedPointId, setSelectedPointId] = useState<string>(
    initialSelectedId || projects[0]?.id || 'PRJ-NH-042'
  );

  // Keep selectedPointId valid when projects list changes & ensure 3D mode is active on inspect
  useEffect(() => {
    if (initialSelectedId && projects.some(p => p.id === initialSelectedId)) {
      setSelectedPointId(initialSelectedId);
      setActiveGeoMode(mode => (mode === '2D_GRID' ? 'GODS_EYE' : mode));
    } else if (projects.length > 0 && !projects.some(p => p.id === selectedPointId)) {
      setSelectedPointId(projects[0].id);
    }
  }, [initialSelectedId, projects]);

  const selectedProject = projects.find(p => p.id === selectedPointId) || projects[0];

  const handleSelect = (project: InfrastructureProject | null) => {
    if (project) {
      setSelectedPointId(project.id);
      onSelectProject?.(project);
    }
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 bg-[#07090E] overflow-hidden select-none">
      {/* Main Geospatial Workspace */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        {activeGeoMode === 'GODS_EYE' ? (
          <GodsEyeFrame
            projects={projects}
            selectedProjectId={selectedPointId}
            onSelectProject={handleSelect}
            onUseClassicGlobe={() => setActiveGeoMode('3D_GLOBE')}
          />
        ) : activeGeoMode === '3D_GLOBE' ? (
          <SpatialErrorBoundary>
            <button
              onClick={() => setActiveGeoMode('GODS_EYE')}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
            >
              OPEN NEW GOD'S EYE
            </button>
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-full w-full bg-[#0B0E14] text-slate-400 font-mono text-xs space-y-2">
                <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                <span className="text-[11px] text-cyan-400 font-bold">LOADING CESIUM 3D GLOBE...</span>
                <span className="text-[10px] text-slate-500">Initializing terrain and satellite layers</span>
              </div>
            }>
              <SpatialIntelligenceView
                projects={projects}
                selectedProjectId={selectedPointId}
                onSelectProject={handleSelect}
                onNavigateTab={onNavigateTab}
                initialSelectedEntityId={selectedPointId}
              />
            </Suspense>
          </SpatialErrorBoundary>
        ) : (
          /* 2D Regional Grid Fallback Workspace */
          <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 p-2 sm:p-3 bg-[#0B0E14] border border-slate-800/90 rounded-xl overflow-hidden font-sans">
            {/* Project List Canvas */}
            <div className="flex-1 bg-[#0B0E14] border border-slate-800 rounded-lg relative overflow-hidden flex flex-col min-w-0 min-h-0">
              <div className="p-2 border-b border-slate-800 bg-[#121722]/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-slate-200">REGIONAL INFRASTRUCTURE SITES ({projects.length})</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {projects.filter(p => p.hasCoordinates).length} GEOCODED • {projects.filter(p => !p.hasCoordinates).length} PENDING
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {projects.map(p => {
                    const isSelected = selectedPointId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#151D2A] border-cyan-500 ring-1 ring-cyan-500/40 shadow-lg'
                            : 'bg-[#0E131C] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <Badge variant="sector" sector={p.sector}>
                                {p.sector}
                              </Badge>
                              <Badge variant="status" status={p.status}>
                                {p.status.replace('_', ' ')}
                              </Badge>
                              {p.hasCoordinates ? (
                                <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/60">
                                  📍 3D MAPPED
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-mono text-amber-400 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60">
                                  ⚠️ STATE LEVEL
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-100 text-xs truncate">{p.name}</h4>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                              {p.state} • CODE: {p.code} {p.ministry ? `• ${p.ministry}` : ''}
                            </div>
                          </div>
                          <Badge variant="risk" riskLevel={p.riskLevel}>
                            RISK: {p.riskLevel}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2.5 space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400">PHYSICAL PROGRESS:</span>
                            <span className="text-cyan-400 font-bold">{p.physicalProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full"
                              style={{ width: `${p.physicalProgress}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
                          <span>BUDGET: ₹{p.budget?.toLocaleString() || 0} Cr</span>
                          <span className="text-emerald-400">EXP: ₹{p.expenditure?.toLocaleString() || 0} Cr</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Project Dossier Sidebar */}
            <div className="w-full lg:w-80 shrink-0 bg-[#121722] border border-slate-800 rounded-lg p-3 space-y-3 overflow-y-auto text-xs font-mono min-h-0">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-200 uppercase">PROJECT DOSSIER</span>
              </div>

              {selectedProject && (
                <div className="space-y-3">
                  <div className="p-2.5 bg-[#0B0E14] rounded border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">SELECTED PROJECT</div>
                    <div className="text-sm font-bold text-slate-100">{selectedProject.name}</div>
                    <div className="text-cyan-400 text-[10.5px]">
                      CODE: {selectedProject.code} • SECTOR: {selectedProject.sector}
                    </div>
                    {selectedProject.ministry && (
                      <div className="text-slate-400 text-[9.5px]">
                        {selectedProject.ministry}
                      </div>
                    )}
                  </div>

                  <div className="p-2 bg-[#0B0E14] rounded border border-slate-800 space-y-1.5 text-[10.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">LOCATION:</span>
                      <span className="text-slate-200 font-bold">{selectedProject.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">COORDINATES:</span>
                      <span className="text-emerald-400 font-bold">
                        {selectedProject.hasCoordinates && typeof selectedProject.latitude === 'number' && typeof selectedProject.longitude === 'number'
                          ? `${selectedProject.latitude.toFixed(4)}°N, ${selectedProject.longitude.toFixed(4)}°E`
                          : 'Pending Geocoding (State-Level)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">RISK RATING:</span>
                      <span className="text-amber-400 font-bold">{selectedProject.riskLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PHYSICAL PROGRESS:</span>
                      <span className="text-cyan-400 font-bold">{selectedProject.physicalProgress}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">BUDGET ALLOCATED:</span>
                      <span className="text-slate-200 font-bold">₹{selectedProject.budget?.toLocaleString() || 0} Cr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">EXPENDITURE:</span>
                      <span className="text-emerald-400 font-bold">₹{selectedProject.expenditure?.toLocaleString() || 0} Cr</span>
                    </div>
                    {selectedProject.timeOverrunMonths !== undefined && selectedProject.timeOverrunMonths !== null && selectedProject.timeOverrunMonths > 0 && (
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>SCHEDULE DELAY:</span>
                        <span>+{selectedProject.timeOverrunMonths} Mos</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block mb-1 uppercase font-bold">PROJECT DESCRIPTION</span>
                    <p className="p-2 bg-[#0B0E14] rounded border border-slate-800 text-slate-300 leading-relaxed text-[10px]">
                      {selectedProject.description}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveGeoMode('GODS_EYE')}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>VIEW ON 3D GLOBE</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeoAnalysisView;

