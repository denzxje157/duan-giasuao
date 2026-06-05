import os
import sys
# Configure stdout and stderr to use UTF-8 and ignore encoding errors to prevent Windows UnicodeEncodeError crashes
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass

import uuid
import json
import re
import base64
from io import BytesIO
try:
    from PIL import Image
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False
from supabase import create_client
from dotenv import load_dotenv

# Prefer MarkItDown for direct PDF->Markdown conversion if available
try:
    from markitdown import MarkItDown
    _MD_TOOL = MarkItDown()
    _MD_AVAILABLE = True
except Exception:
    _MD_TOOL = None
    _MD_AVAILABLE = False

try:
    import google.generativeai as genai
except Exception:
    genai = None


def _mask_key(api_key):
    if not api_key:
        return "<empty>"
    clean = api_key.strip()
    if len(clean) <= 8:
        return f"{clean[:2]}***{clean[-2:]}"
    return f"{clean[:4]}***{clean[-4:]}"


def _is_rate_limit_error(error):
    error_text = str(error).lower()
    return (
        "429" in error_text
        or "rate limit" in error_text
        or "resourceexhausted" in error_text
        or "resource exhausted" in error_text
        or "quota" in error_text
        or "exhausted" in error_text
    )


def _iter_model_candidates(preferred_model=None):
    seen = set()
    ordered = []
    if preferred_model and preferred_model.strip() and preferred_model.strip() not in seen:
        clean_preferred = preferred_model.strip()
        ordered.append(clean_preferred)
        seen.add(clean_preferred)
    for model in FALLBACK_MODELS:
        if model and model.strip() and model.strip() not in seen:
            ordered.append(model.strip())
            seen.add(model.strip())
    return ordered


_KEY_COOLDOWN_TIMESTAMPS = {}

def mark_key_rate_limited(api_key):
    import time
    if api_key:
        _KEY_COOLDOWN_TIMESTAMPS[api_key.strip()] = time.time()

def _iter_active_keys(preferred_key=None):
    import time
    now = time.time()
    seen = set()
    ordered_keys = []
    
    def is_in_cooldown(k):
        ts = _KEY_COOLDOWN_TIMESTAMPS.get(k.strip())
        if ts and (now - ts) < 60:
            return True
        return False

    if preferred_key and preferred_key.strip():
        clean_pref = preferred_key.strip()
        if not is_in_cooldown(clean_pref):
            ordered_keys.append(clean_pref)
            seen.add(clean_pref)
            
    working_keys = []
    cooldown_keys = []
    for key in AVAILABLE_KEYS:
        if key and key.strip() and key.strip() not in seen:
            k_clean = key.strip()
            if is_in_cooldown(k_clean):
                cooldown_keys.append(k_clean)
            else:
                working_keys.append(k_clean)
                
    for k in working_keys + cooldown_keys:
        if k not in seen:
            ordered_keys.append(k)
            seen.add(k)
            
    return ordered_keys

def _iter_embedding_keys(preferred_key=None):
    return _iter_active_keys(preferred_key)


def _iter_embedding_models(preferred_model=None):
    seen = set()
    ordered = []
    if preferred_model and preferred_model.strip() and preferred_model.strip() not in seen:
        clean_preferred = preferred_model.strip()
        ordered.append(clean_preferred)
        seen.add(clean_preferred)
    for model in EMBEDDING_FALLBACK_MODELS:
        if model and model.strip() and model.strip() not in seen:
            ordered.append(model.strip())
            seen.add(model.strip())
    return ordered


CHAT_SESSION_CONTEXT_CACHE = {}
DOCUMENT_CONTEXT_CACHE = {}


def _cache_chat_session_context(session_id, grade=None, subject=None):
    if not session_id:
        return
    key = str(session_id).strip()
    if not key:
        return
    cached = CHAT_SESSION_CONTEXT_CACHE.setdefault(key, {})
    if grade is not None:
        cached["grade"] = str(grade).strip() or None
    if subject is not None:
        cached["subject"] = str(subject).strip() or None


def _get_cached_chat_session_context(session_id):
    if not session_id:
        return {}
    return CHAT_SESSION_CONTEXT_CACHE.get(str(session_id).strip(), {})


def _cache_document_context(doc_id, source_name=None, subject=None):
    if not doc_id:
        return
    key = str(doc_id).strip()
    if not key:
        return
    cached = DOCUMENT_CONTEXT_CACHE.setdefault(key, {})
    if source_name is not None:
        cached["source_name"] = str(source_name).strip() or None
    if subject is not None:
        cached["subject"] = str(subject).strip() or None


def _infer_subject_from_text(text):
    content = (text or "").lower()
    if "tích phân" in content or "tich phan" in content:
        return "Tích phân"
    if "đạo hàm" in content or "dao ham" in content:
        return "Đạo hàm"
    if "toán" in content or "toan" in content:
        return "Toán"
    if "sinh học" in content or "sinh hoc" in content:
        return "Sinh học"
    if "ngữ văn" in content or "ngu van" in content or "văn" in content or "van" in content:
        return "Ngữ văn"
    if "tiếng anh" in content or "tieng anh" in content:
        return "Tiếng Anh"
    if "vật lý" in content or "vat ly" in content or "vật li" in content or "vat li" in content:
        return "Vật lý"
    if "hóa" in content or "hoa" in content:
        return "Hóa học"
    if "lịch sử" in content or "lich su" in content:
        return "Lịch sử"
    if "địa lý" in content or "dia ly" in content or "địa li" in content or "dia li" in content:
        return "Địa lý"
    if "tin học" in content or "tin hoc" in content:
        return "Tin học"
    return "Môn học"


def _embed_with_provider(text, api_key=None, model_name="gemini-embedding-001"):
    model_candidates = _iter_embedding_models(model_name)
    keys_to_try = _iter_embedding_keys(api_key)
    last_error = None

    for current_model in model_candidates:
        model_failed_for_all_keys = True

        for current_key in keys_to_try:
            try:
                if genai is not None:
                    if hasattr(genai, 'configure'):
                        try:
                            genai.configure(api_key=current_key)
                        except Exception as e:
                            print(f"⚠️ configure(genai) failed for key {_mask_key(current_key)}: {e}")

                    try:
                        if hasattr(genai, 'embed_content'):
                            res = genai.embed_content(model=current_model, content=text)
                            if isinstance(res, dict) and 'embedding' in res:
                                return res['embedding']
                    except Exception as e:
                        if _is_rate_limit_error(e):
                            print(f"⚠️ Key {_mask_key(current_key)} đã hết hạn mức embedding, đang thử key tiếp theo...")
                            mark_key_rate_limited(current_key)
                            last_error = e
                            continue
                        print(f"genai embed_content failed for key {_mask_key(current_key)} with model {current_model}:", e)

                    try:
                        if hasattr(genai, 'EmbeddingsClient'):
                            client = genai.EmbeddingsClient()
                            resp = client.create(model=current_model, input=text)
                            return resp.data[0].embedding
                    except Exception as e:
                        if _is_rate_limit_error(e):
                            print(f"⚠️ Key {_mask_key(current_key)} đã hết hạn mức embedding, đang thử key tiếp theo...")
                            mark_key_rate_limited(current_key)
                            last_error = e
                            continue
                        print(f"genai EmbeddingsClient failed for key {_mask_key(current_key)} with model {current_model}:", e)

            except Exception as e:
                if _is_rate_limit_error(e):
                    print(f"⚠️ Key {_mask_key(current_key)} đã hết hạn mức embedding, đang thử key tiếp theo...")
                    mark_key_rate_limited(current_key)
                    last_error = e
                    continue
                last_error = e
                print(f"❌ Lỗi embedding với key {_mask_key(current_key)} và model {current_model}: {e}")
                continue

        if model_failed_for_all_keys:
            print(f"⚠️ Model {current_model} sập toàn bộ key, đang chuyển sang model tiếp theo...")

    if last_error:
        raise last_error
    raise Exception("No embedding provider available or all providers failed")


def _generate_stream(prompt, api_key, model_name="gemini-2.5-flash", image_data=None, temperature=None, max_tokens=None):
    if genai is not None:
        if hasattr(genai, 'configure'):
            try:
                genai.configure(api_key=api_key)
            except Exception as e:
                print(f"⚠️ configure(genai) failed for key {_mask_key(api_key)}: {e}")
        if hasattr(genai, 'GenerativeModel'):
            try:
                model = genai.GenerativeModel(model_name)
                contents = [prompt]
                
                if image_data and _PIL_AVAILABLE:
                    try:
                        b64_str = image_data
                        if b64_str.startswith('data:image'):
                            b64_str = b64_str.split(',', 1)[1]
                        img_bytes = base64.b64decode(b64_str)
                        img = Image.open(BytesIO(img_bytes))
                        contents = [img, prompt]
                    except Exception as img_err:
                        print(f"⚠️ Cannot decode image for Gemini: {img_err}")
                
                # Dynamic generation config
                generation_config = {}
                if temperature is not None:
                    generation_config["temperature"] = temperature
                if max_tokens is not None:
                    generation_config["max_output_tokens"] = max_tokens

                response_iter = model.generate_content(
                    contents, 
                    stream=True,
                    generation_config=generation_config if generation_config else None
                )
                for chunk in response_iter:
                    text = getattr(chunk, 'text', None) or getattr(chunk, 'content', None)
                    if text:
                        yield text
                return
            except Exception as e:
                print(f"genai model {model_name} failed for key {_mask_key(api_key)}:", e)
                raise e

    raise Exception("All providers failed")


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ondtrlthellodkhhrmjx.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZHRybHRoZWxsb2RraGhybWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4NjM0MSwiZXhwIjoyMDk0MDYyMzQxfQ.W67NwYXR_o6lFR3SnNV3b69RT6dMa-vVoQHOSDSwQLc")

