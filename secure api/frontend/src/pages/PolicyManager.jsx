import React, { useState, useEffect } from 'react';
import { Sliders, Save, ShieldCheck, Check } from 'lucide-react';
import { getSecurityPolicy, updateSecurityPolicy } from '../services/api';

export default function PolicyManager() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    getSecurityPolicy().then(res => {
      if (res.data.success) setPolicy(res.data.data);
      setLoading(false);
    });
  }, []);

  const handleToggleModule = (modKey) => {
    setPolicy(prev => ({
      ...prev,
      modulesEnabled: {
        ...prev.modulesEnabled,
        [modKey]: !prev.modulesEnabled[modKey]
      }
    }));
  };

  const handleSavePolicy = async () => {
    try {
      const res = await updateSecurityPolicy(policy);
      if (res.data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert('Policy update failed: ' + err.message);
    }
  };

  if (loading || !policy) return <div className="p-8 text-center text-slate-500 font-mono">Loading security policy...</div>;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Security Policy & Rule Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-1">Configure rate limits, risk score thresholds, and security detector modules in real-time without restarting server</p>
        </div>

        <button
          onClick={handleSavePolicy}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs font-mono shadow-lg shadow-cyan-950 flex items-center gap-2 transition"
        >
          {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'POLICY SAVED!' : 'SAVE SECURITY POLICY'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module Toggles */}
        <div className="p-6 rounded-2xl glass-panel space-y-4">
          <h2 className="text-base font-bold text-white font-mono border-b border-slate-800 pb-3">
            Active Detector Modules
          </h2>
          <div className="space-y-3 font-mono text-xs">
            {Object.keys(policy.modulesEnabled || {}).map((modKey) => (
              <div key={modKey} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-200 uppercase font-semibold">{modKey} Module</span>
                <button
                  onClick={() => handleToggleModule(modKey)}
                  className={`px-3 py-1 rounded-full font-bold text-[11px] transition ${policy.modulesEnabled[modKey] ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                >
                  {policy.modulesEnabled[modKey] ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Rate Limits & Threshold Controls */}
        <div className="p-6 rounded-2xl glass-panel space-y-4">
          <h2 className="text-base font-bold text-white font-mono border-b border-slate-800 pb-3">
            Progressive Threshold Controls
          </h2>
          
          <div className="space-y-4 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-slate-400">Max Safe Requests / Minute: <span className="text-cyan-400 font-bold">{policy.rateLimitMaxRequests}</span></label>
              <input
                type="range" min="10" max="200" step="5"
                value={policy.rateLimitMaxRequests}
                onChange={(e) => setPolicy({ ...policy, rateLimitMaxRequests: parseInt(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Behavioral Enumeration Max Unique IDs: <span className="text-purple-400 font-bold">{policy.enumerationMaxUniqueIds}</span></label>
              <input
                type="range" min="2" max="20" step="1"
                value={policy.enumerationMaxUniqueIds}
                onChange={(e) => setPolicy({ ...policy, enumerationMaxUniqueIds: parseInt(e.target.value) })}
                className="w-full accent-purple-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Temporary IP Block Duration (Minutes): <span className="text-rose-400 font-bold">{(policy.tempBlockDurationMs || 900000) / 60000}</span></label>
              <input
                type="range" min="1" max="60" step="1"
                value={(policy.tempBlockDurationMs || 900000) / 60000}
                onChange={(e) => setPolicy({ ...policy, tempBlockDurationMs: parseInt(e.target.value) * 60000 })}
                className="w-full accent-rose-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
