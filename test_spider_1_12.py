import requests
from bs4 import BeautifulSoup
import re
import time

def crawl_v10_final_strict():
    grade_configs = {
        "Lớp 1": "c52", "Lớp 2": "c53", "Lớp 3": "c54", "Lớp 4": "c55",
        "Lớp 5": "c56", "Lớp 6": "c44", "Lớp 7": "c45", "Lớp 8": "c46",
        "Lớp 9": "c47", "Lớp 10": "c48", "Lớp 11": "c49", "Lớp 12": "c50"
    }

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    base_url = "https://loigiaihay.com"
    
    print("🕵️ GIASUAO SPIDER V10 - CHẾ ĐỘ 'MẮT ĐẠI BÀNG' (CHUẨN 100%)\n")

    for grade_name, grade_id in grade_configs.items():
        curr_num = re.search(r'\d+', grade_name).group() # Số lớp đang quét
        url = f"{base_url}/{grade_name.replace(' ', '-').lower()}-{grade_id}.html"
        
        try:
            res = requests.get(url, headers=headers, timeout=15)
            if res.status_code != 200: continue
            soup = BeautifulSoup(res.content, 'html.parser')
            
            # 🔥 BƯỚC 1: XÓA SẠCH VÙNG NHIỄU (Sidebar, Menu...)
            for noise in soup.find_all(['header', 'footer', 'aside', 'nav']):
                noise.decompose()

            # 🔥 BƯỚC 2: TÌM TRONG DANH SÁCH MÔN (Vùng trung tâm)
            # Trang Loigiaihay thường để sách trong các thẻ <li> của ul.list-subject
            main_list = soup.find('ul', class_='list-subject') or soup.find('div', id='content') or soup
            links = main_list.find_all('a', href=True)
            
            processed_urls = set()
            count = 0
            
            for link in links:
                title = link.text.strip()
                href = link['href']
                title_low = title.lower()
                href_low = href.lower()

                # 🚫 LỌC 1: Phải là đầu sách (SGK, SBT, VBT)
                if not any(kw in title.upper() for kw in ["SGK", "SBT", "VBT", "GIÁO KHOA"]): continue
                
                # 🚫 LỌC 2: Loại bỏ bài lẻ (bài 1, bài 2...)
                if any(kw in title_low for kw in ["bài ", "trang ", "câu ", "tiết "]): continue

                # 🚫 LỌC 3: KIỂM TRA SỐ LỚP CỰC CHẶT
                # Lấy TẤT CẢ các số xuất hiện trong tiêu đề
                all_nums_in_title = re.findall(r'\d+', title)
                if all_nums_in_title:
                    # Nếu có số lớp (như 9, 10, 11) mà không phải số lớp đang quét (ví dụ 1) -> LOẠI
                    # Lưu ý: Sách thường ghi 'Toán 1' hoặc 'Toán lớp 1'
                    if curr_num not in all_nums_in_title:
                        continue
                elif curr_num != "1":
                    # Nếu tiêu đề không có số nào, chỉ cho phép ở Lớp 1 (vì hay ghi SGK Tiếng Việt khơi khơi)
                    continue

                # 🚫 LỌC 4: KIỂM TRA URL (URL phải chứa số lớp)
                # Ví dụ: loigiaihay.com/sgk-toan-1-c123.html (phải có số 1)
                # Dùng regex để tìm số lớp đứng độc lập trong URL
                if not re.search(rf'[-]{curr_num}[-]|lop[-]{curr_num}|-{curr_num}\.html', href_low):
                    if curr_num != "1": continue

                # 🎯 NẾU VƯỢT QUA TẤT CẢ -> ĐÂY LÀ SÁCH CHUẨN
                full_link = href if href.startswith('http') else base_url + href
                if full_link in processed_urls: continue
                
                # Phân loại môn (giống bản cũ của Anh)
                subject = "Tài liệu"
                if "toán" in title_low: subject = "Toán"
                elif "tiếng việt" in title_low: subject = "Tiếng Việt"
                elif "tiếng anh" in title_low: subject = "Tiếng Anh"
                
                print(f"   📗 [{grade_name}] [{subject}] {title}")
                print(f"      🔗 Link sách: {full_link}") # Đây là link để mình 'khoan' vào tải file
                
                processed_urls.add(full_link)
                count += 1
            
            if count > 0:
                print(f"✅ ĐÃ CHỐT: {count} sách Lớp {curr_num}.\n")
            time.sleep(0.5)

        except Exception as e:
            print(f"❌ Lỗi {grade_name}: {e}")

if __name__ == "__main__":
    crawl_v10_final_strict()