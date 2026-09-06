import React, { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw, UserCheck } from 'lucide-react';
import { getAuditLogs } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await getAuditLogs();
      if (res.data.success) setLogs(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            Security Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">Immutable audit log of manual decision overrides, policy modifications, and whitelist updates</p>
        </div>
        <button onClick={fetchLogs} className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Engineer / Actor</th>
                <th className="p-3">Target ID</th>
                <th className="p-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold text-cyan-400">{log.action}</td>
                    <td className="p-3 text-slate-300">{log.performedBy}</td>
                    <td className="p-3 text-amber-400">{log.targetId || 'N/A'}</td>
                    <td className="p-3 text-slate-300 text-[11px]">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500">
                    No manual override or audit events logged yet.
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
