import os
import sys
import uuid
import warnings
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Bỏ qua các cảnh báo không cần thiết
warnings.filterwarnings("ignore")

# Import các hàm từ core_logic trong thư mục api
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))
try:
    from core_logic import supabase, save_document_to_db
except ImportError as e:
    print(f"❌ Lỗi import: {e}. Vui lòng chạy script từ thư mục gốc của dự án.")
    sys.exit(1)

HTML_FOLDER = r"c:\Users\Admin\Downloads\All-Project\duan-giasuao\downloads"
BUCKET_NAME = "giasuao"

def clean_database_and_storage():
    print("\n🧹 ĐANG DỌN DẸP DỮ LIỆU RÁC...")
    
    # 1. Xóa toàn bộ dữ liệu trong bảng documents
    try:
        # Lấy danh sách ID để xóa
        res = supabase.table("documents").select("id").execute()
        ids_to_delete = [row["id"] for row in res.data]
        if ids_to_delete:
            supabase.table("documents").delete().in_("id", ids_to_delete).execute()
            print(f"✅ Đã xóa {len(ids_to_delete)} bản ghi rác trong bảng 'documents'.")
        else:
            print("✅ Bảng 'documents' đã sạch, không có bản ghi nào.")
    except Exception as e:
        print(f"⚠️ Lỗi khi xóa dữ liệu bảng documents: {e}")

    # 2. Xóa toàn bộ file trong bucket storage
    try:
        # Lấy danh sách files trong thư mục books/
        files = supabase.storage.from_(BUCKET_NAME).list("books")
        file_paths = [f"books/{file['name']}" for file in files if file['name'] != '.emptyFolderPlaceholder']
        if file_paths:
            supabase.storage.from_(BUCKET_NAME).remove(file_paths)
            print(f"✅ Đã xóa {len(file_paths)} file rác trong thư mục 'books' của Storage.")
        else:
            print("✅ Thư mục 'books' trong Storage đã sạch.")
    except Exception as e:
        print(f"⚠️ Lỗi khi xóa file trong Storage: {e}")
        
    print("✨ Quá trình dọn dẹp hoàn tất!\n")

def process_and_upload_html_files():
    if not os.path.exists(HTML_FOLDER):
        print(f"❌ Không tìm thấy thư mục: {HTML_FOLDER}")
        return

    files_to_upload = [f for f in os.listdir(HTML_FOLDER) if f.lower().endswith('.html')]
    if not files_to_upload:
        print("❌ Không có file HTML nào trong thư mục.")
        return

    print(f"🚀 Bắt đầu xử lý và tải lên {len(files_to_upload)} file HTML...\n")
    success_count = 0

    for filename in files_to_upload:
        file_path = os.path.join(HTML_FOLDER, filename)
        print(f"🔄 Đang xử lý: {filename}")
        
        try:
            # 1. Đọc và bóc tách nội dung HTML
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            # Lấy toàn bộ text, loại bỏ các thẻ script/style
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            text_content = soup.get_text(separator='\n')
            
            # Làm sạch text (xóa các dòng trống thừa)
            lines = (line.strip() for line in text_content.splitlines())
            text_content = '\n'.join(line for line in lines if line)
            
            if not text_content.strip():
                print(f"  ⚠️ File {filename} không có nội dung chữ, bỏ qua.")
                continue

            # 2. Upload file HTML gốc lên Storage
            safe_id = str(uuid.uuid4())
            storage_path = f"books/{safe_id}.html"
            
            with open(file_path, 'rb') as f:
                supabase.storage.from_(BUCKET_NAME).upload(
                    storage_path, 
                    f.read(), 
                    file_options={"content-type": "text/html"}
                )
            file_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)

            # Lấy thông tin lớp từ tên file nếu có
            grade = "12" if "12" in filename else "1"

            # 3. Tạo bản ghi trong bảng documents
            doc_data = {
                "id": safe_id,
                "name": filename,
                "pdf_url": file_url,  # Dùng chung trường pdf_url để chứa link file
                "thumbnail_url": "",
                "grade": grade,
                "status": "processing",
                "content": text_content
            }
            supabase.table("documents").insert(doc_data).execute()

            # 4. Nhúng vector (Embedding) và cập nhật
            res_msg = save_document_to_db(text_content, filename, safe_id)
            if "Thành công" in res_msg:
                print(f"  ✅ Tải lên & Tạo Vector thành công: {filename}")
                success_count += 1
            else:
                print(f"  ⚠️ Đã tải lên, nhưng lỗi Vector: {res_msg}")

        except Exception as e:
            print(f"  ❌ Lỗi khi xử lý file {filename}: {e}")

    print(f"\n🎉 HOÀN TẤT! Đã tải lên thành công {success_count}/{len(files_to_upload)} file.")

if __name__ == "__main__":
    load_dotenv()
    
    print("=== CÔNG CỤ QUẢN LÝ DỮ LIỆU GIA SƯ ẢO ===")
    print("1. Chỉ dọn dẹp dữ liệu rác (Xóa sạch DB & Storage)")
    print("2. Chỉ tải lên dữ liệu HTML mới")
    print("3. Dọn dẹp RỒI MỚI tải lên dữ liệu HTML mới")
    
    choice = input("👉 Chọn một hành động (1/2/3): ").strip()
    
    if choice == "1":
        clean_database_and_storage()
    elif choice == "2":
        process_and_upload_html_files()
    elif choice == "3":
        clean_database_and_storage()
        process_and_upload_html_files()
    else:
        print("❌ Lựa chọn không hợp lệ.")
