import asyncio
import json
import os
import subprocess
import time
import urllib.request
import base64
import websockets

OUTPUT_DIR = r"c:\Users\Admin\Downloads\All-Project\duan-giasuao\public\guide_images"
ARTIFACT_DIR = r"C:\Users\Admin\.gemini\antigravity\brain\c5972930-3f42-4bbb-97ad-6d7c9c4e6d9b\guide_images"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\Users\Admin\AppData\Local\Temp\chrome_ws_fix"

STUDENT_USER = {
    "id": "f3737394-744d-4e65-972f-47e40031c40b",
    "name": "Nguyễn Tấn Phát",
    "email": "tanphat.nguyen2k15@gmail.com",
    "grade": 11,
    "role": "student"
}

async def main():
    chrome_cmd = [
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9224",
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
            with urllib.request.urlopen("http://127.0.0.1:9224/json") as response:
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

    await call("Page.navigate", {"url": "http://localhost:5173"})
    await asyncio.sleep(2)

    student_json = json.dumps(STUDENT_USER)
    await call("Runtime.evaluate", {"expression": f"""
        localStorage.setItem('virtual_tutor_user', JSON.stringify({student_json}));
        location.reload();
    """})
    await asyncio.sleep(3)

    # Go to Library
    await call("Runtime.evaluate", {"expression": """
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const libBtn = btns.find(b => b.textContent.includes('Tài liệu học tập'));
            if (libBtn) libBtn.click();
        })()
    """})
    await asyncio.sleep(2)

    # Click 'Xem chi tiết' on first book
    await call("Runtime.evaluate", {"expression": """
        (() => {
            const detailSpans = Array.from(document.querySelectorAll('span')).filter(s => s.textContent.includes('Xem chi tiết'));
            if (detailSpans.length > 0) {
                detailSpans[0].click();
            }
        })()
    """})
    await asyncio.sleep(1.5)

    # Click 'Đọc sách trực tuyến'
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

    # Click Drawing board button if available
    await call("Runtime.evaluate", {"expression": """
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const drawBtn = btns.find(b => b.title?.toLowerCase().includes('vẽ') || b.title?.toLowerCase().includes('nháp') || b.textContent.includes('Bảng vẽ') || b.textContent.includes('Nháp'));
            if (drawBtn) drawBtn.click();
            else {
                const editIconBtn = btns.find(b => b.querySelector('svg'));
                // Click any tool button that toggles canvas
            }
        })()
    """})
    await asyncio.sleep(2)

    res = await call("Page.captureScreenshot", {"format": "png", "quality": 95})
    data = base64.b64decode(res["data"])
    with open(os.path.join(OUTPUT_DIR, "06b_workspace_drawing.png"), "wb") as f: f.write(data)
    with open(os.path.join(ARTIFACT_DIR, "06b_workspace_drawing.png"), "wb") as f: f.write(data)
    print("Recaptured 06b_workspace_drawing.png:", len(data))

    await ws.close()
    proc.kill()
    print("Workspace capture finished!")

if __name__ == "__main__":
    asyncio.run(main())
