import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, ShieldAlert, ShieldCheck, Activity, Flame } from 'lucide-react';
import { getEndpointsInventory } from '../services/api';

export default function EndpointsInventory() {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      const res = await getEndpointsInventory();
      if (res.data.success) setEndpoints(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Endpoint Security Inventory & Exposure Map
          </h1>
          <p className="text-xs text-slate-400 mt-1">Catalog of protected endpoints, request volume, threat rates, and security heatmaps</p>
        </div>
        <button onClick={fetchInventory} className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Visual Endpoint Heatmap Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {endpoints.map((ep, idx) => {
          let cardBorder = 'border-slate-800 bg-slate-900/50';
          let statusText = 'text-emerald-400';
          if (ep.riskLevel === 'CRITICAL') {
            cardBorder = 'border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/30';
            statusText = 'text-rose-400';
          } else if (ep.riskLevel === 'HIGH') {
            cardBorder = 'border-orange-500/40 bg-orange-950/20';
            statusText = 'text-orange-400';
          } else if (ep.riskLevel === 'MEDIUM') {
            cardBorder = 'border-amber-500/40 bg-amber-950/20';
            statusText = 'text-amber-400';
          }

          return (
            <div key={idx} className={`p-5 rounded-xl border space-y-3 font-mono ${cardBorder}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white truncate">{ep.endpoint}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border border-current ${statusText}`}>
                  {ep.riskLevel} RISK
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                  <span className="text-slate-500 text-[10px]">Requests</span>
                  <span className="text-slate-200 font-bold block">{ep.totalRequests}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                  <span className="text-slate-500 text-[10px]">Threat Rate</span>
                  <span className={`font-bold block ${statusText}`}>{ep.threatRate}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Blocked: <strong className="text-rose-400">{ep.blockedCount}</strong></span>
                <span>Max Risk: <strong className="text-cyan-400">{ep.maxRiskScore}/100</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Inventory Table */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Endpoint Path</th>
                <th className="p-3">Total Requests</th>
                <th className="p-3">Threat Intercepts</th>
                <th className="p-3">Blocked Requests</th>
                <th className="p-3">Threat Rate</th>
                <th className="p-3">Risk Status Heatmap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {endpoints.length > 0 ? (
                endpoints.map((ep, idx) => {
                  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  if (ep.riskLevel === 'CRITICAL') badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/50';
                  else if (ep.riskLevel === 'HIGH') badgeColor = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
                  else if (ep.riskLevel === 'MEDIUM') badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-white">{ep.endpoint}</td>
                      <td className="p-3 text-slate-300">{ep.totalRequests}</td>
                      <td className="p-3 text-amber-400 font-bold">{ep.threatCount}</td>
                      <td className="p-3 text-rose-400 font-bold">{ep.blockedCount}</td>
                      <td className="p-3 text-slate-300">{ep.threatRate}%</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${badgeColor}`}>
                          {ep.riskLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500">
                    No endpoint traffic recorded yet. Use Attack Simulator to generate API traffic.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
