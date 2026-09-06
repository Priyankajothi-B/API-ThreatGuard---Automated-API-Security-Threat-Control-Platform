import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, ShieldAlert, Cpu, Activity, Database, CheckCircle2, Ban, Layers } from 'lucide-react';

export default function ArchitectureVisualizer() {
  const [activeNode, setActiveNode] = useState('gateway');

  const nodes = [
    {
      id: 'client',
      title: '1. API Client / Attacker',
      subtitle: 'HTTP Requests (GET/POST)',
      icon: Activity,
      color: 'border-slate-700 bg-slate-900/80 text-slate-200',
      details: {
        title: 'API Client Layer',
        description: 'Sends raw HTTP REST API requests containing query params, authorization headers, route params, and JSON payloads.'
      }
    },
    {
      id: 'gateway',
      title: '2. Gateway Middleware',
      subtitle: 'Inline Interception',
      icon: Layers,
      color: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300 shadow-lg shadow-cyan-950',
      details: {
        title: 'Security Gateway Middleware Pipeline',
        description: 'Positioned inline before protected routes. Attaches X-Security-Gateway headers, starts high-precision timing timer, and routes payload through detection modules.'
      }
    },
    {
      id: 'detectors',
      title: '3. Detection Modules',
      subtitle: 'Auth, SQLi, XSS, BOLA, Rate, Enum',
      icon: Cpu,
      color: 'border-purple-500/50 bg-purple-950/40 text-purple-300',
      details: {
        title: 'Multi-Signal Security Detectors',
        description: 'Parallel analysis: JWT Auth (missing/invalid), BOLA authorization check, Multi-Signal SQLi (keywords, tautologies), XSS script vectors, Progressive Rate Abuse, and Behavioral Enumeration.'
      }
    },
    {
      id: 'risk',
      title: '4. Risk Engine',
      subtitle: 'Score (0-100) & Confidence %',
      icon: ShieldAlert,
      color: 'border-amber-500/50 bg-amber-950/40 text-amber-300',
      details: {
        title: 'Transparent Risk & Confidence Engine',
        description: 'Aggregates threat indicators, computes 0-100 capped Risk Score, calculates Confidence percentage, and outputs structured "Why Allowed" / "Why Blocked" explanations.'
      }
    },
    {
      id: 'decision',
      title: '5. Decision Engine',
      subtitle: 'ALLOW / RATE LIMIT / BLOCK',
      icon: ShieldCheck,
      color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300',
      details: {
        title: 'Policy Decision Enforcement',
        description: 'Maps risk score & threat severity to actions: ALLOW (200 OK + Demo API payload), RATE LIMIT (429 + Retry-After), or BLOCK (403 Forbidden).'
      }
    },
    {
      id: 'telemetry',
      title: '6. Telemetry & SOC Stream',
      subtitle: 'MongoDB & Socket.IO',
      icon: Database,
      color: 'border-blue-500/50 bg-blue-950/40 text-blue-300',
      details: {
        title: 'Telemetry & Real-Time Broadcast',
        description: 'Logs full security telemetry to MongoDB document store and broadcasts real-time Socket.IO events to the SOC Dashboard.'
      }
    }
  ];

  const selectedNodeInfo = nodes.find(n => n.id === activeNode) || nodes[1];

  return (
    <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Interactive Security Gateway Architecture Pipeline
          </h2>
          <p className="text-xs text-slate-400">Click any pipeline node to inspect real-time component responsibilities</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-cyan-950 text-cyan-400 font-mono font-semibold border border-cyan-800">
          INLINE DEFENSE
        </span>
      </div>

      {/* Node Pipeline Flow Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {nodes.map((node) => {
          const Icon = node.icon;
          const isSelected = activeNode === node.id;

          return (
            <button
              key={node.id}
              onClick={() => setActiveNode(node.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-150 relative flex flex-col justify-between h-28 ${node.color} ${isSelected ? 'ring-2 ring-cyan-400 scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4" />
                {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
              </div>
              <div>
                <div className="text-xs font-bold font-mono truncate">{node.title}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{node.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Node Details Box */}
      <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            {selectedNodeInfo.details.title}
          </span>
          <span className="text-[11px] font-mono text-slate-400">Pipeline Stage: {selectedNodeInfo.id.toUpperCase()}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {selectedNodeInfo.details.description}
        </p>
      </div>
    </div>
  );
}
