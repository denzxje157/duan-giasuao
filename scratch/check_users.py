import os
from supabase import create_client
from dotenv import load_dotenv

# Try loading env files
for env_file in ['.env.local', '.env']:
    if os.path.exists(env_file):
        load_dotenv(env_file)
        break

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')
print("SUPABASE_URL:", url)

if url and key:
    supabase = create_client(url, key)
    
    # Let's query profiles
    try:
        profiles_res = supabase.table("profiles").select("*").execute()
        print("\n--- PROFILES ---")
        for row in (profiles_res.data or []):
            print(f"ID: {row.get('id')}, Email: {row.get('email')}, Full Name: {row.get('full_name')}")
    except Exception as e:
        print("Error profiles:", e)
        
    # Let's query user_stats
    try:
        stats_res = supabase.table("user_stats").select("*").execute()
        print("\n--- USER STATS ---")
        for row in (stats_res.data or []):
            print(f"User ID: {row.get('user_id')}, Streak: {row.get('streak')}, SP: {row.get('total_sp')}, Last Date: {row.get('last_study_date')}")
    except Exception as e:
        print("Error stats:", e)
else:
    print("No Supabase URL/Key found in environment")
