


BẢN MÔ TẢ QUY TRÌNH




TÊN GIẢI PHÁP:
Gia sư ảo: Cá nhân hoá dữ liệu học tập

















BỨC TRANH TỔNG THỂ: CÁC THÀNH PHẦN CỦA DỰ ÁN
Dự án sẽ được chia làm 3 mảng chính, phù hợp để chia cho 3 thành viên trong nhóm:
Frontend (Giao diện web): Nơi học sinh tương tác, upload tài liệu, chat và nghe AI giảng.
Database (Cơ sở dữ liệu): Nơi lưu trữ tài khoản, file PDF và "trí nhớ" của AI.
Backend AI (Bộ não xử lý): Nơi đọc sách giáo khoa (kể cả công thức toán học) và giao tiếp với mô hình AI.

LỘ TRÌNH THỰC HIỆN THEO THỨ TỰ (STEP-BY-STEP)
Bước 1: Dựng Khung Giao Diện & Nền Tảng Auth (Frontend + Database)
Frontend (React + Vite): Thiết lập cấu trúc thư mục project. Cài đặt React Router để điều hướng. Dựng form đăng ký/đăng nhập có chỗ chọn lớp (1-12). Cấu hình bảo vệ route (chưa đăng nhập thì đá ra ngoài).
Database (Supabase): Thiết lập Auth, tạo bảng User chứa Role và Lớp.
Mục tiêu: Luồng đăng nhập mượt mà, phân đúng người vào đúng trang.
Bước 2: Xây Dựng UI Tủ Sách & Tiền Xử Lý File (Frontend + Backend)
Frontend (React + Vite): Dựng giao diện lưới (Grid) hiển thị Tủ sách tri thức. Code Component nút bấm Upload file có thanh trạng thái tiến trình (loading bar). Hiển thị Ảnh bìa (Thumbnail) cho từng thẻ sách.
Backend (Python): Viết API nhận file từ web, cắt trang đầu làm ảnh bìa, dùng Gemini Vision/PyMuPDF bóc chữ và công thức.
Mục tiêu: Frontend gửi file lên, Backend nhận, xử lý xong, trả về ảnh bìa hiện đẹp trên web.
Bước 3: Dựng Không Gian Học Tập Trực Quan (Frontend Trọng Tâm)
Frontend (React + Vite): Đây là bước mà React "bung sức". Dựng giao diện chia đôi màn hình (Split-screen).
Khung trái: Tích hợp react-pdf-viewer để đọc sách.
Khung phải: Dựng Chatbox chuẩn chỉ. Tích hợp thư viện KaTeX hoặc MathJax để khi nhận chuỗi ký tự toán từ backend, nó biến thành công thức phân số/căn bậc hai cực đẹp.
Mục tiêu: Có khung chat xịn xò để chuẩn bị "hứng" dữ liệu từ AI.
Bước 4: Lắp Ráp "Não Bộ" RAG & Giao Tiếp AI (Backend Core)
Backend & DB: Hoàng Anh và Hà Kiên tập trung xử lý Chunking (băm văn bản), Embedding (nhúng vector) và lưu vào pgvector trên Supabase. Viết API /chat tìm kiếm đoạn văn giống nhất và ném cho Gemini.
Frontend (React + Vite): Gọi hàm fetch hoặc axios nối API /chat vào khung Chat đã dựng ở Bước 3. Xử lý trạng thái "AI đang gõ..." (Typing effect).
Mục tiêu: Gõ câu hỏi trên UI -> AI trả lời bằng kiến thức trong sách + công thức toán hiển thị mượt.
Bước 5: Tích hợp Giọng Nói & Giao Diện Admin (Frontend + Backend)
Frontend (React + Vite): * Thêm nút Micro và Loa vào Chatbox.
Dựng toàn bộ giao diện Admin No-code: Bảng điều khiển API Key, Form kéo thả upload sách hàng loạt.
Backend (Python): Tích hợp faster-whisper (nghe) và API FPT.AI (nói). Viết luồng đọc API Key động từ DB.
Mục tiêu: Web nói được tiếng Việt, Admin chỉnh Key trực tiếp trên UI mà không cần sửa code.
Bước 6: Giao Diện Landing Page, Gamification & Deploy (Hoàn thiện)
Frontend (React + Vite): Code Landing Page (mặt tiền chào mừng) lung linh với các icon mô tả tính năng. Vẽ biểu đồ thống kê giờ học và tủ huy hiệu cho học sinh.
Deploy hệ thống: Frontend ném lên Vercel (Miễn phí, cực nhanh cho React). Backend được đưa lên nền tảng đám mây phù hợp.
Mục tiêu: Có link Public chính thức để khoe với toàn trường.


