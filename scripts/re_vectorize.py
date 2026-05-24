import os
import sys

# Thêm thư mục api vào sys.path để import được core_logic
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

from core_logic import supabase, save_document_to_db

def run():
    print("🔍 Đang tìm các tài liệu chưa có Vector (embedding IS NULL)...")
    
    # Lấy các documents có content nhưng chưa có embedding
    try:
        res = supabase.table("documents").select("id, name, content").is_("embedding", "null").neq("content", "").execute()
        docs = res.data
        if not docs:
            print("✅ Tất cả tài liệu đều đã có vector!")
            return
            
        print(f"🚀 Tìm thấy {len(docs)} tài liệu cần tạo vector. Đang xử lý...")
        
        success_count = 0
        for doc in docs:
            doc_id = doc['id']
            name = doc['name']
            content = doc['content']
            
            print(f"⏳ Đang tạo vector cho: {name}...")
            result = save_document_to_db(content, name, doc_id)
            
            if "Thành công" in result:
                print(f"  ✅ Thành công: {name}")
                success_count += 1
            else:
                print(f"  ❌ Lỗi với {name}: {result}")
                
        print(f"🎉 Đã hoàn thành! Thành công {success_count}/{len(docs)} tài liệu.")
        
    except Exception as e:
        print(f"❌ Lỗi truy vấn database: {e}")

if __name__ == "__main__":
    run()
