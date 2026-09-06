import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Zap, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { getAnomalousReputations } from '../services/api';
import socket from '../services/socket';

export default function BehaviorAnalytics() {
  const [reputations, setReputations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchReputations = async () => {
    setLoading(true);
    try {
      const res = await getAnomalousReputations();
      if (res.data.success) {
        setReputations(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch reputation metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReputations();

    socket.on('behavior-anomaly', (data) => {
      fetchReputations();
    });

    return () => {
      socket.off('behavior-anomaly');
    };
  }, []);

  const filtered = reputations.filter(r => 
    r.subject.toLowerCase().includes(filter.toLowerCase()) ||
    r.level.toLowerCase().includes(filter.toLowerCase())
  );

  const getBadgeStyle = (level) => {
    switch (level) {
      case 'BLOCKED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'HIGH_RISK':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'SUSPICIOUS':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'LOW_RISK':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="w-7 h-7 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Behavioral Analytics & Anomaly Detection</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Real-time request baseline monitoring, decay-weighted IP/User reputation, and explainable anomaly scoring.
          </p>
        </div>

        <button
          onClick={fetchReputations}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{reputations.length}</div>
            <div className="text-xs text-slate-400 font-medium">Tracked Anomalous Subjects</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {reputations.filter(r => r.level === 'BLOCKED' || r.level === 'HIGH_RISK').length}
            </div>
            <div className="text-xs text-slate-400 font-medium">High Risk / Blocked Subjects</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {reputations.filter(r => r.level === 'SUSPICIOUS').length}
            </div>
            <div className="text-xs text-slate-400 font-medium">Suspicious Subjects</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">10 min</div>
            <div className="text-xs text-slate-400 font-medium">Reputation Decay Half-Life</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 glass-panel p-4 rounded-xl border border-slate-800">
        <input
          type="text"
          placeholder="Filter by IP / User / Reputation Level..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Anomalous Sources Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
            Anomalous Subject Reputations ({filtered.length})
          </h2>
          <span className="text-xs text-slate-400">
            Historical events retained permanently in document store
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] font-mono border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Subject (IP / User)</th>
                <th className="px-6 py-3">Reputation Level</th>
                <th className="px-6 py-3">Decayed Score</th>
                <th className="px-6 py-3">Historical Peak</th>
                <th className="px-6 py-3">Last Threat Event</th>
                <th className="px-6 py-3">Explainable Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    Loading behavioral reputation records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    No anomalous subjects recorded yet. Run simulation scenarios to generate behavioral telemetry.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-white">
                      {item.subject}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(item.level)}`}>
                        {item.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                          <div
                            className={`h-full ${item.decayedScore >= 80 ? 'bg-rose-500' : item.decayedScore >= 40 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(100, item.decayedScore)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-white">{item.decayedScore}/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {item.score}/100
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {item.lastThreatAt ? new Date(item.lastThreatAt).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 max-w-xs truncate">
                      {item.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