Thành phần
Phần mềm / Công cụ
Chi phí dự kiến
Giao diện (Frontend)
React + Vite
Miễn phí
Triển khai Web
Vercel
Miễn phí
Database & Lưu trữ
Supabase
Miễn phí
Máy chủ AI (Backend)
Python + FastAPI
Miễn phí
Đọc chữ & Công thức
Gemini 1.5 Flash Vision
Miễn phí
Mô hình Ngôn ngữ AI
Gemini API
Miễn phí
Nghe Giọng Nói (STT)
Gemini API (Audio input)
Miễn phí
Phát Giọng Nói (TTS)
FPT.AI / Zalo AI
Miễn phí giới hạn



Thành viên 1: Trách nhiệm Giao diện (Frontend - React & Vite)
Người này sẽ "thầu" toàn bộ những gì người dùng nhìn thấy, từ Học sinh đến Admin.
Công việc cần làm:
Module 1 & 5: Thiết kế Landing Page thu hút (Hero, Demo) và Form Đăng nhập/Đăng ký chọn cấp lớp (1-12).
Module 2: Xây dựng giao diện "Tủ sách Tri thức" dạng lưới (Grid), hiển thị Card tài liệu có ảnh bìa (Thumbnail) và trạng thái Offline.
Module 3: Thiết kế giao diện chia đôi (Split-screen): Khung trái dùng react-pdf-viewer để lật trang/highlight, Khung phải là Chatbox.
Module 4: Xây dựng trang Admin Dashboard (No-code): Form cấu hình API Key, bảng quản lý người dùng, giao diện kéo thả file.
Module 6: Vẽ biểu đồ học tập và "Tủ huy hiệu" bằng các thư viện UI (như Recharts).
Xử lý Kỹ thuật UI: Tích hợp KaTeX/MathJax để render mã LaTeX thành công thức Toán/Lý đẹp mắt; làm code đồng hồ Pomodoro.
Đầu ra bắt buộc: Một kho mã nguồn (Repository) Frontend hoàn chỉnh, mượt mà, responsive trên các màn hình và không bị "đơ" khi chờ AI phản hồi.
👤 Thành viên 2: Trách nhiệm Máy chủ & AI (Backend - FastAPI). Kỹ sư trưởng đảm nhận luồng xử lý RAG và "bộ não" của hệ thống.
Công việc cần làm:
Module 2 (Data Ingestion): Viết API nhận file PDF/Ảnh từ web. Dùng PyMuPDF cắt trang đầu làm thumbnail. Dùng Gemini 1.5 Flash Vision (hoặc Marker) để đọc chữ & công thức toán học từ file.
Module 3 (RAG & AI Logic): Code luồng RAG bằng LangChain: Băm nhỏ văn bản (Chunking) -> Gọi Gemini Embedding biến thành vector -> Lưu vào DB. Khi có câu hỏi, truy xuất vector tương đồng -> Ném vào Prompt -> Trả về câu trả lời + LaTeX.
Module 4 (No-code Config): Viết hàm get_active_key() để Backend luôn đọc API Key Gemini từ Database thay vì file .env. Viết API để Admin cập nhật Prompt động.
Module 6 (Gamification Logic): Viết thuật toán tính Chuỗi ngày (Streak) và điều kiện đạt Huy hiệu ảo.
Đầu ra bắt buộc: Các cổng API bảo mật xử lý logic mượt mà (Upload, Chat, Config). Đảm bảo AI trả lời đúng trọng tâm tài liệu với tốc độ dưới 5 giây.
👤 Thành viên 3: Trách nhiệm Dữ liệu & Luồng bảo mật (Database - Supabase)Thủ thư số, người nắm giữ hệ thống lưu trữ và quyền lực dữ liệu.
Công việc cần làm:
Module 1 & 4 (Auth & Security): Bật Supabase Auth. Thiết lập bảng profiles (lưu Cấp lớp, Role). Viết chính sách bảo mật RLS (Row Level Security) để bảo vệ dữ liệu học sinh và phân quyền Admin.
Luồng RAG (Database Side): Tạo bảng documents chứa metadata file. Bật extension pgvector trong Supabase PostgreSQL để lưu trữ và truy vấn siêu tốc các dãy số vector do Backend đẩy vào.
Module 2 (Storage): Thiết lập Supabase Storage (Bucket) để chứa file PDF gốc và ảnh bìa Thumbnail.
Module 4 & 6: Thiết kế bảng system_configs (lưu Key Gemini, Prompt) và bảng badges, learning_logs để lưu lịch sử học tập.
Đầu ra bắt buộc: Cơ sở dữ liệu chuẩn hóa, bảo mật tuyệt đối, có khả năng truy vấn vector (match_documents) nhanh chóng.
Module 1: Trang chủ & Hệ thống Tài khoản
Đây là "cửa ngõ" của web, quyết định trải nghiệm cá nhân hóa.
1.1. Cổng Đăng nhập / Đăng ký:
Xác thực: Email/Password (Sử dụng Supabase Auth).
Phân loại đầu vào: Học sinh bắt buộc chọn lớp (1-12).
1.2. Hồ sơ cá nhân (Profile): 
Thay đổi họ tên, ảnh đại diện.
Đổi mật khẩu.
Xem thống kê học tập (Số câu đã hỏi, số tài liệu đã nạp).
1.3. Điều hướng thông minh:
Tự động đá Admin về trang quản trị và học sinh về kho sách.
. Các thông tin cần xử lý (Input & Output)
Thành phần
Chi tiết
Đầu vào (Input)
Email, mật khẩu, họ tên, lớp (1-12).
Đầu ra (Output)
Mã token (JWT), thông tin cá nhân, role (admin/student).


