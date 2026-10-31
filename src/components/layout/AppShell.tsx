import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  Globe,
  BotMessageSquare,
  BarChart3,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Server,
  Database,
  ShieldCheck,
  Search,
  Sun,
  Moon
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { InfrastructureProject } from '../../types/project';
import { useTheme } from '../../context/ThemeContext';
import { AnimatedBackdrop } from '../motion/AnimatedBackdrop';
import { useSpotlight } from '../motion/useSpotlight';

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;

export type NavigationTab =
  | 'overview'
  | 'projects'
  | 'gods-eye'
  | 'assistant'
  | 'analytics'
  | 'reports';

interface AppShellProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isBackendOnline: boolean;
  onRefreshBackendStatus?: () => void;
  activeDatasetMode: 'PAIMANA' | 'SYNTHETIC';
  onToggleDatasetMode?: () => void;
  totalProjectsCount: number;
  geocodedCount: number;
  selectedProject: InfrastructureProject | null;
  onSearchSelectProject?: (project: InfrastructureProject) => void;
  allProjects?: InfrastructureProject[];
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  isBackendOnline,
  onRefreshBackendStatus,
  activeDatasetMode,
  onToggleDatasetMode,
  totalProjectsCount,
  geocodedCount,
  selectedProject,
  onSearchSelectProject,
  allProjects = [],
  children
}) => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  useSpotlight();

  // Quick project search in header
  const filteredSearchResults = headerSearchQuery.trim()
    ? allProjects
        .filter(
          p =>
            p.id.toLowerCase().includes(headerSearchQuery.toLowerCase()) ||
            p.name.toLowerCase().includes(headerSearchQuery.toLowerCase()) ||
            p.sector.toLowerCase().includes(headerSearchQuery.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const navItems = [
    {
      id: 'overview' as NavigationTab,
      label: 'Overview',
      icon: LayoutDashboard
    },
    {
      id: 'projects' as NavigationTab,
      label: 'Projects',
      icon: FolderGit2,
      badge: totalProjectsCount > 0 ? `${totalProjectsCount.toLocaleString()}` : undefined
    },
    {
      id: 'gods-eye' as NavigationTab,
      label: "God's Eye",
      icon: Globe,
      badge: '3D Globe'
    },
    {
      id: 'assistant' as NavigationTab,
      label: 'AI Assistant',
      icon: BotMessageSquare
    },
    {
      id: 'analytics' as NavigationTab,
      label: 'Analytics',
      icon: BarChart3
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Reports',
      icon: FileSpreadsheet
    }
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090E] text-slate-100 font-sans select-none">
      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`bg-[#0C1017] border-r border-slate-800/80 flex flex-col shrink-0 transition-all duration-300 z-30 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        } hidden md:flex`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-14 border-b border-slate-800/90 px-3.5 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <motion.div
              className="flex items-center gap-2.5 overflow-hidden"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="brand-ring w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shrink-0 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-cyan-400 float-soft" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-gradient-drishti font-extrabold tracking-wider text-xs font-mono">
                    DRISHTI
                  </span>
                  <span className="text-[9px] px-1 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800/60 rounded font-mono font-bold">
                    दृष्टि
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-mono truncate" title="AI-Powered Infrastructure Intelligence">
                  AI Infra Intelligence
                </p>
              </div>
            </motion.div>
          )}

          {isSidebarCollapsed && (
            <div className="w-full flex justify-center">
              <div className="brand-ring w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shadow-sm">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
          )}

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition cursor-pointer"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {!isSidebarCollapsed && (
            <div className="px-2 pb-1.5 text-[9.5px] font-mono uppercase tracking-wider text-slate-400">
              Core Monitoring
            </div>
          )}

          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: isActive ? 0 : 3 }}
                className={`relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium group cursor-pointer border border-transparent ${
                  isActive ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/80'
                }`}
                title={item.label}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    transition={SPRING}
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-indigo-500/10 border border-cyan-500/40 shadow-[0_0_18px_-6px_rgba(34,211,238,0.6)]"
                  >
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-gradient-to-b from-cyan-300 to-indigo-400" />
                  </motion.span>
                )}
                <div
                  className={`relative p-1 rounded transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-115 group-hover:-rotate-6" />
                </div>

                {!isSidebarCollapsed && (
                  <div className="relative flex-1 flex items-center justify-between min-w-0">
                    <span
                      className={`truncate text-[12.5px] ${
                        isActive ? 'font-bold text-slate-100' : 'text-slate-300'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          isActive
                            ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Sidebar Footer Info */}
        {!isSidebarCollapsed && (
          <div className="p-3 border-t border-slate-800/80 bg-[#0A0D14]/80 space-y-2 text-[10px] font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-cyan-400" />
                <span>Dataset:</span>
              </span>
              <span className="font-bold text-slate-200">
                {activeDatasetMode === 'PAIMANA' ? 'MoSPI Official' : 'Synthetic Demo'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Server className="w-3 h-3 text-cyan-400" />
                <span>AI Backend:</span>
              </span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  isBackendOnline ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                <span
                  className={`status-ping w-1.5 h-1.5 rounded-full ${
                    isBackendOnline ? 'bg-emerald-400 text-emerald-400' : 'bg-amber-400 text-amber-400'
                  }`}
                />
                {isBackendOnline ? ':8000 Ready' : 'Offline'}
              </span>
            </div>

            <div className="text-[9px] text-slate-400 border-t border-slate-800/60 pt-1.5 truncate">
              SIH26103 • MoSPI PAIMANA • Team KAALNETRA
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
      {isMobileMenuOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex md:hidden bg-black/70 backdrop-blur-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-64 bg-[#0C1017] border-r border-slate-800 h-full flex flex-col p-4 space-y-4"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={SPRING}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider font-mono">DRISHTI (दृष्टि)</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 flex-1 overflow-y-auto">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Theme Toggle */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Theme:</span>
              <div className="flex items-center bg-[#10141D] border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-2 py-1 rounded flex items-center gap-1 text-[10px] ${
                    theme === 'dark'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-2 py-1 rounded flex items-center gap-1 text-[10px] ${
                    theme === 'light'
                      ? 'bg-amber-500/20 text-amber-500 font-bold border border-amber-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light</span>
                </button>
              </div>
            </div>
          </motion.div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </motion.div>
      )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOP HEADER */}
        <header className="h-14 bg-[#0A0D14] border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-gradient-drishti text-xs sm:text-sm font-extrabold tracking-wide uppercase font-sans truncate m-0">
                DRISHTI (दृष्टि)
              </h1>
              <span className="hidden sm:inline text-slate-500 font-mono text-xs">•</span>
              <span className="hidden sm:inline text-xs text-slate-400 font-sans truncate">
                AI-Powered Infrastructure Intelligence • MoSPI PAIMANA
              </span>
            </div>
          </div>

          {/* Quick Search & Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Project Search */}
            <div className="relative hidden sm:block w-48 md:w-60">
              <div className="flex items-center bg-[#10141D] border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Quick lookup ID / Project..."
                  value={headerSearchQuery}
                  onChange={e => {
                    setHeaderSearchQuery(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsSearchDropdownOpen(false), 200)}
                  className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 text-xs w-full"
                />
              </div>

              <AnimatePresence>
              {isSearchDropdownOpen && filteredSearchResults.length > 0 && (
                <motion.div
                  className="absolute top-full left-0 right-0 mt-1 bg-[#121722]/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto py-1 origin-top"
                  initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
                  transition={{ duration: 0.18 }}
                >
                  {filteredSearchResults.map((proj, i) => (
                    <motion.div
                      key={proj.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025 }}
                      onClick={() => {
                        onSearchSelectProject?.(proj);
                        setIsSearchDropdownOpen(false);
                        setHeaderSearchQuery('');
                      }}
                      className="px-3 py-1.5 hover:bg-slate-800/80 cursor-pointer border-b border-slate-800/40 last:border-none"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-cyan-400">#{proj.id}</span>
                        <span className="text-[9.5px] text-slate-400 font-mono">{proj.sector}</span>
                      </div>
                      <div className="text-xs text-slate-200 truncate">{proj.name}</div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* AI Backend Status Indicator */}
            <button
              onClick={onRefreshBackendStatus}
              title={
                isBackendOnline
                  ? 'FastAPI AI Backend is online at http://127.0.0.1:8000'
                  : 'FastAPI Backend offline (uvicorn app.main:app)'
              }
              className={`px-2 py-1 rounded text-[10px] font-mono font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isBackendOnline
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-950/70'
                  : 'bg-amber-950/40 text-amber-400 border-amber-800/50 hover:bg-amber-950/70'
              }`}
            >
              <span
                className={`status-ping w-1.5 h-1.5 rounded-full ${
                  isBackendOnline ? 'bg-emerald-400 text-emerald-400' : 'bg-amber-400 text-amber-400'
                }`}
              />
              <span className="hidden sm:inline">BACKEND:</span>
              <span>{isBackendOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </button>

            {/* Dataset Mode Switcher */}
            {onToggleDatasetMode && (
              <button
                onClick={onToggleDatasetMode}
                className="px-2 py-1 rounded text-[10px] font-mono font-medium border transition-colors cursor-pointer flex items-center gap-1.5 bg-[#10141D] text-slate-300 border-slate-800 hover:text-slate-100 hover:border-slate-700"
                title="Switch Dataset Mode"
              >
                <Database className="w-3 h-3 text-cyan-400" />
                <span className="hidden md:inline">DATASET:</span>
                <span className="font-bold text-slate-200">
                  {activeDatasetMode === 'PAIMANA' ? 'OFFICIAL' : 'DEMO'}
                </span>
              </button>
            )}

            {/* Theme Mode Switcher */}
            <div
              role="radiogroup"
              aria-label="Color theme switcher"
              className="flex items-center bg-[#10141D] border border-slate-800 rounded-lg p-0.5"
            >
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
                onClick={() => setTheme('dark')}
                title="Switch to Dark Theme"
                className={`relative p-1 sm:px-2 sm:py-0.5 rounded flex items-center gap-1.5 text-[10px] font-mono font-medium transition cursor-pointer border border-transparent ${
                  theme === 'dark' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {theme === 'dark' && (
                  <motion.span
                    layoutId="theme-active"
                    transition={SPRING}
                    className="absolute inset-0 rounded bg-cyan-500/20 border border-cyan-500/40"
                  />
                )}
                <Moon className="relative w-3.5 h-3.5 text-cyan-400" />
                <span className="relative hidden md:inline">Dark</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
                onClick={() => setTheme('light')}
                title="Switch to Light Theme"
                className={`relative p-1 sm:px-2 sm:py-0.5 rounded flex items-center gap-1.5 text-[10px] font-mono font-medium transition cursor-pointer border border-transparent ${
                  theme === 'light' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {theme === 'light' && (
                  <motion.span
                    layoutId="theme-active"
                    transition={SPRING}
                    className="absolute inset-0 rounded bg-amber-500/20 border border-amber-500/40"
                  />
                )}
                <Sun className="relative w-3.5 h-3.5 text-amber-500" />
                <span className="relative hidden md:inline">Light</span>
              </button>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* Route progress sweep, replayed on every tab change */}
          <motion.div
            key={currentTab}
            className="absolute top-0 left-0 right-0 h-[2px] z-30 bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 origin-left pointer-events-none"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: [1, 1, 0] }}
            transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], opacity: { times: [0, 0.7, 1], duration: 0.9 } }}
          />
          {currentTab !== 'gods-eye' && <AnimatedBackdrop />}
          <main
            className={`flex-1 min-h-0 relative ${
              currentTab === 'gods-eye'
                ? 'p-0 overflow-hidden' // Full-bleed for Cesium 3D canvas
                : 'overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6'
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
