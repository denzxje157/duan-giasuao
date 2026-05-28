import os
import sys
# Ensure the api directory is on sys.path so local imports work
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime, date, timedelta
import requests
import json
from uuid import uuid4

# Import core logic from same folder
from core_logic import (
    get_ai_response_stream_with_history,
    supabase,
    process_pdf_to_markdown,
    process_image_to_text,
    save_document_to_db,
    SUPABASE_URL,
    SUPABASE_KEY,
    generate_quiz,
    generate_flashcards
)
import urllib.parse
from fastapi import Response

app = FastAPI(title="GiaSuAo API - Hệ thống Gia sư Thông minh")


SESSION_CONTEXT_CACHE: Dict[str, Dict[str, Optional[str]]] = {}


def _cache_session_context(session_id: Optional[str], grade: Optional[str] = None, subject: Optional[str] = None):
    if not session_id:
        return
    key = str(session_id).strip()
    if not key:
        return
    cached = SESSION_CONTEXT_CACHE.setdefault(key, {})
    if grade is not None:
        cached["grade"] = str(grade).strip() or None
    if subject is not None:
        cached["subject"] = str(subject).strip() or None


def _get_cached_session_context(session_id: Optional[str]) -> Dict[str, Optional[str]]:
    if not session_id:
        return {}
    return SESSION_CONTEXT_CACHE.get(str(session_id).strip(), {})

# Configure CORS: prefer explicit allowed origins from environment for production
frontend_url = os.getenv("FRONTEND_URL")
vercel_deploy = os.getenv("VERCEL_URL")

allowed_origins = []
if frontend_url:
    allowed_origins.append(frontend_url)
elif vercel_deploy:
    allowed_origins.append(f"https://{vercel_deploy}")
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# DATA MODELS
# ==========================================
import time
import urllib.parse
from langdetect import detect

FPT_TTS_KEY = "Fe55FqdswrC1wNAK01vaMctxh7wDHiaW"
ZALO_TTS_KEY = "QiYuYBwz8EKfVlwJH3D3vndLxNZaPZzR"

LAST_PROVIDER: Dict[str, str] = {}

@app.get("/api/tts")
def proxy_tts(text: str, gender: str = "female"):
    # Detect language
    try:
        lang = detect(text)
    except:
        lang = 'vi'

    # Nếu là tiếng Anh, ép dùng Google TTS giọng Mỹ (tránh lỗi ngọng của Zalo/FPT)
    if lang == 'en':
        try:
            url = f"https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en-US&client=gtx&q={urllib.parse.quote(text)}"
            r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=5)
            return Response(content=r.content, media_type="audio/mpeg")
        except:
            pass # Fallback xuống các nhà cung cấp khác nếu Google lỗi

    # Determine voice and speaker based on gender
    is_male = (gender.lower() == "male")
    fpt_voice = "giaxuan" if is_male else "banmai"
    zalo_speaker = 3 if is_male else 2

    # Get preferred provider order to ensure consistent voice selection (stickiness)
    pref = LAST_PROVIDER.get(gender.lower(), "fpt")
    providers = ["fpt", "zalo", "google"]
    if pref in providers:
        providers.remove(pref)
        providers.insert(0, pref)

    for provider in providers:
        if provider == "fpt":
            # --- FPT AI ---
            try:
                fpt_res = requests.post(
                    'https://api.fpt.ai/hmi/tts/v5',
                    headers={'api-key': FPT_TTS_KEY, 'voice': fpt_voice, 'speed': '1'},
                    data=text.encode('utf-8'),
                    timeout=2.0
                )
                if fpt_res.status_code == 200:
                    fpt_data = fpt_res.json()
                    if "async" in fpt_data:
                        audio_url = fpt_data["async"]
                        # Poll FPT for up to 1.5 seconds (3 attempts * 0.5s)
                        for _ in range(3):
                            audio_res = requests.get(audio_url, timeout=1.5)
                            if audio_res.status_code == 200 and len(audio_res.content) > 1000:
                                LAST_PROVIDER[gender.lower()] = "fpt"
                                return Response(content=audio_res.content, media_type="audio/mpeg")
                            time.sleep(0.5)
            except Exception as e:
                print("FPT TTS Error:", e)
        elif provider == "zalo":
            # --- Zalo AI ---
            try:
                zalo_res = requests.post(
                    'https://api.zalo.ai/v1/tts/synthesize',
                    headers={'apikey': ZALO_TTS_KEY},
                    data={'input': text, 'encode_type': 1, 'speaker_id': zalo_speaker},
                    timeout=2.0
                )
                if zalo_res.status_code == 200:
                    zalo_data = zalo_res.json()
                    if zalo_data.get("error_code") == 0 and "url" in zalo_data.get("data", {}):
                        audio_url = zalo_data["data"]["url"]
                        # Poll Zalo for up to 1.5 seconds (3 attempts * 0.5s)
                        for _ in range(3):
                            audio_res = requests.get(audio_url, timeout=1.5)
                            if audio_res.status_code == 200 and len(audio_res.content) > 1000:
                                LAST_PROVIDER[gender.lower()] = "zalo"
                                return Response(content=audio_res.content, media_type="audio/mpeg")
                            time.sleep(0.5)
            except Exception as e:
                print("Zalo TTS Error:", e)
        elif provider == "google":
            # --- Google TTS (Fallback) ---
            try:
                audio_content = b""
                # Băm nhỏ văn bản nếu quá dài (Google TTS giới hạn ~200 ký tự)
                words = text.split()
                chunks = []
                current_chunk = ""
                for word in words:
                    if len(current_chunk) + len(word) + 1 > 200:
                        chunks.append(current_chunk.strip())
                        current_chunk = word + " "
                    else:
                        current_chunk += word + " "
                if current_chunk:
                    chunks.append(current_chunk.strip())

                for chunk in chunks:
                    url = f"https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=vi-VN&client=gtx&q={urllib.parse.quote(chunk)}"
                    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, timeout=5)
                    if r.status_code == 200:
                        audio_content += r.content
                        
                if audio_content:
                    LAST_PROVIDER[gender.lower()] = "google"
                    return Response(content=audio_content, media_type="audio/mpeg")
            except Exception as e:
                pass

    raise HTTPException(status_code=500, detail="All TTS providers failed")
