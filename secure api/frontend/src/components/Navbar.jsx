import React from 'react';
import { ShieldCheck, Activity, Radio, AlertOctagon, Zap } from 'lucide-react';
import PostureGauge from './PostureGauge';

export default function Navbar({ posture, isSocketConnected }) {
  const score = posture?.securityScore || 100;

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-0.5 shadow-lg shadow-cyan-950/60">
          <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-wide text-white font-mono">AEGIS<span className="text-cyan-400">GUARD</span></h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-semibold tracking-wider">
              SECURITY GATEWAY v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Intelligent API Threat Control System</p>
        </div>
      </div>

      {/* Center Posture Gauge & Metrics */}
      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-4 px-4 py-1 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="scale-75 -my-3 -mx-2">
            <PostureGauge score={score} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">API Posture Baseline</div>
            <div className="text-xs font-bold font-mono text-slate-200">
              {score >= 80 ? '🔒 OPTIMAL DEFENSE ACTIVE' : score >= 60 ? '⚠️ ELEVATED THREAT LEVEL' : '🚨 CRITICAL ATTACK DETECTED'}
            </div>
          </div>
        </div>

        {posture?.activeIncidents > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-semibold animate-pulse shadow-md shadow-rose-950">
            <AlertOctagon className="w-4 h-4" />
            <span>{posture.activeIncidents} Active Incidents</span>
          </div>
        )}
      </div>

      {/* Right Telemetry Connection Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950 text-xs shadow-inner">
          <Radio className={`w-3.5 h-3.5 ${isSocketConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <span className="font-mono text-slate-300 font-semibold text-[11px]">
            {isSocketConnected ? 'SOC STREAM LIVE' : 'RECONNECTING'}
          </span>
        </div>
      </div>
    </header>
  );
}
