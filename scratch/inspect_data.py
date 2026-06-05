import os
import sys
from supabase import create_client
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

user_id = "a4d0ef9a-1753-4e17-9b58-983dd03c6cc2"

print(f"=== Inspecting database records for user: {user_id} ===")

# user_stats
stats_res = supabase.table("user_stats").select("*").eq("user_id", user_id).execute()
print("\n--- USER STATS ---")
if stats_res.data:
    for row in stats_res.data:
        print(row)
else:
    print("No user_stats record found.")

# user_activities
activities_res = supabase.table("user_activities").select("*").eq("user_id", user_id).execute()
print("\n--- USER ACTIVITIES ---")
if activities_res.data:
    for row in activities_res.data:
        print(row)
else:
    print("No user_activities records found.")
