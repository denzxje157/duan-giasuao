import os
import sys
import uuid
import time
import concurrent.futures
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client

# Tự động tải thư viện (để in tiến độ đẹp mắt)
try:
    from tqdm import tqdm
except ImportError:
    import subprocess
    print("⏳ Đang cài đặt thư viện hiển thị tiến độ (tqdm)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "tqdm"])
    from tqdm import tqdm

try:
    from markitdown import MarkItDown
except ImportError:
    print("❌ Vui lòng chạy lệnh: pip install markitdown pypdf")
    sys.exit(1)

# 1. LOAD BIẾN MÔI TRƯỜNG
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Lỗi: Không tìm thấy SUPABASE_URL hoặc SUPABASE_KEY trong file .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Lấy danh sách API Keys
API_KEYS = []
for i in range(1, 20):
    key = os.getenv(f"GEMINI_API_KEY_{i}")
    if key:
        API_KEYS.append(key)

if not API_KEYS:
    # Thử lấy key mặc định
    default_key = os.getenv("GEMINI_API_KEY")
    if default_key:
        API_KEYS.append(default_key)

if not API_KEYS:
    print("❌ Lỗi: Không tìm thấy bất kỳ GEMINI_API_KEY nào trong file .env")
    sys.exit(1)

print(f"🔑 Tìm thấy {len(API_KEYS)} API Keys. Sẵn sàng ép xung!")

# Cấu hình Chunking
CHUNK_SIZE = 1200 # Số ký tự mỗi chunk
CHUNK_OVERLAP = 200

def split_text(text: str, chunk_size: int, overlap: int):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
    return chunks

def embed_chunk(chunk: str, chunk_idx: int):
    """
    Hàm mã hóa 1 đoạn văn bản thành Vector.
    Nó sẽ tự động đảo vòng qua các API Key để không bị giới hạn.
    """
    for attempt in range(len(API_KEYS) * 2): # Thử lại tối đa 2 vòng
        key_idx = (chunk_idx + attempt) % len(API_KEYS)
        current_key = API_KEYS[key_idx]
        genai.configure(api_key=current_key)
        
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=chunk
            )
            # Chuẩn hóa vector 768 chiều (đề phòng)
            vector = result['embedding']
            if isinstance(vector[0], list):
                vector = vector[0][:768]
            else:
                vector = vector[:768]
            
            return vector
        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "quota" in err_msg:
                # Bị giới hạn rate limit, thử key tiếp theo
                time.sleep(1)
                continue
            else:
                # Lỗi khác (mạng, vv), thử lại sau 2s
                time.sleep(2)
    
    print(f"⚠️ Chunk {chunk_idx} thất bại sau nhiều lần thử!")
    return None

import json
import re
import glob

# File lưu vết các sách đã xử lý
TRACKER_FILE = os.path.join(os.path.dirname(__file__), "processed_files.json")

