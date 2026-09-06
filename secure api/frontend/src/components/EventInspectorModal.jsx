import React, { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, CheckCircle2, Ban, Terminal, UserCheck, Clock, Globe } from 'lucide-react';
import RiskBadge from './RiskBadge';
import DecisionBadge from './DecisionBadge';
import { overrideDecision } from '../services/api';

export default function EventInspectorModal({ event, onClose, onRefresh }) {
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  const handleOverride = async (newDecision) => {
    setLoading(true);
    try {
      await overrideDecision({
        eventId: event._id,
        newDecision,
        reason: overrideReason || 'Manual verification by Security Operations Center Engineer'
      });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      alert('Override failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-[#0D121F] border-l border-slate-800 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">{event.requestId}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-cyan-400 font-semibold">
                  {event.method}
                </span>
              </div>
              <h2 className="text-lg font-bold font-mono text-white mt-0.5">{event.endpoint}</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Summary Badges & Telemetry Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl glass-panel space-y-2">
              <span className="text-xs text-slate-400 uppercase font-mono font-semibold">Gateway Decision</span>
              <div>
                <DecisionBadge decision={event.decision} />
              </div>
            </div>
            <div className="p-4 rounded-xl glass-panel space-y-2">
              <span className="text-xs text-slate-400 uppercase font-mono font-semibold">Risk & Confidence</span>
              <div>
                <RiskBadge score={event.riskScore} confidence={event.confidence} />
              </div>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Transparent Decision Explanation</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {event.explanation || event.reason}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-mono"><Globe className="w-3.5 h-3.5" /> Source IP</span>
              <span className="font-mono text-slate-200 font-bold">{event.ipAddress}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-mono"><UserCheck className="w-3.5 h-3.5" /> User Subject</span>
              <span className="font-mono text-slate-200 font-bold">{event.userId}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-mono"><Clock className="w-3.5 h-3.5" /> Inspection Time</span>
              <span className="font-mono text-slate-200 font-bold">{event.latencyMs?.toFixed(2)} ms</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-mono">Timestamp</span>
              <span className="font-mono text-slate-200 font-bold">{new Date(event.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Risk Breakdown Table */}
          {event.riskBreakdown && event.riskBreakdown.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase font-mono tracking-wider">Triggered Security Detectors</h3>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-mono">
                    <tr>
                      <th className="p-3">Detector</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Detection Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {event.riskBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-3 text-cyan-400 font-semibold">{item.detector}</td>
                        <td className="p-3 text-rose-400 font-bold">+{item.score}</td>
                        <td className="p-3 text-slate-300 font-sans">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gateway Headers Payload */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase font-mono tracking-wider">Intercepted Response Headers</h3>
            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-cyan-300 space-y-1 overflow-x-auto">
              <div>X-Security-Gateway: Active</div>
              <div>X-Security-Request-ID: {event.requestId}</div>
              <div>X-Security-Risk-Score: {event.riskScore}</div>
              <div>X-Security-Confidence: {event.confidence}%</div>
              <div>X-Security-Decision: {event.decision}</div>
              <div>X-Gateway-Latency-ms: {event.latencyMs?.toFixed(2)}ms</div>
            </div>
          </div>

          {/* Override Details if previously overridden */}
          {event.overrideStatus?.isOverridden && (
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-1">
              <span className="text-xs font-bold text-amber-400 font-mono uppercase">Previously Overridden by Engineer</span>
              <p className="text-xs text-slate-300">
                Original: <span className="font-mono text-rose-400">{event.overrideStatus.originalDecision}</span> → New: <span className="font-mono text-emerald-400">{event.overrideStatus.newDecision}</span>
              </p>
              <p className="text-xs text-slate-400">Reason: {event.overrideStatus.overrideReason}</p>
            </div>
          )}

          {/* Engineer Manual Override Action Panel */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Human-in-the-Loop Override Controls</span>
            </h3>
            
            <input
              type="text"
              placeholder="Enter override rationale for security audit log..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center gap-3">
              <button
                disabled={loading || event.decision === 'ALLOW'}
                onClick={() => handleOverride('ALLOW')}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Override to ALLOW
              </button>

              <button
                disabled={loading || event.decision === 'BLOCK'}
                onClick={() => handleOverride('BLOCK')}
                className="flex-1 py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                Override to BLOCK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
