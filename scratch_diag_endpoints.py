import os
import sys
from datetime import timedelta
from supabase import create_client
from dotenv import load_dotenv

# Set python stdout to utf-8
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# We import helpers from api/main.py or redefine them
sys.path.append(os.path.abspath("api"))
from main import _group_sessions_for_user, get_vietnam_date

def diag():
    print("Fetching all profiles...")
    profiles_res = supabase.table("profiles").select("id, email, grade").execute()
    profiles = profiles_res.data or []
    print(f"Found {len(profiles)} profiles.")

    for p in profiles:
        user_id = p["id"]
        email = p.get("email", "unknown")
        grade = p.get("grade")
        print(f"\n--- Diagnosing user: {email} ({user_id}) ---")

        # 1. Test progress charts
        print("Testing progress-charts logic...")
        try:
            today = get_vietnam_date()
            week_data = []
            for i in range(6, -1, -1):
                target_date = today - timedelta(days=i)
                week_data.append({"date": target_date.strftime("%Y-%m-%d"), "day": target_date.strftime("%A"), "time": 0})
                
            act_res = supabase.table("user_activities").select("*").eq("user_id", user_id).gte("study_date", (today - timedelta(days=6)).strftime("%Y-%m-%d")).execute()
            
            activity_dict = {d["date"]: 0 for d in week_data}
            for row in (act_res.data or []):
                dt_str = row["study_date"]
                if dt_str in activity_dict:
                    val = row.get("study_minutes")
                    if val is None:
                        print(f"  Warning: study_minutes is None in activity row: {row}")
                    activity_dict[dt_str] += val if val is not None else 0
                    
            for d in week_data:
                d["time"] = activity_dict[d["date"]]

            # Radar data
            subject_res = supabase.table("user_activities").select("subject_name, study_minutes").eq("user_id", user_id).execute()
            subject_scores = {}
            for row in (subject_res.data or []):
                subj = row.get("subject_name", "Khác")
                val = row.get("study_minutes")
                subject_scores[subj] = subject_scores.get(subj, 0) + (val if val is not None else 0)
                
            radar_data = []
            for subj, mins in subject_scores.items():
                radar_data.append({"subject": subj, "score": min(mins, 100), "fullMark": 100})
                
            if not radar_data:
                radar_data = [
                    {"subject": "Đại số", "score": 0, "fullMark": 100},
                    {"subject": "Hình học", "score": 0, "fullMark": 100},
                    {"subject": "Vật lý", "score": 0, "fullMark": 100},
                ]

            yesterday = get_vietnam_date() - timedelta(days=1)
            yesterday_str = yesterday.strftime("%Y-%m-%d")
            yesterday_res = supabase.table("user_activities").select("subject_name, study_minutes").eq("user_id", user_id).eq("study_date", yesterday_str).execute()
            yesterday_data = []
            for row in (yesterday_res.data or []):
                yesterday_data.append({
                    "subject": row.get("subject_name", "Khác"),
                    "minutes": row.get("study_minutes") or 0
                })
            print("  Progress charts data computed successfully.")
        except Exception as e:
            print(f"  [ERROR] progress-charts failed: {e}")

        # 2. Test chat sessions grouping
        print("Testing chat-sessions/me logic...")
        try:
            history_res = supabase.table('chat_history').select('id, user_id, role, session_id, timestamp').eq('user_id', user_id).execute()
            history_rows_meta = history_res.data or []
            
            try:
                history_rows_meta = sorted(history_rows_meta, key=lambda r: r.get('timestamp') or '')
            except Exception as sort_err:
                print(f"  Warning sorting: {sort_err}")

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

            content_map = {}
            if content_ids_to_fetch:
                id_list = list(content_ids_to_fetch)
                content_res = supabase.table('chat_history').select('id, content').in_('id', id_list).execute()
                for c_row in (content_res.data or []):
                    content_map[c_row['id']] = c_row.get('content') or ''

            history_rows = []
            for row in history_rows_meta:
                row_id = row['id']
                row['content'] = content_map.get(row_id, '')
                history_rows.append(row)

            session_ids = sorted({str(row.get('session_id')) for row in history_rows if row.get('session_id')})
            session_rows = []
            if session_ids:
                session_res = supabase.table('chat_sessions').select('*').in_('id', session_ids).execute()
                session_rows = session_res.data or []

            grouped = _group_sessions_for_user(session_rows, history_rows, current_grade=grade)
            print(f"  Chat sessions grouped successfully (found {len(grouped)} groups).")
        except Exception as e:
            print(f"  [ERROR] chat-sessions failed: {e}")

if __name__ == "__main__":
    diag()
