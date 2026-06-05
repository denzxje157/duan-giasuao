import os
import sys
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
    
    # Query profiles
    profiles_res = supabase.table("profiles").select("*").execute()
    profiles = profiles_res.data or []
    
    # Query stats
    stats_res = supabase.table("user_stats").select("*").execute()
    stats = {row['user_id']: row for row in (stats_res.data or [])}
    
    print("--- DETAILED USER INFORMATION ---")
    for p in profiles:
        uid = p.get('id')
        email = p.get('email')
        name = p.get('full_name')
        stat = stats.get(uid)
        
        stat_info = "No stats"
        if stat:
            stat_info = f"Streak: {stat.get('streak')}, SP: {stat.get('total_sp')}, Minutes: {stat.get('total_study_minutes')}"
            
        print(f"User ID: {uid} | Email: {email} | Name: {name} | Stats: {stat_info}")
else:
    print("No Supabase URL/Key found")
