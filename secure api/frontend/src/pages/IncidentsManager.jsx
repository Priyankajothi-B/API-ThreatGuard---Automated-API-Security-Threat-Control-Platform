import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, RefreshCw, Clock, Globe, User } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { getIncidents } from '../services/api';

export default function IncidentsManager() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    try {
      const res = await getIncidents();
      if (res.data.success) setIncidents(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Active Security Incidents
          </h1>
          <p className="text-xs text-slate-400 mt-1">Grouped suspicious attack patterns correlated by IP address and user behavior</p>
        </div>
        <button onClick={fetchIncidents} className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {incidents.length > 0 ? (
          incidents.map((inc) => (
            <div key={inc._id} className="p-6 rounded-2xl glass-panel border border-rose-500/30 space-y-4 shadow-lg shadow-rose-950/30">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-xs font-mono font-bold border border-rose-500/40">
                    {inc.incidentId}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">STATUS: {inc.status}</span>
                </div>
                <RiskBadge score={inc.highestRiskScore} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-slate-500 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Source IP</span>
                  <span className="text-slate-200 font-bold">{inc.ipAddress}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-slate-500 flex items-center gap-1"><User className="w-3.5 h-3.5" /> User Subject</span>
                  <span className="text-slate-200 font-bold">{inc.userId}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-xs font-mono font-semibold">Primary Threat Violation</span>
                <p className="text-sm font-bold text-rose-400 font-mono">{inc.primaryThreat}</p>
                <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>Total Correlated Events: {inc.eventCount}</span>
                  <span>Last Seen: {new Date(inc.lastSeen).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 p-12 text-center glass-panel rounded-2xl text-slate-500 text-sm">
            Zero active incidents recorded. Your API security baseline is clean.
          </div>
        )}
      </div>
    </div>
  );
}
