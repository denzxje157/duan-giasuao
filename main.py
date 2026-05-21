from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from uuid import uuid4
import json

# Đảm bảo load_dotenv được gọi sớm nhất có thể
from dotenv import load_dotenv
load_dotenv()

from core_logic import (
    get_ai_response_stream_with_history, 
    supabase,
    process_pdf_to_markdown,
)

app = FastAPI(title="GiaSuAo API - Hệ thống Gia sư Thông minh")

# Configure CORS: prefer explicit allowed origins from environment for production
frontend_url = os.getenv("FRONTEND_URL")
vercel_deploy = os.getenv("VERCEL_URL")

allowed_origins = []
if frontend_url:
    allowed_origins.append(frontend_url)
elif vercel_deploy:
    # VERCEL_URL is like "my-project.vercel.app"; build full https URL
    allowed_origins.append(f"https://{vercel_deploy}")
else:
    # Fallback to allow all during local development
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# CÁC MODEL DỮ LIỆU (ĐẦU VÀO)
# ==========================================
class ChatRequest(BaseModel):
    question: str
    session_id: str = None  

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    grade: str 

class LoginRequest(BaseModel):
    email: str
    password: str

class ConfigUpdateRequest(BaseModel):
    key_name: str     
    key_value: str    

# ==========================================
# CÁC CỔNG API GIAO TIẾP
# ==========================================

@app.get("/")
def home():
    url = os.getenv("SUPABASE_URL")
    print(f"📡 API ĐANG KẾT NỐI VỚI SUPABASE: {url}")
    return {
        "status": "online", 
        "connecting_to": url,
        "message": "Hệ thống Gia sư Thông minh đã sẵn sàng!"
    }

# --- 1. TÀI KHOẢN (AUTH) ---
@app.post("/register")
def register_user(req: RegisterRequest):
    try:
        clean_email = req.email.strip()
        res = supabase.auth.sign_up({
            "email": clean_email,
            "password": req.password
        })
        
        if not res.user:
            raise Exception("Supabase Auth không trả về User ID. Kiểm tra cấu hình Confirm Email!")

        user_id = res.user.id
        
        profile_data = {
            "id": user_id,
            "email": clean_email,
            "full_name": req.full_name,
            "grade": req.grade,
            "role": "student"
        }
        
        supabase.table("profiles").insert(profile_data).execute()

        return {
            "status": "success", 
            "message": "Đăng ký thành công!", 
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi đăng ký: {str(e)}")

@app.post("/login")
def login_user(req: LoginRequest):
    try:
        clean_email = req.email.strip()
        res = supabase.auth.sign_in_with_password({
            "email": clean_email,
            "password": req.password
        })
        
        user_id = res.user.id
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        user_data = {"id": user_id, "email": clean_email}
        if profile_res.data:
            user_data.update(profile_res.data[0])

        return {
            "status": "success",
            "message": "Đăng nhập thành công!",
            "token": res.session.access_token,
            "user": user_data
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Sai email hoặc mật khẩu!")

# --- 2. UPLOAD TÀI LIỆU (CHỈ ĐẨY VÀO KHO CHỜ COLAB XỬ LÝ) ---
@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    grade: str = "1"
):
    MAX_FILE_SIZE = 10 * 1024 * 1024 
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File quá lớn! Vui lòng upload file dưới 10MB.")

    allowed_exts = (".pdf", ".jpg", ".jpeg", ".png")
    if not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF, JPG, PNG!")

    bucket_name = "giasuao"
    safe_id = str(uuid4()) 
    ext = os.path.splitext(file.filename)[1].lower()
    file_path = f"books/{safe_id}{ext}"
    
    supabase.storage.from_(bucket_name).upload(file_path, file_bytes, file_options={"content-type": file.content_type})
    file_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

    doc_data = {
        "name": file.filename, 
        "pdf_url": file_url,
        "thumbnail_url": "", # Tạm thời để trống, Worker trên Colab có thể xử lý sau nếu cần
        "grade": grade,
        "status": "processing" # <-- Để trạng thái chờ cho Colab hút về xử lý
    }
    res = supabase.table("documents").insert(doc_data).execute()
    # Try to process the PDF immediately to Markdown and store result
    try:
        markdown_content = process_pdf_to_markdown(file_bytes, file.content_type)
        # Update DB record with markdown and status ready
        # Save extracted markdown into existing `content` field to avoid schema mismatch
        supabase.table("documents").update({
            "content": markdown_content,
            "status": "ready"
        }).eq("pdf_url", file_url).execute()
        return {
            "status": "success",
            "data": {**doc_data, "content": markdown_content}
        }
    except Exception as e:
        # If processing fails, keep status as processing for background worker
        print(f"⚠️ Lỗi khi xử lý PDF ngay lập tức: {e}")
        return {"status": "success", "data": doc_data, "warning": str(e)}

# --- 3. CHAT VỚI AI ---
@app.post("/chat")
def chat(req: ChatRequest):
    def event_stream():
        # Indicate format once at the start
        yield 'data: {"meta":"format","format":"markdown"}\n\n'
        for chunk in get_ai_response_stream_with_history(req.question, req.session_id):
            # Wrap each chunk as JSON with format indicator
            safe_chunk = chunk.replace('\n', '\\n') if isinstance(chunk, str) else str(chunk)
            payload = {"chunk": safe_chunk, "format": "markdown"}
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# --- 4. ADMIN: QUẢN LÝ CẤU HÌNH HỆ THỐNG ---
@app.get("/admin/configs")
def get_system_configs():
    try:
        res = supabase.table("system_configs").select("*").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy cấu hình: {str(e)}")

@app.post("/admin/configs")
def update_system_config(req: ConfigUpdateRequest):
    try:
        supabase.table("system_configs").upsert({
            "key_name": req.key_name,
            "key_value": req.key_value
        }, on_conflict="key_name").execute()
        
        return {"status": "success", "message": f"Đã cập nhật thành công {req.key_name}!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật cấu hình: {str(e)}")
    
# --- 5. ADMIN: QUẢN LÝ HỌC SINH ---
@app.get("/admin/users")
def get_all_users():
    try:
        res = supabase.table("profiles").select("id, email, full_name, grade, role, created_at").execute()
        return {
            "status": "success",
            "total_users": len(res.data),
            "data": res.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách User: {str(e)}")

# --- 6. HỌC SINH: THỐNG KÊ & HUY HIỆU ---
@app.get("/user/stats/{user_id}")
def get_user_stats(user_id: str):
    try:
        return {
            "status": "success",
            "data": {
                "user_id": user_id,
                "current_streak": 3, 
                "total_questions": 15,
                "total_docs": 2,
                "badges": [
                    {"name": "Chiến thần Đặt câu hỏi", "icon": "🔥"},
                    {"name": "Cây bút Chăm chỉ", "icon": "📚"}
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)