import os
import sys
from supabase import create_client
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("Client headers:", client.postgrest.headers)

# Test updating headers
client.postgrest.headers.update({"Authorization": "Bearer test_token"})
print("Updated headers:", client.postgrest.headers)
