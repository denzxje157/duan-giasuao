import os, json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

def sync_session(sid):
    print(f"=== Syncing session {sid[:12]}... ===")
    
    # Get all chat_history rows (skip base64 blobs)
    hist = supabase.table("chat_history").select("role,content,timestamp").eq("session_id", sid).order("timestamp").execute()
    rows = hist.data or []
    print(f"chat_history rows: {len(rows)}")
    
    rebuilt = []
    for row in rows:
        role = row.get("role") or ""
        content = row.get("content") or ""
        # Skip oversized base64
        if len(content) > 50000:
            if "\n" in content:
                content = content[content.rfind("\n"):].strip()
            else:
                content = "[Hinh anh dinh kem]"
        prompt_role = "model" if role == "assistant" else "user"
        rebuilt.append({"role": prompt_role, "content": content})
    
    print(f"Rebuilt messages: {len(rebuilt)}")
    
    # Update chat_sessions.messages
    supabase.table("chat_sessions").update({"messages": rebuilt}).eq("id", sid).execute()
    print(f"Done! Synced {len(rebuilt)} messages to chat_sessions.messages")
    
    # Verify
    check = supabase.table("chat_sessions").select("messages").eq("id", sid).execute()
    if check.data:
        m = check.data[0].get("messages") or []
        print(f"Verification: chat_sessions.messages now has {len(m)} messages")

# Sync the main session
sync_session("e8cf74aa-da89-4a70-b6e3-990a26d5c34b")