def load_tracker():
    if os.path.exists(TRACKER_FILE):
        with open(TRACKER_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_tracker(file_name):
    tracker = load_tracker()
    if file_name not in tracker:
        tracker.append(file_name)
        with open(TRACKER_FILE, "w", encoding="utf-8") as f:
            json.dump(tracker, f, ensure_ascii=False, indent=4)

def infer_metadata_from_filename(filename):
    """
    Tự động suy luận Lớp và Môn từ tên file.
    Hỗ trợ các định dạng: Toan_12.pdf, tieng-anh-lop-10.pdf, SGK_Vat_Ly_11.pdf
    """
    basename = os.path.basename(filename).lower()
    
    # Tìm lớp (số từ 1 đến 12)
    grade = "12" # Mặc định
    grade_match = re.search(r'(?:lop|lớp|-|_|^)\s*([1-9]|1[0-2])\b', basename)
    if grade_match:
        grade = grade_match.group(1)
        
    # Tìm môn học
    subject = "Chung"
    if any(k in basename for k in ["toan", "toán"]): subject = "Toán Học"
    elif any(k in basename for k in ["ly", "lý", "vat", "vật"]): subject = "Vật Lý"
    elif any(k in basename for k in ["hoa", "hóa"]): subject = "Hóa Học"
    elif any(k in basename for k in ["anh", "english"]): subject = "Tiếng Anh"
    elif any(k in basename for k in ["van", "văn", "ngu"]): subject = "Ngữ Văn"
    elif any(k in basename for k in ["tieng viet", "tiếng việt"]): subject = "Tiếng Việt"
    elif any(k in basename for k in ["sinh"]): subject = "Sinh Học"
    elif any(k in basename for k in ["su", "sử"]): subject = "Lịch Sử"
    elif any(k in basename for k in ["dia", "địa"]): subject = "Địa Lý"
    elif any(k in basename for k in ["tin"]): subject = "Tin Học"
    elif any(k in basename for k in ["cong nghe", "công nghệ"]): subject = "Công Nghệ"
    elif any(k in basename for k in ["gdcd", "giáo dục công dân", "cong dan"]): subject = "GDCD"
    elif any(k in basename for k in ["the chat", "thể chất"]): subject = "Giáo Dục Thể Chất"
    elif any(k in basename for k in ["tu nhien", "tự nhiên", "xa hoi", "xã hội"]): subject = "Tự Nhiên & Xã Hội"
    elif any(k in basename for k in ["dao duc", "đạo đức"]): subject = "Đạo Đức"
    
    return grade, subject

def process_directory(directory_path: str):
    print(f"📂 Đang quét thư mục: {directory_path}")
    pdf_files = glob.glob(os.path.join(directory_path, "**/*.pdf"), recursive=True)
    pdf_files.extend(glob.glob(os.path.join(directory_path, "**/*.docx"), recursive=True))
    
    if not pdf_files:
        print("❌ Không tìm thấy file PDF hoặc DOCX nào trong thư mục này.")
        return

    tracker = load_tracker()
    files_to_process = [f for f in pdf_files if os.path.basename(f) not in tracker]
    
    print(f"📦 Tìm thấy tổng cộng {len(pdf_files)} file. Có {len(files_to_process)} file MỚI cần xử lý.")
    
    for file_path in files_to_process:
        filename = os.path.basename(file_path)
        grade, subject = infer_metadata_from_filename(filename)
        
        print("\n" + "="*50)
        print(f"▶️ BẮT ĐẦU XỬ LÝ: {filename}")
        print(f"🏷️ Phân tích tự động -> Lớp: {grade} | Môn: {subject}")
        
        success = process_file(file_path, grade, subject)
        if success:
            save_tracker(filename)
            print(f"✅ Đã lưu vết: {filename} (Lần sau chạy sẽ tự động bỏ qua)")

def process_file(file_path: str, grade: str, subject: str):
    print(f"📄 Đang đọc file: {file_path}")
    content = ""
    try:
        md = MarkItDown()
        result = md.convert(file_path)
        content = result.text_content
    except Exception as e:
        print(f"⚠️ MarkItDown lỗi: {e}. Đang thử dùng pdfplumber làm phương án dự phòng...")
        try:
            import pdfplumber
            pages = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        pages.append(text)
            content = "\n\n".join(pages)
            if not content.strip():
                raise Exception("pdfplumber extracted empty content (Có thể đây là file scan/hình ảnh không có text)")
        except Exception as e2:
            print(f"❌ Lỗi khi đọc file: {e2}")
            return False

    print(f"✂️ Đang chia nhỏ văn bản ({len(content)} ký tự)...")
    chunks = split_text(content, CHUNK_SIZE, CHUNK_OVERLAP)
    print(f"📊 Tổng số đoạn (Chunks) tạo ra: {len(chunks)}")
    
    print(f"🚀 BẮT ĐẦU ÉP XUNG VECTOR HÓA (Đa luồng với {len(API_KEYS)} keys)...")
    
    processed_data = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        future_to_chunk = {executor.submit(embed_chunk, chunk, i): (i, chunk) for i, chunk in enumerate(chunks)}
        
        for future in tqdm(concurrent.futures.as_completed(future_to_chunk), total=len(chunks), desc="Đang mã hóa"):
            i, chunk = future_to_chunk[future]
            try:
                vector = future.result()
                if vector:
                    doc_id = str(uuid.uuid4())
                    processed_data.append({
                        "id": doc_id,
                        "content": chunk,
                        "embedding": vector,
                        "grade": grade,
                        "subject": subject,
                        "status": "ready"
                    })
            except Exception as exc:
                print(f"❌ Chunk {i} sinh ra Exception: {exc}")

    print(f"✅ Mã hóa thành công {len(processed_data)}/{len(chunks)} đoạn.")
    
    if processed_data:
        print("💾 Đang lưu vào Database (Supabase)...")
        batch_size = 100
        for i in tqdm(range(0, len(processed_data), batch_size), desc="Đang lưu DB"):
            batch = processed_data[i:i+batch_size]
            try:
                supabase.table("documents").insert(batch).execute()
            except Exception as e:
                print(f"⚠️ Lỗi khi insert batch {i}-{i+batch_size}: {e}")
                return False
                
        print("🎉 HOÀN TẤT XỬ LÝ SÁCH NÀY!")
        return True
    return False

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Tool Băm Sách Đa Luồng Tự Động (Auto-Ingest)")
    parser.add_argument("--dir", help="Thư mục chứa các file PDF (nếu muốn xử lý hàng loạt)")
    parser.add_argument("--file", help="Đường dẫn đến 1 file PDF cụ thể (nếu chỉ muốn chạy 1 file)")
    parser.add_argument("--grade", help="Ép buộc lớp học (VD: 12) - Bỏ qua sẽ tự động suy luận")
    parser.add_argument("--subject", help="Ép buộc môn học (VD: Vật Lý) - Bỏ qua sẽ tự động suy luận")
    
    args = parser.parse_args()
    
    if args.dir:
        if not os.path.exists(args.dir):
            print(f"❌ Lỗi: Thư mục '{args.dir}' không tồn tại!")
            sys.exit(1)
        process_directory(args.dir)
    elif args.file:
        if not os.path.exists(args.file):
            print(f"❌ Lỗi: File '{args.file}' không tồn tại!")
            sys.exit(1)
        
        grade, subject = args.grade, args.subject
        if not grade or not subject:
            g, s = infer_metadata_from_filename(os.path.basename(args.file))
            grade = grade or g
            subject = subject or s
            print(f"💡 Tự động suy luận: Lớp {grade}, Môn {subject}")
            
        success = process_file(args.file, grade, subject)
        if success:
            save_tracker(os.path.basename(args.file))
    else:
        print("❌ Lỗi: Vui lòng cung cấp tham số --dir (chạy thư mục) hoặc --file (chạy 1 file).")
        print("Ví dụ: python tools/fast_ingest.py --dir \"C:\\ThuMucSach\"")
