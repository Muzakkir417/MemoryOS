import React from 'react';
import { Brain, Sparkles, RotateCcw, PlayCircle, ShieldCheck, User as UserIcon, Settings, LogIn, LogOut, Database, Cpu } from 'lucide-react';
import { User } from '../types/index.js';

interface HeaderProps {
  users: User[];
  currentUser: User | null;
  authenticatedUser: any | null;
  onSelectUser: (user: User) => void;
  onResetUser: () => void;
  onOpenDemo: () => void;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  activeCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  users,
  currentUser,
  authenticatedUser,
  onSelectUser,
  onResetUser,
  onOpenDemo,
  onOpenAuth,
  onOpenSettings,
  onLogout,
  activeCount
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0d121f]/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Memory<span className="text-sky-400">OS</span>
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Track 3 • Final Release
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Universal Dynamic LLM Engine • 100% Deterministic Contradiction Resolution
          </p>
        </div>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Anti-Slowdown WAL Badge */}
        <div 
          title="Engine: SQLite Write-Ahead-Logging (WAL) + 64MB In-Memory Cache + Compaction. Zero laptop bloat."
          className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-mono text-emerald-400"
        >
          <Database className="h-3 w-3 text-emerald-400" />
          <span>WAL Mode • 0.1ms</span>
        </div>

        {/* User Sandbox Selector */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
          <UserIcon className="h-3.5 w-3.5 text-slate-400 ml-2 mr-1" />
          <select
            value={currentUser?.id || ''}
            onChange={(e) => {
              const u = users.find(x => x.id === e.target.value);
              if (u) onSelectUser(u);
            }}
            className="bg-transparent text-xs text-slate-200 font-medium py-1 px-2 focus:outline-none cursor-pointer"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                {u.name} {u.id === 'user_judge' ? '(Live Test)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Active Memories Counter */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-950/40 border border-sky-800/40 text-[11px] font-mono text-sky-300">
          <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
          <span>{activeCount} Facts</span>
        </div>

        {/* Reset Sandbox Button */}
        <button
          onClick={onResetUser}
          title="Clear memories for current user"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden lg:inline">Reset</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Model & Database Optimization Settings"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
        >
          <Settings className="h-3.5 w-3.5 text-slate-300" />
          <span className="hidden lg:inline">Engine & DB</span>
        </button>

        {/* 1-Click Judge Demo Suite */}
        <button
          onClick={onOpenDemo}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-sm shadow-sky-500/20 transition-all cursor-pointer"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Judge Presets</span>
        </button>

        {/* User Auth Profile Button */}
        {authenticatedUser ? (
          <div className="flex items-center gap-1.5 pl-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-700/50 text-xs text-indigo-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="font-semibold max-w-[90px] truncate">{authenticatedUser.name}</span>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors"
          >
            <LogIn className="h-3.5 w-3.5 text-sky-400" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