class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    learning_context: Optional[str] = None
    model_name: Optional[str] = "gemini-1.5-flash"
    image_data: Optional[str] = None


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    grade: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ConfigUpsertRequest(BaseModel):
    key_name: str
    key_value: str

class TrackActivityRequest(BaseModel):
    subject_name: Optional[str] = "Chung"
    study_minutes: int = 1


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetSessionRequest(BaseModel):
    current_session_id: Optional[str] = None
    clear_previous: bool = True


class InitSessionRequest(BaseModel):
    current_session_id: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None


class QuizRequest(BaseModel):
    topic: str
    difficulty: str = "Trung bình"
    num_questions: int = 10
    grade: Optional[str] = None
    subject: Optional[str] = None
    file_content: Optional[str] = None
    user_id: Optional[str] = None


class FlashcardRequest(BaseModel):
    topic: str
    grade: Optional[str] = None
    subject: Optional[str] = None
    file_content: Optional[str] = None
    user_id: Optional[str] = None


def _infer_subject_from_text(text: str) -> str:
    content = (text or '').lower()
    if 'tích phân' in content:
        return 'Tích phân'
    if 'đạo hàm' in content:
        return 'Đạo hàm'
    if 'toán' in content:
        return 'Toán'
    if 'sinh học' in content:
        return 'Sinh học'
    if 'ngữ văn' in content or 'văn' in content:
        return 'Ngữ văn'
    if 'tiếng anh' in content:
        return 'Tiếng Anh'
    if 'vật lý' in content:
        return 'Vật lý'
    if 'hóa' in content:
        return 'Hóa học'
    if 'lịch sử' in content:
        return 'Lịch sử'
    if 'địa lý' in content:
        return 'Địa lý'
    if 'tin học' in content:
        return 'Tin học'
    return 'Môn học'


def _infer_session_title(first_user_text: str, db_title: Optional[str] = None) -> str:
    if db_title and str(db_title).strip():
        return str(db_title).strip()
    text = (first_user_text or '').strip()
    if not text:
        return 'Cuộc trò chuyện mới'
    clean = ' '.join(text.split())
    if len(clean) <= 35:
        return clean
    return clean[:35].rstrip() + '...'


