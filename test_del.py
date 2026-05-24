import os
import sys

# Thêm đường dẫn tới thư mục api
sys.path.insert(0, os.path.join(r'c:\Users\Admin\Downloads\All-Project\duan-giasuao', 'api'))
from core_logic import supabase

def delete_all_files():
    bucket = 'giasuao'
    folder = 'books'
    
    # Lấy 1000 file mỗi lần
    res = supabase.storage.from_(bucket).list(folder, {'limit': 1000})
    print(f"Tổng số file tìm thấy trong lần quét này: {len(res)}")
    
    if len(res) > 0:
        paths = [f"{folder}/{f['name']}" for f in res if f['name'] != '.emptyFolderPlaceholder']
        if not paths:
            print("Không còn file nào để xóa (chỉ có thư mục rỗng).")
            return
            
        print(f"Đang tiến hành xóa {len(paths)} files...")
        
        # Chia nhỏ ra mỗi lần xóa 50 file để tránh lỗi payload quá lớn hoặc timeout
        chunk_size = 50
        deleted_count = 0
        for i in range(0, len(paths), chunk_size):
            chunk = paths[i:i+chunk_size]
            try:
                del_res = supabase.storage.from_(bucket).remove(chunk)
                
                # Check kết quả xóa. 
                # Nếu del_res có lỗi, nó thường trả về dict chứa "error", hoặc list rỗng nếu thành công nhưng ko tìm thấy.
                if isinstance(del_res, list):
                    deleted_count += len(del_res)
                    print(f" - Đã xóa chunk {i//chunk_size + 1}: {len(del_res)} files")
                elif hasattr(del_res, 'error') or (isinstance(del_res, dict) and 'error' in del_res):
                    print(f" ❌ Lỗi khi xóa chunk {i//chunk_size + 1}: {del_res}")
                else:
                    print(f" ⚠️ Phản hồi không rõ ràng khi xóa chunk {i//chunk_size + 1}: {del_res}")
            except Exception as e:
                print(f" ❌ Exception khi xóa: {e}")
                
        print(f"Kết thúc tiến trình xóa. Số lượng file phản hồi đã xóa: {deleted_count}")
    else:
        print("Bucket đã sạch!")

if __name__ == "__main__":
    delete_all_files()
