import { ChatResponse, Memory, MemoryHistory, Message, User } from '../types/index.js';

const API_BASE = '/api';

export const api = {
  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async resetUserSandbox(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to reset sandbox');
    return res.json();
  },

  // Chat
  async sendMessage(userId: string, sessionId: string, message: string): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId, message })
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  async getMessages(userId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/chat/history/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch message history');
    return res.json();
  },

  // Memories
  async getMemories(userId: string, status?: string): Promise<Memory[]> {
    const url = status
      ? `${API_BASE}/memories?userId=${userId}&status=${status}`
      : `${API_BASE}/memories?userId=${userId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch memories');
    return res.json();
  },

  async getMemoryHistory(userId: string): Promise<MemoryHistory[]> {
    const res = await fetch(`${API_BASE}/memories/history?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch memory history');
    return res.json();
  },

  async setMemoryStatus(id: string, status: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/memories/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update memory status');
    return res.json();
  },

  // Judge Demo Scenarios
  async runScenario(scenario: string, userId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/run-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, userId })
    });
    if (!res.ok) throw new Error('Failed to run demo scenario');
    return res.json();
  }
};