2. Phân chia công việc (Ai làm gì?)
Để module này hoàn thành trong 1-2 ngày, nhóm nên chia như sau: 
👤 Thành viên 1: Backend 
Nhiệm vụ: Xây dựng "đường ống" xử lý dữ liệu.
Công việc cụ thể:
Viết API /register: Nhận dữ liệu từ web, mã hóa mật khẩu (hashing) và đẩy vào Supabase. Mặc định gán role = 'student'.
Viết API /login: Kiểm tra email/pass, nếu đúng thì tạo một mã JWT Token gửi về cho Frontend.
Gửi kèm thông tin grade (lớp) và role để Frontend biết đường mà hiển thị giao diện.
👤 Thành viên 2: Frontend
Nhiệm vụ: Xây dựng "mặt tiền" và điều hướng.
Công việc cụ thể:
Thiết kế Form Đăng ký: Có cái Dropdown chọn lớp từ 1 đến 12.
Thiết kế Form đăng nhập: Tối giản, chuyên nghiệp 
Xử lý điều hướng (Quan trọng): Viết logic nếu role == 'admin' thì đẩy sang trang quản trị, nếu là student thì đẩy vào kho sách.
Lưu thông tin lớp học vào LocalStorage hoặc State để AI biết là đang nói chuyện với học sinh lớp mấy.
👤 Thành viên 3: Database 
Nhiệm vụ: Xây dựng "kho chứa" và bảo mật dữ liệu.
Công việc cụ thể:
Thiết kế bảng profiles trong Supabase với các cột: id, email, full_name, grade, role, created_at.
Thiết lập RLS (Row Level Security): Đảm bảo học sinh lớp 1 không xem được nhật ký chat của học sinh lớp 12.
Trực tiếp sửa quyền role = 'admin' cho tài khoản của nhóm trong bảng điều khiển Supabase.