print(f"[Supabase] CORE_LOGIC: {SUPABASE_URL}")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
]

EMBEDDING_FALLBACK_MODELS = [
    "text-embedding-004",
    "gemini-embedding-001",
]


def get_all_keys():
    keys = []
    for i in range(1, 7):
        env_key = os.getenv(f"GEMINI_API_KEY_{i}")
        if env_key and env_key.strip() and env_key.strip() not in keys:
            keys.append(env_key.strip())
    direct_env_key = os.getenv("GEMINI_API_KEY")
    if direct_env_key and direct_env_key.strip() and direct_env_key.strip() not in keys:
        keys.append(direct_env_key.strip())

    try:
        res = supabase.table("system_configs").select("key_name, key_value").execute()
        if res.data:
            for row in res.data:
                name = row.get("key_name") or ""
                val = row.get("key_value")
                if name.startswith("gemini_api_key") or name == "api_key" or (val and val.startswith("AIzaSy")):
                    if val and val.strip() and val.strip() not in keys:
                        keys.append(val.strip())
    except Exception as e:
        print(f"⚠️ Warning: could not load API keys from Supabase system_configs: {e}")

    return keys


AVAILABLE_KEYS = get_all_keys()

# Pre-load chunks.json into memory at module startup (runs once per Vercel function lifecycle)
_CHUNKS_CACHE = {}
_SESSION_CACHE = {}
_DOCS_CACHE = {}

def _load_local_chunks():
    """Load all pre-indexed document chunks from local JSON file into memory.
    Called once at module startup; subsequent calls return the already-loaded data instantly."""
    paths_to_try = [
        os.path.join(os.path.dirname(__file__), "chunks_cache.json"),
        "api/chunks_cache.json",
        "chunks_cache.json"
    ]
    for path in paths_to_try:
        if os.path.exists(path):
            try:
                print(f"⚡ [Local Cache] Loading chunks from {path}...")
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                print(f"⚡ [Local Cache] Successfully loaded {len(data)} chunks into memory!")
                return data
            except Exception as e:
                print(f"⚠️ Failed to load local chunks from {path}: {e}")
    
    print("⚠️ [Local Cache] chunks_cache.json not found, falling back to database query.")
    return []

# Load once at module startup — stored at module level, never re-read from disk per request
_LOCAL_CHUNKS = _load_local_chunks()


def refresh_available_keys():
    global AVAILABLE_KEYS
    AVAILABLE_KEYS = get_all_keys()
    return AVAILABLE_KEYS


def get_user_profile(user_id, client=None):
    if not user_id or str(user_id).strip() == "guest":
        return None

    try:
        # Validate UUID format to prevent database syntax errors
        uuid.UUID(str(user_id).strip())
    except ValueError:
        return None

    db_client = client if client is not None else supabase
    try:
        res = db_client.table("profiles").select("id, email, full_name, grade, role").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as e:
        print(f"⚠️ Không thể lấy hồ sơ người học {user_id}: {e}")

    return None


def _normalize_suggestion_label(label):
    return re.sub(r"\s+", " ", str(label or "")).strip().lower()


def _dedupe_suggestions(suggestions, seen_labels=None):
    seen = {_normalize_suggestion_label(label) for label in (seen_labels or []) if label}
    deduped = []
    for item in suggestions or []:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label") or "").strip()
        if not label:
            continue
        normalized = _normalize_suggestion_label(label)
        if normalized in seen:
            continue
        seen.add(normalized)
        deduped.append({
            "type": str(item.get("type") or "general").strip() or "general",
            "label": label,
        })
    return deduped


def _extract_recent_suggestion_labels(chat_history):
    labels = []
    for message in (chat_history or [])[-10:]:
        content = message.get("content") if isinstance(message, dict) else None
        if not content:
            continue
        match = re.findall(r"```json\s*(\{[\s\S]*?\})\s*```", content)
        if not match:
            continue
        for raw_json in match:
            try:
                parsed = json.loads(raw_json)
                for item in parsed.get("suggestions", []):
                    if isinstance(item, dict) and item.get("label"):
                        labels.append(item["label"])
            except Exception:
                continue
    return labels


def _build_fallback_suggestions(question, context, chat_history):
    text = f"{question}\n{context}\n" + "\n".join([str(m.get("content", "")) for m in (chat_history or [])[-6:]])
    lower = text.lower()

    candidates = []
    if any(keyword in lower for keyword in ["tích phân", "integral"]):
        candidates.extend([
            {"type": "exercise", "label": "Luyện tập bài tập tích phân nâng cao"},
            {"type": "theory", "label": "Xem lại lý thuyết đạo hàm"},
            {"type": "resource", "label": "Tài liệu mở rộng về đổi biến số"},
        ])
    elif any(keyword in lower for keyword in ["đạo hàm", "derivative"]):
        candidates.extend([
            {"type": "exercise", "label": "Làm bài tập đạo hàm tương tự"},
            {"type": "theory", "label": "Ôn lại quy tắc đạo hàm cơ bản"},
            {"type": "resource", "label": "Tài liệu mở rộng về ứng dụng đạo hàm"},
        ])

    if any(keyword in lower for keyword in ["xong", "đã xong", "hoàn thành", "đã làm xong"]):
        candidates.extend([
            {"type": "exercise", "label": "Kiểm tra kết quả"},
            {"type": "resource", "label": "Sang chương mới"},
        ])

    if "không tìm thấy dữ liệu" not in lower and any(keyword in lower for keyword in ["tài liệu", "upload", "pdf", "ảnh", "hình ảnh", "trang"]):
        candidates.extend([
            {"type": "resource", "label": "Tóm tắt tài liệu này"},
            {"type": "exercise", "label": "Giải bài tập trong tài liệu"},
        ])

    if not candidates:
        candidates = [
            {"type": "exercise", "label": "Làm bài tập liên quan"},
            {"type": "theory", "label": "Ôn lại lý thuyết bài cũ"},
            {"type": "resource", "label": "Tài liệu mở rộng"},
        ]

    recent_labels = _extract_recent_suggestion_labels(chat_history)
    return _dedupe_suggestions(candidates, seen_labels=recent_labels)


def _build_default_chat_title(subject=None, grade=None):
    clean_subject = str(subject or "").strip() or "Cuộc trò chuyện"
    clean_grade = str(grade or "").strip()
    if clean_grade:
        return f"{clean_subject} - Lớp {clean_grade}"
    return clean_subject


def generate_quiz(topic, difficulty, num_questions, grade=None, subject=None, file_content=None, user_id=None, model_name="gemini-2.5-flash", exclude_questions=None, client=None):
    if genai is None or not topic:
        return []
    
    db_client = client if client is not None else supabase
    file_context = ""
    if file_content:
        file_context = f"\n\nDựa trên nội dung tài liệu do người dùng tải lên sau:\n{file_content}\n"
    else:
        try:
            # Query document metadata/IDs only to avoid loading large content columns over network
            docs_query = db_client.table("documents").select("id,name")
            if grade: docs_query = docs_query.eq("grade", str(grade).strip())
            if subject: docs_query = docs_query.eq("subject", subject)
            docs_rows = docs_query.limit(10).execute().data or []
            
            if docs_rows:
                doc_ids = [str(r.get("id")).strip() for r in docs_rows if r.get("id")]
                # Filter chunks matching these document IDs in RAM cache
                matching_chunks = [c for c in _LOCAL_CHUNKS if str(c.get("document_id")).strip() in doc_ids]
                
                # filter matching content keywords to simulate RAG
                matching_docs = []
                keywords = [w.lower() for w in topic.split() if len(w) > 2]
                for c in matching_chunks:
                    content_str = c.get("content", "")
                    if content_str and any(kw in content_str.lower() for kw in keywords):
                        matching_docs.append(content_str)
                if not matching_docs:
                    matching_docs = [c.get("content", "") for c in matching_chunks[:3]]
                combined_docs = "\n\n".join(matching_docs[:3])
                file_context = f"\n\nKIẾN THỨC TỪ CƠ SỞ DỮ LIỆU RAG (Sách giáo khoa / Tài liệu):\n{combined_docs}\n"
        except Exception as e:
            print(f"Lỗi lấy dữ liệu RAG cho quiz: {e}")

    exclude_instruction = ""
    if exclude_questions and len(exclude_questions) > 0:
        exclude_str = "\n".join(f"- {q}" for q in exclude_questions)
        exclude_instruction = f"\nTUYỆT ĐỐI KHÔNG tạo các câu hỏi trùng hoặc tương tự với các câu hỏi sau:\n{exclude_str}\n"

    prompt = f"""
    Bạn là một giáo viên chuyên ra đề thi. Hãy tạo một bài trắc nghiệm về chủ đề: '{topic}'.{file_context}
    Môn học: {subject or 'Không xác định'}, Lớp: {grade or 'Không xác định'}.
    Độ khó: {difficulty}.
    Số lượng câu hỏi: {num_questions}.
    {exclude_instruction}
    
    Yêu cầu định dạng đầu ra PHẢI LÀ JSON HỢP LỆ (không bọc trong markdown block ```json ... ```, chỉ xuất ra mảng JSON thuần túy).
    Cấu trúc mỗi câu hỏi trong mảng JSON:
    [
      {{
        "question": "Nội dung câu hỏi",
        "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
        "correctAnswer": 0, // Vị trí index của đáp án đúng (0-3)
        "explanation": "Giải thích chi tiết tại sao lại chọn đáp án này."
      }}
    ]
    """
    keys = refresh_available_keys()
    if not keys:
        return []

    for api_key in keys:
        for m_name in _iter_model_candidates(model_name):
            try:
                genai.configure(api_key=api_key)
                m = genai.GenerativeModel(m_name)
                response = m.generate_content(prompt)
                
                text = response.text.strip()
                # Remove markdown code block if present
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                
                try:
                    import re
                    text = re.sub(r'\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', text)
                except Exception as re_err:
                    print(f"Error escaping LaTeX in JSON: {re_err}")
                
                data = json.loads(text)
                return data
            except Exception as e:
                if _is_rate_limit_error(e):
                    continue
                print(f"Lỗi generate_quiz với model {m_name} key {_mask_key(api_key)}: {e}")
                continue
    return []


