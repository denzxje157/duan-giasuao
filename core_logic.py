import os
import uuid
import google.generativeai as genai
from supabase import create_client
from dotenv import load_dotenv

# Import MinerU (Magic-PDF)
from magic_pdf.pipe.tokendocs_api_doc_py_pdf_no_image import parse_pdf 

# PHẢI NẰM Ở ĐÂY để nạp link của Kiên trước khi tạo Client
load_dotenv() 

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print(f"🔗 CORE_LOGIC ĐANG TRỎ VỀ: {SUPABASE_URL}")

# Tạo client Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Danh sách Model tự động lùi cấp khi bị quá tải
MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash"
]

def get_all_keys():
    """Lấy toàn bộ Key từ DB và .env gom vào một danh sách để xoay vòng"""
    keys = []
    try:
        res = supabase.table("system_configs").select("key_value").eq("key_name", "GEMINI_API_KEY").execute()
        if res.data and len(res.data) > 0:
            db_key = res.data[0]['key_value'].strip()
            if db_key: keys.append(db_key)
    except Exception:
        pass
    
    for i in range(1, 10):
        env_key = os.getenv(f"GEMINI_API_KEY_{i}")
        if env_key and env_key.strip() not in keys:
            keys.append(env_key.strip())
            
    return keys

def process_pdf_to_latex(file_bytes, mime_type):
    """Sử dụng MinerU để chuyển đổi PDF thành Markdown/LaTeX chất lượng cao"""
    # Tạo file tạm để MinerU đọc
    temp_pdf_path = f"temp_{uuid.uuid4()}.pdf"
    try:
        with open(temp_pdf_path, "wb") as f:
            f.write(file_bytes)
        
        # MinerU bóc tách file
        markdown_content = parse_pdf(temp_pdf_path)
        return markdown_content
    except Exception as e:
        print(f"❌ Lỗi xử lý MinerU: {str(e)}")
        return "Lỗi: Không thể bóc tách file PDF bằng MinerU."
    finally:
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

def save_document_to_db(text_content, source_name, doc_id):
    keys = get_all_keys()
    
    for api_key in keys:
        genai.configure(api_key=api_key)
        try:
            # MinerU trả về nội dung Markdown sạch, AI sẽ nhúng tốt hơn
            safe_content = text_content[:9000]
            result = genai.embed_content(
                model="models/gemini-embedding-2",
                content=safe_content
            )
            
            vector = result['embedding']
            if isinstance(vector[0], list):
                vector = vector[0][:768]
            else:
                vector = vector[:768]
            
            supabase.table("documents").update({
                "content": safe_content,
                "embedding": vector,
                "status": "ready"
            }).eq("id", doc_id).execute()
            
            return "Thành công"
        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "quota" in err_msg:
                continue
            else:
                return f"Lỗi: {str(e)}"
                
    return "Lỗi: Không thể tạo Vector vì tất cả API Key đều hết hạn mức."

