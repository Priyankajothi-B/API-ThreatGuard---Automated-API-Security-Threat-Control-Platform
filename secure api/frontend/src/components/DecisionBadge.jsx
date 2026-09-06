import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Ban } from 'lucide-react';

export default function DecisionBadge({ decision }) {
  switch (decision) {
    case 'ALLOW':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          ALLOW
        </span>
      );
    case 'MONITOR':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          MONITOR
        </span>
      );
    case 'RATE_LIMIT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <ShieldAlert className="w-3.5 h-3.5" />
          RATE_LIMIT (429)
        </span>
      );
    case 'BLOCK':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-sm shadow-rose-950">
          <Ban className="w-3.5 h-3.5" />
          BLOCK (403)
        </span>
      );
    default:
      return <span className="text-xs text-slate-400">{decision}</span>;
  }
}
