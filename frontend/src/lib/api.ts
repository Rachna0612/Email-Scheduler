const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export interface ScheduledEmail {
  id: string;
  campaignId: string;
  to: string;
  subject: string;
  scheduledTime: string;
  status: string;
}

export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  sentAt: string;
  status: string;
}

export const api = {
  async getMe(): Promise<User | null> {
    const res = await fetch(`${API_BASE}/api/auth/me`, { headers: getHeaders() });
    if (!res.ok) return null;
    return res.json();
  },

  async getScheduled(): Promise<ScheduledEmail[]> {
    const res = await fetch(`${API_BASE}/api/emails/scheduled`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch scheduled emails');
    return res.json();
  },

  async getSent(): Promise<SentEmail[]> {
    const res = await fetch(`${API_BASE}/api/emails/sent`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch sent emails');
    return res.json();
  },

  async schedule(params: {
    subject: string;
    body: string;
    fromEmail: string;
    recipients: string[];
    startTime: string;
    delayBetweenMs?: number;
    hourlyLimit?: number;
  }): Promise<{ campaignId: string }> {
    const res = await fetch(`${API_BASE}/api/emails/schedule`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to schedule');
    }
    return res.json();
  },
};

export const AUTH_URL = `${API_BASE}/api/auth/google`;