def generate_flashcards(topic, grade=None, subject=None, file_content=None, user_id=None, model_name="gemini-2.5-flash", client=None):
    if genai is None or not topic:
        return []
        
    db_client = client if client is not None else supabase
    file_context = ""
    if file_content:
        file_context = f"\n\nDựa trên nội dung tài liệu do người dùng tải lên sau:\n{file_content}\n"
    else:
        try:
            # Query document metadata/IDs only to avoid loading large content columns over network
            docs_query = db_client.table("documents").select("id,name")
            if grade: docs_query = docs_query.eq("grade", str(grade).strip())
            if subject: docs_query = docs_query.eq("subject", subject)
            docs_rows = docs_query.limit(10).execute().data or []
            
            if docs_rows:
                doc_ids = [str(r.get("id")).strip() for r in docs_rows if r.get("id")]
                # Filter chunks matching these document IDs in RAM cache
                matching_chunks = [c for c in _LOCAL_CHUNKS if str(c.get("document_id")).strip() in doc_ids]
                
                matching_docs = []
                keywords = [w.lower() for w in topic.split() if len(w) > 2]
                for c in matching_chunks:
                    content_str = c.get("content", "")
                    if content_str and any(kw in content_str.lower() for kw in keywords):
                        matching_docs.append(content_str)
                if not matching_docs:
                    matching_docs = [c.get("content", "") for c in matching_chunks[:3]]
                combined_docs = "\n\n".join(matching_docs[:3])
                file_context = f"\n\nKIẾN THỨC TỪ CƠ SỞ DỮ LIỆU RAG (Sách giáo khoa / Tài liệu):\n{combined_docs}\n"
        except Exception as e:
            print(f"Lỗi lấy dữ liệu RAG cho flashcard: {e}")

    prompt = f"""
    Bạn là một giáo viên chuyên tạo thẻ học tập (flashcard). Hãy tạo một bộ flashcard về chủ đề: '{topic}'.{file_context}
    Môn học: {subject or 'Không xác định'}, Lớp: {grade or 'Không xác định'}.
    Số lượng thẻ: 5-10 thẻ chứa các khái niệm/công thức quan trọng nhất.
    
    Yêu cầu định dạng đầu ra PHẢI LÀ JSON HỢP LỆ (không bọc trong markdown block, chỉ xuất mảng JSON).
    Cấu trúc:
    [
      {{
        "front": "Khái niệm hoặc câu hỏi ngắn gọn gọn gọn",
        "back": "Định nghĩa hoặc công thức hoặc đáp án ngắn gọn"
      }}
    ]
    """
    keys = refresh_available_keys()
    if not keys:
        return []

    for api_key in keys:
        for m_name in _iter_model_candidates(model_name):
            try:
                genai.configure(api_key=api_key)
                m = genai.GenerativeModel(m_name)
                response = m.generate_content(prompt)
                
                text = response.text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                
                try:
                    import re
                    text = re.sub(r'\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', text)
                except Exception as re_err:
                    print(f"Error escaping LaTeX in JSON: {re_err}")
                
                data = json.loads(text)
                return data
            except Exception as e:
                if _is_rate_limit_error(e):
                    continue
                continue
    return []


def _generate_chat_title(question, api_key=None, model_name="gemini-2.5-flash", subject=None, grade=None):
    if genai is None or not question:
        return _build_default_chat_title(subject, grade)

    try:
        if hasattr(genai, 'configure'):
            genai.configure(api_key=api_key)
        if hasattr(genai, 'GenerativeModel'):
            model = genai.GenerativeModel(model_name)
            prompt = (
                "Hãy tóm tắt nội dung sau thành một tiêu đề hội thoại ngắn dưới 5 từ, "
                "phù hợp để đặt tên chat. Chỉ trả về tiêu đề, không dấu ngoặc kép, không giải thích.\n\n"
                f"Nội dung: {question}"
            )
            result = model.generate_content(prompt)
            title = getattr(result, 'text', '') or ''
            clean_title = re.sub(r"[\r\n\t]+", " ", title).strip(' "')
            if clean_title:
                return clean_title[:60]
    except Exception as e:
        print(f"⚠️ Không thể sinh tiêu đề chat tự động: {e}")
        if _is_rate_limit_error(e):
            return _build_default_chat_title(subject, grade)[:60]

    fallback = question.strip().split('?')[0].strip()
    fallback = re.sub(r"\s+", " ", fallback)
    if fallback:
        return fallback[:60]
    return _build_default_chat_title(subject, grade)


def _extract_grade_from_question(question, learner_profile=None):
    if learner_profile and learner_profile.get("grade"):
        return str(learner_profile.get("grade"))
    return None


def _normalize_subject_name(subject):
    raw = str(subject or "").strip().lower()
    if not raw:
        return ""
    aliases = {
        "toán": "Toán",
        "toan": "Toán",
        "ngữ văn": "Ngữ văn",
        "ngu van": "Ngữ văn",
        "tiếng anh": "Tiếng Anh",
        "tieng anh": "Tiếng Anh",
        "vật lý": "Vật lý",
        "vat ly": "Vật lý",
        "hóa học": "Hóa học",
        "hoa hoc": "Hóa học",
        "sinh học": "Sinh học",
        "sinh hoc": "Sinh học",
        "lịch sử": "Lịch sử",
        "lich su": "Lịch sử",
        "địa lý": "Địa lý",
        "dia ly": "Địa lý",
        "tin học": "Tin học",
        "tin hoc": "Tin học",
    }
    if raw in aliases:
        return aliases[raw]
    return str(subject or "").strip()


def _extract_structured_suggestions(full_answer):
    if not full_answer:
        return [], full_answer

    match = re.search(r"```json\s*(\{[\s\S]*?\})\s*```\s*$", full_answer)
    if not match:
        return [], full_answer

    try:
        parsed = json.loads(match.group(1))
    except Exception:
        return [], full_answer

    suggestions = parsed.get("suggestions") if isinstance(parsed, dict) else []
    cleaned_answer = full_answer[:match.start()].rstrip()
    return _dedupe_suggestions(suggestions), cleaned_answer


def _default_suggestions_for_subject(subject_name):
    normalized = _normalize_subject_name(subject_name).lower()
    if 'toán' in normalized:
        return [
            {"type": "exercise", "label": "Làm thêm 1 bài tập Toán"},
            {"type": "theory", "label": "Ôn lại công thức liên quan"},
            {"type": "resource", "label": "Xem ví dụ tương tự trong sách"},
        ]
    if 'văn' in normalized:
        return [
            {"type": "exercise", "label": "Phân tích thêm một đoạn văn"},
            {"type": "theory", "label": "Ôn lại ý chính bài học"},
            {"type": "resource", "label": "Xem dàn ý mẫu"},
        ]
    if 'anh' in normalized:
        return [
            {"type": "exercise", "label": "Luyện thêm một câu tương tự"},
            {"type": "theory", "label": "Ôn lại từ vựng trọng tâm"},
            {"type": "resource", "label": "Xem mẫu hội thoại"},
        ]
    return [
        {"type": "exercise", "label": "Làm thêm một bài liên quan"},
        {"type": "theory", "label": "Ôn lại lý thuyết chính"},
        {"type": "resource", "label": "Xem tài liệu tham khảo"},
    ]