def _group_sessions_for_user(session_rows: List[Dict[str, Any]], history_rows: List[Dict[str, Any]], current_grade: Optional[str] = None):
    sessions_by_id: Dict[str, Dict[str, Any]] = {}
    for row in session_rows:
        sid = str(row.get('id'))
        sessions_by_id[sid] = row

    grouped: Dict[str, Dict[str, Any]] = {}
    by_session: Dict[str, List[Dict[str, Any]]] = {}
    for row in history_rows:
        sid = str(row.get('session_id') or 'no-session')
        by_session.setdefault(sid, []).append(row)

    for sid, rows in by_session.items():
        user_rows = [r for r in rows if r.get('role') == 'user']
        real_user_rows = [r for r in user_rows if not str(r.get('content', '')).startswith('Chào Gia sư, mình muốn học môn')]
        
        title_source_row = real_user_rows[0] if real_user_rows else (user_rows[0] if user_rows else (rows[0] if rows else None))
        first_user_row = user_rows[0] if user_rows else (rows[0] if rows else None)
        
        subject = _infer_subject_from_text((first_user_row or {}).get('content', ''))
        grade_label = f"Lớp {current_grade}" if current_grade else 'Lớp học'
        session_meta = sessions_by_id.get(sid, {})
        title = _infer_session_title((title_source_row or {}).get('content', ''), session_meta.get('title'))
        updated_at = (rows[-1] or {}).get('timestamp') if rows else session_meta.get('updated_at')

        grouped.setdefault(grade_label, {}).setdefault(subject, []).append({
            'session_id': sid,
            'title': title,
            'subject': subject,
            'grade': grade_label,
            'updated_at': updated_at,
            'last_message': (rows[-1] or {}).get('content', ''),
        })

    result = []
    for grade_label, subjects in grouped.items():
        subject_items = []
        for subject, sessions in subjects.items():
            sessions.sort(key=lambda item: item.get('updated_at') or '', reverse=True)
            subject_items.append({'subject': subject, 'sessions': sessions})
        subject_items.sort(key=lambda item: item['subject'])
        result.append({'grade': grade_label, 'subjects': subject_items})

    result.sort(key=lambda item: item['grade'])
    return result


# ==========================================
# API ENDPOINTS
# ==========================================
@app.get("/api/")
def home():
    url = SUPABASE_URL or os.getenv("SUPABASE_URL")
    print(f"📡 API ĐANG KẾT NỐI VỚI SUPABASE: {url}")
    return {"status": "online", "connecting_to": url, "message": "Hệ thống Gia sư Thông minh đã sẵn sàng!"}


@app.post("/api/register")
def register_user(req: RegisterRequest):
    try:
        clean_email = req.email.strip()
        res = supabase.auth.sign_up({"email": clean_email, "password": req.password})
        if not getattr(res, 'user', None):
            raise Exception("Supabase Auth không trả về User ID. Kiểm tra cấu hình Confirm Email!")

        user_id = res.user.id
        profile_data = {"id": user_id, "email": clean_email, "full_name": req.full_name, "grade": req.grade, "role": "student"}
        supabase.table("profiles").insert(profile_data).execute()

        return {"status": "success", "message": "Đăng ký thành công!", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi đăng ký: {str(e)}")


@app.post("/api/login")
def login_user(req: LoginRequest):
    try:
        clean_email = req.email.strip()
        res = supabase.auth.sign_in_with_password({"email": clean_email, "password": req.password})
        user_id = res.user.id
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        user_data = {"id": user_id, "email": clean_email}
        if profile_res.data:
            user_data.update(profile_res.data[0])

        return {"status": "success", "message": "Đăng nhập thành công!", "token": res.session.access_token, "user": user_data}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Sai email hoặc mật khẩu!")


@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), grade: str = Form("1"), user_id: Optional[str] = Form(None), background_tasks: BackgroundTasks = None):
    MAX_FILE_SIZE = 10 * 1024 * 1024
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File quá lớn! Vui lòng upload file dưới 10MB.")

    allowed_exts = (".pdf", ".jpg", ".jpeg", ".png")
    if not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF, JPG, PNG!")

    bucket_name = "giasuao"
    from uuid import uuid4
    safe_id = str(uuid4())
    ext = os.path.splitext(file.filename)[1].lower()
    file_path = f"books/{safe_id}{ext}"

    supabase.storage.from_(bucket_name).upload(file_path, file_bytes, file_options={"content-type": file.content_type})
    file_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

    doc_data = {"name": file.filename, "pdf_url": file_url, "thumbnail_url": "", "grade": grade, "status": "processing"}
    if user_id and user_id != 'undefined':
        doc_data["user_id"] = user_id

    # Insert document row with deterministic id so we can update embeddings later
    try:
        res = supabase.table("documents").insert(doc_data).execute()
    except Exception as e:
        print(f"⚠️ Warning: failed to insert document row: {e}")
        res = None

    doc_id = res.data[0]['id'] if getattr(res, 'data', None) and len(res.data) > 0 and 'id' in res.data[0] else safe_id
    try:
        content_text = ""
        if file.content_type == 'application/pdf' or file.filename.lower().endswith('.pdf'):
            content_text = process_pdf_to_markdown(file_bytes, file.content_type)
        elif file.content_type and file.content_type.startswith('image'):
            # Try OCR extraction for images; if not available, store a placeholder
            try:
                ocr_text = process_image_to_text(file_bytes)
                if ocr_text and ocr_text.strip():
                    content_text = ocr_text
                else:
                    content_text = f"[IMAGE UPLOAD] {file.filename}"
            except Exception as e:
                print(f"⚠️ Image OCR failed: {e}")
                content_text = f"[IMAGE UPLOAD] {file.filename}"
        else:
            try:
                content_text = file_bytes.decode('utf-8')
            except Exception:
                content_text = f"Uploaded file {file.filename} (binary)"

        supabase.table("documents").update({"content": content_text, "status": "ready"}).eq("id", doc_id).execute()

        # Schedule embedding generation in background so upload returns quickly
        if background_tasks is not None:
            background_tasks.add_task(save_document_to_db, content_text, file.filename, doc_id)
        else:
            try:
                save_document_to_db(content_text, file.filename, doc_id)
            except Exception as e:
                print(f"⚠️ Lỗi khi xử lý embedding đồng bộ: {e}")

        return {"status": "success", "data": {**doc_data, "content": content_text, "id": doc_id}}
    except Exception as e:
        print(f"⚠️ Lỗi khi xử lý file ngay lập tức: {e}")
        return {"status": "success", "data": doc_data, "warning": str(e)}