📚 MODULE 2: TỦ SÁCH TRI THỨC (THƯ VIỆN)
Đây là nơi quản lý toàn bộ "nguyên liệu" kiến thức. Mọi tài liệu ở đây sau khi nạp xong sẽ là cơ sở dữ liệu để Gia sư AI trả lời ở Module 3.
2.1. Kho Sách Giáo Khoa (Dữ liệu Hệ thống)
Hiển thị thông minh: Tự động hiển thị danh mục sách dựa trên Lớp (1-12) mà học sinh đã chọn khi đăng ký.
Phân loại theo Môn học: Chia thành các tab hoặc thư mục: Toán, Lý, Hóa, Ngữ Văn, Tiếng Anh... giúp học sinh không bị rối.
Chế độ xem: Hiển thị dưới dạng lưới (Grid) với các Thẻ sách (Book Cards) sinh động.
2.2. Kho Tài liệu cá nhân (Học sinh tự nạp)
Cổng nạp dữ liệu (Upload): Nút bấm cho phép học sinh tải lên các file PDF hoặc Ảnh chụp vở ghi/đề ôn tập.
Quản lý tập tin: Học sinh có quyền Xóa hoặc Đổi tên các tài liệu cá nhân này để dọn dẹp không gian học tập.
Trạng thái xử lý RAG (AI Status): Mỗi tài liệu mới nạp sẽ hiển thị biểu tượng trạng thái:
⏳ Đang phân tích... (Hệ thống đang bóc tách chữ và tạo Vector).
✅ Sẵn sàng (AI đã "học" xong, có thể bắt đầu hỏi đáp).
2.3. Hiển thị Trực quan & Tìm kiếm
Xem trước (Thumbnail Preview): Thay vì chỉ hiện tên file, mỗi thẻ tài liệu sẽ hiển thị ảnh bìa hoặc trang đầu tiên của file đó.
Lưu ý thiết kế: Nhớ lồng ghép Logo hình tròn của dự án vào một góc trên ảnh bìa để tạo tính đồng bộ thương hiệu.
Tìm kiếm nhanh: Thanh tìm kiếm phía trên cùng để học sinh gõ từ khóa tìm nhanh tên tài liệu hoặc môn học.

Thành phần
Công việc cụ thể
Đầu vào/Đầu ra
Backend 
1. Viết API lấy danh sách sách (lọc theo grade).
2. Viết API xử lý Upload tài liệu cá nhân.
3. Code logic tự động chụp ảnh trang đầu PDF làm Thumbnail.
Vào: File PDF/Ảnh.
Ra: Link Thumbnail + Trạng thái xử lý.
Frontend 
1. Thiết kế giao diện "Kệ sách" dạng lưới (Grid).
2. Code Component Book Card (có ảnh bìa, tên sách, logo tròn).
3. Làm thanh Tìm kiếm và các Tab môn học.
Vào: Data từ API.
Ra: Giao diện trực quan cho học sinh.
Database 
1. Cấu hình Supabase Storage để chứa file PDF và ảnh bìa.
2. Quản lý bảng documents (thêm cột is_system, thumbnail_url).
3. Thiết lập quyền xóa/sửa file.
Vào: Lệnh SQL.
Ra: Kho lưu trữ bảo mật.


🎯 MODULE 3: KHÔNG GIAN HỌC TẬP (BẢN HOÀN THIỆN)
3.1. Trình xem PDF thông minh (Bên trái)
Tương tác cơ bản: Xem, lật trang, phóng to/thu nhỏ tài liệu.
Định vị kiến thức: Tự động nhảy đến trang và highlight đoạn văn bản mà AI dùng để trả lời.
3.2. Gia sư AI đa năng (Bên phải)
Hỏi đáp RAG: Trả lời dựa trên đúng nội dung sách đang mở.
Render công thức: Hiển thị Toán, Lý, Hóa bằng mã LaTeX chuyên nghiệp.
Hỗ trợ âm thanh: * TTS (Loa): AI đọc bài giảng.
STT (Micro): Học sinh hỏi bằng giọng nói.
Nút "Giải thích đơn giản hơn" (New): AI dùng ví dụ đời thường, ẩn dụ để giảng lại nội dung vừa trả lời nếu học sinh vẫn chưa hiểu.
3.3. Tiện ích tập trung (Focus Utilities)
Đồng hồ Pomodoro (New): Bộ đếm thời gian (ví dụ 25p học - 5p nghỉ) giúp học sinh không bị quá tải.
Trích dẫn & Gợi ý: Ghi rõ trang sách trích dẫn và gợi ý các câu hỏi liên quan để mở rộng tư duy.
Giao diện thích ứng: Tự động đổi màu sắc và Avatar gia sư theo cấp học (Tiểu học/Trung học/THPT).