def process_pdf_to_markdown(file_bytes, mime_type="application/pdf"):
    import tempfile
    temp_dir = tempfile.gettempdir()
    temp_pdf_path = os.path.join(temp_dir, f"temp_{uuid.uuid4()}.pdf")
    output_dir = os.path.join(temp_dir, f"temp_output_{uuid.uuid4()}")
    try:
        with open(temp_pdf_path, "wb") as f:
            f.write(file_bytes)

        text_extracted = ""

        # 1. Try pypdf first (Extremely fast, < 1 second)
        try:
            from pypdf import PdfReader
            reader = PdfReader(temp_pdf_path)
            pages = []
            for i, p in enumerate(reader.pages):
                text = p.extract_text() or ""
                if text.strip():
                    pages.append(f"## Page {i+1}\n\n" + text.strip())
            if pages:
                text_extracted = "\n\n".join(pages)
        except Exception as e:
            print("pypdf extraction failed:", e)

        # 2. Only if pypdf extracts nothing or is extremely short, run MarkItDown (Slow, heavy)
        if (not text_extracted or len(text_extracted.strip()) < 100) and _MD_AVAILABLE:
            try:
                res = _MD_TOOL.convert(temp_pdf_path)
                text = getattr(res, "text_content", None) or getattr(res, "text", None) or ""
                if text and text.strip():
                    text_extracted = text.strip()
            except Exception as e:
                print("MarkItDown conversion failed:", e)

        # Fallback to Gemini 1.5 Flash if text extraction is empty or too short (handles scanned PDFs)
        if not text_extracted or len(text_extracted.strip()) < 50:
            print("PDF extracted text is empty or too short. Trying Gemini 1.5 Flash OCR...")
            keys = refresh_available_keys()
            if keys:
                for api_key in keys:
                    try:
                        if genai is not None and hasattr(genai, 'configure'):
                            genai.configure(api_key=api_key)
                            model = genai.GenerativeModel("gemini-1.5-flash")
                            prompt = (
                                "Bạn là một AI trích xuất tài liệu. Hãy đọc toàn bộ tài liệu PDF này "
                                "(bao gồm tất cả các trang, chữ viết tay, hình vẽ, công thức toán học) "
                                "và trích xuất/chuyển đổi nó thành định dạng Markdown chi tiết và đầy đủ nhất. "
                                "Hãy giữ cấu trúc của các câu hỏi, lời giải, hay bài tập nếu có. Không giải thích thêm."
                            )
                            res = model.generate_content([
                                {
                                    "mime_type": "application/pdf",
                                    "data": file_bytes
                                },
                                prompt
                            ])
                            if res.text and res.text.strip():
                                text_extracted = res.text.strip()
                                print("Gemini PDF extraction succeeded!")
                                break
                    except Exception as e:
                        print(f"⚠️ Gemini PDF OCR failed with key {_mask_key(api_key)}: {e}")
                        continue

        if text_extracted and len(text_extracted.strip()) >= 10:
            return text_extracted

        return "Error: Could not process PDF."
    except Exception as e:
        print(f"❌ PDF processing error: {str(e)}")
        return f"Error: Could not process PDF: {str(e)}"
    finally:
        try:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
            if os.path.exists(output_dir):
                import shutil
                shutil.rmtree(output_dir, ignore_errors=True)
        except Exception:
            pass


def process_image_to_text(file_bytes):
    """Try to extract text from an image using Gemini Vision natively."""
    keys = refresh_available_keys()
    if not keys:
        return ""

    try:
        from io import BytesIO
        from PIL import Image
        img = Image.open(BytesIO(file_bytes)).convert('RGB')
        
        for api_key in keys:
            try:
                if genai is not None and hasattr(genai, 'configure'):
                    genai.configure(api_key=api_key)
                    model = genai.GenerativeModel("gemini-1.5-flash")
                    prompt = "Bạn là một AI trích xuất văn bản từ hình ảnh. Hãy đọc toàn bộ nội dung trong ảnh này (bao gồm cả công thức toán học, chữ viết tay, hình học) và xuất ra dưới dạng Markdown chính xác nhất. Không giải bài tập, chỉ đọc chữ."
                    res = model.generate_content([prompt, img])
                    if res.text:
                        return res.text.strip()
            except Exception as e:
                print(f"⚠️ Gemini Vision OCR failed with key {_mask_key(api_key)}: {e}")
                continue
        return ""
    except Exception as e:
        print(f"⚠️ Image processing failed: {e}")
        return ""


def _chunk_text(text, chunk_size=1500, overlap=200):
    if not text:
        return []
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        if end >= text_len:
            break
        start += chunk_size - overlap
    return chunks


def save_document_to_db(text_content, source_name, doc_id, client=None):
    db_client = client if client is not None else supabase
    
    # Fetch existing document to check if it already has a subject
    final_subject = None
    try:
        doc_res = db_client.table("documents").select("subject").eq("id", doc_id).execute()
        if doc_res.data and len(doc_res.data) > 0:
            existing_doc = doc_res.data[0]
            if existing_doc and existing_doc.get("subject") and str(existing_doc.get("subject")).strip():
                final_subject = existing_doc.get("subject")
    except Exception as doc_fetch_err:
        print(f"⚠️ Warning: failed to fetch existing document subject: {doc_fetch_err}")

    if not final_subject:
        final_subject = _infer_subject_from_text(f"{source_name or ''} {text_content or ''}")
        
    _cache_document_context(doc_id, source_name=source_name, subject=final_subject)
    
    try:
        # 1. Split text into chunks
        chunks = _chunk_text(text_content, chunk_size=1500, overlap=200)
        
        # 2. Delete existing chunks for this document to avoid duplicates on retry/update
        try:
            db_client.table("document_chunks").delete().eq("document_id", doc_id).execute()
        except Exception as del_err:
            print(f"⚠️ Warning: could not delete old chunks for document {doc_id}: {del_err}")

        # 3. Create embeddings for each chunk and save to document_chunks
        chunk_rows = []
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk:
                continue
            try:
                vector = _embed_with_provider(chunk)
                if vector:
                    if isinstance(vector[0], list):
                        vector = vector[0][:768]
                    else:
                        vector = vector[:768]
                    chunk_rows.append({
                        "document_id": doc_id,
                        "content": chunk,
                        "embedding": vector
                    })
            except Exception as chunk_err:
                print(f"⚠️ Warning: failed to generate embedding for chunk in document {doc_id}: {chunk_err}")
                
        if chunk_rows:
            try:
                db_client.table("document_chunks").insert(chunk_rows).execute()
                print(f"💾 [Supabase Bulk Insert] Successfully saved {len(chunk_rows)} chunks in bulk.")
            except Exception as insert_err:
                print(f"❌ Supabase bulk insert failed, attempting fallback loop insertion: {insert_err}")
                # Fallback to sequential insert if bulk insert fails for some reason
                for row in chunk_rows:
                    try:
                        db_client.table("document_chunks").insert(row).execute()
                    except Exception as fallback_row_err:
                        print(f"⚠️ Warning: fallback loop insert failed for row: {fallback_row_err}")
                
        # 4. Save first 9,000 characters and its embedding to main documents table for backward compatibility
        safe_content = text_content[:9000]
        main_vector = None
        try:
            main_vector = _embed_with_provider(safe_content)
            if main_vector:
                if isinstance(main_vector[0], list):
                    main_vector = main_vector[0][:768]
                else:
                    main_vector = main_vector[:768]
        except Exception as main_emb_err:
            print(f"⚠️ Warning: failed to generate main document embedding: {main_emb_err}")
            
        db_client.table("documents").update({
            "content": safe_content,
            "embedding": main_vector,
            "subject": final_subject,
            "status": "ready"
        }).eq("id", doc_id).execute()
        return "Thành công"
    except Exception as e:
        print(f"❌ save_document_to_db failed for document {doc_id}: {e}")
        # Try to set status to ready even if chunking/embeddings failed
        try:
            db_client.table("documents").update({"status": "ready"}).eq("id", doc_id).execute()
        except Exception:
            pass
        return f"Lỗi: {str(e)}"


def _document_matches_subject(doc_name, target_subject):
    if not target_subject:
        return True
    
    import unicodedata
    def strip_accents(t):
        return "".join(c for c in unicodedata.normalize('NFD', str(t or "")) if unicodedata.category(c) != 'Mn').lower()
        
    doc_clean = strip_accents(doc_name)
    sub_clean = strip_accents(target_subject)
    
    # Check if target subject is in doc_clean
    if sub_clean in doc_clean:
        return True
        
    # Standard mapping fallbacks
    if sub_clean == "toan":
        return "toan" in doc_clean
    if sub_clean == "van" or sub_clean == "ngu van":
        return "van" in doc_clean or "tieng viet" in doc_clean
    if sub_clean == "tin" or sub_clean == "tin hoc":
        return "tin" in doc_clean
    if sub_clean == "tieng anh" or sub_clean == "anh":
        return "anh" in doc_clean or "english" in doc_clean
    if sub_clean == "vat ly" or sub_clean == "ly" or sub_clean == "vat li":
        return "ly" in doc_clean or "li" in doc_clean
    if sub_clean == "hoa" or sub_clean == "hoa hoc":
        return "hoa" in doc_clean
    if sub_clean == "sinh" or sub_clean == "sinh hoc":
        return "sinh" in doc_clean
    if sub_clean == "lich su" or sub_clean == "su":
        return "su" in doc_clean
    if sub_clean == "dia" or sub_clean == "dia ly" or sub_clean == "dia li":
        return "dia" in doc_clean
        
    return False


def _normalize_grade_value(g):
    if not g:
        return ""
    s = str(g).lower().strip()
    s = s.replace("lớp", "").replace("lop", "").strip()
    return s


# Cache structures migrated to top of file



