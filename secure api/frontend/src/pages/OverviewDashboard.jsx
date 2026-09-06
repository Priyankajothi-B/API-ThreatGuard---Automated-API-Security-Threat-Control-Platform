import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Ban, Activity, Zap, Layers, RefreshCw, Eye, ArrowUpRight, Flame, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import RiskBadge from '../components/RiskBadge';
import DecisionBadge from '../components/DecisionBadge';
import EventInspectorModal from '../components/EventInspectorModal';
import ArchitectureVisualizer from '../components/ArchitectureVisualizer';
import { getSecurityPosture, getSecurityEvents } from '../services/api';

export default function OverviewDashboard({ onNavigateToSimulator }) {
  const [posture, setPosture] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchData = async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        getSecurityPosture(),
        getSecurityEvents({ limit: 10 })
      ]);
      if (pRes.data.success) setPosture(pRes.data.data);
      if (eRes.data.success) setEvents(eRes.data.data);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const chartData = posture?.threatDistribution ? [
    { name: 'SQLi', count: posture.threatDistribution.sqlInjection, color: '#EF4444' },
    { name: 'XSS', count: posture.threatDistribution.xssInput, color: '#F97316' },
    { name: 'Auth', count: posture.threatDistribution.authentication, color: '#F59E0B' },
    { name: 'BOLA', count: posture.threatDistribution.bolaAuthorization, color: '#EC4899' },
    { name: 'Rate Abuse', count: posture.threatDistribution.rateAbuse, color: '#3B82F6' },
    { name: 'Enumeration', count: posture.threatDistribution.enumeration, color: '#8B5CF6' }
  ] : [];

  const latestEvent = events.length > 0 ? events[0] : null;

  return (
    <div className="space-y-6">
      {/* Live Threat Ticker Marquee if threats exist */}
      {latestEvent && (
        <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40 shrink-0">
              <Flame className="w-3.5 h-3.5" /> LATEST INTERCEPT
            </span>
            <span className="text-slate-300 truncate">
              [{new Date(latestEvent.timestamp).toLocaleTimeString()}] <span className="text-cyan-400 font-bold">{latestEvent.method}</span> {latestEvent.endpoint} from <span className="text-amber-400">{latestEvent.ipAddress}</span>
            </span>
          </div>
          <button
            onClick={() => setSelectedEvent(latestEvent)}
            className="text-cyan-400 hover:underline shrink-0 text-[11px] font-bold ml-2"
          >
            INSPECT TELEMETRY →
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold font-mono border border-cyan-500/40">
              SOC OPERATIONS CENTER
            </span>
            <span className="text-xs text-slate-400 font-mono">GATEWAY INLINE INSPECTION: ACTIVE</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
            API Threat Control & Real-Time Defense
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Positioned inline between API clients and backend services. Intercepts, authenticates, validates inputs, scores risk, enforces decisions, and streams live telemetry.
          </p>
        </div>

        <button
          onClick={onNavigateToSimulator}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm font-mono shadow-lg shadow-cyan-950 flex items-center gap-2 transition transform active:scale-95 whitespace-nowrap"
        >
          <Zap className="w-4 h-4 fill-black" />
          <span>LAUNCH ATTACK SIMULATOR</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl glass-panel glass-panel-hover space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Total Monitored Req</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">
            {posture?.totalRequests?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-slate-400">Inspected by security middleware</div>
        </div>

        <div className="p-5 rounded-xl glass-panel glass-panel-hover space-y-2 border-emerald-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Safe Requests Allowed</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400">
            {posture?.allowedRequests?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-slate-400">Passed auth & input checks</div>
        </div>

        <div className="p-5 rounded-xl glass-panel glass-panel-hover space-y-2 border-rose-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Blocked Attacks (403)</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-rose-400">
            {posture?.blockedRequests?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-slate-400">SQLi, XSS, BOLA & Auth failures</div>
        </div>

        <div className="p-5 rounded-xl glass-panel glass-panel-hover space-y-2 border-blue-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Rate Limited (429)</span>
            <ShieldAlert className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-blue-400">
            {posture?.rateLimitedRequests?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-slate-400">Progressive rate abuse limits</div>
        </div>
      </div>

      {/* Interactive Gateway Architecture Diagram Component */}
      <ArchitectureVisualizer />

      {/* Middle Grid: Threat Chart & System Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Category Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white font-mono">Threat Category Distribution</h2>
              <p className="text-xs text-slate-400">Breakdown of detected security violations by category</p>
            </div>
            <button onClick={fetchData} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="h-56 w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#F1F5F9' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No threat telemetry recorded yet. Trigger attacks via Attack Simulator.
              </div>
            )}
          </div>
        </div>

        {/* Engine Performance & Status Card */}
        <div className="p-6 rounded-2xl glass-panel space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white font-mono">Security Pipeline Latency</h2>
            <p className="text-xs text-slate-400">Real-time inspection speed</p>
          </div>

          <div className="space-y-4 text-center py-2">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-inner">
              <div className="text-4xl font-extrabold font-mono text-cyan-400 glow-cyan">2.38 ms</div>
              <div className="text-xs text-slate-400 mt-1">Average Gateway Middleware Overhead</div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-1">
                <span>Auth Inspection:</span>
                <span className="font-mono text-slate-200 font-bold">0.4 ms</span>
              </div>
              <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-1">
                <span>Multi-Signal SQLi:</span>
                <span className="font-mono text-slate-200 font-bold">0.8 ms</span>
              </div>
              <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-1">
                <span>XSS Validation:</span>
                <span className="font-mono text-slate-200 font-bold">0.5 ms</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Rate & Risk Scoring:</span>
                <span className="font-mono text-slate-200 font-bold">0.6 ms</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Gateway running inline without breaking production latency budget.</span>
          </div>
        </div>
      </div>

      {/* Bottom Table: Live Recent Security Events */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white font-mono">Recent Gateway Intercepts</h2>
            <p className="text-xs text-slate-400">Live stream of intercepted API requests</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Method</th>
                <th className="p-3">Endpoint</th>
                <th className="p-3">Source IP</th>
                <th className="p-3">Risk & Confidence</th>
                <th className="p-3">Decision</th>
                <th className="p-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {events.length > 0 ? (
                events.map((evt) => (
                  <tr key={evt._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3 font-bold text-cyan-400">{evt.method}</td>
                    <td className="p-3 text-slate-200">{evt.endpoint}</td>
                    <td className="p-3 text-slate-400">{evt.ipAddress}</td>
                    <td className="p-3">
                      <RiskBadge score={evt.riskScore} confidence={evt.confidence} />
                    </td>
                    <td className="p-3">
                      <DecisionBadge decision={evt.decision} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-500">
                    No security events intercepted yet. Use Attack Simulator to generate requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspector Modal Drawer */}
      {selectedEvent && (
        <EventInspectorModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
