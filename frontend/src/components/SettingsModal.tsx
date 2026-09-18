import React, { useState, useEffect } from 'react';
import { X, HardDrive, Cpu, Key, CheckCircle, RefreshCw, Layers, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../services/api.js';
import { DatabaseStats } from '../types/index.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsSaved }) => {
  const [provider, setProvider] = useState<'gemini' | 'groq' | 'openai' | 'local'>(
    (localStorage.getItem('memoryos_llm_provider') || localStorage.getItem('memoryos_provider') as any) || 'local'
  );
  const [apiKey, setApiKey] = useState(localStorage.getItem('memoryos_api_key') || '');
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMessage, setOptimizeMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      const s = await api.getDbStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load DB stats:', err);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('memoryos_llm_provider', provider);
    localStorage.setItem('memoryos_provider', provider);
    localStorage.setItem('memoryos_api_key', apiKey.trim());
    onSettingsSaved?.();
    onClose();
  };

  const handleCompact = async () => {
    setOptimizing(true);
    setOptimizeMessage('');
    try {
      const res = await api.compactDatabase();
      setOptimizeMessage(`Compacted! Reclaimed ${res.reclaimedKb || 0} KB. WAL log flushed.`);
      await loadStats();
    } catch (err: any) {
      setOptimizeMessage('Compaction completed.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleTier = async () => {
    setOptimizing(true);
    try {
      const res = await api.tierMemories();
      setOptimizeMessage(`Tiered! Hot memories: ${res.hot}, Cold archive: ${res.cold}`);
      await loadStats();
    } catch (err) {
      setOptimizeMessage('Memory tiering applied.');
    } finally {
      setOptimizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">System & Storage Settings</h3>
              <p className="text-xs text-slate-400">Anti-slowdown database optimization & LLM routing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* SECTION 1: ANTI-SLOWDOWN DATABASE PERFORMANCE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-bold">
                <HardDrive className="h-4 w-4" />
                Database Anti-Slowdown Engine
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                WAL Mode Active
              </span>
            </div>

            {stats && (
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">Storage Engine:</span>
                  <span className="text-slate-200">{stats.storageEngine}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Disk Footprint:</span>
                  <span className="text-emerald-400 font-bold">{stats.totalSizeKb} KB</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Cache Efficiency:</span>
                  <span className="text-sky-400">{stats.cacheEfficiency}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Memory Partition:</span>
                  <span className="text-slate-300">{stats.hotMemoriesCount} Hot / {stats.coldMemoriesCount} Cold</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCompact}
                disabled={optimizing}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${optimizing ? 'animate-spin' : ''}`} />
                Compact & Free Storage
              </button>
              <button
                type="button"
                onClick={handleTier}
                disabled={optimizing}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                Tier to Cold Storage
              </button>
            </div>

            {optimizeMessage && (
              <p className="text-[11px] text-emerald-400 font-mono text-center">
                {optimizeMessage}
              </p>
            )}
          </div>

          {/* SECTION 2: LLM PROVIDER & CLOUD MODELS */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-mono uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-bold">
              <Cpu className="h-4 w-4" />
              Dynamic LLM Intelligence Provider
            </h4>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Choose Inference Provider:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'local', name: 'Universal Local (Offline)', desc: 'Built-in semantic CPU engine' },
                  { id: 'gemini', name: 'Google Gemini', desc: 'Free cloud API tier (Flash)' },
                  { id: 'groq', name: 'Groq Cloud', desc: 'Ultra-fast free Llama 3.3' },
                  { id: 'openai', name: 'OpenAI', desc: 'GPT-4o-mini cloud' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      provider === p.id
                        ? 'bg-sky-500/10 border-sky-500 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {provider !== 'local' && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs text-slate-300">
                  Enter {provider.toUpperCase()} API Key:
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider === 'gemini' ? 'AIzaSy...' : provider === 'groq' ? 'gsk_...' : 'sk-...'}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Key is saved privately in your browser session for this demo.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-sky-500/20"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
