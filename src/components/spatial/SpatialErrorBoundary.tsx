import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SpatialErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SpatialErrorBoundary] Uncaught error in Spatial Intelligence component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#05070A] text-slate-300 font-mono p-6 space-y-4 select-none">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 shadow-xl">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-sm font-bold text-slate-100 tracking-wider">SPATIAL INTELLIGENCE SUBSYSTEM RECOVERY</h2>
            <p className="text-xs text-slate-400 max-w-md">
              A graphics or telemetry error was safely caught to prevent workspace termination.
            </p>
            {this.state.error && (
              <p className="text-[10px] text-red-400 bg-red-950/40 border border-red-900/60 p-2 rounded max-w-lg overflow-x-auto text-left">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" /> RESTORE VIEWPORT
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
