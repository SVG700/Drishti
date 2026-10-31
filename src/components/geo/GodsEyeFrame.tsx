import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Crosshair, Globe, MapPin, PanelRightClose, PanelRightOpen, RefreshCw, Search } from 'lucide-react';
import type { InfrastructureProject } from '../../types/project';
import { Badge } from '../common/Badge';
import { ProjectHistoryChart } from '../spatial/ProjectHistoryChart';

/**
 * The new God's Eye (gods-eye-view, served on its own dev server) framed in
 * Drishti. Drishti's geocoded projects are posted to its Drishti bridge
 * (gods-eye-view/src/drishti/bridge.js), which pins them on the globe; pin
 * clicks come back as project selections.
 */

const GODS_EYE_URL = (import.meta.env.VITE_GODS_EYE_URL as string | undefined)?.trim() || 'http://localhost:4173/';
// God's Eye answers once its startup camera has settled (up to ~20 s after load).
const CONNECT_TIMEOUT_MS = 45000;

type BridgeStatus = 'connecting' | 'connected' | 'offline';

interface BridgeProject {
  id: string;
  name: string;
  code: string;
  sector: string;
  status: string;
  riskLevel: string;
  physicalProgress: number;
  state: string;
  district?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
}

function toBridgeProject(p: InfrastructureProject): BridgeProject {
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    sector: p.sector,
    status: p.status,
    riskLevel: p.riskLevel,
    physicalProgress: p.physicalProgress,
    state: p.state,
    district: p.district ?? undefined,
    latitude: p.latitude as number,
    longitude: p.longitude as number,
    altitude: p.altitude
  };
}

export function isMappedProject(p: InfrastructureProject): boolean {
  return (
    p.hasCoordinates &&
    typeof p.latitude === 'number' &&
    typeof p.longitude === 'number' &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude)
  );
}

interface GodsEyeFrameProps {
  projects: InfrastructureProject[];
  selectedProjectId: string | null;
  onSelectProject: (project: InfrastructureProject) => void;
  onUseClassicGlobe: () => void;
}

