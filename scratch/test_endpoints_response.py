import os
import sys
from fastapi.testclient import TestClient

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath("api"))

from main import app
import main

# Mock token verification to return our target user_id
main._verify_token_and_get_user = lambda creds: "a4d0ef9a-1753-4e17-9b58-983dd03c6cc2"

client = TestClient(app)

print("=== Calling /api/user/gamification-stats ===")
resp1 = client.get("/api/user/gamification-stats", headers={"Authorization": "Bearer fake_token"})
print(f"Status: {resp1.status_code}")
print(resp1.json())

print("\n=== Calling /api/user/progress-charts ===")
resp2 = client.get("/api/user/progress-charts", headers={"Authorization": "Bearer fake_token"})
print(f"Status: {resp2.status_code}")
print(resp2.json())
