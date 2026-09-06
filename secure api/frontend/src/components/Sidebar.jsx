import React from 'react';
import { LayoutDashboard, Zap, Activity, AlertTriangle, Layers, Sliders, ClipboardList, TrendingUp, GitMerge } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'overview', label: 'SOC Overview', icon: LayoutDashboard },
    { id: 'simulator', label: 'Attack Simulator', icon: Zap, highlight: true },
    { id: 'events', label: 'Live Events Stream', icon: Activity },
    { id: 'behavior', label: 'Behavior Analytics', icon: TrendingUp },
    { id: 'campaigns', label: 'Attack Campaigns', icon: GitMerge },
    { id: 'incidents', label: 'Active Incidents', icon: AlertTriangle },
    { id: 'endpoints', label: 'Endpoints Inventory', icon: Layers },
    { id: 'policies', label: 'Security Policies', icon: Sliders },
    { id: 'audit', label: 'Audit Trail', icon: ClipboardList }
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0D121F] p-4 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
          Security Controls
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            let btnStyle = 'text-slate-400 hover:text-white hover:bg-slate-800/60';
            if (isActive) {
              btnStyle = item.highlight 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950 font-semibold'
                : 'bg-slate-800 text-white font-semibold border-l-4 border-cyan-400';
            } else if (item.highlight) {
              btnStyle = 'text-cyan-400 hover:bg-cyan-950/40 border border-cyan-900/50 font-medium';
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${btnStyle}`}
              >
                <Icon className={`w-4 h-4 ${isActive && item.highlight ? 'text-cyan-400 animate-pulse' : ''}`} />
                <span>{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto text-[10px] bg-cyan-950 text-cyan-400 font-mono px-1.5 py-0.5 rounded border border-cyan-800">
                    DEMO
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 rounded-xl glass-panel border border-slate-800 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span>Inspection Latency</span>
          <span className="text-emerald-400 font-mono font-bold">~2.4 ms</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Engine Status</span>
          <span className="text-cyan-400 font-mono font-bold">INTERCEPTING</span>
        </div>
      </div>
    </aside>
  );
}