def get_ai_response_stream_with_history(question, session_id=None, user_id=None, model_name="gemini-2.5-flash", grade=None, subject=None, force_reset_context=False, image_data=None, client=None):
    keys = refresh_available_keys()
    if not keys:
        yield "Hệ thống chưa được cấu hình API Key!"
        return

    db_client = client if client is not None else supabase
    
    # Load system configs from DB
    sys_configs = {}
    try:
        res = db_client.table("system_configs").select("key_name, key_value").execute()
        if res.data:
            for row in res.data:
                k = row.get("key_name")
                v = row.get("key_value")
                if k and v is not None:
                    sys_configs[k] = v
    except Exception as sys_err:
        print(f"⚠️ Warning: could not load configs from system_configs: {sys_err}")

    db_temperature = None
    db_max_tokens = None
    if "temperature" in sys_configs:
        try:
            db_temperature = float(sys_configs["temperature"])
        except ValueError:
            pass
    if "max_tokens" in sys_configs:
        try:
            db_max_tokens = int(sys_configs["max_tokens"])
        except ValueError:
            pass
            
    system_instruction = sys_configs.get("system_prompt") or 'Bạn là Gia sư ảo — được định vị là "Trợ lý sư phạm chống gian lận & thấu cảm", TUYỆT ĐỐI KHÔNG nhận mình là "Chatbot trả lời câu hỏi" thông thường.'

    chat_history = []
    is_first_turn = True
    cached_session_context = _get_cached_chat_session_context(session_id)
    target_grade = str(grade).strip() if grade is not None else str(cached_session_context.get("grade") or "").strip() or None
    target_subject = _normalize_subject_name(subject or cached_session_context.get("subject"))
    learner_profile = get_user_profile(user_id, client=db_client)

    try:
        is_valid_uuid = False
        if session_id:
            session_id = session_id.replace("[SESSION_ID:", "").replace("SESSION_ID:", "").replace("]", "").strip()
            try:
                uuid.UUID(session_id)
                is_valid_uuid = True
            except Exception:
                is_valid_uuid = False

        session_row = {}
        session_exists = False
        if is_valid_uuid:
            if session_id in _SESSION_CACHE:
                # Fast path: in-memory cache (same process/instance)
                session_row = _SESSION_CACHE[session_id]
                chat_history = session_row.get("messages") or []
                session_exists = True
                print(f"⚡ [Session Cache] Hit for session {session_id} ({len(chat_history)} messages)")
            else:
                # Cold start: reload from DB
                try:
                    res = db_client.table("chat_sessions").select("messages,grade,subject").eq("id", session_id).execute()
                    if res.data and len(res.data) > 0:
                        session_row = res.data[0] or {}
                        session_exists = True
                        
                        # Primary source: chat_sessions.messages (has correct image URLs, not base64)
                        db_messages = session_row.get("messages") or []
                        chat_history = db_messages
                        
                        # Secondary source: chat_history table (count only, to detect if more messages exist)
                        # Only sync if chat_history has significantly more rows than what we have
                        if user_id:
                            try:
                                count_res = (
                                    db_client.table("chat_history")
                                    .select("id", count="exact")
                                    .eq("session_id", session_id)
                                    .execute()
                                )
                                total_in_db = count_res.count or len(count_res.data or [])
                                current_msg_count = len(db_messages)
                                
                                print(f"📊 [Session] chat_sessions.messages={current_msg_count}, chat_history rows={total_in_db}")
                                
                                # If chat_sessions.messages is more than 4 messages behind, rebuild
                                if total_in_db > current_msg_count + 4:
                                    print(f"🔄 [History Rebuild] chat_sessions.messages ({current_msg_count}) lagging behind chat_history ({total_in_db}). Rebuilding...")
                                    hist_res = (
                                        db_client.table("chat_history")
                                        .select("role,content,timestamp")
                                        .eq("session_id", session_id)
                                        .order("timestamp")
                                        .execute()
                                    )
                                    hist_rows = hist_res.data or []
                                    rebuilt = []
                                    for row in hist_rows:
                                        role = row.get("role") or ""
                                        content = row.get("content") or ""
                                        # Skip rows with huge base64 content (legacy format before fix)
                                        if len(content) > 50000:
                                            # Keep only the text part after the image marker
                                            if "\n" in content:
                                                content = content[content.rfind("\n"):].strip()
                                            else:
                                                content = "[Hình ảnh đính kèm]"
                                        # Skip [ANSWER]...[END_ANSWER] markers from assistant — keep raw
                                        # Map role
                                        prompt_role = "model" if role == "assistant" else "user"
                                        rebuilt.append({"role": prompt_role, "content": content})
                                    
                                    if len(rebuilt) > len(db_messages):
                                        chat_history = rebuilt
                                        # Sync back to chat_sessions.messages
                                        try:
                                            db_client.table("chat_sessions").update({"messages": chat_history}).eq("id", session_id).execute()
                                            print(f"✅ [History Rebuild] Synced {len(chat_history)} messages back to chat_sessions.messages")
                                        except Exception as sync_err:
                                            print(f"⚠️ Sync failed: {sync_err}")
                            except Exception as count_err:
                                print(f"⚠️ [History Check] Could not compare message counts: {count_err}")
                        
                        if len(_SESSION_CACHE) > 1000:
                            for k in list(_SESSION_CACHE.keys())[:100]:
                                _SESSION_CACHE.pop(k, None)
                        _SESSION_CACHE[session_id] = {
                            "messages": chat_history,
                            "grade": session_row.get("grade") or target_grade,
                            "subject": session_row.get("subject") or target_subject
                        }
                        print(f"💾 [Session Cache] Cached session {session_id} ({len(chat_history)} messages)")
                except Exception as session_err:
                    print(f"⚠️ Không thể đọc chat_sessions: {session_err}")


        # If not a valid UUID, generate one
        if not is_valid_uuid:
            session_id = str(uuid.uuid4())

        # If session does not exist in database (new local UUID or freshly generated), insert it!
        if not session_exists:
            try:
                insert_payload = {"id": session_id, "messages": []}
                if target_grade:
                    insert_payload["grade"] = target_grade
                if target_subject:
                    insert_payload["subject"] = target_subject
                db_client.table("chat_sessions").insert(insert_payload).execute()
                print(f"🆕 [Session Init] Khởi tạo session mới {session_id} trong DB.")
                
                session_row = {
                    "messages": [],
                    "grade": target_grade,
                    "subject": target_subject
                }
                _SESSION_CACHE[session_id] = session_row
                chat_history = []
            except Exception as create_err:
                print(f"⚠️ Warning: không thể khởi tạo session {session_id}: {create_err}")
                chat_history = []

        db_grade = str(session_row.get("grade") or cached_session_context.get("grade") or "").strip()
        db_subject = _normalize_subject_name(session_row.get("subject") or cached_session_context.get("subject"))
        if db_grade or db_subject:
            _cache_chat_session_context(session_id, grade=db_grade or target_grade, subject=db_subject or target_subject)

        norm_db_grade = _normalize_grade_value(db_grade)
        norm_target_grade = _normalize_grade_value(target_grade)
        
        if force_reset_context:
            chat_history = []
            reset_payload = {"messages": []}
            if target_grade:
                reset_payload["grade"] = target_grade
            if target_subject:
                reset_payload["subject"] = target_subject
            try:
                db_client.table("chat_sessions").update(reset_payload).eq("id", session_id).execute()
                if session_id in _SESSION_CACHE:
                    _SESSION_CACHE[session_id]["messages"] = []
                    if target_grade:
                        _SESSION_CACHE[session_id]["grade"] = target_grade
                    if target_subject:
                        _SESSION_CACHE[session_id]["subject"] = target_subject
            except Exception as reset_err:
                print(f"⚠️ Không thể reset session context: {reset_err}")
                _cache_chat_session_context(session_id, grade=reset_payload.get("grade") or db_grade, subject=reset_payload.get("subject") or db_subject)
        else:
            # Update metadata in DB and Cache if changed, but do NOT wipe messages!
            update_payload = {}
            if norm_target_grade and norm_db_grade and norm_db_grade != norm_target_grade:
                update_payload["grade"] = target_grade
            if target_subject and db_subject and db_subject != target_subject:
                update_payload["subject"] = target_subject
            if update_payload:
                try:
                    db_client.table("chat_sessions").update(update_payload).eq("id", session_id).execute()
                    if session_id in _SESSION_CACHE:
                        if "grade" in update_payload:
                            _SESSION_CACHE[session_id]["grade"] = target_grade
                        if "subject" in update_payload:
                            _SESSION_CACHE[session_id]["subject"] = target_subject
                    print(f"🔄 [Session Update] Updated grade/subject metadata without resetting history: {update_payload}")
                except Exception as update_err:
                    print(f"⚠️ Không thể cập nhật session metadata: {update_err}")
    except Exception:
        if not session_id:
            session_id = str(uuid.uuid4())

    yield f"[SESSION_ID:{session_id}]\n\n"

    learner_name = None
    learner_grade = None
    learner_role = None
    learner_email = None
    learning_style = None
    daily_goal = None
    
    if learner_profile:
        full_name_raw = learner_profile.get("full_name") or learner_profile.get("name") or ""
        if "|" in full_name_raw:
            parts = full_name_raw.split("|")
            learner_name = parts[0].strip()
            for part in parts[1:]:
                part = part.strip()
                if part.startswith("goal:"):
                    daily_goal = part[len("goal:"):].strip()
                elif part.startswith("style:"):
                    learning_style = part[len("style:"):].strip()
        else:
            learner_name = full_name_raw.strip()
            
        learner_grade = learner_profile.get("grade")
        learner_role = learner_profile.get("role")
        learner_email = learner_profile.get("email")

    learner_lines = ["THÔNG TIN NGƯỜI HỌC:"]
    if learner_name:
        learner_lines.append(f"- Tên: {learner_name}")
    if learner_email:
        learner_lines.append(f"- Email: {learner_email}")
    if learner_grade:
        learner_lines.append(f"- Lớp: {learner_grade}")
    if learner_role:
        learner_lines.append(f"- Vai trò: {learner_role}")
    if daily_goal:
        learner_lines.append(f"- Mục tiêu học tập hàng ngày: {daily_goal} phút")
    if learning_style:
        learner_lines.append(f"- Phong cách học tập: {learning_style}")
        if learning_style in ["theory", "Lý thuyết"]:
            learner_lines.append("- Hướng dẫn phong cách: Học sinh chọn phong cách học lý thuyết. Giải thích các khái niệm chuyên sâu, cung cấp định nghĩa, bản chất và các ví dụ lý thuyết cặn kẽ.")
        elif learning_style in ["practice", "Thực hành"]:
            learner_lines.append("- Hướng dẫn phong cách: Học sinh chọn phong cách học thực hành. Hãy ưu tiên gợi mở bài tập, ví dụ thực tế và áp dụng phương pháp Socratic để học sinh tự suy luận từng bước.")
        elif learning_style in ["concise", "Ngắn gọn"]:
            learner_lines.append("- Hướng dẫn phong cách: Học sinh chọn phong cách học ngắn gọn. Hãy trả lời cực kỳ cô đọng, đi thẳng vào vấn đề, sử dụng gạch đầu dòng và loại bỏ mọi câu chữ giải thích rườm rà không cần thiết.")
            
    if len(learner_lines) == 1:
        learner_lines.append("- Chưa xác định được hồ sơ, hãy xưng hô trung tính và hỏi tên nếu cần.")
    learner_context_text = "\n".join(learner_lines)

    last_error = None
    model_candidates = _iter_model_candidates(model_name)

    for current_model in model_candidates:
        model_succeeded = False

        for api_key in _iter_active_keys():
            try:
                context = "Không tìm thấy dữ liệu liên quan trong sách."
                try:
                    # Check for short or conversational queries to bypass expensive RAG
                    # IMPORTANT: Do NOT skip RAG if there's already active chat history —
                    # short answers like "20 ạ", "3 ạ" are follow-up responses within an ongoing lesson.
                    _truly_conversational = question.strip().lower() in [
                        "ok", "chào", "chào cô", "cảm ơn", "cảm ơn cô", "dạ", "dạ vâng", "tiếp đi", "tiếp tục", "hi", "hello"
                    ]
                    # Only skip RAG if message is very short AND there's NO active chat history context
                    is_conversational_only = _truly_conversational or (len(question.strip()) < 15 and len(chat_history) == 0)
                    
                    pub_docs = []
                    user_docs = []
                    if is_conversational_only:
                        print(f"⚡ [RAG Skip] Bỏ qua RAG cho câu hỏi hội thoại thuần: '{question}'")
                    else:
                        # 1. Fetch matching public documents by grade and subject (including name) (using in-memory cache)
                        docs_cache_key = (target_grade, target_subject)
                        if docs_cache_key in _DOCS_CACHE:
                            pub_docs = _DOCS_CACHE[docs_cache_key]
                            print(f"⚡ [Docs Cache] Lấy thành công {len(pub_docs)} public documents từ bộ nhớ đệm (0ms)!")
                        else:
                            try:
                                pub_query = db_client.table("documents").select("id,name,grade,subject").is_("user_id", "null")
                                if target_grade:
                                    pub_query = pub_query.eq("grade", target_grade)
                                if target_subject:
                                    pub_query = pub_query.eq("subject", target_subject)
                                pub_docs = pub_query.execute().data or []
                                
                                # Fallback: if no documents matched target_subject directly, query all matching grade and filter locally by matching subject keywords in name
                                if not pub_docs and target_grade:
                                    try:
                                        print(f"🔍 [Docs Fallback] Thử tìm tài liệu public lớp {target_grade} không lọc môn học để tìm theo tên...")
                                        fallback_query = db_client.table("documents").select("id,name,grade,subject").is_("user_id", "null")
                                        fallback_query = fallback_query.eq("grade", target_grade)
                                        all_docs = fallback_query.execute().data or []
                                        pub_docs = [
                                            d for d in all_docs
                                            if _normalize_subject_name(d.get("subject")) == target_subject 
                                            or _document_matches_subject(d.get("name"), target_subject)
                                        ]
                                        print(f"💾 [Docs Fallback] Tìm thấy {len(pub_docs)} tài liệu public phù hợp sau khi lọc tên.")
                                    except Exception as fallback_err:
                                        print(f"⚠️ Document fallback query failed: {fallback_err}")
                                
                                if len(_DOCS_CACHE) > 500:
                                    for k in list(_DOCS_CACHE.keys())[:50]:
                                        _DOCS_CACHE.pop(k, None)
                                _DOCS_CACHE[docs_cache_key] = pub_docs
                                print(f"💾 [Docs Cache] Lưu {len(pub_docs)} public documents vào bộ nhớ đệm.")
                            except Exception as docs_err:
                                print(f"⚠️ Document query with subject/grade failed, retrying without subject: {docs_err}")
                                try:
                                    pub_query = db_client.table("documents").select("id,name,grade").is_("user_id", "null")
                                    if target_grade:
                                        pub_query = pub_query.eq("grade", target_grade)
                                    pub_docs = pub_query.execute().data or []
                                    if len(_DOCS_CACHE) > 500:
                                        for k in list(_DOCS_CACHE.keys())[:50]:
                                            _DOCS_CACHE.pop(k, None)
                                    _DOCS_CACHE[docs_cache_key] = pub_docs
                                except Exception as docs_fallback_err:
                                    print(f"⚠️ Document fallback query failed: {docs_fallback_err}")
                                    pub_docs = []

                        # 2. Fetch user's private documents (no global cache)
                        if user_id and str(user_id).strip() != "guest":
                            try:
                                user_query = db_client.table("documents").select("id,name,grade,subject,content,created_at").eq("user_id", user_id)
                                if target_grade:
                                    user_query = user_query.eq("grade", target_grade)
                                if target_subject:
                                    user_query = user_query.or_(f"subject.eq.{target_subject},subject.is.null")
                                
                                user_docs = user_query.execute().data or []
                                print(f"🔍 [User Docs] Tìm thấy {len(user_docs)} tài liệu cá nhân của user.")
                                if user_docs:
                                    if all("created_at" in d for d in user_docs):
                                        try:
                                            user_docs.sort(key=lambda x: x.get("created_at") or "", reverse=True)
                                        except Exception:
                                            pass
                            except Exception as user_err:
                                print(f"⚠️ User document query failed: {user_err}")
                                user_docs = []

                    docs_rows = pub_docs + user_docs

                    # 3. Filter doc_ids precisely matching criteria
                    doc_ids = []
                    doc_id_to_name = {}
                    if docs_rows:
                        for item in docs_rows:
                            doc_id = str(item.get("id") or "").strip()
                            doc_name = item.get("name") or "Tài liệu không tên"
                            doc_id_to_name[doc_id] = doc_name
                            
                            doc_cache = DOCUMENT_CONTEXT_CACHE.get(doc_id, {}) if doc_id else {}
                            doc_subject = _normalize_subject_name(item.get("subject") or doc_cache.get("subject"))
                            doc_grade = str(item.get("grade") or "").strip()
                            if target_grade and doc_grade and doc_grade != target_grade:
                                continue
                            if target_subject and doc_subject and doc_subject != target_subject:
                                continue
                            doc_ids.append(doc_id)

                    # 4. Retrieve chunks for matched documents and perform Cosine Similarity search in Python (using in-memory caching)
                    chunks_rows = []
                    if doc_ids:
                        cache_key = tuple(sorted(doc_ids))
                        if cache_key in _CHUNKS_CACHE:
                            chunks_rows = _CHUNKS_CACHE[cache_key]
                            print(f"⚡ [RAG Cache] Lấy thành công {len(chunks_rows)} chunks từ bộ nhớ đệm (0ms)!")
                        else:
                            local_chunks = _load_local_chunks()
                            local_doc_ids = set(c.get("document_id") for c in local_chunks if c.get("document_id"))
                            
                            # Filter local chunks for matched doc_ids
                            cached_doc_chunks = [c for c in local_chunks if str(c.get("document_id") or "").strip() in doc_ids]
                            chunks_rows.extend(cached_doc_chunks)
                            
                            # Find which doc_ids are missing from the local cache
                            missing_doc_ids = [d for d in doc_ids if d not in local_doc_ids]
                            
                            # Query missing doc_ids from Supabase
                            if missing_doc_ids:
                                try:
                                    print(f"🔍 [RAG Database] Tìm thấy {len(missing_doc_ids)} tài liệu mới chưa được cache, đang truy vấn Supabase...")
                                    chunks_query = db_client.table("document_chunks").select("content,embedding,document_id").in_("document_id", missing_doc_ids)
                                    db_chunks = chunks_query.limit(1000).execute().data or []
                                    chunks_rows.extend(db_chunks)
                                    print(f"💾 [RAG Database] Tải thành công {len(db_chunks)} chunks từ database.")
                                except Exception as chunks_err:
                                    print(f"⚠️ Failed to fetch missing chunks from document_chunks: {chunks_err}")
                            
                            if len(_CHUNKS_CACHE) > 500:
                                for k in list(_CHUNKS_CACHE.keys())[:50]:
                                    _CHUNKS_CACHE.pop(k, None)
                            _CHUNKS_CACHE[cache_key] = chunks_rows
                            print(f"⚡ [RAG Cache] Đã chuẩn bị {len(chunks_rows)} chunks từ cache/database.")

                    # Build personal uploads context
                    user_docs_context = ""
                    if user_docs:
                        for d in user_docs[:2]: # Limit to top 2 user docs to avoid prompt bloat
                            d_name = d.get("name") or "Tài liệu học sinh tải lên"
                            d_content = d.get("content") or ""
                            if d_content.strip():
                                user_docs_context += f"\n\n[TÀI LIỆU HỌC SINH TẢI LÊN: {d_name}]\n{d_content[:6000]}\n"

                    # Build textbook RAG context
                    rag_context = ""
                    if chunks_rows:
                        try:
                            # Create embedding vector for the query
                            question_vector = _embed_with_provider(question)
                            if isinstance(question_vector[0], list):
                                question_vector = question_vector[0][:768]
                            else:
                                question_vector = question_vector[:768]

                            # Define Cosine Similarity calculator using numpy for vector acceleration (300x speedup)
                            import numpy as np
                            q_arr = np.array(question_vector, dtype=np.float32)
                            q_norm = np.linalg.norm(q_arr)

                            scored_chunks = []
                            if q_norm > 0:
                                for chunk in chunks_rows:
                                    content_str = chunk.get("content", "")
                                    embedding_str = chunk.get("embedding", "")
                                    doc_id = chunk.get("document_id", "")
                                    if content_str and embedding_str:
                                        try:
                                            if isinstance(embedding_str, str):
                                                c_vec = json.loads(embedding_str)
                                            else:
                                                c_vec = embedding_str
                                            
                                            c_arr = np.array(c_vec, dtype=np.float32)
                                            c_norm = np.linalg.norm(c_arr)
                                            if c_norm > 0:
                                                score = float(np.dot(q_arr, c_arr) / (q_norm * c_norm))
                                                scored_chunks.append((score, content_str, doc_id))
                                        except Exception:
                                            pass

                            # Sort by score descending and take top 5 chunks
                            scored_chunks.sort(key=lambda x: x[0], reverse=True)
                            top_chunks = scored_chunks[:5]

                            # Detailed Console Log
                            print(f"🔍 [RAG] Tìm thấy {len(top_chunks)} chunks phù hợp cho câu hỏi: '{question}'")
                            for idx, (score, content_str, doc_id) in enumerate(top_chunks):
                                doc_name = doc_id_to_name.get(doc_id, "Tài liệu không tên")
                                print(f"   - Chunk {idx+1} (Độ khớp: {score:.4f} | Từ file: {doc_name}): {content_str[:120]}...")

                            if top_chunks and top_chunks[0][0] > 0.3:
                                context_parts = []
                                for idx, (score, content_str, doc_id) in enumerate(top_chunks):
                                    doc_name = doc_id_to_name.get(doc_id, "Tài liệu không tên")
                                    context_parts.append(f"[Nguồn: {doc_name} (Độ tương đồng: {score:.4f})]\n{content_str}")
                                    rag_context = "\n\n---\n\n".join(context_parts)
                        except Exception as calc_err:
                            print(f"⚠️ Similarity check failed: {calc_err}")

                    # Combine both contexts
                    context = ""
                    if user_docs_context:
                        context += user_docs_context
                    if rag_context:
                        if context:
                            context += f"\n\n---\n\n[KIẾN THỨC THAM CHIẾU KHÁC TỪ SÁCH GIÁO KHOA]:\n{rag_context}"
                        else:
                            context = rag_context

                    if not context:
                        # Fallback to preview content if no similarity matches
                        fallback_content = ""
                        fallback_doc_name = "Tài liệu không tên"
                        if doc_ids:
                            for d in docs_rows:
                                if d.get("id") in doc_ids:
                                    try:
                                        preview_res = db_client.table("documents").select("name,content").eq("id", d.get("id")).execute()
                                        if preview_res.data and preview_res.data[0].get("content"):
                                            fallback_content = preview_res.data[0].get("content")
                                            fallback_doc_name = preview_res.data[0].get("name") or "Tài liệu không tên"
                                            break
                                    except Exception:
                                        pass
                        if fallback_content:
                            context = f"[Nguồn: {fallback_doc_name} (Xem trước tài liệu)]\n{fallback_content[:4000]}"
                        else:
                            context = f"Hiện tại cô chưa có tài liệu cụ thể của lớp {target_grade or learner_grade or 'chưa xác định'} môn {target_subject or subject or 'chưa xác định'}, nhưng với kiến thức chung, cô sẽ giải đáp như sau..."
                except Exception as rag_err:
                    print(f"⚠️ RAG fallback activated (embedding/search failed): {rag_err}")
                    context = f"Hiện tại thầy chưa có tài liệu cụ thể của lớp {target_grade or learner_grade or 'chưa xác định'} môn {target_subject or subject or 'chưa xác định'}, nhưng với kiến thức chung, thầy có thể giải đáp như sau..."

                from datetime import datetime, timezone, timedelta
                vn_tz = timezone(timedelta(hours=7))
                vn_now = datetime.now(vn_tz)
                vn_time_str = vn_now.strftime("%H:%M:%S ngày %d/%m/%Y")
                vn_hour = vn_now.hour

                # Check for debug/test keyword in the user's question to force burnout activation
                is_test_burnout = any(keyword in str(question).lower() for keyword in ["test-burnout", "test_burnout", "test burnout"])
                if is_test_burnout:
                    vn_hour = 23
                    vn_time_str = "23:45:00 ngày " + vn_now.strftime("%d/%m/%Y")

                user_msg_count = sum(1 for m in chat_history if m.get("role") == "user") + 1
                
                # Explicit burnout detection — avoids relying solely on natural-language hints
                is_late_night = vn_hour >= 23 or vn_hour < 5
                burnout_active = (is_late_night and user_msg_count >= 4) or is_test_burnout
                burnout_signal = (
                    f"⚠️ BURNOUT_ACTIVE: TRUE — Giờ hiện tại là {vn_time_str.split()[0]} (đêm khuya). "
                    f"Học sinh đã hỏi {user_msg_count} câu trong phiên này. "
                    f"BẮT BUỘC: Chỉ nhắc học sinh đi ngủ, từ chối hỗ trợ thêm bài tập hoặc giải thích kiến thức mới trong tối nay."
                ) if burnout_active else f"BURNOUT_ACTIVE: FALSE (giờ: {vn_time_str.split()[0]}, số câu: {user_msg_count})"
                
                current_time_guidance = f"Thời gian hiện tại ở Việt Nam: {vn_time_str}. Số câu hỏi học sinh đã gửi trong phiên học này: {user_msg_count} câu."
                
                recent_suggestions = _extract_recent_suggestion_labels(chat_history)
                # Send only last 10 messages to AI prompt for speed — full history is kept in DB
                recent_history_text_parts = []
                for m in chat_history[-10:]:
                    role_label = "user" if m.get("role") == "user" else "model"
                    content_str = m.get("content") or ""
                    if m.get("imageUrl"):
                        content_str = f"[Hình ảnh học sinh đính kèm: {m['imageUrl']}]\n{content_str}"
                    recent_history_text_parts.append(f"{role_label}: {content_str}")
                recent_history_text = '\n'.join(recent_history_text_parts)
                is_image_attached = image_data is not None
                image_guidance = "Học sinh vừa tải lên một hình ảnh/đề thi mẫu. BẠN PHẢI ĐỌC HÌNH ẢNH ĐÓ. Nếu học sinh yêu cầu, hãy giải thích đề mẫu hoặc hướng dẫn giải chi tiết. ĐẶC BIỆT CHÚ Ý: Bạn PHẢI trả về 3 gợi ý sau trong phần SUGGESTIONS: 1. Giải thích đề mẫu này, 2. Hướng dẫn mình cách giải, 3. Tạo đề thi tương tự đề mẫu." if is_image_attached else ""
                default_suggestions = _default_suggestions_for_subject(target_subject or subject or '')

                prompt = f"""
                {system_instruction}

                BẠN LÀ GIA SƯ LỚP {target_grade or learner_grade or 'chưa xác định'} - MÔN {target_subject or subject or 'chưa xác định'}. CHỈ ĐƯỢC PHÉP DÙNG KIẾN THỨC CỦA LỚP {target_grade or learner_grade or 'chưa xác định'}. NẾU TÀI LIỆU ĐƯỢC CUNG CẤP KHÔNG THUỘC LỚP {target_grade or learner_grade or 'chưa xác định'}, HÃY TỪ CHỐI TRẢ LỜI VÀ BÁO LỖI.

                {learner_context_text}

                LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY:
                {recent_history_text}

                GỢI Ý ĐÃ TỪNG XUẤT HIỆN (KHÔNG ĐƯỢC LẶP LẠI):
                {', '.join(recent_suggestions) if recent_suggestions else 'Chưa có'}

                TÍN HIỆU PHÂN TÍCH VÀ BỐI CẢNH HỆ THỐNG:
                - {current_time_guidance}
                - {burnout_signal}
                - {image_guidance if image_guidance else 'Không có tín hiệu ảnh rõ ràng.'}

                KIẾN THỨC THAM CHIẾU (bao gồm sách, tệp học sinh tải lên hoặc đoạn trích):
                {context}

                CÂU HỎI MỚI NHẤT CỦA HỌC SINH:
                {question}

                                YÊU CẦU BẮT BUỘC VỀ ĐẦU RA:
                                - Chỉ trả về MỘT chuỗi duy nhất, không giải thích format, không thêm phần ngoài mẫu.
                                - KHÔNG được quăng block code JSON vào trong nội dung chat.
                                - Chỉ được dùng đúng các marker sau:
                                    [ANSWER]
                                    Nội dung trả lời ở đây (hỗ trợ Markdown chuẩn)
                                    [END_ANSWER]
                                    [SUGGESTIONS]
                                    {json.dumps(default_suggestions[0], ensure_ascii=False)}
                                    {json.dumps(default_suggestions[1], ensure_ascii=False)}
                                    {json.dumps(default_suggestions[2], ensure_ascii=False)}
                                    [END_SUGGESTIONS]

                QUY TẮC NỘI DUNG VỀ ĐỊNH VỊ VÀ PHƯƠNG PHÁP:
                1) TÍNH MỚI 1 - CHỐNG GIAN LẬN TƯ DUY (PHƯƠNG PHÁP SOCRATIC - GỢI MỞ):
                   - TUYỆT ĐỐI KHÔNG BAO GIỜ cung cấp trực tiếp đáp án cuối cùng, đáp án trắc nghiệm cụ thể (ví dụ: "đáp án là A", "kết quả là 4"), hoặc viết sẵn toàn bộ lời giải chi tiết từng bước từ đầu đến cuối cho bài tập học sinh yêu cầu để chép/làm hộ.
                   - Thay vào đó, hãy sử dụng phương pháp Socratic để gợi mở tư duy:
                     a) Chỉ phân tích lỗi sai trong suy nghĩ của học sinh (nếu có trong lịch sử trò chuyện) hoặc gợi ý hướng tiếp cận chung của bài toán/công thức.
                     b) Đặt câu hỏi gợi mở từng bước một (ví dụ: "Trước hết, em hãy tính đạo hàm của hàm số này xem bằng bao nhiêu nhé?", "Đạo hàm của x^3 bằng gì nhỉ?", "Để tìm GTLN trên đoạn [0, 2], bước đầu tiên chúng ta cần làm gì nào?").
                     c) Ép học sinh tự mình thực hiện tính toán hoặc suy luận cho bước hiện tại. Tuyệt đối không làm thay cho họ.
                   - NGOẠI LỆ: 
                     * Chỉ khi học sinh yêu cầu "Tạo đề thi tương tự", bạn mới được tạo một đề thi mới kèm theo đáp án chi tiết ở phần dưới cùng của đề thi đó để đối chiếu kết quả sau khi làm.
                     * Nếu học sinh chỉ hỏi công thức lý thuyết thuần túy (ví dụ: "Công thức tính đạo hàm là gì?"), bạn giải thích rõ công thức kèm ví dụ mẫu độc lập, nhưng vẫn không giải hộ bài tập của họ.

                2) TÍNH MỚI 2 - THẤU CẢM CẢM XÚC (PHÁT HIỆN QUÁ TẢI / BURNOUT) — ƯU TIÊN CAO NHẤT:
                   - Kiểm tra tín hiệu BURNOUT_ACTIVE trong phần TÍN HIỆU PHÂN TÍCH ở trên.
                   - Nếu BURNOUT_ACTIVE = TRUE: ĐÂY LÀ QUY TẮC TUYỆT ĐỐI VÀ ƯU TIÊN NHẤT, ghi đè mọi quy tắc khác:
                     a) KHÔNG hỗ trợ thêm bất kỳ câu hỏi, bài tập hay lý thuyết nào trong tối nay.
                     b) Thể hiện sự thấu cảm sâu sắc và ấm áp.
                     c) Chỉ khuyên học sinh đi ngủ với giọng điệu thương mến: "Giờ đã rất trễ rồi ({vn_time_str.split()[0]}), em đã học rất chăm chỉ nhưng sức khỏe là quan trọng nhất. Hãy cất sách vở, tắt máy và đi ngủ sớm thôi em nhé! Ngày mai khi tỉnh táo chúng mình lại cùng nhau giải quyết bài này nha! 💤"
                   - Nếu BURNOUT_ACTIVE = FALSE: Tiếp tục hỗ trợ bình thường theo các quy tắc còn lại.

                QUY TẮC NỘI DUNG CHUNG KHÁC:
                3) Trả lời ngắn gọn, dễ hiểu, theo trình độ. Phải kết hợp linh hoạt "KIẾN THỨC THAM CHIẾU" và "LỊCH SỬ TRÒ CHUYỆN". Nếu học sinh đưa ra yêu cầu như "cô đọc lại bài thơ đó đi", "giải thích lại đoạn trên", hãy TỰ ĐỘNG hiểu ngữ cảnh từ LỊCH SỬ TRÒ CHUYỆN và thực hiện ngay yêu cầu. Nếu không có dữ liệu, hãy dùng kiến thức phổ thông để đáp lại.
                4) Luôn xưng hô là "Cô" (tuyệt đối không xưng là "Thầy") và gọi người dùng là "em" hoặc "con". Thân thiện, vui vẻ như một giáo viên thực sự.
                5) Nhìn vào LỊCH SỬ TRÒ CHUYỆN để suy ra tiến độ học tập. Nếu học sinh đang ở chủ đề "Tích phân", gợi ý tiếp theo phải gần chủ đề đó; nếu học sinh nói đã xong bài, ưu tiên gợi ý "Kiểm tra kết quả" hoặc "Sang chương mới".
                6) Không lặp lại các gợi ý đã từng xuất hiện trong lịch sử.
                7) ĐỊNH DẠNG NGUỒN TRÍCH DẪN: Ở cuối câu trả lời (TRƯỚC marker [END_ANSWER]), hãy tự động thêm một phần "📚 **Tham chiếu từ Sách Giáo Khoa:**" liệt kê rõ ràng tên sách, độ tương đồng/độ khớp từ thông tin "[Nguồn: Tên_sách (Độ tương đồng: x.xxxx)]" trong phần KIẾN THỨC THAM CHIẾU để học sinh biết nguồn gốc nội dung đó (tuyệt đối không lặp lại phần trích dẫn văn bản, chỉ ghi tên sách và độ khớp, ví dụ: `* Sách Vật lí 11 (Độ khớp: 81%)`).
                8) Không viết thêm nội dung nào ngoài các marker [ANSWER]...[END_ANSWER] and [SUGGESTIONS]...[END_SUGGESTIONS].
                9) [TÙY CHỌN] NẾU NỘI DUNG LÀ GIẢI THÍCH LÝ THUYẾT: Sau khi giải thích xong (trong [ANSWER]), BẮT BUỘC chèn thêm một khối [QUIZ] ở cuối cùng chứa MỘT câu hỏi trắc nghiệm (A,B,C,D) bằng JSON theo ĐÚNG định dạng sau để kiểm tra xem học sinh có nhớ lý thuyết vừa học không. JSON phải CỰC KỲ CHÍNH XÁC:
[QUIZ]
{{
  "question": "Câu hỏi ở đây?",
  "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
  "answer": <số_nguyên_từ_0_đến_3_tương_ứng_vị_trí_đáp_án_đúng>,
  "explanation": "Lời giải thích ngắn gọn, cặn kẽ vì sao chọn đáp án đó là ĐÚNG và vì sao các đáp án khác là SAI để học sinh hiểu rõ bản chất."
}}
[END_QUIZ]

PHẦN TRẢ LỜI CỦA BẠN PHẢI TUÂN THEO CẤU TRÚC SAU:
[ANSWER]
(Nội dung chat, giải thích...)
[END_ANSWER]

(NẾU LÀ LÝ THUYẾT THÌ THÊM KHỐI QUIZ VÀO ĐÂY)
[QUIZ]
{{...}}
[END_QUIZ]

[SUGGESTIONS]
(Các gợi ý...)
[END_SUGGESTIONS].
                """

                response_iter = _generate_stream(
                    prompt, 
                    api_key, 
                    model_name=current_model, 
                    image_data=image_data,
                    temperature=db_temperature,
                    max_tokens=db_max_tokens
                )
                full_answer = ""
                for chunk in response_iter:
                    if chunk:
                        full_answer += chunk
                        yield chunk

                uploaded_url = None
                if image_data:
                    if image_data.startswith('http'):
                        uploaded_url = image_data
                    else:
                        try:
                            import base64
                            import uuid
                            b64_str = image_data
                            if b64_str.startswith('data:image'):
                                b64_str = b64_str.split(',', 1)[1]
                            img_bytes = base64.b64decode(b64_str)
                            file_path = f"chat_images/{uuid.uuid4()}.png"
                            db_client.storage.from_("giasuao").upload(file_path, img_bytes, file_options={"content-type": "image/png"})
                            uploaded_url = db_client.storage.from_("giasuao").get_public_url(file_path)
                        except Exception as e:
                            print(f"⚠️ Không thể upload ảnh lên Storage: {e}")

                user_msg = {"role": "user", "content": question}
                if uploaded_url:
                    user_msg["imageUrl"] = uploaded_url
                chat_history.append(user_msg)
                
                chat_history.append({"role": "model", "content": full_answer})
                # Full history is preserved — do NOT trim. AI prompt only uses last 10 (see above).
                try:
                    update_payload = {"messages": chat_history}
                    if target_grade:
                        update_payload["grade"] = target_grade
                    if target_subject:
                        update_payload["subject"] = target_subject
                    
                    db_client.table("chat_sessions").update(update_payload).eq("id", session_id).execute()
                    # CRITICAL: update in-memory session cache so next request reads from here (not DB)
                    if len(_SESSION_CACHE) > 1000:
                        for k in list(_SESSION_CACHE.keys())[:100]:
                            _SESSION_CACHE.pop(k, None)
                    _SESSION_CACHE[session_id] = {
                        "messages": chat_history,
                        "grade": target_grade,
                        "subject": target_subject
                    }
                    _cache_chat_session_context(session_id, grade=update_payload.get("grade") or target_grade, subject=update_payload.get("subject") or target_subject)
                    print(f"⚡ [Session Cache] Updated in-memory for session {session_id} ({len(chat_history)} messages).")
                except Exception as session_err:
                    print(f"⚠️ Không thể cập nhật chat_sessions: {session_err}")


                model_succeeded = True
                return

            except Exception as e:
                if _is_rate_limit_error(e):
                    print(f"⚠️ Key {_mask_key(api_key)} đã hết hạn mức, đang thử key tiếp theo...")
                    mark_key_rate_limited(api_key)
                    last_error = e
                    continue
                last_error = e
                print(f"❌ Lỗi tạo phản hồi với key {_mask_key(api_key)} và model {current_model}: {e}")
                continue

        if not model_succeeded:
            next_model = None
            if current_model in model_candidates:
                current_index = model_candidates.index(current_model)
                if current_index + 1 < len(model_candidates):
                    next_model = model_candidates[current_index + 1]
            if next_model:
                print(f"⚠️ Model {current_model} sập toàn bộ key, đang chuyển sang model {next_model}")

    if last_error:
        yield "Hệ thống đang quá tải, vui lòng thử lại sau!"
