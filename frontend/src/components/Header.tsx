import React from 'react';
import { Brain, Sparkles, RotateCcw, PlayCircle, ShieldCheck, User as UserIcon } from 'lucide-react';
import { User } from '../types/index.js';

interface HeaderProps {
  users: User[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onResetUser: () => void;
  onOpenDemo: () => void;
  activeCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  users,
  currentUser,
  onSelectUser,
  onResetUser,
  onOpenDemo,
  activeCount
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0d121f]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 flex items-center justify-between">
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
              Track 3 • Epochesque 2.0
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Long-term memory engine with deterministic contradiction resolution
          </p>
        </div>
      </div>

      {/* Center / User Switcher & Controls */}
      <div className="flex items-center gap-3">
        {/* User Profile Selector (Multi-Tenant Isolation) */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1">
          <UserIcon className="h-4 w-4 text-slate-400 ml-2 mr-1" />
          <select
            value={currentUser?.id || ''}
            onChange={(e) => {
              const u = users.find(x => x.id === e.target.value);
              if (u) onSelectUser(u);
            }}
            className="bg-transparent text-sm text-slate-200 font-medium py-1 px-2 focus:outline-none cursor-pointer"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                {u.name} {u.id === 'user_judge' ? '(Live Test)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Active Memories Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-800/40 text-xs font-mono text-sky-300">
          <ShieldCheck className="h-4 w-4 text-sky-400" />
          <span>{activeCount} Active Facts</span>
        </div>

        {/* Reset Sandbox Button */}
        <button
          onClick={onResetUser}
          title="Clear memories for this user to start fresh"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reset Sandbox</span>
        </button>

        {/* 1-Click Judge Demo Suite */}
        <button
          onClick={onOpenDemo}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
        >
          <PlayCircle className="h-4 w-4" />
          <span>Judge Demo Presets</span>
        </button>
      </div>
    </header>
  );
};