Thành phần
Công việc cụ thể
Đầu vào (Input)
Đầu ra (Output)
Backend 
1. Xử lý RAG (Tìm kiến thức trong sách).
2. Chế độ "Giảng lại đơn giản".
3. Tích hợp TTS (Chuyển chữ thành tiếng).
Câu hỏi học sinh, ID tài liệu, Cấp học (1-12).
Câu trả lời (Text + LaTeX), Link audio (TTS), Số trang trích dẫn.
Frontend 
1. Giao diện Chia đôi màn hình.
2. Bộ đếm Pomodoro.
3. Hiển thị PDF & Highlight.
4. Thu âm Micro (STT).
Dữ liệu từ Backend (Text, Audio, Trang).
Giao diện hoàn chỉnh, Lệnh lật trang PDF, File ghi âm/Text hỏi AI.
Database 
1. Truy vấn Vector (Tìm đoạn văn bản khớp nhất).
2. Lưu/Xuất lịch sử chat theo tài liệu.
Câu hỏi đã được Vector hóa.
Các đoạn văn bản liên quan (Context), Lịch sử trò chuyện cũ.



MODULE 4: QUẢN TRỊ HỆ THỐNG (ADMIN DASHBOARD)
Đây là khu vực "quyền lực" nhất, giúp bạn vận hành dự án mà không cần mở VS Code.
4.1. Quản lý Kho kiến thức (No-code RAG)
Cổng nạp sách hàng loạt (Bulk Upload): Giao diện kéo-thả để bạn ném hàng chục file PDF/Ảnh sách giáo khoa lên web.
Gán nhãn thông minh: Các nút chọn (Dropdown) để bạn gán file đó vào "Lớp mấy", "Môn gì" ngay khi upload.
Quản lý dữ liệu bóc tách: Một bảng hiển thị toàn bộ nội dung văn bản mà AI đã "đọc" được từ sách. Bạn có thể Sửa trực tiếp các đoạn chữ bị lỗi font hoặc Xóa những đoạn rác để AI không trả lời sai.
4.2. Cấu hình AI & Hệ thống (Thay đổi thông số không dùng code)
Quản lý API Key (Xoay vòng Key): Một ô nhập liệu để bạn dán các API Key của Gemini. Khi một key hết hạn, bạn chỉ cần lên đây dán key mới và bấm "Lưu". Code sẽ tự động nhận key mới từ Database.
Chỉnh sửa Persona (Prompt): Một khung văn bản cho phép bạn sửa "tính cách" của Gia sư.
Ví dụ: Bạn muốn AI xưng là "Thầy" thay vì "Anh", bạn chỉ cần sửa trong ô này trên web là xong.
Điều chỉnh tham số AI: Các thanh trượt (Slider) để chỉnh độ thông minh hoặc độ sáng tạo (Temperature) của AI mà không cần tìm file Python để sửa.
4.3. Quản lý Người dùng (User Control)
Danh sách học sinh: Xem toàn bộ thông tin các bạn đã đăng ký (Email, Họ tên, Lớp).
Phân quyền & Bảo mật:
Nút Khóa tài khoản nếu thấy ai đó dùng quá nhiều hoặc vi phạm quy định.
Nút Reset mật khẩu cho học sinh nếu các bạn ấy lỡ quên.
Nút Nâng cấp Admin để bạn có thể cấp quyền cho 2 bạn cùng nhóm (Hà Kiên và bạn làm Frontend) cùng quản trị.
4.4. Theo dõi & Báo cáo (System Monitoring)
Biểu đồ sử dụng: Xem hôm nay hệ thống đã trả lời bao nhiêu câu hỏi, dung lượng bộ nhớ còn bao nhiêu.
Nhật ký lỗi (Error Log): Hiển thị các lỗi kỹ thuật dưới dạng danh sách (ví dụ: "File PDF quá nặng không xử lý được"). Bạn nhìn vào đây để biết hệ thống đang "ốm" ở đâu mà xử lý.

