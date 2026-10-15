import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.request
import base64
import websockets

PROJECT_DIR = r"c:\Users\Admin\Downloads\All-Project\duan-giasuao"
OUTPUT_DIR = os.path.join(PROJECT_DIR, "public", "guide_images")
ARTIFACT_DIR = r"C:\Users\Admin\.gemini\antigravity\brain\c5972930-3f42-4bbb-97ad-6d7c9c4e6d9b\guide_images"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\Admin\AppData\Local\Temp\chrome_guide_session_v2"

STUDENT_USER = {
    "id": "f3737394-744d-4e65-972f-47e40031c40b",
    "name": "Nguyễn Tấn Phát",
    "email": "tanphat.nguyen2k15@gmail.com",
    "grade": 11,
    "role": "student"
}

ADMIN_USER = {
    "id": "f7bb41ef-fe9f-44b6-a76a-0d4fbad941da",
    "name": "Administrator",
    "email": "admin@gmail.com",
    "grade": 11,
    "role": "admin"
}

CHAT_DEMO_MESSAGES = [
    {
        "role": "user",
        "content": "Dạ em chào Thầy/Cô ạ! Cho em hỏi khi tăng áp suất tác dụng lên hệ cân bằng khí $N_2(k) + 3H_2(k) \\rightleftharpoons 2NH_3(k)$ thì cân bằng sẽ chuyển dịch theo chiều nào và vì sao ạ?"
    },
    {
        "role": "assistant",
        "content": "Chào em nhé! Đây là một câu hỏi rất hay về **Nguyên lý chuyển dịch cân bằng Le Chatelier** trong Hóa học 11.\n\nTrước hết, em hãy cùng thầy/cô đếm số mol khí ở hai vế của phản ứng nhé:\n- Vế trái (chất phản ứng): $1\\text{ mol } N_2 + 3\\text{ mol } H_2 = 4\\text{ mol khí}$\n- Vế phải (sản phẩm): $2\\text{ mol } NH_3$\n\n💡 **Gợi ý tư duy Socratic:**\nTheo nguyên lý Le Chatelier, khi ta tác động một yếu tố từ bên ngoài (như làm tăng áp suất), hệ cân bằng sẽ tự động chuyển dịch theo chiều làm **giảm** tác động đó.\n\nEm thử suy luận xem: Để làm giảm áp suất của bình phản ứng, hệ cần chuyển dịch sang phía có **nhiều mol khí hơn** hay **ít mol khí hơn**?"
    },
    {
        "role": "user",
        "content": "Dạ thưa cô, để giảm áp suất thì hệ phải giảm số lượng phân tử khí, tức là chuyển dịch sang phía ít mol khí hơn (từ 4 mol về 2 mol) đúng không ạ?"
    },
    {
        "role": "assistant",
        "content": "Chính xác tuyệt đối! 🎉 Em đã nắm rất vững bản chất.\n\nVì vế phải chỉ có $2\\text{ mol khí}$ (ít hơn $4\\text{ mol khí}$ ở vế trái), nên khi **tăng áp suất**, cân bằng sẽ chuyển dịch theo **chiều thuận** (tạo ra nhiều $NH_3$ hơn).\n\n💡 *Thử thách mở rộng:* Nếu bây giờ cô hạ nhiệt độ của bình phản ứng, biết rằng phản ứng tổng hợp amoniac là phản ứng tỏa nhiệt ($\\Delta_r H_{298}^0 = -92\\text{ kJ/mol} < 0$), thì cân bằng sẽ chuyển dịch theo chiều nào? Em thử dự đoán xem nào!"
    }
]

