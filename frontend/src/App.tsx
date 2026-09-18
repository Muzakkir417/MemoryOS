import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { ChatInterface } from './components/ChatInterface.js';
import { MemoryInspector } from './components/MemoryInspector.js';
import { JudgeDemoModal } from './components/JudgeDemoModal.js';
import { api } from './services/api.js';
import { Memory, MemoryHistory, Message, User, ProvenanceCitation } from './types/index.js';

export function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMemories, setActiveMemories] = useState<Memory[]>([]);
  const [supersededMemories, setSupersededMemories] = useState<Memory[]>([]);
  const [history, setHistory] = useState<MemoryHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  // Initial load: Fetch users
  useEffect(() => {
    async function initUsers() {
      try {
        const uList = await api.getUsers();
        setUsers(uList);
        // Default to Judge Sandbox or first user
        const defaultUser = uList.find(u => u.id === 'user_judge') || uList[0];
        if (defaultUser) {
          setCurrentUser(defaultUser);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    }
    initUsers();
  }, []);

  // When current user changes, reload memories, history, and message transcript
  useEffect(() => {
    if (!currentUser) return;
    loadUserData(currentUser.id);
  }, [currentUser]);

  const loadUserData = async (userId: string) => {
    try {
      const [msgs, activeMems, supersededMems, hist] = await Promise.all([
        api.getMessages(userId),
        api.getMemories(userId, 'active'),
        api.getMemories(userId, 'superseded'),
        api.getMemoryHistory(userId)
      ]);
      setMessages(msgs);
      setActiveMemories(activeMems);
      setSupersededMemories(supersededMems);
      setHistory(hist);
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!currentUser) return;
    setIsLoading(true);

    // Optimistic user message append
    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      userId: currentUser.id,
      sessionId: 'session_main',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await api.sendMessage(currentUser.id, 'session_main', text);

      const assistantMsg: Message = {
        id: `assist_${Date.now()}`,
        userId: currentUser.id,
        sessionId: 'session_main',
        role: 'assistant',
        content: response.message,
        createdAt: new Date().toISOString(),
        citations: response.citations,
        memoryDecisions: response.memoryDecisions
      };

      setMessages(prev => [...prev, assistantMsg]);
      // Refresh memory state
      await loadUserData(currentUser.id);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgetMemory = async (id: string) => {
    if (!currentUser) return;
    try {
      await api.setMemoryStatus(id, 'forgotten');
      await loadUserData(currentUser.id);
    } catch (err) {
      console.error('Failed to forget memory:', err);
    }
  };

  const handleResetSandbox = async () => {
    if (!currentUser) return;
    if (window.confirm(`Reset all memories and chat history for ${currentUser.name}?`)) {
      try {
        await api.resetUserSandbox(currentUser.id);
        await loadUserData(currentUser.id);
      } catch (err) {
        console.error('Failed to reset sandbox:', err);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0d14] text-slate-100 font-sans">
      {/* Top Navigation */}
      <Header
        users={users}
        currentUser={currentUser}
        onSelectUser={(u) => setCurrentUser(u)}
        onResetUser={handleResetSandbox}
        onOpenDemo={() => setIsDemoModalOpen(true)}
        activeCount={activeMemories.length}
      />

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Chat Interface (55% width on desktop) */}
        <div className="flex-1 h-1/2 lg:h-full lg:w-[55%]">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Right: Interactive Memory Inspector (45% width on desktop) */}
        <div className="flex-1 h-1/2 lg:h-full lg:w-[45%] border-t lg:border-t-0 lg:border-l border-slate-800">
          <MemoryInspector
            activeMemories={activeMemories}
            supersededMemories={supersededMemories}
            history={history}
            onForgetMemory={handleForgetMemory}
          />
        </div>
      </div>

      {/* 1-Click Judge Demo Modal */}
      <JudgeDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onCompleteScenario={() => currentUser && loadUserData(currentUser.id)}
        currentUserId={currentUser?.id || 'user_judge'}
      />
    </div>
  );
}

export default App;
