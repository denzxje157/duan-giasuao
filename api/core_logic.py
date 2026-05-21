import os
import uuid
import json
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
    import google.genai as genai
except Exception:
    try:
        import genai
    except Exception:
        genai = None

try:
    import openai
except Exception:
    openai = None


def _embed_with_provider(text, api_key):
    if genai is not None:
        if hasattr(genai, 'configure'):
            try:
                genai.configure(api_key=api_key)
            except Exception:
                pass
        try:
            if hasattr(genai, 'embed_content'):
                res = genai.embed_content(model="models/gemini-embedding-2", content=text)
                if isinstance(res, dict) and 'embedding' in res:
                    return res['embedding']
        except Exception as e:
            print("genai embed_content failed:", e)
        try:
            if hasattr(genai, 'EmbeddingsClient'):
                client = genai.EmbeddingsClient()
                resp = client.create(model="gemini-embedding-2", input=text)
                return resp.data[0].embedding
        except Exception as e:
            print("genai EmbeddingsClient failed:", e)

    if openai is not None:
        try:
            openai.api_key = api_key
            emb = openai.Embedding.create(model="text-embedding-3-small", input=text)
            return emb['data'][0]['embedding']
        except Exception as e:
            print("OpenAI embedding failed:", e)

    raise Exception("No embedding provider available or all providers failed")


def _generate_stream(prompt, api_key):
    if genai is not None:
        if hasattr(genai, 'configure'):
            try:
                genai.configure(api_key=api_key)
            except Exception:
                pass
        if hasattr(genai, 'GenerativeModel'):
            for model_name in MODELS:
                try:
                    model = genai.GenerativeModel(model_name)
                    response_iter = model.generate_content(prompt, stream=True)
                    for chunk in response_iter:
                        text = getattr(chunk, 'text', None) or getattr(chunk, 'content', None)
                        if text:
                            yield text
                    return
                except Exception as e:
                    print(f"genai model {model_name} failed:", e)
                    continue

    if openai is not None:
        try:
            openai.api_key = api_key
            messages = [{"role": "user", "content": prompt}]
            resp = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=messages, stream=True)
            for event in resp:
                try:
                    chunk = event['choices'][0]['delta'].get('content')
                    if chunk:
                        yield chunk
                except Exception:
                    continue
            return
        except Exception as e:
            print("OpenAI generation failed:", e)

    yield "Hệ thống chưa cấu hình provider AI để trả lời."


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print(f"🔗 CORE_LOGIC ĐANG TRỎ VỀ: {SUPABASE_URL}")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash"
]


def get_all_keys():
    keys = []
    try:
        res = supabase.table("system_configs").select("key_value").eq("key_name", "GEMINI_API_KEY").execute()
        if res.data and len(res.data) > 0:
            db_key = res.data[0]['key_value'].strip()
            if db_key:
                keys.append(db_key)
    except Exception:
        pass
    for i in range(1, 10):
        env_key = os.getenv(f"GEMINI_API_KEY_{i}")
        if env_key and env_key.strip() not in keys:
            keys.append(env_key.strip())
    return keys


def process_pdf_to_markdown(file_bytes, mime_type="application/pdf"):
    temp_pdf_path = f"temp_{uuid.uuid4()}.pdf"
    output_dir = f"temp_output_{uuid.uuid4()}"
    try:
        with open(temp_pdf_path, "wb") as f:
            f.write(file_bytes)

        if _MD_AVAILABLE:
            try:
                res = _MD_TOOL.convert(temp_pdf_path)
                text = getattr(res, "text_content", None) or getattr(res, "text", None) or ""
                if text and text.strip():
                    return text
            except Exception as e:
                print("MarkItDown conversion failed:", e)

        try:
            from pypdf import PdfReader
            reader = PdfReader(temp_pdf_path)
            pages = []
            for i, p in enumerate(reader.pages):
                text = p.extract_text() or ""
                if text.strip():
                    pages.append(f"## Page {i+1}\n\n" + text.strip())
            if pages:
                return "\n\n".join(pages)
        except Exception as e:
            print("Fallback pypdf extraction failed:", e)

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


