import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY_1")
genai.configure(api_key=key)

print("=== DANH SÁCH GIA SƯ BẠN ĐƯỢC PHÉP THUÊ ===")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print("Lỗi khi lấy danh sách:", e)
print("==========================================")