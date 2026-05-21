/**
 * API Client for GiaSuAo Backend
 * Centralized API calls to FastAPI backend (backend/main.py)
 */

// Base URL configuration
// In development use localhost; in production (Vercel) use relative `/api` path
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '/api');

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

// ==========================================
// Authentication API
// ==========================================

export async function registerUser(data: RegisterRequest) {
  const response = await fetch(`${API_BASE_URL}/register`, {
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
  const response = await fetch(`${API_BASE_URL}/login`, {
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
): Promise<ReadableStream<string>> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  return response.body;
}

// ==========================================
// Document Upload API
// ==========================================

export async function uploadDocument(
  file: File,
  grade: string
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('grade', grade);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
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
  const response = await fetch(`${API_BASE_URL}/admin/configs`, {
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
  const response = await fetch(`${API_BASE_URL}/admin/configs`, {
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
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Không thể lấy danh sách user');
  }

  return response.json();
}

// ==========================================
// User Stats API
// ==========================================

export async function getUserStats(userId: string) {
  const response = await fetch(`${API_BASE_URL}/user/stats/${userId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Không thể lấy thống kê');
  }

  return response.json();
}

// ==========================================
// Password Recovery
// ==========================================
export async function forgotPassword(email: string) {
  const response = await fetch(`${API_BASE_URL}/forgot-password`, {
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
  sessionId?: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
  getUserStats,
  forgotPassword,
};
