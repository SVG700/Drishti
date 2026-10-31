import React from 'react';

export type BadgeVariant =
  | 'entity'
  | 'severity'
  | 'status'
  | 'sector'
  | 'risk'
  | 'default'
  | 'accent'
  | 'confidence';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  entityType?: string;
  severity?: string;
  status?: string;
  sector?: string;
  riskLevel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  entityType,
  severity,
  status,
  sector,
  riskLevel,
  className = '',
  size = 'md'
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  // Sector variant (Infrastructure)
  if (variant === 'sector' || sector) {
    const sec = sector || String(children);
    let secColor = 'bg-cyan-950/60 text-cyan-400 border-cyan-800/40';
    if (sec.includes('Road') || sec.includes('Highway')) {
      secColor = 'bg-amber-950/60 text-amber-400 border-amber-800/40';
    } else if (sec.includes('Rail') || sec.includes('Metro')) {
      secColor = 'bg-indigo-950/60 text-indigo-400 border-indigo-800/40';
    } else if (sec.includes('Port') || sec.includes('Shipping')) {
      secColor = 'bg-sky-950/60 text-sky-400 border-sky-800/40';
    } else if (sec.includes('Energy') || sec.includes('Power')) {
      secColor = 'bg-yellow-950/60 text-yellow-400 border-yellow-800/40';
    } else if (sec.includes('Water')) {
      secColor = 'bg-teal-950/60 text-teal-400 border-teal-800/40';
    } else if (sec.includes('Urban')) {
      secColor = 'bg-purple-950/60 text-purple-400 border-purple-800/40';
    }
    return (
      <span className={`inline-flex items-center font-mono font-medium rounded border ${sizeClasses} ${secColor} ${className}`}>
        {children}
      </span>
    );
  }

  // Risk Level variant (Infrastructure & General)
  if (variant === 'risk' || riskLevel || (variant === 'severity' && severity)) {
    const level = (riskLevel || severity || String(children)).toUpperCase();
    let riskColor = 'bg-slate-900 text-slate-400 border-slate-700/50';
    if (level === 'CRITICAL') {
      riskColor = 'bg-red-950/80 text-red-400 border-red-800/60 font-semibold animate-pulse';
    } else if (level === 'HIGH') {
      riskColor = 'bg-orange-950/70 text-orange-400 border-orange-800/50 font-medium';
    } else if (level === 'MEDIUM') {
      riskColor = 'bg-amber-950/50 text-amber-400 border-amber-800/40';
    } else if (level === 'LOW') {
      riskColor = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';
    }
    return (
      <span className={`inline-flex items-center font-mono rounded border ${sizeClasses} ${riskColor} ${className}`}>
        {children}
      </span>
    );
  }

  // Project / Case Status variant
  if (variant === 'status' && status) {
    const stat = status.toUpperCase();
    let statusColor = 'bg-slate-800 text-slate-300 border-slate-700';
    if (stat === 'ON_SCHEDULE' || stat === 'ACTIVE') {
      statusColor = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';
    } else if (stat === 'COMPLETED' || stat === 'RESOLVED') {
      statusColor = 'bg-cyan-950/60 text-cyan-400 border-cyan-800/40';
    } else if (stat === 'DELAYED' || stat === 'TRIAGED') {
      statusColor = 'bg-amber-950/60 text-amber-400 border-amber-800/40';
    } else if (stat === 'CRITICAL') {
      statusColor = 'bg-rose-950/80 text-rose-400 border-rose-800/60 animate-pulse';
    } else if (stat === 'PLANNING' || stat === 'IN PROGRESS') {
      statusColor = 'bg-blue-950/60 text-blue-400 border-blue-800/40';
    }
    return (
      <span className={`inline-flex items-center font-mono rounded border ${sizeClasses} ${statusColor} ${className}`}>
        {children}
      </span>
    );
  }

  if (variant === 'entity' && entityType) {
    return (
      <span className={`inline-flex items-center font-mono font-medium rounded border ${sizeClasses} bg-cyan-950/60 text-cyan-400 border-cyan-800/40 ${className}`}>
        {children}
      </span>
    );
  }

  if (variant === 'accent') {
    return (
      <span className={`inline-flex items-center font-mono rounded border bg-orange-950/40 text-orange-400 border-orange-500/30 ${sizeClasses} ${className}`}>
        {children}
      </span>
    );
  }

  if (variant === 'confidence') {
    return (
      <span className={`inline-flex items-center font-mono rounded border bg-emerald-950/40 text-emerald-400 border-emerald-500/30 ${sizeClasses} ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-mono rounded border bg-slate-800/80 text-slate-300 border-slate-700/60 ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
};
