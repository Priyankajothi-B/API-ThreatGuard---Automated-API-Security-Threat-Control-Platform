import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Eye, Search, Pause, Play, Download } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import DecisionBadge from '../components/DecisionBadge';
import EventInspectorModal from '../components/EventInspectorModal';
import { getSecurityEvents } from '../services/api';

export default function LiveEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [filterDecision, setFilterDecision] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = async () => {
    if (isPaused) return;
    try {
      const res = await getSecurityEvents({ decision: filterDecision || undefined, limit: 100 });
      if (res.data.success) setEvents(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [filterDecision, isPaused]);

  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `security_events_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredEvents = events.filter(e => 
    e.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.ipAddress.includes(searchTerm) ||
    e.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.threatTypes && e.threatTypes.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Security Events Stream
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time inspection telemetry logged by API Security Gateway</p>
        </div>

        {/* Filter & Action Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter endpoint, IP, request ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-60 font-mono"
            />
          </div>

          <select
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Decisions</option>
            <option value="ALLOW">ALLOW</option>
            <option value="MONITOR">MONITOR</option>
            <option value="RATE_LIMIT">RATE_LIMIT</option>
            <option value="BLOCK">BLOCK</option>
          </select>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition ${isPaused ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-900 text-slate-300 border-slate-800'}`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'RESUME STREAM' : 'PAUSE'}</span>
          </button>

          <button
            onClick={exportToJson}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-white text-slate-300 text-xs font-mono font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT</span>
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Request ID</th>
                <th className="p-3">Method & Path</th>
                <th className="p-3">Source IP</th>
                <th className="p-3">Detected Threat</th>
                <th className="p-3">Risk & Confidence</th>
                <th className="p-3">Decision</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => (
                  <tr key={evt._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3 font-semibold text-slate-300">{evt.requestId}</td>
                    <td className="p-3">
                      <span className="text-cyan-400 font-bold mr-2">{evt.method}</span>
                      <span className="text-slate-200">{evt.endpoint}</span>
                    </td>
                    <td className="p-3 text-slate-400">{evt.ipAddress}</td>
                    <td className="p-3">
                      {evt.threatTypes && evt.threatTypes.length > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold">
                          {evt.threatTypes.join(', ')}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">CLEAN_REQUEST</span>
                      )}
                    </td>
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
                  <td colSpan="8" className="p-6 text-center text-slate-500">
                    No matching security events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEvent && (
        <EventInspectorModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRefresh={fetchEvents}
        />
      )}
    </div>
  );
}