export const GodsEyeFrame: React.FC<GodsEyeFrameProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onUseClassicGlobe
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<BridgeStatus>('connecting');
  const [frameKey, setFrameKey] = useState(0);
  const [showPanel, setShowPanel] = useState(true);
  const [query, setQuery] = useState('');
  // A selection that came from a pin click: the globe already flew there.
  const clickedIdRef = useRef<string | null>(null);

  const targetOrigin = useMemo(() => new URL(GODS_EYE_URL, window.location.href).origin, []);
  const frameSrc = useMemo(() => {
    const url = new URL(GODS_EYE_URL, window.location.href);
    url.searchParams.set('drishti', '1');
    url.searchParams.set('origin', window.location.origin);
    return url.toString();
  }, []);

  const mappedProjects = useMemo(() => projects.filter(isMappedProject), [projects]);
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const post = useCallback(
    (message: unknown) => {
      iframeRef.current?.contentWindow?.postMessage(message, targetOrigin);
    },
    [targetOrigin]
  );

  // Latest values for the message handler, which is installed once.
  const latest = useRef({ mappedProjects, projects, selectedProjectId, onSelectProject });
  latest.current = { mappedProjects, projects, selectedProjectId, onSelectProject };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== targetOrigin || event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;
      if (data.type === 'drishti:bridge-ready') {
        setStatus('connected');
        const { mappedProjects: mapped, selectedProjectId: id } = latest.current;
        post({ type: 'drishti:projects', projects: mapped.map(toBridgeProject) });
        // Opened from "Inspect" (#/gods-eye?id=...): go straight to the site.
        const deepLinked = /[?&]id=/.test(window.location.hash) && window.location.hash.includes('gods-eye');
        post({ type: 'drishti:select', id, fly: deepLinked });
      } else if (data.type === 'drishti:project-click' && typeof data.id === 'string') {
        const project = latest.current.projects.find(p => p.id === data.id);
        if (project) {
          clickedIdRef.current = project.id;
          latest.current.onSelectProject(project);
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post, targetOrigin]);

  // No bridge answer in time: the gods-eye-view server is not running.
  useEffect(() => {
    if (status !== 'connecting') return;
    const timer = setTimeout(() => setStatus(s => (s === 'connecting' ? 'offline' : s)), CONNECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status, frameKey]);

  // Dataset switches (PAIMANA / synthetic) replace the pins.
  useEffect(() => {
    if (status === 'connected') {
      post({ type: 'drishti:projects', projects: mappedProjects.map(toBridgeProject) });
      post({ type: 'drishti:select', id: latest.current.selectedProjectId, fly: false });
    }
  }, [mappedProjects, status, post]);

  // Selections made anywhere in Drishti fly the globe to the site.
  useEffect(() => {
    if (status !== 'connected') return;
    const fromClick = clickedIdRef.current === selectedProjectId;
    clickedIdRef.current = null;
    post({ type: 'drishti:select', id: selectedProjectId, fly: !fromClick });
  }, [selectedProjectId, status, post]);

  const reconnect = () => {
    setStatus('connecting');
    setFrameKey(k => k + 1);
  };

  const filteredSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mappedProjects;
    return mappedProjects.filter(p =>
      [p.name, p.code, p.state, p.district, p.sector, p.id].some(v => v?.toLowerCase().includes(q))
    );
  }, [mappedProjects, query]);

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-[#07090E]">
      <div className="flex-1 min-w-0 relative">
        <iframe
          key={frameKey}
          ref={iframeRef}
          src={frameSrc}
          title="God's Eye"
          className="w-full h-full border-0 block"
          allow="fullscreen; geolocation; microphone; clipboard-write"
        />

        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#07090E]/90 font-mono text-xs">
            {status === 'connecting' ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                <span className="text-[11px] text-cyan-400 font-bold">CONNECTING TO GOD'S EYE...</span>
                <span className="text-[10px] text-slate-500">{GODS_EYE_URL}</span>
              </div>
            ) : (
              <div className="max-w-md p-4 bg-[#121722] border border-slate-800 rounded-lg space-y-3 text-slate-300">
                <div className="text-amber-400 font-bold text-[11px]">GOD'S EYE SERVER NOT REACHABLE</div>
                <p className="text-[10.5px] leading-relaxed">
                  The new God's Eye runs on its own server at <span className="text-cyan-400">{GODS_EYE_URL}</span>.
                  Start everything with <span className="text-cyan-400">npm run dev:all</span> in the Drishti folder,
                  or start it alone with <span className="text-cyan-400">npm run dev:gods-eye</span>.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={reconnect}
                    className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> RETRY
                  </button>
                  <button
                    onClick={onUseClassicGlobe}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" /> CLASSIC GLOBE
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowPanel(v => !v)}
          title={showPanel ? 'Hide project sites' : 'Show project sites'}
          className="absolute bottom-3 right-3 z-10 p-1.5 rounded bg-[#121722]/90 border border-slate-700 text-slate-300 hover:text-cyan-400 cursor-pointer"
        >
          {showPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
      </div>

      {showPanel && (
        <aside className="w-80 shrink-0 flex flex-col min-h-0 bg-[#0B0E14] border-l border-slate-800 font-mono text-xs">
          <div className="p-2.5 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>PROJECT SITES ({mappedProjects.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => post({ type: 'drishti:overview' })}
                  disabled={status !== 'connected'}
                  title="India overview"
                  className="p-1 rounded text-slate-400 hover:text-cyan-400 disabled:opacity-40 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onUseClassicGlobe}
                  title="Classic globe"
                  className="p-1 rounded text-slate-400 hover:text-cyan-400 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="text-[9.5px] text-slate-500">
              {projects.length - mappedProjects.length} projects await verified geocoding and are not pinned.
            </div>
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter sites..."
                className="w-full pl-6 pr-2 py-1 bg-[#121722] border border-slate-800 rounded text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-600"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {selectedProject && (
              <div className="p-2.5 border-b border-slate-800 space-y-2 bg-[#121722]">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" /> SELECTED PROJECT
                </div>
                <div className="text-[12px] font-bold text-slate-100 leading-snug">{selectedProject.name}</div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="status" status={selectedProject.status}>
                    {selectedProject.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="risk" riskLevel={selectedProject.riskLevel}>
                    RISK: {selectedProject.riskLevel}
                  </Badge>
                </div>
                <div className="space-y-1 text-[10.5px]">
                  <Row label="CODE" value={selectedProject.code} />
                  <Row label="SECTOR" value={selectedProject.sector} />
                  <Row label="LOCATION" value={`${selectedProject.district ? selectedProject.district + ', ' : ''}${selectedProject.state}`} />
                  <Row
                    label="COORDINATES"
                    value={
                      isMappedProject(selectedProject)
                        ? `${selectedProject.latitude!.toFixed(4)}°N, ${selectedProject.longitude!.toFixed(4)}°E`
                        : 'Pending verified geocoding'
                    }
                    tone={isMappedProject(selectedProject) ? 'text-emerald-400' : 'text-amber-400'}
                  />
                  <Row label="PROGRESS" value={`${selectedProject.physicalProgress}%`} tone="text-cyan-400" />
                  <Row label="BUDGET" value={`₹${selectedProject.budget?.toLocaleString() || 0} Cr`} />
                  <Row label="EXPENDITURE" value={`₹${selectedProject.expenditure?.toLocaleString() || 0} Cr`} tone="text-emerald-400" />
                  {selectedProject.timeOverrunMonths ? (
                    <Row label="SCHEDULE DELAY" value={`+${selectedProject.timeOverrunMonths} Mos`} tone="text-rose-400" />
                  ) : null}
                </div>
                <ProjectHistoryChart
                  history={selectedProject.history}
                  projectName={selectedProject.name}
                  projectId={selectedProject.id}
                />
              </div>
            )}

            <ul className="divide-y divide-slate-800/80">
              {filteredSites.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => onSelectProject(p)}
                    className={`w-full text-left px-2.5 py-2 hover:bg-[#151D2A] cursor-pointer ${
                      p.id === selectedProjectId ? 'bg-[#151D2A] border-l-2 border-amber-400' : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="text-[11px] text-slate-100 font-bold truncate">{p.name}</div>
                    <div className="text-[9.5px] text-slate-400 truncate">
                      {p.state} • {p.sector} • {p.physicalProgress}%
                    </div>
                  </button>
                </li>
              ))}
              {filteredSites.length === 0 && (
                <li className="p-3 text-[10.5px] text-slate-500">No mapped sites match.</li>
              )}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = 'text-slate-200' }) => (
  <div className="flex justify-between gap-2">
    <span className="text-slate-400 shrink-0">{label}:</span>
    <span className={`${tone} font-bold text-right truncate`}>{value}</span>
  </div>
);
