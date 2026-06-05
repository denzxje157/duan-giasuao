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
    user_id = 'a4d0ef9a-1753-4e17-9b58-983dd03c6cc2'
    
    # Query user_activities
    act_res = supabase.table("user_activities").select("*").eq("user_id", user_id).execute()
    print("--- ACTIVITIES ---")
    print(act_res.data)
    
    # Query user_stats
    stats_res = supabase.table("user_stats").select("*").eq("user_id", user_id).execute()
    print("\n--- STATS ---")
    print(stats_res.data)
else:
    print("No Supabase URL/Key found")
