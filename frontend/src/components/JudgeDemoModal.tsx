import React, { useState } from 'react';
import { X, Play, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../services/api.js';

interface JudgeDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteScenario: () => void;
  currentUserId: string;
}

export const JudgeDemoModal: React.FC<JudgeDemoModalProps> = ({
  isOpen,
  onClose,
  onCompleteScenario,
  currentUserId
}) => {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRun = async (scenario: string) => {
    setRunning(true);
    setActiveScenario(scenario);
    setLogs([{ step: 'Starting', detail: 'Running automated scenario against MemoryOS backend...' }]);

    try {
      const res = await api.runScenario(scenario, currentUserId);
      if (res && res.logs) {
        setLogs(res.logs);
      }
      onCompleteScenario();
    } catch (err: any) {
      setLogs(prev => [...prev, { step: 'Error', detail: err.message || 'Scenario execution failed' }]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Play className="h-4 w-4 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Judge Demonstration Suite</h3>
              <p className="text-xs text-slate-400">1-click repeatable test scenarios aligned with Track 3 rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Preset Scenario Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Scenario 1 */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition-all space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-bold uppercase">
                    Rule #2 Contradiction
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mt-1.5">Day 1 ➔ Day 3 Language Switch</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Tests: Day 1 (Java) ➔ Day 3 switch to C++. Verifies Java is superseded and C++ is retrieved to answer.
                </p>
              </div>
              <button
                onClick={() => handleRun('contradiction_day1_day3')}
                disabled={running}
                className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {running && activeScenario === 'contradiction_day1_day3' ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                Run Contradiction Test
              </button>
            </div>

            {/* Scenario 2 */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition-all space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 font-bold uppercase">
                    Depth & Scoping
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mt-1.5">Contextual Scoping (No Conflict)</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Tests: "C++ for DSA" + "Python for ML". Proves both coexist because context scopes differ.
                </p>
              </div>
              <button
                onClick={() => handleRun('contextual_scope')}
                disabled={running}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {running && activeScenario === 'contextual_scope' ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                Run Scoping Test
              </button>
            </div>
          </div>

          {/* Live Execution Logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Execution Evidence & Verification Log:
              </h4>
              <div className="p-4 rounded-xl bg-black/60 border border-slate-800 max-h-60 overflow-y-auto font-mono text-xs space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className="pb-2 border-b border-slate-900 last:border-0 last:pb-0">
                    <span className="text-sky-400 font-bold">[{log.step}]: </span>
                    {log.detail && <span className="text-slate-300">{log.detail}</span>}
                    {log.fact && <span className="text-emerald-300 ml-1 font-semibold">{log.fact}</span>}
                    {log.reason && <p className="text-slate-400 text-[11px] mt-0.5">Reason: {log.reason}</p>}
                    {log.answer && (
                      <div className="mt-1 p-2 rounded bg-slate-900 border border-slate-800 text-slate-200">
                        <span className="text-indigo-300 font-semibold">Assistant Answer: </span>
                        {log.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Rule Compliance: Persistent • Contradiction-Aware • Provenance-Grounded
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Close & Inspect UI
          </button>
        </div>
      </div>
    </div>
  );
};
