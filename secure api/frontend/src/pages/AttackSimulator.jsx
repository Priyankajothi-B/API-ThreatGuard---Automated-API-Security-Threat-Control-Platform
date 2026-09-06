import React, { useState } from 'react';
import { Zap, ShieldAlert, CheckCircle2, Ban, Activity, RefreshCw, Terminal, ArrowRight, Copy, Check, Code } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import DecisionBadge from '../components/DecisionBadge';
import { triggerSimulation } from '../services/api';

export default function AttackSimulator({ onRefreshDashboard }) {
  const [activeScenario, setActiveScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simOutput, setSimOutput] = useState(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [filterText, setFilterText] = useState('');

  const scenarios = [
    {
      id: 'NORMAL_REQUEST',
      name: '1. Legitimate Request',
      description: 'Public API access GET /api/products',
      expectedDecision: 'ALLOW',
      color: 'border-emerald-500/40 hover:border-emerald-500 bg-emerald-950/20',
      curlCommand: 'curl -X GET http://localhost:5000/api/products'
    },
    {
      id: 'MISSING_JWT',
      name: '2. Missing JWT Token',
      description: 'Protected endpoint access GET /api/profile without token',
      expectedDecision: 'BLOCK',
      color: 'border-amber-500/40 hover:border-amber-500 bg-amber-950/20',
      curlCommand: 'curl -X GET http://localhost:5000/api/profile'
    },
    {
      id: 'INVALID_JWT',
      name: '3. Invalid JWT Signature',
      description: 'Forged/tampered JWT signature verification',
      expectedDecision: 'BLOCK',
      color: 'border-amber-500/40 hover:border-amber-500 bg-amber-950/20',
      curlCommand: 'curl -X GET http://localhost:5000/api/profile -H "Authorization: Bearer invalid.signature.token"'
    },
    {
      id: 'BOLA_ATTACK',
      name: '4. BOLA / Authz Attack',
      description: 'User A attempting access to User B private object',
      expectedDecision: 'BLOCK',
      color: 'border-rose-500/40 hover:border-rose-500 bg-rose-950/20',
      curlCommand: 'curl -X GET http://localhost:5000/api/users/user_2 -H "Authorization: Bearer <USER_1_JWT>"'
    },
    {
      id: 'SQLI_ATTACK',
      name: '5. Multi-Signal SQLi',
      description: "Query injection payload (' OR 1=1 --) in search API",
      expectedDecision: 'BLOCK',
      color: 'border-rose-500/40 hover:border-rose-500 bg-rose-950/20',
      curlCommand: 'curl -X GET "http://localhost:5000/api/search?q=laptop\'%20OR%201=1%20--"'
    },
    {
      id: 'XSS_ATTACK',
      name: '6. XSS Payload Injection',
      description: 'Malicious <script> vector in JSON request body',
      expectedDecision: 'BLOCK',
      color: 'border-rose-500/40 hover:border-rose-500 bg-rose-950/20',
      curlCommand: 'curl -X POST http://localhost:5000/api/orders -H "Content-Type: application/json" -d \'{"product":"<script>alert(1)</script>"}\''
    },
    {
      id: 'RATE_ABUSE',
      name: '7. Progressive Rate Abuse',
      description: 'High-frequency request burst exceeding rate policy',
      expectedDecision: 'RATE_LIMIT',
      color: 'border-blue-500/40 hover:border-blue-500 bg-blue-950/20',
      curlCommand: 'for i in {1..35}; do curl -s http://localhost:5000/api/products; done'
    },
    {
      id: 'ENUMERATION',
      name: '8. Behavioral Enumeration',
      description: 'Rapid sequential object ID probing on /api/users/:id',
      expectedDecision: 'MONITOR/BLOCK',
      color: 'border-purple-500/40 hover:border-purple-500 bg-purple-950/20',
      curlCommand: 'for id in 1 2 3 4 5 6 7; do curl -s http://localhost:5000/api/users/id_$id; done'
    },
    {
      id: 'CORRELATED_ATTACK',
      name: '9. Correlated Attack Chain',
      description: 'SQLi + Rapid Enumeration + XSS multi-stage attack',
      expectedDecision: 'BLOCK + INCIDENT',
      color: 'border-red-600/60 hover:border-red-500 bg-red-950/40',
      curlCommand: 'curl -X GET "http://localhost:5000/api/search?q=\'%20UNION%20SELECT%20*"'
    }
  ];

  const handleRunSimulation = async (scenarioId) => {
    setActiveScenario(scenarioId);
    setLoading(true);
    setSimOutput(null);
    setCopiedCurl(false);

    try {
      const res = await triggerSimulation(scenarioId);
      if (res.data.success) {
        setSimOutput(res.data.simulationResult);
        if (onRefreshDashboard) onRefreshDashboard();
      }
    } catch (err) {
      setSimOutput({ error: err.response?.data || err.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedScenarioObj = scenarios.find(s => s.id === activeScenario);

  const copyCurlToClipboard = () => {
    if (selectedScenarioObj?.curlCommand) {
      navigator.clipboard.writeText(selectedScenarioObj.curlCommand);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const filteredScenarios = scenarios.filter(s => 
    s.name.toLowerCase().includes(filterText.toLowerCase()) ||
    s.description.toLowerCase().includes(filterText.toLowerCase()) ||
    s.expectedDecision.toLowerCase().includes(filterText.toLowerCase())
  );

  const gatewayMeta = simOutput?.body?.securityGateway || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400" />
            <h1 className="text-xl font-bold font-mono text-white">Live Attack & Threat Simulator</h1>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Trigger controlled attack vectors against the API Gateway to visually demonstrate real-time detection, risk scoring, decision enforcement, and telemetry updates.
          </p>
        </div>

        <input
          type="text"
          placeholder="Filter scenarios (e.g. SQLi, Auth)..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-64 font-mono"
        />
      </div>

      {/* Scenario Triggers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredScenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => handleRunSimulation(sc.id)}
            disabled={loading}
            className={`p-4 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between space-y-3 ${sc.color} ${activeScenario === sc.id ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-950' : ''}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white font-mono">{sc.name}</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700">
                  {sc.expectedDecision}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{sc.description}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-mono font-semibold text-cyan-400">
              <span>{loading && activeScenario === sc.id ? 'Executing Intercept...' : 'Run Simulation'}</span>
              <ArrowRight className={`w-4 h-4 ${loading && activeScenario === sc.id ? 'animate-spin' : ''}`} />
            </div>
          </button>
        ))}
      </div>

      {/* Real-Time Inspector Panel */}
      {simOutput && (
        <div className="p-6 rounded-2xl glass-panel border border-cyan-500/40 space-y-6 animate-fadeIn shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold font-mono text-white">Simulation Execution Results</h2>
                <p className="text-xs text-slate-400">HTTP Status Code: <span className="font-mono font-bold text-cyan-400">{simOutput.status}</span></p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {gatewayMeta.decision && <DecisionBadge decision={gatewayMeta.decision} />}
              {gatewayMeta.riskScore !== undefined && (
                <RiskBadge score={gatewayMeta.riskScore} confidence={gatewayMeta.confidence} />
              )}
            </div>
          </div>

          {/* Visual Step-by-Step Execution Pipeline Trace */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Gateway Pipeline Execution Trace</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">STEP 1: INTERCEPT</span>
                <span className="text-cyan-400 font-bold">REQ Intercepted</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">STEP 2: DETECT</span>
                <span className="text-purple-400 font-bold">{gatewayMeta.threatTypes?.length > 0 ? gatewayMeta.threatTypes.join(', ') : 'No Threats Flagged'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">STEP 3: RISK SCORE</span>
                <span className="text-amber-400 font-bold">{gatewayMeta.riskScore || 0}/100 ({gatewayMeta.confidence || 100}% conf)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">STEP 4: DECISION</span>
                <span className="text-emerald-400 font-bold">{gatewayMeta.decision || 'ALLOW'}</span>
              </div>
            </div>
          </div>

          {/* Explanation Box */}
          {gatewayMeta.explanation && (
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-1">
              <div className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                Transparent Gateway Explanation
              </div>
              <p className="text-sm text-slate-200">{gatewayMeta.explanation}</p>
            </div>
          )}

          {/* Copy-as-cURL Snippet Bar */}
          {selectedScenarioObj?.curlCommand && (
            <div className="p-3 rounded-xl bg-black border border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 overflow-hidden text-slate-300">
                <span className="text-cyan-400 font-bold">$</span>
                <span className="truncate">{selectedScenarioObj.curlCommand}</span>
              </div>
              <button
                onClick={copyCurlToClipboard}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'COPIED!' : 'COPY cURL'}</span>
              </button>
            </div>
          )}

          {/* JSON Payload Inspector Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
            {/* Headers Payload */}
            <div className="space-y-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">Intercepted Security Headers</span>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 space-y-1 overflow-x-auto h-56">
                <div>X-Security-Gateway: {simOutput.headers?.['x-security-gateway'] || 'Active'}</div>
                <div>X-Security-Request-ID: {simOutput.headers?.['x-security-request-id']}</div>
                <div>X-Security-Risk-Score: {simOutput.headers?.['x-security-risk-score']}</div>
                <div>X-Security-Confidence: {simOutput.headers?.['x-security-confidence']}</div>
                <div>X-Security-Decision: {simOutput.headers?.['x-security-decision']}</div>
                <div>X-Gateway-Latency-ms: {simOutput.headers?.['x-gateway-latency-ms']}</div>
              </div>
            </div>

            {/* Response Body JSON */}
            <div className="space-y-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">JSON Response Payload</span>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto h-56 text-[11px] leading-relaxed">
                {JSON.stringify(simOutput.body, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
