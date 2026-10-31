import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GeoAnalysisView } from './components/geo/GeoAnalysisView';
import { SYNTHETIC_PROJECTS } from './data/syntheticProjects';
import { loadPaimanaDataset, type PaimanaDatasetResult } from './services/paimanaDataProvider';
import type { InfrastructureProject } from './types/project';
import { AppShell, type NavigationTab } from './components/layout/AppShell';
import { OverviewView } from './components/dashboard/OverviewView';
import { ProjectsView } from './components/projects/ProjectsView';
import { AssistantView } from './components/assistant/AssistantView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { ReportsView } from './components/reports/ReportsView';
import apiService from './services/apiService';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { PageTransition } from './components/motion/PageTransition';
import { BootSplash } from './components/motion/BootSplash';

// Helper to parse hash route from window.location
function parseHashRoute(): { tab: NavigationTab; projectId?: string } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [routePart, queryPart] = hash.split('?');
  const validTabs: NavigationTab[] = [
    'overview',
    'projects',
    'gods-eye',
    'assistant',
    'analytics',
    'reports'
  ];

  let tab: NavigationTab = 'overview';
  if (validTabs.includes(routePart as NavigationTab)) {
    tab = routePart as NavigationTab;
  }

  let projectId: string | undefined;
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    const idParam = params.get('id');
    if (idParam) projectId = idParam;
  }

  return { tab, projectId };
}