def save_document_to_db(text_content, source_name, doc_id):
    keys = get_all_keys()
    for api_key in keys:
        try:
            safe_content = text_content[:9000]
            vector = _embed_with_provider(safe_content, api_key)
            if isinstance(vector[0], list):
                vector = vector[0][:768]
            else:
                vector = vector[:768]
            supabase.table("documents").update({"content": safe_content, "embedding": vector, "status": "ready"}).eq("id", doc_id).execute()
            return "Thành công"
        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "quota" in err_msg:
                continue
            else:
                return f"Lỗi: {str(e)}"
    return "Lỗi: Không thể tạo Vector vì tất cả API Key đều hết hạn mức."


def get_ai_response_stream_with_history(question, session_id=None):
    keys = get_all_keys()
    if not keys:
        yield "Hệ thống chưa được cấu hình API Key!"
        return

    chat_history = []
    try:
        is_valid_uuid = False
        if session_id:
            session_id = session_id.replace("[SESSION_ID:", "").replace("SESSION_ID:", "").replace("]", "").strip()
            try:
                uuid.UUID(session_id)
                is_valid_uuid = True
            except Exception:
                is_valid_uuid = False

        if not is_valid_uuid:
            try:
                res = supabase.table("chat_sessions").insert({"messages": []}).execute()
                if res.data and len(res.data) > 0 and 'id' in res.data[0]:
                    session_id = str(res.data[0]['id'])
                else:
                    session_id = str(uuid.uuid4())
                    supabase.table("chat_sessions").insert({"id": session_id, "messages": []}).execute()
            except Exception as e:
                session_id = str(uuid.uuid4())
                try:
                    supabase.table("chat_sessions").insert({"id": session_id, "messages": []}).execute()
                except Exception:
                    pass

        try:
            res = supabase.table("chat_sessions").select("messages").eq("id", session_id).execute()
            if res.data and len(res.data) > 0 and res.data[0].get('messages'):
                chat_history = res.data[0]['messages']
        except Exception:
            chat_history = []
    except Exception:
        if not session_id:
            session_id = str(uuid.uuid4())

    yield f"[SESSION_ID:{session_id}]\n\n"

    last_error = None

    for api_key in keys:
        try:
            question_vector = _embed_with_provider(question, api_key)
            if isinstance(question_vector[0], list):
                question_vector = question_vector[0][:768]
            else:
                question_vector = question_vector[:768]

            search_res = supabase.rpc("match_documents", {"query_embedding": question_vector, "match_threshold": 0.5, "match_count": 3}).execute()

            context = ""
            if search_res.data:
                context = "\n".join([item['content'] for item in search_res.data])
            else:
                context = "Không tìm thấy dữ liệu liên quan trong sách."

            prompt = f"""
            Bạn là Gia sư ảo  - Chuyên gia giảng dạy.
            
            LỊCH SỬ TRÒ CHUYỆN:
            {''.join([f"{m['role']}: {m['content']}\n\n" for m in chat_history])}
            
            KIẾN THỨC TỪ SÁCH:
            {context}
            
            CÂU HỎI MỚI NHẤT CỦA HỌC SINH:
            {question}
            """

            response_iter = _generate_stream(prompt, api_key)
            full_answer = ""
            for chunk in response_iter:
                if chunk:
                    full_answer += chunk
                    yield chunk

            chat_history.append({"role": "user", "content": question})
            chat_history.append({"role": "model", "content": full_answer})
            supabase.table("chat_sessions").update({"messages": chat_history}).eq("id", session_id).execute()

            return
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str or "exhausted" in err_str:
                print(f"⚠️ Key {api_key[:10]}... báo hết hạn mức (429), TỰ ĐỘNG ĐỔI KEY KHÁC...")
                last_error = e
                continue
            else:
                print(f"❌ Lỗi RAG (không phải 429): {e}")
                yield "Hệ thống đang gặp sự cố, vui lòng thử lại sau!"
                return

    if last_error:
        yield "Toàn bộ API Key dự phòng đều đã hết hạn mức. Vui lòng quay lại sau ít phút!"