@app.post("/api/chat")
def chat(req: ChatRequest):
    def _normalize_subject(subject: Optional[str]) -> str:
        return str(subject or '').strip().lower()

    force_reset_context = False
    if req.session_id and (req.grade or req.subject):
        cached_context = _get_cached_session_context(req.session_id)
        old_grade = str(cached_context.get("grade") or "").strip()
        old_subject = _normalize_subject(cached_context.get("subject"))
        new_grade = str(req.grade or "").strip()
        new_subject = _normalize_subject(req.subject)

        try:
            current_meta = supabase.table("chat_sessions").select("grade,subject").eq("id", req.session_id).limit(1).execute()
            row = (current_meta.data or [{}])[0]
            old_grade = str(row.get("grade") or old_grade).strip()
            old_subject = _normalize_subject(row.get("subject") or old_subject)
        except Exception as meta_err:
            print(f"⚠️ Không thể đọc grade/subject từ chat_sessions: {meta_err}")
            _cache_session_context(req.session_id, grade=old_grade or req.grade, subject=old_subject or req.subject)

        grade_changed = bool(new_grade and old_grade and new_grade != old_grade)
        subject_changed = bool(new_subject and old_subject and new_subject != old_subject)
        force_reset_context = grade_changed or subject_changed

        update_payload = {}
        if new_grade:
            update_payload["grade"] = new_grade
        if req.subject:
            update_payload["subject"] = req.subject
        if force_reset_context:
            update_payload["messages"] = []

        try:
            if update_payload:
                try:
                    supabase.table("chat_sessions").update(update_payload).eq("id", req.session_id).execute()
                except Exception as update_err:
                    print(f"⚠️ Không thể cập nhật grade/subject trong chat_sessions: {update_err}")
                    _cache_session_context(req.session_id, grade=update_payload.get("grade") or cached_context.get("grade"), subject=update_payload.get("subject") or cached_context.get("subject"))
                    lightweight_payload = {key: value for key, value in update_payload.items() if key not in {"grade", "subject"}}
                    if lightweight_payload:
                        try:
                            supabase.table("chat_sessions").update(lightweight_payload).eq("id", req.session_id).execute()
                        except Exception as fallback_update_err:
                            print(f"⚠️ Không thể cập nhật chat_sessions tối giản: {fallback_update_err}")
        except Exception as meta_err:
            print(f"⚠️ Không thể kiểm tra/cập nhật session context trước khi chat: {meta_err}")
            _cache_session_context(req.session_id, grade=req.grade, subject=req.subject)

    def event_stream():
        yield 'data: {"meta":"format","format":"markdown"}\n\n'
        full_answer = ''
        detected_session_id = None

        # Enrich user question with optional implicit context (non-breaking for old clients)
        question_for_ai = req.question
        if req.learning_context:
            question_for_ai = f"{req.learning_context}\n\nCÂU HỎI HỌC SINH: {req.question}"
        elif req.subject:
            question_for_ai = f"Bối cảnh học tập: Lớp {req.grade or 'chưa xác định'}, môn {req.subject}.\n\nCÂU HỎI HỌC SINH: {req.question}"

        for chunk in get_ai_response_stream_with_history(
            question_for_ai,
            req.session_id,
            req.user_id,
            req.model_name or "gemini-1.5-flash",
            req.grade,
            req.subject,
            force_reset_context,
            req.image_data,
        ):
            try:
                chunk_str = str(chunk)
            except Exception:
                chunk_str = json.dumps(chunk)

            # detect session id emitted by core_logic
            if '[SESSION_ID:' in chunk_str:
                try:
                    start = chunk_str.index('[SESSION_ID:') + len('[SESSION_ID:')
                    end = chunk_str.index(']', start)
                    detected_session_id = chunk_str[start:end]
                except Exception:
                    detected_session_id = req.session_id
                
                # Do NOT manually replace '\n' with '\\n'. json.dumps handles escaping correctly.
                # If chunk_str contains literal '\n', json.dumps will escape it to "\\n" for the JSON payload.
                payload = {"chunk": chunk_str, "format": "markdown"}
                yield f"data: {json.dumps(payload)}\n\n"
                continue

            payload = {"chunk": chunk_str, "format": "markdown"}
            full_answer += chunk_str
            yield f"data: {json.dumps(payload)}\n\n"

        # After streaming completes, persist user->assistant pair into chat_history (server-side)
        try:
            user_id_val = req.user_id if getattr(req, 'user_id', None) else None
            sid = detected_session_id or req.session_id
            if user_id_val:
                user_content = req.question
                if req.image_data:
                    user_content = f"![Hình đính kèm]({req.image_data})\n\n" + req.question
                rows = [
                    {"user_id": user_id_val, "role": "user", "content": user_content, "session_id": sid},
                    {"user_id": user_id_val, "role": "assistant", "content": full_answer, "session_id": sid},
                ]
                try:
                    supabase.table("chat_history").insert(rows).execute()
                except Exception as e:
                    print(f"⚠️ Không thể lưu chat_history: {e}")
        except Exception as e:
            print(f"⚠️ Lỗi khi cố gắng lưu lịch sử trò chuyện: {e}")

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/generate-quiz")
def api_generate_quiz(req: QuizRequest):
    try:
        quiz_data = generate_quiz(req.topic, req.difficulty, req.num_questions, req.grade, req.subject, req.file_content, req.user_id)
        return {"status": "success", "data": quiz_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo quiz: {str(e)}")


@app.post("/api/generate-flashcards")
def api_generate_flashcards(req: FlashcardRequest):
    try:
        flashcards_data = generate_flashcards(req.topic, req.grade, req.subject, req.file_content, req.user_id)
        return {"status": "success", "data": flashcards_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo flashcards: {str(e)}")


@app.get("/api/admin/configs")
def get_system_configs():
    try:
        res = supabase.table("system_configs").select("*").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy cấu hình: {str(e)}")


@app.post("/api/admin/config")
def update_system_config(req: ConfigUpsertRequest):
    try:
        supabase.table("system_configs").upsert({"key_name": req.key_name, "key_value": req.key_value}, on_conflict="key_name").execute()
        return {"status": "success", "message": f"Đã cập nhật thành công {req.key_name}!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật cấu hình: {str(e)}")


@app.get("/api/admin/users")
def get_all_users():
    try:
        res = supabase.table("profiles").select("id, email, full_name, grade, role, created_at").execute()
        return {"status": "success", "total_users": len(res.data), "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách User: {str(e)}")


@app.get("/api/user/stats/{user_id}")
def get_user_stats(user_id: str):
    try:
        return {"status": "success", "data": {"user_id": user_id, "current_streak": 3, "total_questions": 15, "total_docs": 2, "badges": [{"name": "Chiến thần Đặt câu hỏi", "icon": "🔥"}, {"name": "Cây bút Chăm chỉ", "icon": "📚"}]}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê: {str(e)}")

def _verify_token_and_get_user(credentials: HTTPAuthorizationCredentials):
    token = credentials.credentials if credentials else None
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization token")
    auth_url = (SUPABASE_URL.rstrip('/') if SUPABASE_URL else os.getenv('SUPABASE_URL', '')).rstrip('/') + '/auth/v1/user'
    headers = {'Authorization': f'Bearer {token}', 'apikey': SUPABASE_KEY or os.getenv('SUPABASE_KEY', '')}
    try:
        r = requests.get(auth_url, headers=headers, timeout=5)
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail='Invalid or expired token')
        user_info = r.json()
        token_user_id = user_info.get('id')
        if not token_user_id:
            raise HTTPException(status_code=401, detail='Invalid token payload')
        return token_user_id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'Failed to verify token: {e}')

@app.get("/api/user/gamification-stats")
def get_user_gamification_stats(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    try:
        user_id = _verify_token_and_get_user(credentials)
        res = supabase.table("user_stats").select("*").eq("user_id", user_id).execute()
        if res.data and len(res.data) > 0:
            return {"status": "success", "data": res.data[0]}
        else:
            return {"status": "success", "data": {"user_id": user_id, "streak": 0, "max_streak": 0, "total_study_minutes": 0, "total_sp": 0}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê gamification: {str(e)}")

@app.get("/api/user/progress-charts")
def get_user_progress_charts(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    try:
        user_id = _verify_token_and_get_user(credentials)
        
        # Lấy 7 ngày gần nhất
        today = date.today()
        week_data = []
        for i in range(6, -1, -1):
            target_date = today - timedelta(days=i)
            week_data.append({"date": target_date.strftime("%Y-%m-%d"), "day": target_date.strftime("%A"), "time": 0})
            
        act_res = supabase.table("user_activities").select("*").eq("user_id", user_id).gte("study_date", (today - timedelta(days=6)).strftime("%Y-%m-%d")).execute()
        
        activity_dict = {d["date"]: 0 for d in week_data}
        for row in (act_res.data or []):
            dt_str = row["study_date"]
            if dt_str in activity_dict:
                activity_dict[dt_str] += row.get("study_minutes", 0)
                
        for d in week_data:
            d["time"] = activity_dict[d["date"]]

        # Lấy Radar data (tổng hợp theo môn)
        subject_res = supabase.table("user_activities").select("subject_name, study_minutes").eq("user_id", user_id).execute()
        subject_scores = {}
        for row in (subject_res.data or []):
            subj = row.get("subject_name", "Khác")
            subject_scores[subj] = subject_scores.get(subj, 0) + row.get("study_minutes", 0)
            
        radar_data = []
        for subj, mins in subject_scores.items():
            radar_data.append({"subject": subj, "score": min(mins, 100), "fullMark": 100})
            
        if not radar_data:
            radar_data = [
                {"subject": "Đại số", "score": 0, "fullMark": 100},
                {"subject": "Hình học", "score": 0, "fullMark": 100},
                {"subject": "Vật lý", "score": 0, "fullMark": 100},
            ]

        return {"status": "success", "data": {"activityData": week_data, "radarData": radar_data}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy dữ liệu biểu đồ: {str(e)}")

@app.post("/api/user/track-activity")
def track_user_activity(req: TrackActivityRequest, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    try:
        user_id = _verify_token_and_get_user(credentials)
        today_str = date.today().strftime("%Y-%m-%d")
        
        # Cập nhật user_activities
        act_res = supabase.table("user_activities").select("id, study_minutes").eq("user_id", user_id).eq("study_date", today_str).eq("subject_name", req.subject_name).execute()
        if act_res.data and len(act_res.data) > 0:
            act_id = act_res.data[0]["id"]
            new_mins = act_res.data[0]["study_minutes"] + req.study_minutes
            supabase.table("user_activities").update({"study_minutes": new_mins}).eq("id", act_id).execute()
        else:
            supabase.table("user_activities").insert({
                "user_id": user_id,
                "study_date": today_str,
                "subject_name": req.subject_name,
                "study_minutes": req.study_minutes
            }).execute()

        # Cập nhật user_stats (Streak, SP, Total Minutes)
        stat_res = supabase.table("user_stats").select("*").eq("user_id", user_id).execute()
        sp_earned = 10 if req.study_minutes >= 1 else 0 # 10 điểm mỗi phút
        
        if stat_res.data and len(stat_res.data) > 0:
            stat = stat_res.data[0]
            last_date_str = stat.get("last_study_date")
            current_streak = stat.get("streak", 0)
            
            if last_date_str == today_str:
                # Đã học hôm nay rồi
                pass
            else:
                last_date = datetime.strptime(last_date_str, "%Y-%m-%d").date() if last_date_str else None
                if last_date == date.today() - timedelta(days=1):
                    current_streak += 1
                else:
                    current_streak = 1
                    
            supabase.table("user_stats").update({
                "streak": current_streak,
                "max_streak": max(current_streak, stat.get("max_streak", 0)),
                "total_study_minutes": stat.get("total_study_minutes", 0) + req.study_minutes,
                "total_sp": stat.get("total_sp", 0) + sp_earned,
                "last_study_date": today_str
            }).eq("user_id", user_id).execute()
        else:
            supabase.table("user_stats").insert({
                "user_id": user_id,
                "streak": 1,
                "max_streak": 1,
                "total_study_minutes": req.study_minutes,
                "total_sp": sp_earned,
                "last_study_date": today_str
            }).execute()

        return {"status": "success", "message": "Activity tracked"}
    except Exception as e:
        # Silently fail for tracker to not crash frontend
        return {"status": "error", "message": str(e)}


@app.get("/api/chat-history/me")
def get_chat_history_me(session_id: Optional[str] = None, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Return chat_history rows for the currently authenticated user (derived from token).

    Requires Authorization: Bearer <token>. Will verify token with Supabase and extract user id.
    """
    try:
        token_user_id = _verify_token_and_get_user(credentials)

        # Query chat_history for this user
        try:
            query = supabase.table('chat_history').select('id, user_id, role, content, session_id, timestamp').eq('user_id', token_user_id)
            if session_id:
                query = query.eq('session_id', session_id)
            res = query.execute()
            rows = res.data or []
            try:
                rows = sorted(rows, key=lambda r: r.get('timestamp') or '')
            except Exception:
                pass
            return { 'status': 'success', 'count': len(rows), 'data': rows }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Error querying chat_history: {e}')

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Unexpected error: {str(e)}')


@app.get("/api/chat-sessions/me")
def get_chat_sessions_me(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    try:
        token = credentials.credentials if credentials else None
        if not token:
            raise HTTPException(status_code=401, detail="Missing Authorization token")

        auth_url = (SUPABASE_URL.rstrip('/') if SUPABASE_URL else os.getenv('SUPABASE_URL', '')).rstrip('/') + '/auth/v1/user'
        headers = {
            'Authorization': f'Bearer {token}',
            'apikey': SUPABASE_KEY or os.getenv('SUPABASE_KEY', ''),
        }
        r = requests.get(auth_url, headers=headers, timeout=5)
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail='Invalid or expired token')

        user_info = r.json()
        token_user_id = user_info.get('id')
        if not token_user_id:
            raise HTTPException(status_code=401, detail='Invalid token payload')

        profile_res = supabase.table('profiles').select('grade').eq('id', token_user_id).execute()
        current_grade = None
        if profile_res.data:
            current_grade = str(profile_res.data[0].get('grade') or '')

        # 1. Fetch metadata without the large content field
        history_res = supabase.table('chat_history').select('id, user_id, role, session_id, timestamp').eq('user_id', token_user_id).execute()
        history_rows_meta = history_res.data or []
        
        # Sort them by timestamp to correctly identify first and last messages
        try:
            history_rows_meta = sorted(history_rows_meta, key=lambda r: r.get('timestamp') or '')
        except Exception:
            pass

        # Identify which message IDs we actually need the content for
        session_to_msg_ids = {}
        for row in history_rows_meta:
            sid = str(row.get('session_id') or 'no-session')
            session_to_msg_ids.setdefault(sid, []).append(row)

        content_ids_to_fetch = set()
        for sid, rows in session_to_msg_ids.items():
            user_rows = [r for r in rows if r.get('role') == 'user']
            if user_rows:
                content_ids_to_fetch.add(user_rows[0]['id'])
                if len(user_rows) > 1:
                    content_ids_to_fetch.add(user_rows[1]['id'])
            if rows:
                content_ids_to_fetch.add(rows[0]['id'])
                content_ids_to_fetch.add(rows[-1]['id'])

        # 2. Query content only for those specific message IDs
        content_map = {}
        if content_ids_to_fetch:
            try:
                id_list = list(content_ids_to_fetch)
                content_res = supabase.table('chat_history').select('id, content').in_('id', id_list).execute()
                for c_row in (content_res.data or []):
                    content_map[c_row['id']] = c_row.get('content') or ''
            except Exception as content_err:
                print(f"⚠️ Không thể lấy content cho chat_history: {content_err}")

        # 3. Populate content back into our metadata rows
        history_rows = []
        for row in history_rows_meta:
            row_id = row['id']
            row['content'] = content_map.get(row_id, '')
            history_rows.append(row)

        session_ids = sorted({str(row.get('session_id')) for row in history_rows if row.get('session_id')})

        session_rows = []
        if session_ids:
            try:
                session_res = supabase.table('chat_sessions').select('*').in_('id', session_ids).execute()
                session_rows = session_res.data or []
            except Exception as e:
                print(f'⚠️ Không thể lấy chat_sessions: {e}')

        grouped = _group_sessions_for_user(session_rows, history_rows, current_grade=current_grade)
        return {'status': 'success', 'data': grouped}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Unexpected error: {str(e)}')


@app.delete("/api/chat-sessions/me/{session_id}")
def delete_chat_session_me(session_id: str, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    try:
        token = credentials.credentials if credentials else None
        if not token:
            raise HTTPException(status_code=401, detail="Missing Authorization token")

        auth_url = (SUPABASE_URL.rstrip('/') if SUPABASE_URL else os.getenv('SUPABASE_URL', '')).rstrip('/') + '/auth/v1/user'
        headers = {
            'Authorization': f'Bearer {token}',
            'apikey': SUPABASE_KEY or os.getenv('SUPABASE_KEY', ''),
        }
        r = requests.get(auth_url, headers=headers, timeout=5)
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail='Invalid or expired token')

        user_info = r.json()
        token_user_id = user_info.get('id')
        if not token_user_id:
            raise HTTPException(status_code=401, detail='Invalid token payload')

        try:
            supabase.table('chat_history').delete().eq('user_id', token_user_id).eq('session_id', session_id).execute()
        except Exception as e:
            print(f'⚠️ Lỗi xóa chat_history session {session_id}: {e}')

        try:
            supabase.table('chat_sessions').delete().eq('id', session_id).execute()
        except Exception as e:
            print(f'⚠️ Lỗi xóa chat_sessions session {session_id}: {e}')

        return {'status': 'success', 'message': 'Đã xóa hội thoại'}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Unexpected error: {str(e)}')


@app.post("/api/chat-sessions/reset-current")
def reset_current_chat_session(req: ResetSessionRequest, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    try:
        token = credentials.credentials if credentials else None
        if not token:
            raise HTTPException(status_code=401, detail="Missing Authorization token")

        auth_url = (SUPABASE_URL.rstrip('/') if SUPABASE_URL else os.getenv('SUPABASE_URL', '')).rstrip('/') + '/auth/v1/user'
        headers = {
            'Authorization': f'Bearer {token}',
            'apikey': SUPABASE_KEY or os.getenv('SUPABASE_KEY', ''),
        }
        r = requests.get(auth_url, headers=headers, timeout=5)
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail='Invalid or expired token')

        user_info = r.json()
        token_user_id = user_info.get('id')
        if not token_user_id:
            raise HTTPException(status_code=401, detail='Invalid token payload')

        current_session_id = (req.current_session_id or '').strip()
        if req.clear_previous and current_session_id:
            try:
                supabase.table('chat_history').delete().eq('user_id', token_user_id).eq('session_id', current_session_id).execute()
            except Exception as e:
                print(f'⚠️ Không thể xóa chat_history của phiên cũ: {e}')

            try:
                supabase.table('chat_sessions').delete().eq('id', current_session_id).execute()
            except Exception as e:
                print(f'⚠️ Không thể xóa chat_sessions của phiên cũ: {e}')

        new_session_id = str(uuid4())
        return {
            'status': 'success',
            'data': {
                'new_session_id': new_session_id,
                'previous_session_cleared': bool(req.clear_previous and current_session_id),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Unexpected error: {str(e)}')


@app.post("/api/init-session")
def init_session(req: InitSessionRequest, credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    try:
        token_user_id = None
        token = credentials.credentials if credentials else None
        if token:
            try:
                auth_url = (SUPABASE_URL.rstrip('/') if SUPABASE_URL else os.getenv('SUPABASE_URL', '')).rstrip('/') + '/auth/v1/user'
                headers = {
                    'Authorization': f'Bearer {token}',
                    'apikey': SUPABASE_KEY or os.getenv('SUPABASE_KEY', ''),
                }
                r = requests.get(auth_url, headers=headers, timeout=5)
                if r.status_code == 200:
                    user_info = r.json()
                    token_user_id = user_info.get('id')
            except Exception as auth_err:
                print(f'⚠️ Không thể xác thực token cho init-session: {auth_err}')

        previous_session_id = (req.current_session_id or '').strip()
        if previous_session_id:
            try:
                history_delete = supabase.table('chat_history').delete().eq('session_id', previous_session_id)
                if token_user_id:
                    history_delete = history_delete.eq('user_id', token_user_id)
                history_delete.execute()
            except Exception as e:
                print(f'⚠️ Không thể xóa chat_history cũ: {e}')

            try:
                supabase.table('chat_sessions').delete().eq('id', previous_session_id).execute()
            except Exception as e:
                print(f'⚠️ Không thể xóa chat_sessions cũ: {e}')

        new_session_id = str(uuid4())
        insert_payload = {
            'id': new_session_id,
            'messages': [],
            'grade': str(req.grade or '').strip() or None,
            'subject': str(req.subject or '').strip() or None,
        }
        insert_payload = {key: value for key, value in insert_payload.items() if value is not None}
        try:
            supabase.table('chat_sessions').insert(insert_payload).execute()
        except Exception as e:
            print(f'⚠️ Không thể tạo chat_sessions mới: {e}')
            minimal_payload = {'id': new_session_id, 'messages': []}
            try:
                supabase.table('chat_sessions').insert(minimal_payload).execute()
            except Exception as fallback_err:
                print(f'⚠️ Không thể tạo chat_sessions tối giản: {fallback_err}')

        _cache_session_context(new_session_id, grade=req.grade, subject=req.subject)

        return {
            'status': 'success',
            'data': {
                'new_session_id': new_session_id,
                'previous_session_cleared': bool(previous_session_id),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Unexpected error: {str(e)}')


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