export const App: React.FC = () => {
  const initialRoute = parseHashRoute();
  const [currentTab, setCurrentTab] = useState<NavigationTab>(initialRoute.tab);
  const [datasetMode, setDatasetMode] = useState<'PAIMANA' | 'SYNTHETIC'>('PAIMANA');
  const [paimanaResult, setPaimanaResult] = useState<PaimanaDatasetResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialRoute.projectId || '400010'
  );
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);

  // Check Python FastAPI backend health on mount
  const checkBackendHealth = useCallback(() => {
    apiService
      .isBackendOnline()
      .then(online => setIsBackendOnline(online))
      .catch(() => setIsBackendOnline(false));
  }, []);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  // Sync hash route with browser history
  useEffect(() => {
    const handleHashChange = () => {
      const { tab, projectId } = parseHashRoute();
      setCurrentTab(tab);
      if (projectId) {
        setSelectedProjectId(projectId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = useCallback(
    (tab: NavigationTab) => {
      setCurrentTab(tab);
      const query = selectedProjectId ? `?id=${selectedProjectId}` : '';
      window.location.hash = `#/${tab}${query}`;
    },
    [selectedProjectId]
  );

  // Load official PAIMANA MoSPI dataset on component mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    loadPaimanaDataset()
      .then(result => {
        if (!isMounted) return;
        setPaimanaResult(result);
        if (result.error && result.source === 'SYNTHETIC_FALLBACK') {
          setLoadError(result.error);
          setDatasetMode('SYNTHETIC');
        } else {
          // If no initial project specified, prefer landmark 400010 or first project
          if (!initialRoute.projectId) {
            const defaultProject =
              result.projects.find(p => p.id === '400010') || result.projects[0];
            if (defaultProject) {
              setSelectedProjectId(defaultProject.id);
            }
          }
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed loading PAIMANA dataset:', err);
        setLoadError(err?.message || 'Error loading CSV files');
        setDatasetMode('SYNTHETIC');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute active projects based on selected mode
  const activeProjects = useMemo(() => {
    if (datasetMode === 'PAIMANA' && paimanaResult && paimanaResult.projects.length > 0) {
      return paimanaResult.projects;
    }
    return SYNTHETIC_PROJECTS;
  }, [datasetMode, paimanaResult]);

  const selectedProject = useMemo(() => {
    const match = activeProjects.find(p => p.id === selectedProjectId);
    if (match) return match;
    // While the official dataset loads, activeProjects is the synthetic placeholder;
    // substituting one of its projects would send the backend an ID it does not know.
    if (isLoading && datasetMode === 'PAIMANA') return null;
    return activeProjects[0] || null;
  }, [activeProjects, selectedProjectId, isLoading, datasetMode]);

  const handleSelectProject = useCallback((project: InfrastructureProject) => {
    setSelectedProjectId(project.id);
  }, []);

  const handleInspectProject = useCallback((project: InfrastructureProject) => {
    setSelectedProjectId(project.id);
    setCurrentTab('gods-eye');
    window.location.hash = `#/gods-eye?id=${project.id}`;
  }, []);

  // Toggle between Official PAIMANA and Synthetic Demo datasets
  const handleToggleDatasetMode = useCallback(() => {
    setDatasetMode(prev => {
      const nextMode = prev === 'PAIMANA' ? 'SYNTHETIC' : 'PAIMANA';
      if (nextMode === 'SYNTHETIC') {
        setSelectedProjectId(SYNTHETIC_PROJECTS[0]?.id || null);
      } else if (paimanaResult && paimanaResult.projects.length > 0) {
        const defaultProject =
          paimanaResult.projects.find(p => p.id === '400010') || paimanaResult.projects[0];
        setSelectedProjectId(defaultProject?.id || null);
      }
      return nextMode;
    });
  }, [paimanaResult]);

  const geocodedCount = useMemo(() => {
    return activeProjects.filter(p => p.hasCoordinates).length;
  }, [activeProjects]);

  return (
    <MotionConfig reducedMotion="user">
    <BootSplash />
    <AppShell
      currentTab={currentTab}
      onSelectTab={handleSelectTab}
      isBackendOnline={isBackendOnline}
      onRefreshBackendStatus={checkBackendHealth}
      activeDatasetMode={datasetMode}
      onToggleDatasetMode={handleToggleDatasetMode}
      totalProjectsCount={activeProjects.length}
      geocodedCount={geocodedCount}
      selectedProject={selectedProject}
      onSearchSelectProject={handleSelectProject}
      allProjects={activeProjects}
    >
      <AnimatePresence mode="wait">
      {/* 1. OVERVIEW DASHBOARD */}
      {currentTab === 'overview' && (
        <PageTransition key="overview">
        <OverviewView
          projects={activeProjects}
          onSelectProject={handleSelectProject}
          onNavigateTab={handleSelectTab}
          onInspectProject={handleInspectProject}
          isBackendOnline={isBackendOnline}
        />
        </PageTransition>
      )}

      {/* 2. PROJECTS EXPLORER */}
      {currentTab === 'projects' && (
        <PageTransition key="projects">
        <ProjectsView
          projects={activeProjects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onNavigateTab={handleSelectTab}
          onInspectProject={handleInspectProject}
          isBackendOnline={isBackendOnline}
        />
        </PageTransition>
      )}

      </AnimatePresence>

      {/* 3. GOD'S EYE 3D GEOSPATIAL INTELLIGENCE */}
      {/* Kept mounted to preserve Cesium WebGL context, active shaders, camera, and tactical radar */}
      <div
        className={`page-layer w-full h-full flex flex-col overflow-hidden bg-[#07090E] ${
          currentTab === 'gods-eye' ? 'block' : 'hidden'
        }`}
      >
        <GeoAnalysisView
          projects={activeProjects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onNavigateTab={(tab: string) => {
            if (
              ['overview', 'projects', 'gods-eye', 'assistant', 'analytics', 'reports'].includes(tab)
            ) {
              handleSelectTab(tab as NavigationTab);
            }
          }}
          activeDatasetMode={datasetMode}
          onToggleDatasetMode={handleToggleDatasetMode}
          isDatasetLoading={isLoading}
        />
      </div>

      <AnimatePresence mode="wait">
      {/* 4. AI ASSISTANT CHATBOT */}
      {currentTab === 'assistant' && (
        <PageTransition key="assistant">
        <AssistantView
          projects={activeProjects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          onInspectProject={handleInspectProject}
          onNavigateTab={handleSelectTab}
          isBackendOnline={isBackendOnline}
        />
        </PageTransition>
      )}

      {/* 5. ADVANCED ANALYTICS */}
      {currentTab === 'analytics' && (
        <PageTransition key="analytics">
        <AnalyticsView
          projects={activeProjects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          onNavigateTab={handleSelectTab}
          onInspectProject={handleInspectProject}
          isBackendOnline={isBackendOnline}
        />
        </PageTransition>
      )}

      {/* 6. EXECUTIVE INTELLIGENCE REPORTS */}
      {currentTab === 'reports' && (
        <PageTransition key="reports">
        <ReportsView
          projects={activeProjects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          onNavigateTab={handleSelectTab}
          onInspectProject={handleInspectProject}
          isBackendOnline={isBackendOnline}
        />
        </PageTransition>
      )}
      </AnimatePresence>
    </AppShell>
    </MotionConfig>
  );
};

export default App;
