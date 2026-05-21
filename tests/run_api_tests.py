import json
import traceback
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

results = []

def record(name, success, detail=None, category=None):
    results.append({"name": name, "success": success, "detail": detail, "category": category})

def run_tests():
    # 1. GET /
    try:
        r = client.get("/")
        record("home", r.status_code == 200, r.text if r.status_code != 200 else None, "backend")
    except Exception as e:
        record("home", False, traceback.format_exc(), "backend")

    test_email = None
    # 2. Register (likely to hit Supabase) - use randomized email to avoid dupes
    try:
        import time
        ts = int(time.time() * 1000)
        test_email = f"testuser+{ts}@example.com"
        payload = {"email": test_email, "password": "Password123!", "full_name": "Test User", "grade": "1"}
        r = client.post("/register", json=payload)
        ok = r.status_code in (200,201)
        record("register", ok, r.text if not ok else r.json(), "backend/database" if not ok else "backend")
    except Exception as e:
        record("register", False, traceback.format_exc(), "backend/database")

    # 3. Login
    try:
        login_email = test_email or "testuser@example.com"
        payload = {"email": login_email, "password": "Password123!"}
        r = client.post("/login", json=payload)
        ok = r.status_code == 200
        record("login", ok, r.text if not ok else r.json(), "backend/database" if not ok else "backend")
    except Exception as e:
        record("login", False, traceback.format_exc(), "backend/database")

    # 3b. Forgot password (use the test email if available)
    try:
        fp_email = test_email or "testuser@example.com"
        r = client.post("/forgot-password", json={"email": fp_email})
        ok = r.status_code == 200
        record("forgot_password", ok, r.text if not ok else r.json(), "backend/auth" if not ok else "backend")
    except Exception as e:
        record("forgot_password", False, traceback.format_exc(), "backend/auth")

    # 4. Chat (stream endpoint) - hit /chat
    try:
        payload = {"question": "Hello", "session_id": None}
        r = client.post("/chat", json=payload)
        ok = r.status_code == 200
        text = None
        if ok:
            # read response text (SSE stream may be present; capture initial chunk)
            text = (r.text or "")[:1000]
        record("chat", ok, text or (r.text if not ok else None), "backend/ai" if not ok else "backend")
    except Exception as e:
        record("chat", False, traceback.format_exc(), "backend/ai")

    # 5. Upload document
    try:
        files = {"file": ("test.pdf", b"%PDF-1.4 test", "application/pdf")}
        data = {"grade": "1"}
        r = client.post("/upload", files=files, data=data)
        ok = r.status_code == 200
        record("upload", ok, r.text if not ok else r.json(), "backend/storage/database" if not ok else "backend")
    except Exception as e:
        record("upload", False, traceback.format_exc(), "backend/storage")

    # 6. Admin configs GET
    try:
        r = client.get("/admin/configs")
        ok = r.status_code == 200
        record("admin_configs_get", ok, r.text if not ok else r.json(), "backend/database" if not ok else "backend")
    except Exception as e:
        record("admin_configs_get", False, traceback.format_exc(), "backend/database")

    # 7. Admin users
    try:
        r = client.get("/admin/users")
        ok = r.status_code == 200
        record("admin_users", ok, r.text if not ok else r.json(), "backend/database" if not ok else "backend")
    except Exception as e:
        record("admin_users", False, traceback.format_exc(), "backend/database")

    # 8. User stats
    try:
        r = client.get("/user/stats/test-user-id")
        ok = r.status_code == 200
        record("user_stats", ok, r.text if not ok else r.json(), "backend" if ok else "backend/database")
    except Exception as e:
        record("user_stats", False, traceback.format_exc(), "backend")

    print(json.dumps({"results": results}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    run_tests()