SESSION_GROUPS_DEMO = [
    {
        "grade": "Lớp 11",
        "subjects": [
            {
                "subject": "Hóa học",
                "sessions": [
                    {
                        "session_id": "session-hoa-11-lechatelier",
                        "title": "Cân bằng hóa học & Áp suất",
                        "subject": "Hóa học",
                        "grade": "Lớp 11",
                        "updated_at": "2026-06-15T09:30:00.000Z",
                        "last_message": "Chính xác tuyệt đối! Em đã nắm rất vững bản chất..."
                    }
                ]
            },
            {
                "subject": "Toán",
                "sessions": [
                    {
                        "session_id": "session-toan-11-daoham",
                        "title": "Ý nghĩa hình học của đạo hàm",
                        "subject": "Toán",
                        "grade": "Lớp 11",
                        "updated_at": "2026-06-12T14:15:00.000Z",
                        "last_message": "Đúng rồi, hệ số góc tiếp tuyến chính là f'(x0)..."
                    }
                ]
            }
        ]
    }
]

class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 0

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=25*1024*1024)

    async def send(self, method, params=None):
        self.msg_id += 1
        req = {"id": self.msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(req))
        while True:
            resp_raw = await self.ws.recv()
            resp = json.loads(resp_raw)
            if resp.get("id") == self.msg_id:
                return resp.get("result", {})

    async def eval(self, expr):
        res = await self.send("Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True})
        return res.get("result", {}).get("value")

    async def capture_screenshot(self, filepath):
        res = await self.send("Page.captureScreenshot", {"format": "png", "quality": 95})
        data = base64.b64decode(res["data"])
        with open(filepath, "wb") as f:
            f.write(data)
        # Also copy to artifact dir
        filename = os.path.basename(filepath)
        artifact_path = os.path.join(ARTIFACT_DIR, filename)
        with open(artifact_path, "wb") as f:
            f.write(data)
        print(f"Captured: {filepath} ({len(data)} bytes) & synced to artifact")

    async def close(self):
        if self.ws:
            await self.ws.close()

async def main():
    if os.path.exists(USER_DATA_DIR):
        try:
            shutil.rmtree(USER_DATA_DIR, ignore_errors=True)
        except Exception:
            pass

    chrome_cmd = [
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        f"--user-data-dir={USER_DATA_DIR}",
        "--window-size=1440,900",
        "--hide-scrollbars",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank"
    ]

    print("Launching Chrome...")
    proc = subprocess.Popen(chrome_cmd)
    time.sleep(2)

    ws_url = None
    for _ in range(10):
        try:
            with urllib.request.urlopen("http://127.0.0.1:9222/json") as response:
                targets = json.loads(response.read().decode())
                for t in targets:
                    if t.get("type") == "page":
                        ws_url = t.get("webSocketDebuggerUrl")
                        break
            if ws_url:
                break
        except Exception:
            time.sleep(0.5)

    if not ws_url:
        print("Failed to get WebSocket debugger URL!")
        proc.kill()
        return

    print("Connected to CDP:", ws_url)
    client = CDPClient(ws_url)
    await client.connect()

    await client.send("Page.enable")
    await client.send("Runtime.enable")
    await client.send("Emulation.setDeviceMetricsOverride", {
        "width": 1440,
        "height": 900,
        "deviceScaleFactor": 1.25,
        "mobile": False
    })

    # 1. LANDING PAGE
    print("1. Landing Page...")
    await client.send("Page.navigate", {"url": "http://localhost:5173"})
    await asyncio.sleep(2)
    await client.eval("localStorage.clear(); location.reload();")
    await asyncio.sleep(2.5)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "01_landing_page.png"))

    # 2. LOGIN / REGISTER PAGE
    print("2. Login / Register...")
    await client.eval("""
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const loginBtn = btns.find(b => b.textContent.includes('Đăng nhập') || b.textContent.includes('Bắt đầu'));
            if (loginBtn) loginBtn.click();
        })()
    """)
    await asyncio.sleep(1.5)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "02_login_register.png"))

    # 3. OVERVIEW DASHBOARD
    print("3. Logging in as Student...")
    student_json = json.dumps(STUDENT_USER)
    chat_demo_json = json.dumps(CHAT_DEMO_MESSAGES)
    session_groups_json = json.dumps(SESSION_GROUPS_DEMO)
    session_id = "session-hoa-11-lechatelier"

    await client.eval(f"""
        localStorage.setItem('virtual_tutor_user', JSON.stringify({student_json}));
        localStorage.setItem('ai_chat_session_{STUDENT_USER["id"]}', '{session_id}');
        localStorage.setItem('ai_chat_history_{session_id}', JSON.stringify({chat_demo_json}));
        localStorage.setItem('ai_chat_guest_sessions', JSON.stringify({session_groups_json}));
        location.reload();
    """)
    await asyncio.sleep(3)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "03_overview_dashboard.png"))

    # 4. AI CHAT (Active Socratic Conversation with Math & Chemistry formulas)
    print("4. AI Chat (Active Socratic conversation)...")
    await client.eval("""
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const aiBtn = btns.find(b => b.textContent.includes('Trợ lý AI') || b.textContent.includes('Gia sư AI'));
            if (aiBtn) aiBtn.click();
        })()
    """)
    await asyncio.sleep(3)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "04_ai_chat_socratic.png"))

    # 5. LIBRARY (Textbooks)
    print("5. Library (Textbooks)...")
    await client.eval("""
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const libBtn = btns.find(b => b.textContent.includes('Tài liệu học tập') || b.textContent.includes('Tủ sách'));
            if (libBtn) libBtn.click();
        })()
    """)
    await asyncio.sleep(2.5)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "05_library_textbooks.png"))

    # 6. WORKSPACE (Clicking into online textbook to show real split-screen Workspace)
    print("6. Opening Workspace (Split-screen PDF + AI Tutor)...")
    await client.eval("""
        (() => {
            // Find and click 'Đọc sách trực tuyến'
            const btns = Array.from(document.querySelectorAll('button'));
            const readBtn = btns.find(b => b.textContent.includes('Đọc sách trực tuyến'));
            if (readBtn) {
                readBtn.click();
            } else {
                // If book details not open, click first book card
                const bookCard = document.querySelector('.bg-white.rounded-2xl') || document.querySelector('.group.cursor-pointer');
                if (bookCard) bookCard.click();
                setTimeout(() => {
                    const b2 = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Đọc sách trực tuyến'));
                    if (b2) b2.click();
                }, 800);
            }
        })()
    """)
    await asyncio.sleep(3.5)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "06_workspace_integrated.png"))

    # 7. QUIZ (Practice & Assessment)
    print("7. Quiz...")
    await client.eval("""
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const quizBtn = btns.find(b => b.textContent.includes('Luyện tập & Quiz') || b.textContent.includes('Luyện tập'));
            if (quizBtn) quizBtn.click();
        })()
    """)
    await asyncio.sleep(2.5)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "07_quiz_practice.png"))

    # 8. PROGRESS (Study Tracking & Blind Spots)
    print("8. Progress & Blind Spots...")
    await client.eval("""
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const progBtn = btns.find(b => b.textContent.includes('Khám phá điểm mù'));
            if (progBtn) progBtn.click();
        })()
    """)
    await asyncio.sleep(2.5)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "08_progress_analytics.png"))

    # 9. PROFILE
    print("9. Profile & Settings...")
    await client.eval("""
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const profBtn = btns.find(b => b.textContent.includes('Hồ sơ cá nhân'));
            if (profBtn) profBtn.click();
        })()
    """)
    await asyncio.sleep(2)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "09_profile_settings.png"))

    # 10. ADMIN PANEL
    print("10. Admin Panel...")
    admin_json = json.dumps(ADMIN_USER)
    await client.eval(f"""
        localStorage.setItem('virtual_tutor_user', JSON.stringify({admin_json}));
        location.reload();
    """)
    await asyncio.sleep(2.5)
    await client.eval("""
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const adminBtn = btns.find(b => b.textContent.includes('Admin / Cài đặt'));
            if (adminBtn) adminBtn.click();
        })()
    """)
    await asyncio.sleep(3)
    await client.capture_screenshot(os.path.join(OUTPUT_DIR, "10_admin_panel.png"))

    print("All enhanced screenshots successfully captured!")
    await client.close()
    proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
