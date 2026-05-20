import os
import requests

# Đường dẫn đến thư mục chứa đống SGK, PDF của Anh
FOLDER_PATH = r"C:\Users\Admin\Downloads\SGK_Lớp_12" 
API_URL = "http://localhost:8000/upload"

def bulk_upload():
    # Lấy danh sách toàn bộ file trong thư mục
    files_to_upload = []
    for filename in os.listdir(FOLDER_PATH):
        if filename.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg')):
            file_path = os.path.join(FOLDER_PATH, filename)
            # Mở file dưới dạng binary
            files_to_upload.append(
                ('files', (filename, open(file_path, 'rb'), 'application/octet-stream'))
            )

    if not files_to_upload:
        print("❌ Không tìm thấy file nào phù hợp trong thư mục!")
        return

    print(f"🚀 Đang bắt đầu bơm {len(files_to_upload)} file vào hệ thống...")
    
    # Gọi API upload một lần duy nhất
    response = requests.post(API_URL, files=files_to_upload, params={"grade": "12"})
    
    if response.status_code == 200:
        print("✅ Đã gửi toàn bộ file thành công! Hệ thống đang xử lý ngầm...")
    else:
        print(f"❌ Lỗi: {response.text}")

if __name__ == "__main__":
    bulk_upload()