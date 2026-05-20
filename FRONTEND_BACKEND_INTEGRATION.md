# Frontend - Backend Integration Guide

## 📋 Tổng Quan

Frontend (React + TypeScript) đã được kết nối với Backend (FastAPI) để gọi các API endpoints.

## 🔌 API Client

Toàn bộ API calls được tập trung tại **`src/lib/api.ts`**

### Cấu trúc API Client

```typescript
import { apiClient, streamChatResponse } from '@/lib/api';

// Chat
await apiClient.chat(question, sessionId);
await apiClient.streamChat(question, sessionId, onChunk);

// Auth
await apiClient.register({ email, password, full_name, grade });
await apiClient.login({ email, password });

// Documents
await apiClient.upload(file, grade);

// Admin
await apiClient.getConfigs();
await apiClient.updateConfig(keyName, keyValue);
await apiClient.getAllUsers();
```

## 📍 Backend URL Configuration

### Development

Backend URL được cấu hình từ biến môi trường **`VITE_BACKEND_URL`**

**File: `.env`**
```dotenv
VITE_BACKEND_URL=http://localhost:8000
```

**Khi chạy dev server:**
```bash
npm run dev
```

Vite sẽ proxy tất cả requests đến `/api/*` tới backend URL.

### Production

Cập nhật `.env` hoặc cấu hình environment variables:
```dotenv
VITE_BACKEND_URL=https://your-api.com
```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Component |
|--------|----------|-----------|
| POST | `/register` | Login.tsx |
| POST | `/login` | Login.tsx |

**Request:**
```typescript
{
  email: "student@school.com",
  password: "password123",
  full_name: "Nguyễn Văn A",  // for register
  grade: "12"                 // for register
}
```

**Response:**
```typescript
{
  status: "success",
  token: "jwt_token",
  user: {
    id: "user_id",
    email: "student@school.com",
    full_name: "Nguyễn Văn A",
    grade: "12"
  }
}
```

### Chat

| Method | Endpoint | Component |
|--------|----------|-----------|
| POST | `/chat` | AIChat.tsx |

**Request:**
```typescript
{
  question: "Giải thích phương trình bậc hai?",
  session_id: "uuid-string"  // optional
}
```

**Response:** Server-Sent Events (SSE) stream with text chunks

**Session Management:**
- Session ID được lưu trong localStorage
- Hệ thống tự tạo session mới nếu không cung cấp ID
- Session ID được trả về trong response stream

### Document Upload

| Method | Endpoint |
|--------|----------|
| POST | `/upload` |

**Request:** FormData
```typescript
file: File
grade: "12"
```

**Response:**
```typescript
{
  status: "success",
  data: {
    name: "book.pdf",
    pdf_url: "https://...",
    grade: "12",
    status: "processing"
  }
}
```

### Admin

| Method | Endpoint |
|--------|----------|
| GET | `/admin/configs` |
| POST | `/admin/configs` |
| GET | `/admin/users` |

## 🔄 Data Flow

### Login Flow

```
User Input (Email, Password)
    ↓
Login.tsx: handleSubmit()
    ↓
apiClient.login()
    ↓
Backend: /login
    ↓
Response: { token, user }
    ↓
Save token & user to localStorage
    ↓
Redirect to Dashboard
```

### Chat Flow

```
User Message
    ↓
AIChat.tsx: handleSend()
    ↓
streamChatResponse(question, sessionId)
    ↓
Backend: /chat (SSE)
    ↓
Real-time stream chunks
    ↓
Update UI with streaming text
    ↓
Save session ID
```

## 🛠️ Components Updated

### 1. **Login.tsx**
- Added backend API calls for register/login
- Fallback to Supabase if backend unavailable
- Token saved to localStorage

### 2. **AIChat.tsx**
- Uses `streamChatResponse()` for streaming
- Session ID management
- Proper error handling

### 3. **src/lib/api.ts** (NEW)
- Centralized API client
- All endpoints defined
- Streaming support
- Error handling

## 🚀 Running

### Backend
```bash
# Terminal 1 - FastAPI
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
# Terminal 2 - React + Vite
npm run dev
```

Frontend will be at `http://localhost:5173`
Backend will be at `http://localhost:8000`

## ⚙️ Error Handling

### API Errors
- All API calls include error handling
- Errors are thrown with descriptive messages
- Components catch and display user-friendly messages

### Network Issues
- If backend is down, Login component falls back to Supabase
- Chat errors show message: "Có chút lỗi kỹ thuật, bạn thử lại sau nhen!"

### Session Errors
- Invalid session IDs are ignored
- New session is created automatically

## 📦 Dependencies

Frontend uses:
- `react` - UI framework
- `axios` (optional) - HTTP client (currently using fetch)
- `motion/react` - Animations
- `react-markdown` - Markdown rendering
- `@supabase/supabase-js` - Supabase client
- `@google/genai` - Google AI SDK

Backend uses:
- `fastapi` - API framework
- `supabase` - Database
- `google-generativeai` - Gemini API
- `python-dotenv` - Environment variables

## 🔐 Authentication

### Token Management
- JWT token saved to localStorage after login
- Token can be retrieved with: `localStorage.getItem('auth_token')`
- Token sent in request headers if needed (future enhancement)

### Session Management
- Chat session ID saved to localStorage
- Format: `localStorage.getItem('chat_session_id')`

## 📝 Future Enhancements

- [ ] Add token to all API requests as Bearer token
- [ ] Implement token refresh logic
- [ ] Add loading states for all API calls
- [ ] Implement retry logic for failed requests
- [ ] Add request/response logging
- [ ] Implement request caching
- [ ] Add real-time updates with WebSockets

## 🐛 Troubleshooting

### "Cannot connect to backend"
1. Check if backend is running on port 8000
2. Check `VITE_BACKEND_URL` in `.env`
3. Check browser console for CORS errors

### "Session not saved"
1. Check if localStorage is enabled
2. Check browser DevTools → Application → Local Storage

### "Chat not streaming"
1. Check if response is SSE format
2. Check Network tab in DevTools
3. Verify backend `/chat` endpoint returns proper SSE response

---

**Status**: ✅ Frontend & Backend integrated and ready!
