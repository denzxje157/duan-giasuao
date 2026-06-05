import os
import sys
from datetime import datetime, timezone, timedelta
from supabase import create_client
from dotenv import load_dotenv

# Reconfigure stdout for UTF-8
sys.stdout.reconfigure(encoding='utf-8')

for env_file in ['.env.local', '.env']:
    if os.path.exists(env_file):
        load_dotenv(env_file)
        break

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

if url and key:
    supabase = create_client(url, key)
    user_id = 'a4d0ef9a-1753-4e17-9b58-983dd03c6cc2'
    subject_name = 'Chung'
    study_minutes = 5
    
    # Simulate track_user_activity logic
    try:
        today_str = (datetime.now(timezone(timedelta(hours=7)))).strftime("%Y-%m-%d")
        print(f"Tracking {study_minutes} minutes for {user_id} on {today_str}...")
        
        # 1. Update user_activities
        act_res = supabase.table("user_activities").select("id, study_minutes").eq("user_id", user_id).eq("study_date", today_str).eq("subject_name", subject_name).execute()
        if act_res.data and len(act_res.data) > 0:
            act_id = act_res.data[0]["id"]
            new_mins = (act_res.data[0].get("study_minutes") or 0) + study_minutes
            res = supabase.table("user_activities").update({"study_minutes": new_mins}).eq("id", act_id).execute()
            print("Updated user_activities:", res.data)
        else:
            res = supabase.table("user_activities").insert({
                "user_id": user_id,
                "study_date": today_str,
                "subject_name": subject_name,
                "study_minutes": study_minutes
            }).execute()
            print("Inserted user_activities:", res.data)
            
        # 2. Update user_stats
        stat_res = supabase.table("user_stats").select("*").eq("user_id", user_id).execute()
        sp_earned = 10 * study_minutes
        
        if stat_res.data and len(stat_res.data) > 0:
            stat = stat_res.data[0]
            last_date_str = stat.get("last_study_date")
            current_streak = stat.get("streak") or 0
            
            if last_date_str == today_str:
                pass
            else:
                last_date = datetime.strptime(last_date_str, "%Y-%m-%d").date() if last_date_str else None
                if last_date == datetime.now(timezone(timedelta(hours=7))).date() - timedelta(days=1):
                    current_streak += 1
                else:
                    current_streak = 1
                    
            res = supabase.table("user_stats").update({
                "streak": current_streak,
                "max_streak": max(current_streak, stat.get("max_streak") or 0),
                "total_study_minutes": (stat.get("total_study_minutes") or 0) + study_minutes,
                "total_sp": (stat.get("total_sp") or 0) + sp_earned,
                "last_study_date": today_str
            }).eq("user_id", user_id).execute()
            print("Updated user_stats:", res.data)
        else:
            res = supabase.table("user_stats").insert({
                "user_id": user_id,
                "streak": 1,
                "max_streak": 1,
                "total_study_minutes": study_minutes,
                "total_sp": sp_earned,
                "last_study_date": today_str
            }).execute()
            print("Inserted user_stats:", res.data)
            
        print("Success!")
    except Exception as e:
        print("Failed to run logic:", e)
else:
    print("No Supabase URL/Key found")
