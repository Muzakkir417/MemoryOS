import React, { useState } from 'react';
import { Database, History, Eye, ShieldAlert, CheckCircle, Tag, Layers, Trash2, Cpu } from 'lucide-react';
import { Memory, MemoryHistory } from '../types/index.js';
import { TimelineDiff } from './TimelineDiff.js';

interface MemoryInspectorProps {
  activeMemories: Memory[];
  supersededMemories: Memory[];
  history: MemoryHistory[];
  onForgetMemory: (id: string) => void;
}

export const MemoryInspector: React.FC<MemoryInspectorProps> = ({
  activeMemories,
  supersededMemories,
  history,
  onForgetMemory
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'superseded' | 'history' | 'debugger'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inspectingMemory, setInspectingMemory] = useState<Memory | null>(null);

  const filteredActive = activeMemories.filter(m => 
    selectedCategory === 'all' ? true : m.category === selectedCategory
  );

  return (
    <div className="flex flex-col h-full bg-[#0d121f] text-slate-200">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Memory Inspector
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          SQLite Vector Store • Persistent
        </span>
      </div>

      {/* Slide 5 Memory Lifecycle Matrix Bar */}
      <div className="px-4 py-2 bg-black/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono scrollbar-none">
        <span className="text-slate-500 uppercase font-bold tracking-wider mr-1">Lifecycle:</span>
        <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">CREATE</span>
        <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">SUPERSEDE</span>
        <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">SCOPE REFINEMENT</span>
        <span className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40">REINFORCE</span>
        <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40">FORGET</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 px-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'border-sky-400 text-sky-400 bg-sky-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Active ({activeMemories.length})
        </button>

        <button
          onClick={() => setActiveTab('superseded')}
          className={`px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'superseded'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Superseded ({supersededMemories.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-indigo-400 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Diff Timeline ({history.length})
        </button>

        <button
          onClick={() => setActiveTab('debugger')}
          className={`px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'debugger'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          Vector RAG
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: ACTIVE MEMORIES */}
        {activeTab === 'active' && (
          <div className="space-y-3">
            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {['all', 'preference', 'goal', 'project', 'temporary'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono capitalize transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredActive.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No active memories in this category. Start chatting to register facts!
              </div>
            ) : (
              filteredActive.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition-all space-y-2.5 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-semibold">
                        {mem.category}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        v{mem.version}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-400">
                        {(mem.confidence * 100).toFixed(0)}% Conf
                      </span>
                      <button
                        onClick={() => onForgetMemory(mem.id)}
                        title="Forget this memory"
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Fact Representation */}
                  <div className="font-mono text-xs">
                    <div className="text-slate-400 text-[11px]">{mem.predicate}</div>
                    <div className="text-white text-sm font-semibold mt-0.5">{mem.object}</div>
                  </div>

                  {/* Context Scope */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Tag className="h-3 w-3 text-slate-500" />
                      Scope: <span className="text-slate-300">{mem.contextScope}</span>
                    </span>
                    <button
                      onClick={() => setInspectingMemory(mem)}
                      className="text-[10px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      Inspect Vector
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: SUPERSEDED MEMORIES */}
        {activeTab === 'superseded' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed bg-amber-950/20 border border-amber-800/30 p-2.5 rounded-lg">
              <strong>Audit Safety:</strong> Superseded memories are preserved for historical provenance and reasoning audit, but strictly excluded from active RAG context.
            </p>

            {supersededMemories.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No superseded memories yet. Switch a preference in chat to see old facts archived here!
              </div>
            ) : (
              supersededMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3.5 rounded-xl bg-slate-900/40 border border-amber-900/30 space-y-2 opacity-80"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 font-semibold">
                      SUPERSEDED (v{mem.version})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Replaced by #{mem.supersededById?.slice(0, 8)}
                    </span>
                  </div>

                  <div className="font-mono text-xs">
                    <div className="text-slate-400">{mem.predicate}</div>
                    <div className="text-rose-400 line-through font-semibold text-sm mt-0.5">
                      {mem.object}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/40">
                    Scope: {mem.contextScope} • Archived: {new Date(mem.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: DIFF TIMELINE */}
        {activeTab === 'history' && <TimelineDiff history={history} />}

        {/* TAB 4: VECTOR RAG DEBUGGER */}
        {activeTab === 'debugger' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-2">
              <div className="text-sky-400 font-semibold flex items-center gap-1.5">
                <Cpu className="h-4 w-4" />
                <span>Vector Index & Cosine Math</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Memories are projected into normalized 128-dimensional dense vectors stored in SQLite. On query, cosine similarity is computed against active memories only:
              </p>
              <div className="p-2 rounded bg-black/50 text-[10px] text-slate-300">
                cos_sim(u, v) = (u · v) / (||u|| × ||v||)
              </div>
            </div>

            {inspectingMemory ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-sky-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>Inspecting: Memory #{inspectingMemory.id.slice(0, 8)}</span>
                  <button
                    onClick={() => setInspectingMemory(null)}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="text-[11px] font-mono text-slate-300">
                  Predicate: {inspectingMemory.predicate} = {inspectingMemory.object}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Vector Dimensions: {inspectingMemory.embedding?.length || 0}
                </div>
                <div className="max-h-32 overflow-y-auto p-2 rounded bg-black/60 font-mono text-[9px] text-emerald-400 break-all">
                  [{inspectingMemory.embedding?.slice(0, 32).join(', ')}, ...]
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs font-mono">
                Click "Inspect Vector" on any memory card to view its embedding representation.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
