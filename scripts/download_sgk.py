import os
import requests
import urllib3
from bs4 import BeautifulSoup
import re

# Bỏ qua cảnh báo bảo mật SSL do trang của NXB có chứng chỉ SSL không hợp lệ
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_DIR = r"C:\Users\Admin\Downloads\SGK_Moi_NXBGĐ"

# Danh sách các môn học có trong code của bạn
ALLOWED_SUBJECTS = [
    "toán", "tiếng việt", "ngữ văn", "tiếng anh", 
    "khoa học tự nhiên", "vật lí", "hóa học", "sinh học", 
    "lịch sử", "địa lí", "tự nhiên và xã hội", "tin học", "công nghệ",
    "đạo đức", "âm nhạc", "mĩ thuật", "thể chất"
]

def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", name)

def download():
    os.makedirs(BASE_DIR, exist_ok=True)
    session = requests.Session()
    session.verify = False
    session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    for grade in range(1, 13):
        print(f"\n{'='*40}")
        print(f"🚀 ĐANG QUÉT LỚP {grade}...")
        print(f"{'='*40}")
        
        grade_dir = os.path.join(BASE_DIR, f"Lop_{grade}")
        os.makedirs(grade_dir, exist_ok=True)
        
        cards = []
        for page in range(1, 10):
            url = f"https://taphuan.nxbgd.vn/tap-huan?grade={grade}" if page == 1 else f"https://taphuan.nxbgd.vn/tap-huan/page-{page}?grade={grade}"
            try:
                res = session.get(url, timeout=15)
            except Exception as e:
                break
            
            soup = BeautifulSoup(res.text, 'html.parser')
            page_cards = soup.find_all('a', href=re.compile(r'/chi-tiet-sach/'))
            if not page_cards:
                break
            cards.extend(page_cards)
        
        for card in cards:
            span = card.find('span', title=True)
            if not span: continue
            title = span['title'].strip()
            title_lower = title.lower()
            
            # Lọc theo danh sách môn học
            if not any(subj in title_lower for subj in ALLOWED_SUBJECTS):
                continue
                
            # Bỏ qua SGV (Sách giáo viên), VBT (Vở bài tập) nếu bị lẫn vào
            if "giáo viên" in title_lower or "bài tập" in title_lower or "chuyên đề" in title_lower:
                continue
                
            book_url = card['href']
            # Đảm bảo URL đầy đủ
            if not book_url.startswith('http'):
                book_url = 'https://taphuan.nxbgd.vn' + book_url
                
            print(f"📖 Đang xử lý sách: {title}")
            
            try:
                res_detail = session.get(book_url, timeout=15)
                soup_detail = BeautifulSoup(res_detail.text, 'html.parser')
                
                doc_links = soup_detail.find_all('a', href=re.compile(r'/doc-sach/'))
                sgk_link = None
                
                # Ưu tiên tìm link có chữ SGK
                for d in doc_links:
                    d_text = d.text.lower()
                    if "sgk" in d_text or "sách giáo khoa" in d_text:
                        sgk_link = d['href']
                        break
                
                # Nếu không có chữ SGK, lấy link đầu tiên không phải SGV/VBT
                if not sgk_link:
                    for d in doc_links:
                        d_text = d.text.lower()
                        if "sgv" not in d_text and "vbt" not in d_text and "tập viết" not in d_text:
                            sgk_link = d['href']
                            break
                            
                if not sgk_link:
                    print(f"   ⚠️ Không tìm thấy link đọc sách.")
                    continue
                    
                if not sgk_link.startswith('http'):
                    sgk_link = 'https://taphuan.nxbgd.vn' + sgk_link
                    
                res_doc = session.get(sgk_link, timeout=15)
                soup_doc = BeautifulSoup(res_doc.text, 'html.parser')
                
                # Lấy tất cả ảnh của các trang
                imgs = soup_doc.find_all('img')
                image_urls = []
                for img in imgs:
                    src = img.get('data-src') or img.get('src')
                    if src and "blank_book_page" not in src and "cdn" in src:
                        if src not in image_urls:
                            image_urls.append(src)
                        
                if not image_urls:
                    print(f"   ⚠️ Không tìm thấy trang sách nào.")
                    continue
                    
                print(f"   -> Đang tải {len(image_urls)} trang và nén thành PDF...")
                
                from PIL import Image
                from io import BytesIO
                import concurrent.futures
                
                pdf_path = os.path.join(grade_dir, f"{sanitize_filename(title)}.pdf")
                if os.path.exists(pdf_path):
                    print(f"   -> Đã tồn tại file {pdf_path}, bỏ qua.")
                    continue
                    
                images = [None] * len(image_urls)
                
                def fetch_image(idx, url):
                    try:
                        img_res = session.get(url, timeout=15)
                        return idx, Image.open(BytesIO(img_res.content)).convert('RGB')
                    except Exception as e:
                        print(f"   ⚠️ Lỗi tải trang {idx+1}: {e}")
                        return idx, None

                with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
                    futures = [executor.submit(fetch_image, i, url) for i, url in enumerate(image_urls)]
                    for future in concurrent.futures.as_completed(futures):
                        idx, img = future.result()
                        images[idx] = img
                        
                images = [img for img in images if img is not None]
                        
                if images:
                    images[0].save(pdf_path, save_all=True, append_images=images[1:])
                    print(f"   ✅ Đã lưu thành công: {pdf_path}")
                    
            except Exception as e:
                print(f"   ❌ Lỗi khi xử lý {title}: {e}")

if __name__ == "__main__":
    download()
