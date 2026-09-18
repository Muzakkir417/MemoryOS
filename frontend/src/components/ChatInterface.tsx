import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Sparkles, ChevronRight, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Message, ProvenanceCitation } from '../types/index.js';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onSelectCitation?: (citation: ProvenanceCitation) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onSelectCitation
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const quickPrompts = [
    'I prefer Java for my DSA coding.',
    "I'm switching to C++ for DSA.",
    'What language should you use for my DSA examples?',
    'I prefer Python for Machine Learning.'
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] border-r border-slate-800">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4 text-sky-400">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">MemoryOS Assistant Ready</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Start chatting or click a quick prompt below to test cross-session persistence and real-time contradiction handling.
            </p>
            <div className="w-full space-y-2">
              <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider text-left">
                Suggested Live Demo Flow:
              </p>
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(prompt)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{prompt}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id || index}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
            >
              {!isUser && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow-md shadow-sky-500/10 mt-1">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-br-none shadow-md shadow-blue-900/20'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-lg shadow-black/40'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Real-Time Memory Decisions Badge (shown on turn if state changed) */}
                  {msg.memoryDecisions && msg.memoryDecisions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                      {msg.memoryDecisions.map((dec, i) => {
                        const isSupersede = dec.action === 'SUPERSEDE';
                        const isScope = dec.action === 'SCOPE REFINEMENT';
                        return (
                          <div
                            key={i}
                            className={`text-xs px-2.5 py-1.5 rounded-md flex items-start gap-1.5 font-mono ${
                              isSupersede
                                ? 'bg-amber-950/40 border border-amber-800/50 text-amber-300'
                                : isScope
                                ? 'bg-indigo-950/40 border border-indigo-800/50 text-indigo-300'
                                : 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                            }`}
                          >
                            {isSupersede ? (
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                            ) : isScope ? (
                              <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-indigo-400" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                            )}
                            <div>
                              <span className="font-semibold uppercase tracking-wider text-[10px]">
                                [{dec.action}]:
                              </span>{' '}
                              <span>{dec.reason}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Provenance Citations Pills */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Info className="h-3 w-3 text-sky-400" />
                        Memory Provenance (Grounding Evidence):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((citation, ci) => (
                          <button
                            key={ci}
                            onClick={() => onSelectCitation && onSelectCitation(citation)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/50 text-[11px] font-mono text-sky-300 transition-colors cursor-pointer"
                            title={`Similarity: ${(citation.similarity * 100).toFixed(0)}% | Source: ${citation.sourceMessageContent}`}
                          >
                            <span>🧠 Memory #{citation.memoryId.slice(0, 8)}</span>
                            <span className="text-[9px] px-1 rounded bg-sky-900 text-sky-200">
                              {(citation.similarity * 100).toFixed(0)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`text-[10px] text-slate-500 font-mono ${isUser ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {isUser && (
                <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center text-slate-300 shadow-sm mt-1">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto justify-start items-center">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow-md shadow-sky-500/10">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-400 text-xs font-mono flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-ping"></span>
              Extracting facts & checking contradiction engine...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="p-4 border-t border-slate-800 bg-[#0d121f]">
        {/* Quick prompt suggestions bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(qp)}
              disabled={isLoading}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me a preference, switch a choice, or ask what I remember..."
            disabled={isLoading}
            className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-sans transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-sky-500/20"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