Thành phần
Công việc cụ thể
Đầu vào (Input)
Đầu ra (Output)
Backend 
1. API nhận file hàng loạt & gán nhãn Lớp/Môn.
2. Logic cập nhật API Key & Prompt từ DB vào hệ thống.
3. API CRUD (Thêm/Sửa/Xóa) người dùng.
File PDF/Ảnh, Chuỗi ký tự (Key/Prompt), ID người dùng.
Trạng thái Upload, Danh sách User, Thông báo cập nhật Config thành công.
Frontend 
1. Thiết kế Dashboard (Bảng điều khiển) Admin.
2. Làm form cấu hình AI (Ô nhập key, thanh trượt tham số).
3. Biểu đồ theo dõi lỗi & lượt dùng.
Data từ Backend (Logs, Users, Configs).
Giao diện điều khiển "No-code" trực quan.
Database 
1. Tạo bảng system_configs (lưu API Key, Prompts).
2. Lưu trữ log hệ thống và lỗi.
3. Phân quyền Admin truy cập trang (RLS).
Lệnh lưu cấu hình mới, Dữ liệu log lỗi từ Backend.
Các tham số cấu hình mới nhất cho Backend chạy.



🌐 MODULE 5: LANDING PAGE (MẶT TIỀN DỰ ÁN)
Đây là trang "chào hàng", giúp người dùng hiểu giá trị dự án trước khi đăng ký.
5.1. Hero Section (Phần đầu trang):
Slogan ấn tượng và nút "Học ngay" dẫn thẳng đến trang Đăng ký/Đăng nhập.
5.2. Quick Demo (Bản dùng thử nhanh):
Một khung chat nhỏ cho phép hỏi thử AI 1-3 câu để thấy độ thông minh của "Gia sư" mà chưa cần tạo tài khoản.
5.3. Features Overview (Giới thiệu tính năng):
Hiển thị các thẻ tính năng: Gia sư RAG, Học tập trung (Focus Mode), Giảng bài bằng giọng nói.
5.4. Hướng dẫn sử dụng (User Guide):
Quy trình 3 bước đơn giản: Nạp tài liệu -> Chọn cấp lớp -> Tương tác cùng AI.

📈 MODULE 6: TIẾN ĐỘ & THÀNH TÍCH (GAMIFICATION)
Hệ thống tạo động lực, giúp học sinh duy trì thói quen học tập mỗi ngày.
6.1. Nhật ký học tập (Learning Log):
Biểu đồ thống kê thời gian học và các môn học quan tâm nhất.
6.2. Chuỗi ngày học tập (Streaks):
Đếm số ngày học liên tiếp (giống Duolingo) để khuyến khích học sinh không bỏ lỡ ngày nào.
6.3. Hệ thống Huy hiệu (Badges):
Tặng huy hiệu ảo: "Chiến thần Toán học", "Cây bút chăm chỉ", "Nhà thông thái lớp 1" khi đạt mốc câu hỏi hoặc thời gian học nhất định.
6.4. Gợi ý lộ trình (Smart Recommendations):
AI dựa vào lịch sử chat để gợi ý bài học hoặc tài liệu tiếp theo phù hợp với trình độ

Thành phần
Công việc cụ thể
Đầu vào (Input)
Đầu ra (Output)
Backend 
1. API tính toán Streak & Thống kê.
2. Logic gợi ý bài học thông minh.
Lịch sử chat, Thời gian đăng nhập.
Dữ liệu biểu đồ, Danh sách huy hiệu đạt được.
Frontend 
1. Thiết kế Landing Page có hiệu ứng.
2. Làm UI cho trang Dashboard cá nhân.
Dữ liệu thống kê từ Backend.
Trang chủ hấp dẫn, Trang cá nhân đầy thành tích.
Database
1. Quản lý bảng badges & streaks.
2. Lưu trữ log hoạt động của người dùng.
Sự kiện học tập từ hệ thống.
Cập nhật thứ hạng và huy hiệu thời gian thực.

