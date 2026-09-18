import React from 'react';
import { ArrowRight, History, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { MemoryHistory } from '../types/index.js';

interface TimelineDiffProps {
  history: MemoryHistory[];
}

export const TimelineDiff: React.FC<TimelineDiffProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 px-4 text-slate-500 text-xs">
        <History className="h-8 w-8 mx-auto mb-2 text-slate-600" />
        No memory state transitions recorded yet. Contradictions and updates will appear here in real time.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {history.map((h) => {
        const isSuperseded = h.action === 'SUPERSEDED';
        const isCreated = h.action === 'CREATED';
        const isScope = h.action === 'SCOPE REFINEMENT';
        const isReinforced = h.action === 'REINFORCED';

        return (
          <div
            key={h.id}
            className={`p-3.5 rounded-xl border transition-all ${
              isSuperseded
                ? 'bg-amber-950/20 border-amber-800/40 shadow-sm'
                : isScope
                ? 'bg-indigo-950/20 border-indigo-800/40'
                : isCreated
                ? 'bg-emerald-950/20 border-emerald-800/40'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            {/* Header / Action Badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                  isSuperseded
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : isScope
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : isCreated
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                }`}
              >
                {isSuperseded && <AlertCircle className="h-3 w-3" />}
                {isScope && <span className="text-indigo-400 font-bold">✨</span>}
                {isCreated && <CheckCircle2 className="h-3 w-3" />}
                {h.action}
              </span>

              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(h.changedAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Value Evolution Diff */}
            {h.previousValue && h.newValue && h.previousValue !== h.newValue ? (
              <div className="my-2 p-2 rounded-lg bg-black/40 border border-slate-800 font-mono text-xs flex items-center gap-2">
                <span className="text-rose-400 line-through bg-rose-950/30 px-2 py-0.5 rounded">
                  {h.previousValue}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                <span className="text-emerald-400 font-semibold bg-emerald-950/30 px-2 py-0.5 rounded">
                  {h.newValue}
                </span>
              </div>
            ) : h.newValue ? (
              <div className="my-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 font-mono text-xs text-emerald-300">
                + Initialized: <span className="font-semibold">{h.newValue}</span>
              </div>
            ) : null}

            {/* Transition Reason */}
            <p className="text-xs text-slate-300 leading-snug">
              {h.reason}
            </p>

            {/* Memory Reference */}
            <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Target: Memory #{h.memoryId.slice(0, 8)}</span>
              {h.predicate && <span className="text-slate-400">{h.predicate}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
