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
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\Admin\AppData\Local\Temp\chrome_ws_quiz"

STUDENT_USER = {
    "id": "f3737394-744d-4e65-972f-47e40031c40b",
    "name": "Nguyễn Tấn Phát",
    "email": "tanphat.nguyen2k15@gmail.com",
    "grade": 11,
    "role": "student"
}

QUIZ_ACTIVE_STATE = {
    "quizData": [
        {
            "question": "Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực đại của đồ thị hàm số là điểm nào sau đây?",
            "options": [
                "A. $(0; 2)$",
                "B. $(2; -2)$",
                "C. $(0; -2)$",
                "D. $(1; 0)$"
            ],
            "correctAnswer": 0,
            "explanation": "Ta có $y' = 3x^2 - 6x = 3x(x - 2)$. Phương trình $y' = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$.\nQua $x = 0$, đạo hàm $y'$ đổi dấu từ dương sang âm nên $x = 0$ là điểm cực đại. Giá trị cực đại là $y(0) = 2$. Vậy tọa độ điểm cực đại là $(0; 2)$."
        },
        {
            "question": "Tìm nguyên hàm của hàm số $f(x) = \\cos(2x)$:",
            "options": [
                "A. $\\frac{1}{2}\\sin(2x) + C$",
                "B. $-\\frac{1}{2}\\sin(2x) + C$",
                "C. $2\\sin(2x) + C$",
                "D. $-2\\sin(2x) + C$"
            ],
            "correctAnswer": 0,
            "explanation": "Theo công thức cơ bản: $\\int \\cos(ax+b) dx = \\frac{1}{a}\\sin(ax+b) + C$. Với $a=2$, ta được $\\frac{1}{2}\\sin(2x) + C$."
        }
    ],
    "currentQuestionIndex": 0,
    "score": 10,
    "selectedAnswer": 0,
    "showExplanation": True,
    "quizFinished": False,
    "topic": "Hàm số và Đạo hàm - Toán 11",
    "difficulty": "Vận dụng",
    "numQuestions": 5
}