def get_ai_response_stream_with_history(question, session_id=None):
    """Hệ thống RAG tối thượng: Streaming + Trí nhớ + Kỷ luật thép + Xoay vòng Key"""
    keys = get_all_keys()
    if not keys:
        yield "Hệ thống chưa được cấu hình API Key!"
        return
        
    # ====================================================
    # 1. BỌC THÉP LỌC RÁC & KIỂM TRA CHUẨN UUID
    # ====================================================
    is_valid_uuid = False
    if session_id:
        session_id = session_id.replace("[SESSION_ID:", "").replace("SESSION_ID:", "").replace("]", "").strip()
        try:
            uuid.UUID(session_id)
            is_valid_uuid = True
        except ValueError:
            is_valid_uuid = False

    chat_history = []
    # Nếu không truyền ID, hoặc truyền chữ rác -> Tự mở cuộc trò chuyện mới
    if not is_valid_uuid:
        res = supabase.table("chat_sessions").insert({"messages": []}).execute()
        session_id = str(res.data[0]['id'])
    else:
        # Nếu đúng ID xịn -> Lấy lại ký ức cũ
        res = supabase.table("chat_sessions").select("messages").eq("id", session_id).execute()
        if res.data and res.data[0]['messages']:
            chat_history = res.data[0]['messages']

    history_text = ""
    for msg in chat_history:
        role = "Học sinh" if msg["role"] == "user" else "Gia sư"
        history_text += f"{role}: {msg['content']}\n\n"

    # Bắn Session ID cho Frontend 1 lần duy nhất ở nhịp đầu tiên
    yield f"[SESSION_ID:{session_id}]\n\n"

    last_error = None

    # ====================================================
    # 2. VÒNG LẶP XOAY TUA API KEY
    # ====================================================
    for api_key in keys:
        genai.configure(api_key=api_key)
        try:
            # Tìm kiến thức Vector
            question_embedding_res = genai.embed_content(
                model="models/gemini-embedding-2",
                content=question,
                task_type="retrieval_query"
            )
            question_vector = question_embedding_res['embedding']
            if isinstance(question_vector[0], list):
                question_vector = question_vector[0][:768]
            else:
                question_vector = question_vector[:768]

            search_res = supabase.rpc("match_documents", {
                "query_embedding": question_vector,
                "match_threshold": 0.5,
                "match_count": 3
            }).execute()

            context = ""
            if search_res.data:
                context = "\n".join([item['content'] for item in search_res.data])
            else:
                context = "Không tìm thấy dữ liệu liên quan trong sách."

            # ====================================================
            # 3. PROMPT TRÓI BUỘC KIẾN THỨC (CHỐNG CHÉM GIÓ)
            # ====================================================
            prompt = f"""
            Bạn là Gia sư ảo  - Chuyên gia giảng dạy.
            
            LỊCH SỬ TRÒ CHUYỆN:
            {history_text}
            
            KIẾN THỨC TỪ SÁCH:
            {context}
            
            CÂU HỎI MỚI NHẤT CỦA HỌC SINH:
            {question}
            
            YÊU CẦU QUAN TRỌNG (BẮT BUỘC TUÂN THỦ): 
            1. Trả lời thân thiện, xưng hô 'Gia sư' và 'Học sinh'.
            2. CHỈ ĐƯỢC PHÉP trả lời dựa trên phần "KIẾN THỨC TỪ SÁCH" được cung cấp.
            3. Nếu phần "KIẾN THỨC TỪ SÁCH" ghi là "Không tìm thấy dữ liệu..." hoặc không chứa đủ thông tin để trả lời, bạn TUYỆT ĐỐI KHÔNG được tự dùng kiến thức bên ngoài của bạn. 
            4. Trong trường hợp không có dữ liệu, BẮT BUỘC phải trả lời chính xác câu này: "Hiện tại Gia sư chưa được nạp dữ liệu về sách/tài liệu này. Học sinh vui lòng upload tài liệu lên hệ thống để Gia sư học nhé!"
            """
            
            response = None
            # ====================================================
            # 4. VÒNG LẶP XOAY MODEL (TỪ LITE ĐẾN FLASH)
            # ====================================================
            for model_name in MODELS:
                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(prompt, stream=True)
                    break # Ăn điểm thì dừng, không thử model sau nữa
                except Exception as e:
                    err_str = str(e).lower()
                    if "429" in err_str or "quota" in err_str:
                        print(f"⚠️ Con AI {model_name} bị quá tải, thử gọi con tiếp theo...")
                        continue
                    else:
                        raise e

            if not response:
                raise Exception("429 Quota Exhausted on all models")
            
            # Nhả chữ cho Frontend
            full_answer = ""
            for chunk in response:
                if chunk.text:
                    full_answer += chunk.text
                    yield chunk.text

            # Lưu vào Database trí nhớ của Kiên
            chat_history.append({"role": "user", "content": question})
            chat_history.append({"role": "model", "content": full_answer})
            supabase.table("chat_sessions").update({"messages": chat_history}).eq("id", session_id).execute()

            return # Mọi thứ thành công thì DỪNG LẠI, không thử Key kế tiếp

        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str or "exhausted" in err_str:
                print(f"⚠️ Key {api_key[:10]}... báo hết hạn mức (429), TỰ ĐỘNG ĐỔI KEY KHÁC...")
                last_error = e
                continue # Bỏ key này, quay lại vòng lặp ngoài lấy Key dự phòng
            else:
                print(f"❌ Lỗi RAG (không phải 429): {e}")
                yield "Hệ thống đang gặp sự cố, vui lòng thử lại sau!"
                return

    # Khúc này là "Đầu hàng" nếu cả 3 Key đều sập
    if last_error:
        yield "Toàn bộ API Key dự phòng đều đã hết hạn mức. Vui lòng quay lại sau ít phút!"