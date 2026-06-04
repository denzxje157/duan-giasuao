import os
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ondtrlthellodkhhrmjx.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

auth_url = SUPABASE_URL.rstrip('/') + '/auth/v1/user'
headers = {
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'apikey': SUPABASE_KEY,
}

print(f"Connecting to {auth_url}...")
try:
    r = requests.get(auth_url, headers=headers, timeout=10)
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text[:200]}")
except Exception as e:
    print(f"Connection Failed: {e}")
