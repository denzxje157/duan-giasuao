import requests
import json

def test_chat():
    url = "http://127.0.0.1:8000/chat"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "question": "Bạn có thể giải thích cho tôi về phép cộng cơ bản không?",
        "model_name": "gemini-2.5-flash",
        "subject": "Môn Toán"
    }
    
    print("Sending request to /chat...")
    response = requests.post(url, json=data, headers=headers, stream=True)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return
        
    full_text = ""
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data: ') and not line_str.endswith('[DONE]'):
                try:
                    data = json.loads(line_str[6:])
                    chunk = data.get('chunk', '') or data.get('text', '')
                    full_text += chunk
                    print(chunk, end='', flush=True)
                except Exception as e:
                    pass
    
    print("\n\n--- FULL RESULT ---")
    print(full_text)
    print("-----------------------------------")
    
    # Try parse JSON
    if full_text.strip().startswith('```json'):
        raw = full_text.strip().replace('```json', '').replace('```', '').strip()
    else:
        raw = full_text.strip()
        
    if raw.startswith('{'):
        try:
            parsed = json.loads(raw)
            print("\n[SUCCESS] JSON Data!")
            print(f"Answer length: {len(parsed.get('answer', ''))}")
            print(f"Suggestions: {json.dumps(parsed.get('suggestions', []), ensure_ascii=False, indent=2)}")
        except Exception as e:
            print("\n[JSON PARSE ERROR]:", e)
    else:
        print("\n[ERROR] Data does not start with {")

if __name__ == "__main__":
    test_chat()
