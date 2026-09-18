import { ChatResponse, Memory, MemoryHistory, Message, User } from '../types/index.js';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem('memoryos_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const provider = localStorage.getItem('memoryos_llm_provider');
  if (provider) {
    headers['x-llm-provider'] = provider;
  }
  const apiKey = localStorage.getItem('memoryos_api_key');
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  const model = localStorage.getItem('memoryos_model');
  if (model) {
    headers['x-model'] = model;
  }
  return headers;
}

export const api = {
  // Authentication
  async register(name: string, email: string, password: string): Promise<{ success: boolean; token: string; user: any }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async login(email: string, password: string): Promise<{ success: boolean; token: string; user: any }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async getMe(): Promise<{ success: boolean; user: any }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Session invalid');
    return res.json();
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async resetUserSandbox(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to reset sandbox');
    return res.json();
  },

  // Chat
  async sendMessage(userId: string, sessionId: string, message: string): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, sessionId, message })
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  async getMessages(userId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/chat/history/${userId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch message history');
    return res.json();
  },

  // Memories
  async getMemories(userId: string, status?: string): Promise<Memory[]> {
    const url = status
      ? `${API_BASE}/memories?userId=${userId}&status=${status}`
      : `${API_BASE}/memories?userId=${userId}`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch memories');
    return res.json();
  },

  async getMemoryHistory(userId: string): Promise<MemoryHistory[]> {
    const res = await fetch(`${API_BASE}/memories/history?userId=${userId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch memory history');
    return res.json();
  },

  async setMemoryStatus(id: string, status: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/memories/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update memory status');
    return res.json();
  },

  // Database Health & Performance (Anti-Slowdown)
  async getDbStats(): Promise<any> {
    const res = await fetch(`${API_BASE}/db/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch DB stats');
    return res.json();
  },

  async compactDatabase(): Promise<any> {
    const res = await fetch(`${API_BASE}/db/compact`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to compact DB');
    return res.json();
  },

  async tierMemories(): Promise<any> {
    const res = await fetch(`${API_BASE}/db/tier`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to tier memories');
    return res.json();
  },

  // Judge Demo Scenarios
  async runScenario(scenario: string, userId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/run-scenario`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ scenario, userId })
    });
    if (!res.ok) throw new Error('Failed to run demo scenario');
    return res.json();
  }
};