async def main():
    if os.path.exists(USER_DATA_DIR):
        try: shutil.rmtree(USER_DATA_DIR, ignore_errors=True)
        except: pass

    chrome_cmd = [
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9223",
        f"--user-data-dir={USER_DATA_DIR}",
        "--window-size=1440,900",
        "--hide-scrollbars",
        "--disable-gpu",
        "about:blank"
    ]
    proc = subprocess.Popen(chrome_cmd)
    time.sleep(2)

    ws_url = None
    for _ in range(10):
        try:
            with urllib.request.urlopen("http://127.0.0.1:9223/json") as response:
                targets = json.loads(response.read().decode())
                for t in targets:
                    if t.get("type") == "page":
                        ws_url = t.get("webSocketDebuggerUrl")
                        break
            if ws_url: break
        except:
            time.sleep(0.5)

    ws = await websockets.connect(ws_url, max_size=25*1024*1024)
    msg_id = 0
    async def call(method, params=None):
        nonlocal msg_id
        msg_id += 1
        await ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        while True:
            res = json.loads(await ws.recv())
            if res.get("id") == msg_id: return res.get("result", {})

    await call("Page.enable")
    await call("Runtime.enable")
    await call("Emulation.setDeviceMetricsOverride", {
        "width": 1440,
        "height": 900,
        "deviceScaleFactor": 1.25,
        "mobile": False
    })

    # Navigate to app
    await call("Page.navigate", {"url": "http://localhost:5173"})
    await asyncio.sleep(2)

    student_json = json.dumps(STUDENT_USER)
    quiz_json = json.dumps(QUIZ_ACTIVE_STATE)

    # Set up user and active quiz
    await call("Runtime.evaluate", {"expression": f"""
        localStorage.setItem('virtual_tutor_user', JSON.stringify({student_json}));
        localStorage.setItem('active_quiz_{STUDENT_USER["id"]}', JSON.stringify({quiz_json}));
        location.reload();
    """})
    await asyncio.sleep(3)

    # 1. QUIZ SCREENSHOT with active question & explanation!
    print("Capturing active Quiz...")
    await call("Runtime.evaluate", {"expression": """
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const quizBtn = btns.find(b => b.textContent.includes('Luyện tập & Quiz'));
            if (quizBtn) quizBtn.click();
        })()
    """})
    await asyncio.sleep(2)
    # Check if there is recovery prompt or active quiz
    await call("Runtime.evaluate", {"expression": """
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const resumeBtn = btns.find(b => b.textContent.includes('Tiếp tục bài thi') || b.textContent.includes('Làm tiếp') || b.textContent.includes('Khôi phục'));
            if (resumeBtn) resumeBtn.click();
        })()
    """})
    await asyncio.sleep(2)

    res = await call("Page.captureScreenshot", {"format": "png", "quality": 95})
    data = base64.b64decode(res["data"])
    with open(os.path.join(OUTPUT_DIR, "07_quiz_practice.png"), "wb") as f: f.write(data)
    with open(os.path.join(ARTIFACT_DIR, "07_quiz_practice.png"), "wb") as f: f.write(data)
    print("Recaptured 07_quiz_practice.png:", len(data))

    # 2. WORKSPACE SPLIT SCREEN
    print("Capturing Workspace split screen...")
    # Navigate to Library
    await call("Runtime.evaluate", {"expression": """
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const libBtn = btns.find(b => b.textContent.includes('Tài liệu học tập'));
            if (libBtn) libBtn.click();
        })()
    """})
    await asyncio.sleep(2)

    # Click first book
    await call("Runtime.evaluate", {"expression": """
        (() => {
            const card = document.querySelector('.bg-white.rounded-2xl') || document.querySelector('.group.cursor-pointer');
            if (card) card.click();
        })()
    """})
    await asyncio.sleep(1.5)

    # Click "Đọc sách trực tuyến"
    await call("Runtime.evaluate", {"expression": """
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const readBtn = btns.find(b => b.textContent.includes('Đọc sách trực tuyến'));
            if (readBtn) readBtn.click();
        })()
    """})
    await asyncio.sleep(3.5)

    res = await call("Page.captureScreenshot", {"format": "png", "quality": 95})
    data = base64.b64decode(res["data"])
    with open(os.path.join(OUTPUT_DIR, "06_workspace_integrated.png"), "wb") as f: f.write(data)
    with open(os.path.join(ARTIFACT_DIR, "06_workspace_integrated.png"), "wb") as f: f.write(data)
    print("Recaptured 06_workspace_integrated.png:", len(data))

    # 3. DRAWING CANVAS (Bảng vẽ nháp)
    print("Toggling drawing canvas in Workspace...")
    await call("Runtime.evaluate", {"expression": """
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const drawBtn = btns.find(b => b.title?.includes('nháp') || b.title?.includes('vẽ') || b.textContent.includes('Bảng vẽ') || b.textContent.includes('Nháp'));
            if (drawBtn) drawBtn.click();
            else {
                // look for icon with edit / pencil
                const svgBtn = btns.find(b => b.querySelector('svg.lucide-pen-tool, svg.lucide-edit-3, svg.lucide-edit-2'));
                if (svgBtn) svgBtn.click();
            }
        })()
    """})
    await asyncio.sleep(2)
    res = await call("Page.captureScreenshot", {"format": "png", "quality": 95})
    data = base64.b64decode(res["data"])
    with open(os.path.join(OUTPUT_DIR, "06b_workspace_drawing.png"), "wb") as f: f.write(data)
    with open(os.path.join(ARTIFACT_DIR, "06b_workspace_drawing.png"), "wb") as f: f.write(data)
    print("Captured 06b_workspace_drawing.png:", len(data))

    await ws.close()
    proc.kill()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
