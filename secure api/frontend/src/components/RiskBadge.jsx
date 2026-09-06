import React from 'react';

export default function RiskBadge({ score, confidence }) {
  let colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let label = 'LOW';

  if (score >= 80) {
    colorClass = 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse';
    label = 'CRITICAL';
  } else if (score >= 60) {
    colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    label = 'HIGH';
  } else if (score >= 30) {
    colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    label = 'MEDIUM';
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${colorClass} flex items-center gap-1.5`}>
        <span>{label}</span>
        <span className="font-mono text-[11px] font-bold">{score}/100</span>
      </span>
      {confidence !== undefined && (
        <span className="text-[11px] text-slate-400 font-mono" title="Detection Confidence Score">
          ({confidence}% conf)
        </span>
      )}
    </div>
  );
}
