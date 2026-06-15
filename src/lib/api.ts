/**
 * API Client for GiaSuAo Backend
 * Centralized API calls to FastAPI backend (backend/main.py)
 */

// Base URL configuration
// In development use localhost; in production (Vercel) use relative `/api` path
import { supabase } from './supabase';
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatRequest {
  question: string;
  session_id?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  grade: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChatHistoryRow {
  id?: string;
  user_id: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  session_id?: string;
  timestamp?: string;
}

export interface ChatSessionItem {
  session_id: string;
  title: string;
  subject: string;
  grade: string;
  updated_at?: string;
  last_message?: string;
}

export interface ChatSessionGroup {
  grade: string;
  subjects: Array<{
    subject: string;
    sessions: ChatSessionItem[];
  }>;
}

export interface ResetSessionResponse {
  new_session_id: string;
  previous_session_cleared: boolean;
}

export interface InitSessionResponse {
  new_session_id: string;
  previous_session_cleared: boolean;
}

// ==========================================
// Authentication API
// ==========================================

export async function registerUser(data: RegisterRequest) {
  const response = await fetch(`${API_BASE_URL}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Đăng ký thất bại');
  }

  return response.json();
}

export async function loginUser(data: LoginRequest) {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Đăng nhập thất bại');
  }

  return response.json();
}

// ==========================================
// Chat API (Streaming)
// ==========================================

export async function chatWithAI(
  question: string,
  sessionId?: string
): Promise<ReadableStream<Uint8Array> | null> {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {
    // ignore
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.statusText}`);
  }

  return response.body;
}

// ==========================================
// Document Upload API
// ==========================================

export async function uploadDocument(
  file: File,
  grade: string,
  userId?: string,
  subject?: string
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('grade', grade);
  if (userId) {
    formData.append('user_id', userId);
  }
  if (subject) {
    formData.append('subject', subject);
  }

  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {
    // ignore
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload thất bại');
  }

  return response.json();
}

// ==========================================
// Admin API
// ==========================================

export async function getSystemConfigs() {
  const response = await fetch(`${API_BASE_URL}/api/admin/configs`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Không thể lấy cấu hình');
  }

  return response.json();
}

export async function updateSystemConfig(
  keyName: string,
  keyValue: string
) {
  const response = await fetch(`${API_BASE_URL}/api/admin/configs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key_name: keyName,
      key_value: keyValue,
    }),
  });

  if (!response.ok) {
    throw new Error('Cập nhật cấu hình thất bại');
  }

  return response.json();
}

export async function getAllUsers() {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Không thể lấy danh sách user');
  }

  return response.json();
}

export async function getAdminDocuments() {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {}

  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Không thể lấy danh sách tài liệu');
  }

  return response.json();
}

export async function reprocessDocument(docId: string) {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {}

  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/admin/documents/${docId}/reprocess`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Xử lý lại tài liệu thất bại');
  }

  return response.json();
}

export async function syncSystemTextbooks() {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {}

  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/admin/documents/sync-system-textbooks`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Đồng bộ tài liệu hệ thống thất bại');
  }

  return response.json();
}

export async function deleteDocument(docId: string) {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {}

  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/admin/documents/${docId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Xóa tài liệu thất bại');
  }

  return response.json();
}

// ==========================================
// User Stats API
// ==========================================

export async function getUserStats(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/user/stats/${userId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Không thể lấy thống kê');
  }

  return response.json();
}

// ==========================================
// Chat History (Supabase)
// ==========================================
export async function fetchChatHistory(sessionId?: string): Promise<ChatHistoryRow[]> {
  // Attach current user's access token (JWT) to the Authorization header
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {
    // ignore
  }

  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  // Ensure in dev we call localhost:8000 to avoid CORS issues when running frontend dev server
  const base = import.meta.env.DEV ? 'http://localhost:8000' : API_BASE_URL;
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  const url = `${base}/chat-history/me${query}`;
  console.log('[api] fetchChatHistory url=', url);
  const resp = await fetch(url.replace('/chat-history', '/api/chat-history'), {
    method: 'GET',
    headers,
  });

  if (!resp.ok) {
    let err = 'Không thể lấy lịch sử chat';
    try {
      const body = await resp.json();
      err = body.detail || body.message || err;
    } catch (e) {}
    if (resp.status === 401 || resp.status === 403) {
      return [];
    }
    throw new Error(err);
  }

  const body = await resp.json();
  return (body.data || []) as ChatHistoryRow[];
}

export async function fetchChatSessions(): Promise<ChatSessionGroup[]> {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {
    // ignore
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const base = import.meta.env.DEV ? 'http://localhost:8000' : API_BASE_URL;
  const resp = await fetch(`${base}/api/chat-sessions/me`, { method: 'GET', headers });
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      return [];
    }
    throw new Error('Không thể lấy danh sách hội thoại');
  }

  const body = await resp.json();
  return (body.data || []) as ChatSessionGroup[];
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {
    // ignore
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const base = import.meta.env.DEV ? 'http://localhost:8000' : API_BASE_URL;
  const resp = await fetch(`${base}/api/chat-sessions/me/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers,
  });

  if (!resp.ok) {
    throw new Error('Không thể xóa hội thoại');
  }
}

export async function resetCurrentSession(currentSessionId?: string, clearPrevious: boolean = true): Promise<ResetSessionResponse> {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {
    // ignore
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const base = import.meta.env.DEV ? 'http://localhost:8000' : API_BASE_URL;
  const resp = await fetch(`${base}/api/chat-sessions/reset-current`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      current_session_id: currentSessionId,
      clear_previous: clearPrevious,
    }),
  });

  if (!resp.ok) {
    throw new Error('Không thể reset phiên hội thoại hiện tại');
  }

  const body = await resp.json();
  return (body.data || {}) as ResetSessionResponse;
}

export async function initSession(currentSessionId?: string, grade?: string, subject?: string): Promise<InitSessionResponse> {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {
    // ignore
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const base = import.meta.env.DEV ? 'http://localhost:8000' : API_BASE_URL;
  const resp = await fetch(`${base}/api/init-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      current_session_id: currentSessionId,
      grade,
      subject,
    }),
  });

  if (!resp.ok) {
    throw new Error('Không thể khởi tạo session mới');
  }

  const body = await resp.json();
  return (body.data || {}) as InitSessionResponse;
}

// ==========================================
// Password Recovery
// ==========================================
export async function forgotPassword(email: string) {
  const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Không thể gửi email đặt lại mật khẩu');
  }

  return response.json();
}

// ==========================================
// Stream Helper Function
// ==========================================

export async function streamChatResponse(
  question: string,
  onChunk: (chunk: string) => void,
  sessionId?: string
): Promise<string> {
  let accessToken = '';
  try {
    if ((supabase.auth as any).getSession) {
      const maybe = await (supabase.auth as any).getSession();
      accessToken = maybe?.data?.session?.access_token || '';
    } else if ((supabase.auth as any).session) {
      const s = (supabase.auth as any).session();
      accessToken = s?.access_token || '';
    }
  } catch (e) {
    // ignore
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

export const apiClient = {
  // Auth
  register: registerUser,
  login: loginUser,

  // Chat
  chat: chatWithAI,
  streamChat: streamChatResponse,

  // Documents
  upload: uploadDocument,

  // Admin
  getConfigs: getSystemConfigs,
  updateConfig: updateSystemConfig,
  getAllUsers,
  getAdminDocuments,
  reprocessDocument,
  syncSystemTextbooks,
  deleteDocument,
  getUserStats,
  forgotPassword,
  fetchChatHistory,
};
