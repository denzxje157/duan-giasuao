# Tóm tắt Dự án: Gia Sư Ảo (GiaSuAo)

**Gia Sư Ảo** là một nền tảng giáo dục thông minh ứng dụng trí tuệ nhân tạo (AI), được thiết kế để hỗ trợ học sinh Việt Nam ôn tập, giải bài tập và học tập theo ngữ cảnh. Nền tảng hoạt động như một gia sư cá nhân 24/7, có khả năng nhận diện môn học, theo sát lịch sử học tập và kết nối với tài liệu (sách giáo khoa, PDF bài tập) tải lên để cung cấp lộ trình giảng dạy tối ưu.

---

## 1. Kiến trúc Hệ thống (Tech Stack)

Dự án sử dụng mô hình **Client-Server** với sự tách biệt rõ ràng giữa Frontend và Backend, kết hợp cùng các dịch vụ Cloud hiện đại.

### Frontend
- **Framework:** React (với TypeScript) build bằng Vite.
- **Styling:** Tailwind CSS (kết hợp các biến CSS tùy chỉnh trong `index.css`) giúp giao diện hiện đại, chuẩn giáo dục.
- **Animation & Icons:** Sử dụng `framer-motion` (motion/react) cho các hiệu ứng chuyển động mượt mà và `lucide-react` cho biểu tượng.
- **Markdown Rendering:** `react-markdown` kết hợp `remark-math` và `rehype-katex` để hiển thị hoàn hảo các công thức Toán học, Lý, Hóa.

### Backend
- **Framework:** Python với FastAPI (`api/main.py`). Được cấu hình chạy qua `uvicorn` (port 8000).
- **Core Logic:** Chứa trong `api/core_logic.py`. Đảm nhận kết nối AI, nhúng (embedding), và tiền xử lý tài liệu.
- **AI Model:** Google Generative AI (các model `gemini-2.5-flash`, `gemini-3.5-flash` và `gemini-embedding-001`). Xử lý luồng stream câu trả lời theo chuẩn JSON linh hoạt.
- **Data Extraction:** Tích hợp `markitdown`, `pypdf`, và `pytesseract` (OCR) để trích xuất văn bản từ PDF và hình ảnh do người dùng tải lên.

### Database & Auth (BaaS)
- **Dịch vụ:** Supabase.
- **Authentication:** Supabase Auth (Email/Password).
- **Cơ sở dữ liệu:** PostgreSQL kết hợp thư viện `pgvector` phục vụ RAG (Retrieval-Augmented Generation - tìm kiếm tài liệu bằng AI).

---

## 2. Cấu trúc Thư mục Chính

```text
duan-giasuao/
├── api/
│   ├── main.py           # Routing API của FastAPI (Auth, Upload, Chat, Admin)
│   └── core_logic.py     # Xử lý logic AI (Stream Gemini, Embedding, OCR, PDF)
├── src/
│   ├── components/       # Các UI Component React
│   │   └── dashboard/
│   │       └── AIChat.tsx # Giao diện Chat chính yếu, xử lý Stream JSON & UI Chips
│   ├── lib/              # Các hàm tương tác với API (fetchChatHistory...)
│   ├── App.tsx           # Entry point của giao diện
│   └── types.ts          # Định nghĩa kiểu dữ liệu TS (User, History...)
├── Giasuao.md            # Tài liệu thiết kế hệ thống / Báo cáo đặc tả ban đầu
├── FRONTEND_BACKEND_INTEGRATION.md # Tài liệu hướng dẫn Endpoints
└── .env                  # Lưu trữ biến môi trường (Gemini keys, Supabase URLs)
```

---

## 3. Các Tính Năng Cốt Lõi (Key Features)

### 3.1. Chatbot Trí tuệ Nhân tạo (Smart AI Chat)
- Học sinh có thể chọn các môn học (Toán, Văn, Anh, Khoa học...) dựa trên cấp độ lớp (từ Lớp 1 đến THPT).
- **Luồng Stream thông minh:** Câu trả lời của AI được stream (trả về từng chữ) để không tạo độ trễ. 
- **Định dạng trả về nâng cao:** AI trả về cấu trúc JSON gồm:
  - `answer`: Nội dung câu trả lời có chứa định dạng Markdown/Công thức toán học.
  - `suggestions`: Mảng các gợi ý học tập tiếp theo.
- **Interactive UI (Chips):** Dựa trên `suggestions`, frontend (trong `AIChat.tsx`) tự động sinh ra các nút bấm (làm bài tập 📝, ôn lý thuyết 📚, tài liệu 🔗) để học sinh bấm vào và tiếp tục luồng chat liền mạch.

### 3.2. Hệ thống RAG - Phân tích Tài liệu (Document Processing)
- Hỗ trợ tải lên `.pdf`, `.png`, `.jpg` trực tiếp từ khung chat.
- Khi có file tải lên, Backend sẽ sử dụng OCR hoặc trình đọc PDF để bóc tách chữ.
- Chữ được mã hóa (embedded) bằng mô hình của Gemini và đưa vào Supabase (Vector DB).
- Khi học sinh hỏi, AI sẽ dùng Vector Search (RAG) tìm kiếm kiến thức tương đồng nhất trong tài liệu để làm "ngữ cảnh" trả lời chuẩn xác.

### 3.3. Quản lý Lịch sử Học tập & Tiến độ
- Mọi phiên chat được gán `session_id` và lưu giữ trong bảng `chat_history`.
- Khi người dùng đăng nhập lại hoặc chuyển môn, AI sẽ truy xuất lịch sử cũ để nắm bắt đúng tiến trình người học.
- Hỗ trợ xem lại lịch sử các phiên học ở Sidebar.

### 3.4. Hệ thống xoay vòng API Keys
- Quản lý linh hoạt nhiều API Keys của Google Gemini trong Backend (qua mảng `AVAILABLE_KEYS` trong `.env` như `GEMINI_API_KEY_1`, `2`...) để phòng tránh lỗi giới hạn lượt gọi (Rate Limit - Error 429). Khi một key kiệt quệ, hệ thống tự động fallback sang key khác giúp ứng dụng luôn "sống".

---

## 4. Cấu trúc Database (Supabase Schema)

Dự án xoay quanh 5 bảng (tables) chính trong Supabase:

1. **`profiles`**: Quản lý thông tin học sinh (`id`, `email`, `full_name`, `grade` - khối lớp, `role`).
2. **`documents`**: Lưu trữ metadata và nội dung file học sinh/giáo viên tải lên (`id`, `name`, `content`, `embedding` vector 768 chiều, `status`).
3. **`chat_sessions`**: Lưu trữ định danh phiên chat hiện tại (Phục vụ phân cụm phiên học từng môn).
4. **`chat_history`**: Lưu từng dòng tin nhắn của User và AI (`id`, `user_id`, `session_id`, `role`, `content`, `timestamp`).
5. **`system_configs`**: Bảng cấu hình động cho phép Quản trị viên thay đổi các biến số hệ thống.

---

## Tổng kết
Dự án **GiaSưẢo** là một giải pháp EdTech ứng dụng Mô hình Ngôn ngữ Lớn (LLMs) tiên tiến nhất hiện nay. Nhờ sự kết hợp nhuần nhuyễn của kiến trúc API chuẩn mực (FastAPI), RAG cho xử lý PDF/Hình ảnh, luồng dữ liệu Stream JSON động và giao diện siêu phản hồi (ReactJS), nền tảng này sẵn sàng cho việc đưa vào áp dụng thực tế hoặc dùng làm Đồ án Tốt nghiệp đạt điểm xuất sắc.
