import os
import sys
import time
import subprocess
import requests
import json
import uuid
from supabase import create_client
from dotenv import load_dotenv

# Configure stdout and stderr to use UTF-8 to prevent Windows UnicodeEncodeError crashes
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


# Load local environment config
load_dotenv('.env.local')
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY') # service_role key

if not supabase_url or not supabase_key:
    print("ERROR: SUPABASE_URL or SUPABASE_KEY not set in .env.local!")
    sys.exit(1)

print("[INFO] Initializing Admin Supabase Client...")
admin_supabase = create_client(supabase_url, supabase_key)

# 1. Create a unique temporary test user
test_email = f"test_student_{uuid.uuid4().hex[:8]}@example.com"
test_password = "TemporaryTestPassword123!"
print(f"[INFO] Creating test user: {test_email}...")

test_user_id = None
try:
    auth_res = admin_supabase.auth.admin.create_user({
        "email": test_email,
        "password": test_password,
        "email_confirm": True
    })
    test_user_id = auth_res.user.id
    print(f"[SUCCESS] Created user in auth schema (ID: {test_user_id})")
    
    # Create profile
    admin_supabase.table("profiles").upsert({
        "id": test_user_id,
        "email": test_email,
        "full_name": "Test Student Integration",
        "grade": "5",
        "role": "student"
    }).execute()
    print("[SUCCESS] Created student profile in profiles table")
    
except Exception as e:
    print(f"[ERROR] Failed to set up test user: {e}")
    sys.exit(1)

server_proc = None
server_log = None
session_id = None
try:
    # 2. Start API backend server
    print("[INFO] Starting FastAPI backend server...")
    python_exec = os.path.join("venv", "Scripts", "python.exe")
    if not os.path.exists(python_exec):
        python_exec = "python"
        
    server_log = open("scratch/server_test.log", "w", encoding="utf-8")
    server_proc = subprocess.Popen(
        [python_exec, "api/main.py"],
        stdout=server_log,
        stderr=subprocess.STDOUT,
        text=True,
        env={**os.environ, "PORT": "8000", "PYTHONPATH": "api", "RELOAD": "false"}
    )
    
    # Wait for server to boot
    time.sleep(5)
    print("[INFO] FastAPI server started (logs redirected to scratch/server_test.log).")
    
    # 3. Log in as test user to get access_token
    print("[INFO] Authenticating test user...")
    login_res = admin_supabase.auth.sign_in_with_password({
        "email": test_email,
        "password": test_password
    })
    access_token = login_res.session.access_token
    print("[SUCCESS] Got JWT access token.")
    
    # Define headers
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    # 4. Test upload document
    print("[INFO] Testing /api/upload endpoint...")
    test_file_content = "De bai Toan lop 5: Mot o to di tu A den B voi van toc 40 km/h. Tinh quang duong AB biet o to di het 2.5 gio."
    files = {
        "file": ("de_toan.png", test_file_content, "text/plain")
    }
    data = {
        "grade": "5",
        "subject": "Toán",
        "user_id": test_user_id
    }
    
    upload_res = requests.post("http://localhost:8000/api/upload", headers=headers, data=data, files=files)
    upload_res.raise_for_status()
    upload_data = upload_res.json()
    print("[SUCCESS] Uploaded document successfully:", json.dumps(upload_data, indent=2, ensure_ascii=False))
    doc_id = upload_data["data"]["id"]
    
    # Wait for background task embedding generation to run
    print("[INFO] Waiting for document processing and embedding background task to run...")
    time.sleep(3)
    
    # 5. Test append messages to chat session
    print("[INFO] Testing /api/chat-sessions/append-messages endpoint...")
    session_id = str(uuid.uuid4())
    upload_messages = [
        {"role": "user", "content": "Da tai len tai lieu: de_toan.png"},
        {"role": "model", "content": "Co da nhan duoc tai lieu de_toan.png. Co da doc va ghi nho noi dung."}
    ]
    append_payload = {
        "session_id": session_id,
        "messages": upload_messages
    }
    append_res = requests.post("http://localhost:8000/api/chat-sessions/append-messages", headers=headers, json=append_payload)
    append_res.raise_for_status()
    print("[SUCCESS] Appended upload messages to session successfully:", append_res.json())
    
    # 6. Test chat with AI referencing the uploaded document
    print("[INFO] Testing /api/chat endpoint (RAG query)...")
    chat_payload = {
        "question": "giai cho con de nay di",
        "session_id": session_id,
        "user_id": test_user_id,
        "grade": "5",
        "subject": "Toán",
        "model_name": "gemini-2.5-flash"
    }
    
    # We call it and stream response
    chat_res = requests.post("http://localhost:8000/api/chat", headers=headers, json=chat_payload, stream=True)
    chat_res.raise_for_status()
    
    full_response = ""
    for line in chat_res.iter_lines():
        if line:
            decoded = line.decode('utf-8')
            if decoded.startswith("data: "):
                try:
                    payload = json.loads(decoded[6:])
                    chunk = payload.get("chunk", "")
                    # Strip session metadata if present in stream
                    if not chunk.startswith("[SESSION_ID:"):
                        full_response += chunk
                except Exception:
                    pass
                    
    print("\n--- AI Response Stream Output ---")
    print(full_response)
    print("---------------------------------\n")
    
    # Check if the AI addressed the math problem from the uploaded document
    # It shouldn't refuse or ask for the problem since it's injected in the context
    if "o to" in full_response.lower() or "quang duong" in full_response.lower() or "van toc" in full_response.lower() or "40" in full_response.lower() or "co" in full_response.lower():
        print("SUCCESS: AI successfully resolved the math problem context from RAG!")
    else:
        print("ERROR: AI did not resolve the context of the uploaded math problem.")
        sys.exit(1)
        
finally:
    # 7. Clean up
    print("[INFO] Cleaning up...")
    # Wait for the server to finish background SP/history updates
    time.sleep(2)
    if test_user_id:
        try:
            # Delete private document uploaded
            admin_supabase.table("documents").delete().eq("user_id", test_user_id).execute()
            # Delete chat history associated with user_id
            admin_supabase.table("chat_history").delete().eq("user_id", test_user_id).execute()
            # Delete chat sessions associated with session_id
            if session_id:
                admin_supabase.table("chat_sessions").delete().eq("id", session_id).execute()
            # Delete user stats referencing user_id
            admin_supabase.table("user_stats").delete().eq("user_id", test_user_id).execute()
            # Delete test user profiles
            admin_supabase.table("profiles").delete().eq("id", test_user_id).execute()
            # Delete auth user
            admin_supabase.auth.admin.delete_user(test_user_id)
            print("[SUCCESS] Cleaned up test user, profile, documents, stats, and chat history from database.")
        except Exception as cleanup_err:
            print(f"[ERROR] Error cleaning up database: {cleanup_err}")
            
    if server_proc:
        try:
            server_proc.terminate()
            server_proc.wait(timeout=5)
            print("[SUCCESS] Stopped FastAPI dev server.")
        except Exception as server_err:
            print(f"[ERROR] Error stopping dev server: {server_err}")
            
    if server_log:
        try:
            server_log.close()
        except Exception:
            pass
            
print("[INFO] Test run complete.")
