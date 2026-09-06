import React, { useState, useEffect } from 'react';
import { Layers, ShieldAlert, GitCommit, Clock, RefreshCw, AlertTriangle, ChevronRight } from 'lucide-react';
import { getAttackCampaigns, getAttackChains } from '../services/api';
import socket from '../services/socket';

export default function AttackCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campRes, chainRes] = await Promise.all([
        getAttackCampaigns(),
        getAttackChains()
      ]);

      if (campRes.data.success) setCampaigns(campRes.data.data);
      if (chainRes.data.success) setChains(chainRes.data.data);
    } catch (err) {
      console.error('Failed to fetch campaign data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    socket.on('attack-campaign', (campaign) => {
      fetchData();
    });

    return () => {
      socket.off('attack-campaign');
    };
  }, []);

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <Layers className="w-7 h-7 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Threat Correlation & Attack Campaigns</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Correlate isolated security anomalies into multi-stage attack chains and multi-hour campaign narratives.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{campaigns.length}</div>
            <div className="text-xs text-slate-400 font-medium">Active Attack Campaigns</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <GitCommit className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{chains.length}</div>
            <div className="text-xs text-slate-400 font-medium">Correlated Attack Chains</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {campaigns.filter(c => c.severity === 'CRITICAL' || c.severity === 'HIGH').length}
            </div>
            <div className="text-xs text-slate-400 font-medium">Critical/High Severity Campaigns</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">30m / 2h</div>
            <div className="text-xs text-slate-400 font-medium">Correlation & Campaign Windows</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Campaigns & Attack Chains Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Campaigns List */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden space-y-3 p-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono px-2 py-1 border-b border-slate-800 flex items-center justify-between">
            <span>Active Campaigns ({campaigns.length})</span>
            <span className="text-[11px] text-cyan-400 normal-case font-normal">Real-Time Correlated</span>
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading active campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No active attack campaigns detected yet. Launch attack simulations to assemble campaign timelines.
            </div>
          ) : (
            campaigns.map((cmp, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedCampaign(cmp)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  selectedCampaign?.campaignId === cmp.campaignId
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">{cmp.campaignId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityStyle(cmp.severity)}`}>
                      {cmp.severity}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Peak Risk: <strong className="text-rose-400">{cmp.highestRiskScore}/100</strong>
                  </span>
                </div>

                <div className="mt-2 text-sm font-semibold text-white">
                  {cmp.campaignType}
                </div>

                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Source IP: <strong className="text-slate-200 font-mono">{cmp.source}</strong></span>
                  <span>Events: <strong className="text-indigo-400 font-mono">{cmp.eventCount}</strong></span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {cmp.attackTypes.map((t, i) => (
                    <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Correlated Attack Chains */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono px-2 py-1 border-b border-slate-800 flex items-center justify-between">
            <span>Correlated Attack Chains ({chains.length})</span>
            <span className="text-[11px] text-indigo-400 normal-case font-normal">30-min Window</span>
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading attack chains...</div>
          ) : chains.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No correlated attack chains currently active.
            </div>
          ) : (
            chains.map((chain, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono text-xs font-bold text-white">{chain.chainId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityStyle(chain.severity)}`}>
                      {chain.severity}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Bonus: <strong className="text-indigo-300">+{chain.correlationBonus} risk</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                  {chain.explanation}
                </p>

                {/* Event sequence timeline */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Attack Sequence:</div>
                  {chain.events.map((evt, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-950/40 p-2 rounded border border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-[10px]">#{i + 1}</span>
                        <span className="font-mono text-cyan-400 font-medium">{evt.method} {evt.endpoint}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-[11px] font-mono">{evt.threatTypes.join(', ')}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${evt.decision === 'BLOCK' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {evt.decision}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
