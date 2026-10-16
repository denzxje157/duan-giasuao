import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_cell_left_border(cell, color_hex="2563EB", size="36"):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="{size}" w:space="0" w:color="{color_hex}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
    tcPr.append(borders)

def add_callout(doc, text_list, title="LƯU Ý QUAN TRỌNG"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.2)
    set_cell_background(cell, "EFF6FF")
    set_cell_left_border(cell, "2563EB", "36")
    set_cell_margins(cell, top=140, bottom=140, left=200, right=180)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(f"💡 {title}\n")
    run_title.bold = True
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(10.5)
    run_title.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)
    
    for item in text_list:
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(2)
        r = p2.add_run(f"• {item}")
        r.font.name = "Calibri"
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(6)

def add_image_with_caption(doc, img_path, caption_text, width_in=6.0):
    if not os.path.exists(img_path):
        print(f"Warning: Image {img_path} not found!")
        return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    run = p.add_run()
    run.add_picture(img_path, width=Inches(width_in))
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(10)
    r_cap = p_cap.add_run(caption_text)
    r_cap.font.name = "Calibri"
    r_cap.font.size = Pt(9.5)
    r_cap.italic = True
    r_cap.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

def build_word_handbook():
    doc = docx.Document()
    
    # Page Setup: A4, 1-inch margins
    for sec in doc.sections:
        sec.page_width = Inches(8.27)   # A4 width
        sec.page_height = Inches(11.69) # A4 height
        sec.top_margin = Inches(1.0)
        sec.bottom_margin = Inches(1.0)
        sec.left_margin = Inches(1.0)
        sec.right_margin = Inches(1.0)
        
        # Header & Footer
        header = sec.header
        p_hdr = header.paragraphs[0]
        p_hdr.text = "Gia Sư Ảo — Sổ tay hướng dẫn sử dụng hệ thống"
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_hdr.runs[0].font.name = "Calibri"
        p_hdr.runs[0].font.size = Pt(8.5)
        p_hdr.runs[0].font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
        
        footer = sec.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.text = "© 2026 Nền tảng Gia Sư Ảo AI Socratic RAG — Tài liệu lưu hành nội bộ và dự thi NCKH"
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_ftr.runs[0].font.name = "Calibri"
        p_ftr.runs[0].font.size = Pt(8.5)
        p_ftr.runs[0].font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    # Base style
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Calibri'
    style_normal.font.size = Pt(11)
    style_normal.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    style_normal.paragraph_format.line_spacing = 1.15
    style_normal.paragraph_format.space_after = Pt(5)

    base_img_dir = r"c:\Users\Admin\Downloads\All-Project\duan-giasuao\public\guide_images"

    # ================= COVER PAGE =================
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(36)
    p_pre.paragraph_format.space_after = Pt(12)
    p_pre.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_pre = p_pre.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO — DỰ ÁN NGHIÊN CỨU KHOA HỌC KỸ THUẬT\nLĨNH VỰC: HỆ THỐNG PHẦN MỀM & TRÍ TUỆ NHÂN TẠO")
    r_pre.font.size = Pt(11)
    r_pre.font.bold = True
    r_pre.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(40)
    p_title.paragraph_format.space_after = Pt(10)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("SỔ TAY HƯỚNG DẪN SỬ DỤNG")
    r_title.font.size = Pt(26)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(4)
    p_sub.paragraph_format.space_after = Pt(30)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("HỆ THỐNG GIA SƯ ẢO — AI SOCRATIC RAG\n(Trợ lý học tập thông minh theo Chương trình GDPT 2018)")
    r_sub.font.size = Pt(14)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)

    # Decorative line / box
    p_desc = doc.add_paragraph()
    p_desc.paragraph_format.space_before = Pt(20)
    p_desc.paragraph_format.space_after = Pt(60)
    p_desc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_desc = p_desc.add_run("Tài liệu hướng dẫn trực quan kèm ảnh chụp màn hình thực tế\nDành cho Học sinh từ Lớp 1 đến Lớp 12, Quý Thầy Cô và Phụ huynh")
    r_desc.font.size = Pt(11.5)
    r_desc.italic = True
    r_desc.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_before = Pt(60)
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_meta = p_meta.add_run("Nhóm tác giả Nghiên cứu & Phát triển\nNăm học 2025 – 2026")
    r_meta.font.size = Pt(11)
    r_meta.font.bold = True
    r_meta.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    doc.add_page_break()

    # ================= TABLE OF CONTENTS & INTRODUCTION =================
    p_h1 = doc.add_paragraph()
    p_h1.paragraph_format.space_before = Pt(12)
    p_h1.paragraph_format.space_after = Pt(8)
    r_h1 = p_h1.add_run("MỤC LỤC TỔNG QUAN")
    r_h1.font.size = Pt(16)
    r_h1.font.bold = True
    r_h1.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    toc_items = [
        ("LỜI NÓI ĐẦU & NGUYÊN TẮC HOẠT ĐỘNG", "Trang 3"),
        ("CHƯƠNG 1: TRANG CHỦ & ĐĂNG NHẬP / ĐĂNG KÝ TÀI KHOẢN", "Trang 4"),
        ("CHƯƠNG 2: MÀN HÌNH TỔNG QUAN (DASHBOARD OVERVIEW)", "Trang 6"),
        ("CHƯƠNG 3: TRỢ LÝ AI SOCRATIC — HỎI ĐÁP & GỢI MỞ TƯ DUY", "Trang 7"),
        ("CHƯƠNG 4: THƯ VIỆN SÁCH GIÁO KHOA SỐ HÓA GDPT 2018", "Trang 9"),
        ("CHƯƠNG 5: KHÔNG GIAN HỌC TẬP TÍCH HỢP (WORKSPACE & POMODORO)", "Trang 10"),
        ("CHƯƠNG 6: PHÂN HỆ LUYỆN TẬP & THỬ THÁCH (QUIZ TRẮC NGHIỆM)", "Trang 11"),
        ("CHƯƠNG 7: PHÂN TÍCH ĐIỂM MÙ KIẾN THỨC & THEO DÕI TIẾN ĐỘ", "Trang 12"),
        ("CHƯƠNG 8: QUẢN LÝ HỒ SƠ CÁ NHÂN & CÀI ĐẶT MỤC TIÊU", "Trang 13"),
        ("CHƯƠNG 9: BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN (ADMIN PANEL)", "Trang 14"),
        ("CHƯƠNG 10: BẢNG TỔNG HỢP MẸO & PHÍM TẮT HỌC TẬP HIỆU QUẢ", "Trang 15"),
    ]

    tbl_toc = doc.add_table(rows=len(toc_items), cols=2)
    tbl_toc.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (item, page) in enumerate(toc_items):
        row = tbl_toc.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(5.0)
        c1.width = Inches(1.2)
        set_cell_background(c0, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_background(c1, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(3)
        p0.paragraph_format.space_after = Pt(3)
        r0 = p0.add_run(item)
        r0.font.name = "Calibri"
        r0.font.size = Pt(10.5)
        if "CHƯƠNG" in item:
            r0.font.bold = True
            r0.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)
        else:
            r0.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            
        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p1.paragraph_format.space_before = Pt(3)
        p1.paragraph_format.space_after = Pt(3)
        r1 = p1.add_run(page)
        r1.font.name = "Calibri"
        r1.font.size = Pt(10)
        r1.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(12)
    p_div.paragraph_format.space_after = Pt(8)

    # LỜI NÓI ĐẦU
    p_lh = doc.add_paragraph()
    r_lh = p_lh.add_run("LỜI NÓI ĐẦU & NGUYÊN TẮC SƯ PHẠM CỐT LÕI")
    r_lh.font.size = Pt(14)
    r_lh.font.bold = True
    r_lh.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Chào mừng các bạn học sinh, quý thầy cô giáo và các bậc phụ huynh đến với Hệ thống Gia Sư Ảo! "
        "Cuốn sổ tay này được biên soạn nhằm hướng dẫn chi tiết từng bước cách sử dụng các tính năng hiện có trên website. "
        "Toàn bộ hình ảnh minh họa trong tài liệu đều là ảnh chụp màn hình thực tế từ chính hệ thống đang hoạt động, "
        "mô tả chính xác những gì trang web cung cấp mà không cường điệu hay phóng đại."
    )

    doc.add_paragraph(
        "Khác với các công cụ chatbot thông thường chỉ đưa ra lời giải tức thời khiến học sinh thụ động, Gia Sư Ảo được thiết kế dựa trên 3 trụ cột sư phạm và công nghệ cốt lõi:"
    )

    p_p1 = doc.add_paragraph()
    r_p1 = p_p1.add_run("1. Phương pháp gợi mở Socratic (Pedagogical Scaffolding): ")
    r_p1.bold = True
    p_p1.add_run("Hệ thống tuyệt đối không giải hộ hay cung cấp đáp án có sẵn. Thay vào đó, AI đóng vai trò như một người thầy kiên nhẫn, phân tích đề bài, trích xuất dữ kiện và đặt ra các câu hỏi định hướng từng bước để học sinh tự tìm ra bản chất vấn đề.")

    p_p2 = doc.add_paragraph()
    r_p2 = p_p2.add_run("2. Cơ sở tri thức chuẩn hóa RAG (Chương trình GDPT 2018): ")
    r_p2.bold = True
    p_p2.add_run("Nội dung phản hồi được neo chặt vào SGK của Bộ Giáo dục và Đào tạo (bộ Kết nối tri thức, Chân trời sáng tạo, Cánh diều từ Lớp 1 đến Lớp 12), đảm bảo thuật ngữ, công thức và chuẩn kiến thức - kỹ năng chính xác.")

    p_p3 = doc.add_paragraph()
    r_p3 = p_p3.add_run("3. Không gian học tập tích hợp đa nhiệm (Workspace & Pomodoro): ")
    r_p3.bold = True
    p_p3.add_run("Giao diện chia đôi màn hình kết hợp đọc SGK số hóa, bảng vẽ nháp tay và đồng hồ đếm ngược Pomodoro 25 phút giúp rèn luyện thói quen tự học kỷ luật cao độ.")

    doc.add_page_break()

    # ================= CHƯƠNG 1 =================
    p_c1 = doc.add_paragraph()
    r_c1 = p_c1.add_run("CHƯƠNG 1: TRANG CHỦ & ĐĂNG NHẬP / ĐĂNG KÝ TÀI KHOẢN")
    r_c1.font.size = Pt(14)
    r_c1.font.bold = True
    r_c1.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_c1_1 = doc.add_paragraph()
    r_c1_1 = p_c1_1.add_run("1.1. Trang chủ giới thiệu (Landing Page)")
    r_c1_1.font.size = Pt(12)
    r_c1_1.font.bold = True
    r_c1_1.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)

    doc.add_paragraph(
        "Khi truy cập vào website lần đầu tiên, học sinh sẽ được đón tiếp bởi giao diện trang chủ thân thiện với đầy đủ thông tin định hướng học tập."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "01_landing_page.png"),
        "Hình 1: Giao diện Trang chủ hệ thống Gia Sư Ảo với định hướng phương pháp Socratic"
    )

    doc.add_paragraph("Các thành phần thao tác chính trên Trang chủ:")
    p = doc.add_paragraph()
    p.add_run("• Nút 'Bắt đầu học ngay': ").bold = True
    p.add_run("Mở màn hình chọn khối lớp và đăng nhập hoặc đăng ký tài khoản thành viên mới.")
    p = doc.add_paragraph()
    p.add_run("• Nút 'Học thử 30 phút' (Chế độ Khách): ").bold = True
    p.add_run("Cho phép học sinh hoặc khách vãng lai trải nghiệm ngay các tính năng hỏi đáp và đọc SGK mà không bắt buộc tạo tài khoản ngay lập tức.")
    p = doc.add_paragraph()
    p.add_run("• Thẻ giới thiệu 3 trụ cột: ").bold = True
    p.add_run("Tóm tắt trực quan phương pháp gợi mở, kho SGK số hóa và không gian học tập tích hợp.")

    p_c1_2 = doc.add_paragraph()
    r_c1_2 = p_c1_2.add_run("1.2. Đăng ký & Đăng nhập theo khối lớp")
    r_c1_2.font.size = Pt(12)
    r_c1_2.font.bold = True
    r_c1_2.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)

    doc.add_paragraph(
        "Hệ thống thiết kế cơ chế đăng nhập cá nhân hóa theo từng khối lớp từ Lớp 1 đến Lớp 12 nhằm đồng bộ SGK và ngữ cảnh tư vấn phù hợp lứa tuổi."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "02_login_register.png"),
        "Hình 2: Màn hình Đăng nhập / Đăng ký tài khoản với tính năng chọn khối lớp linh hoạt"
    )

    doc.add_paragraph("Quy trình 3 bước tham gia học tập:")
    p = doc.add_paragraph()
    p.add_run("1. Chọn Khối lớp: ").bold = True
    p.add_run("Nhấp chọn khối lớp của em (Lớp 1 đến Lớp 12). Hệ thống tự động chuyển đổi theme màu và độ phức tạp ngôn ngữ (Tiểu học: tươi sáng, xưng hô 'em'; THPT: chuyên sâu, giao diện tối giản).")
    p = doc.add_paragraph()
    p.add_run("2. Nhập thông tin tài khoản: ").bold = True
    p.add_run("Điền Họ và tên (để AI xưng hô thân mật), Địa chỉ Email (ví dụ: tanphat.nguyen2k15@gmail.com) và Mật khẩu.")
    p = doc.add_paragraph()
    p.add_run("3. Xác nhận: ").bold = True
    p.add_run("Bấm nút 'Đăng nhập' để lưu phiên làm việc an toàn và chuyển tiếp thẳng vào màn hình Tổng quan.")

    doc.add_page_break()

    # ================= CHƯƠNG 2 =================
    p_c2 = doc.add_paragraph()
    r_c2 = p_c2.add_run("CHƯƠNG 2: MÀN HÌNH TỔNG QUAN (DASHBOARD OVERVIEW)")
    r_c2.font.size = Pt(14)
    r_c2.font.bold = True
    r_c2.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Màn hình Tổng quan là trung tâm điều khiển hàng ngày của người học, nơi tổng hợp toàn bộ các chỉ số đo lường hiệu suất học tập, danh sách nhiệm vụ và lịch học dự kiến."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "03_overview_dashboard.png"),
        "Hình 3: Màn hình Tổng quan cá nhân hóa của học sinh Nguyễn Tấn Phát (Khối 11)"
    )

    doc.add_paragraph("Các thành phần thông tin chi tiết trên màn hình Tổng quan:")
    
    p = doc.add_paragraph()
    p.add_run("1. Bộ 4 thẻ chỉ số học tập trọng tâm:\n").bold = True
    p.add_run("• Chuỗi học tập (Streak): ").bold = True
    p.add_run("Đo lường số ngày liên tục học sinh đăng nhập tự học để duy trì thói quen bền bỉ.\n")
    p.add_run("• Thời gian học hôm nay: ").bold = True
    p.add_run("Được ghi nhận tự động thông qua bộ theo dõi học tập song song (Study Tracker).\n")
    p.add_run("• Mục tiêu ngày: ").bold = True
    p.add_run("Tiến độ hoàn thành nhiệm vụ (ví dụ: hoàn thành 0/5 nhiệm vụ được giao).\n")
    p.add_run("• Điểm thưởng (SP - Study Points): ").bold = True
    p.add_run("Điểm thưởng tích lũy khi làm bài trắc nghiệm, hỏi bài và duy trì chuỗi học tập.")

    p = doc.add_paragraph()
    p.add_run("2. Cột Nhiệm vụ học tập (Phía bên phải):\n").bold = True
    p.add_run("Danh sách các hành động có thưởng điểm SP như: 'Chào Gia sư & chọn môn học mới (+10 SP)', 'Hỏi Gia sư một câu hỏi bất kỳ (+15 SP)', 'Khám phá sách mới (+20 SP)', 'Làm thử 1 câu hỏi trắc nghiệm (+25 SP)'...")

    p = doc.add_paragraph()
    p.add_run("3. Widget song song thời gian tự học (Góc dưới bên phải):\n").bold = True
    p.add_run("Widget 'Thời gian con đã học' luôn chạy ngầm, đo lường chính xác từng giây học sinh tương tác với từng bộ môn cụ thể (Toán, Hóa, Ngữ văn...).")

    doc.add_page_break()

    # ================= CHƯƠNG 3 =================
    p_c3 = doc.add_paragraph()
    r_c3 = p_c3.add_run("CHƯƠNG 3: TRỢ LÝ AI SOCRATIC — HỎI ĐÁP & GỢI MỞ TƯ DUY")
    r_c3.font.size = Pt(14)
    r_c3.font.bold = True
    r_c3.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Đây là trái tim của hệ thống Gia Sư Ảo. Thay vì hoạt động như một cỗ máy giải bài tập thụ động, "
        "Gia sư AI đóng vai trò người dẫn dắt tư duy Socratic: chia nhỏ vấn đề, đặt câu hỏi gợi ý và giúp học sinh tự khám phá ra đáp án."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "04_ai_chat_socratic.png"),
        "Hình 4: Phiên đối thoại Socratic thực tế môn Hóa học 11 kèm công thức KaTeX và gợi ý tư duy"
    )

    doc.add_paragraph("Đặc điểm kỹ thuật và sư phạm nổi bật:")

    p = doc.add_paragraph()
    p.add_run("• Trình bày công thức Toán - Lý - Hóa chuẩn KaTeX: ").bold = True
    p.add_run("Hệ thống tự động hiển thị phương trình phản ứng thuận nghịch ($N_2(k) + 3H_2(k) \\rightleftharpoons 2NH_3(k)$), nhiệt phản ứng ($\\Delta_r H_{298}^0 = -92\\text{ kJ/mol}$), các công thức đạo hàm, tích phân rõ ràng và đẹp mắt.")

    p = doc.add_paragraph()
    p.add_run("• Khung gợi ý tư duy Socratic (Scaffolding): ").bold = True
    p.add_run("AI làm nổi bật dữ kiện quan trọng: 'Vế trái có 1 mol N2 + 3 mol H2 = 4 mol khí; vế phải có 2 mol NH3'. Sau đó đặt câu hỏi định hướng: 'Để làm giảm áp suất của bình phản ứng, hệ cần chuyển dịch sang phía có nhiều mol khí hơn hay ít mol khí hơn?'")

    p = doc.add_paragraph()
    p.add_run("• Phản hồi tích cực & Mở rộng bài học: ").bold = True
    p.add_run("Khi học sinh trả lời đúng, AI xác nhận bằng thông điệp 'Chính xác tuyệt đối! 🎉 Em đã nắm rất vững bản chất', đồng thời đặt tiếp câu hỏi mở rộng về ảnh hưởng của nhiệt độ để học sinh phát triển năng lực tự học.")

    p = doc.add_paragraph()
    p.add_run("• Nút hành động nhanh: ").bold = True
    p.add_run("Phía dưới mỗi câu trả lời tích hợp sẵn 3 nút: 'Làm thêm 1 bài liên quan', 'Ôn lại lý thuyết chính' và 'Xem tài liệu tham khảo'.")

    p = doc.add_paragraph()
    p.add_run("• Đọc câu trả lời bằng giọng nói tiếng Việt (TTS): ").bold = True
    p.add_run("Nút biểu tượng chiếc loa ở góc trên bên phải cho phép đọc diễn cảm nội dung câu trả lời, rất hữu ích cho học sinh tiểu học hoặc học sinh khiếm thị.")

    add_callout(
        doc,
        [
            "Học sinh có thể gõ trực tiếp công thức toán học bằng cú pháp LaTeX kẹp giữa cặp dấu $ (ví dụ $y = x^3 - 3x$).",
            "Không nên hỏi cộc lốc 'Cho đáp án câu này', hãy hỏi 'Em đang vướng ở bước này, cô gợi ý giúp em' để nhận được hướng dẫn hiệu quả nhất."
        ],
        "MẸO TƯƠNG TÁC HIỆU QUẢ CÙNG GIA SƯ AI"
    )

    doc.add_page_break()

    # ================= CHƯƠNG 4 =================
    p_c4 = doc.add_paragraph()
    r_c4 = p_c4.add_run("CHƯƠNG 4: THƯ VIỆN SÁCH GIÁO KHOA SỐ HÓA GDPT 2018")
    r_c4.font.size = Pt(14)
    r_c4.font.bold = True
    r_c4.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Thư viện số hóa của hệ thống tập hợp đầy đủ các đầu sách giáo khoa theo chuẩn Chương trình GDPT 2018 mới nhất của Bộ Giáo dục và Đào tạo, "
        "bao gồm các bộ sách: Kết nối tri thức với cuộc sống, Chân trời sáng tạo và Cánh diều."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "05_library_textbooks.png"),
        "Hình 5: Kho Sách giáo khoa số hóa phân bổ theo từng môn học cho Khối 11"
    )

    doc.add_paragraph("Hướng dẫn khai thác Thư viện:")
    p = doc.add_paragraph()
    p.add_run("• Bộ lọc bộ môn: ").bold = True
    p.add_run("Dễ dàng lọc nhanh các đầu sách theo môn học bằng thanh phân loại ngang: Tất cả, Toán, Tiếng Anh, Vật lí, Hóa học, Ngữ văn, Sinh học, Lịch sử, Tin học, Công nghệ, Địa lí...")
    p = doc.add_paragraph()
    p.add_run("• Phân loại tài liệu: ").bold = True
    p.add_run("Chuyển đổi linh hoạt giữa 'Sách Hệ Thống' (do ban quản trị cập nhật sẵn) và 'Tài Liệu Cá Nhân' (học sinh tự tải lên để ôn tập).")
    p = doc.add_paragraph()
    p.add_run("• Đọc trực tuyến & Tải PDF: ").bold = True
    p.add_run("Bấm 'Xem chi tiết' để xem tóm tắt giới thiệu, số trang và mục lục từng chương, sau đó bấm 'Đọc sách trực tuyến' để vào ngay Không gian học tập Workspace.")

    doc.add_page_break()

    # ================= CHƯƠNG 5 =================
    p_c5 = doc.add_paragraph()
    r_c5 = p_c5.add_run("CHƯƠNG 5: KHÔNG GIAN HỌC TẬP TÍCH HỢP (WORKSPACE)")
    r_c5.font.size = Pt(14)
    r_c5.font.bold = True
    r_c5.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Workspace là không gian học tập đa nhiệm chia đôi màn hình (Split-screen), "
        "giúp học sinh không cần phải chuyển đổi qua lại giữa trình đọc PDF và công cụ hỏi đáp bên ngoài."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "06_workspace_integrated.png"),
        "Hình 6: Không gian làm việc chia đôi màn hình kết hợp tài liệu và Trợ lý AI trong Workspace"
    )

    doc.add_paragraph("Các công cụ tích hợp trong Workspace:")
    p = doc.add_paragraph()
    p.add_run("1. Cột trái — Vùng hiển thị tài liệu: ").bold = True
    p.add_run("Trình xem văn bản/PDF trực tuyến với đầy đủ tính năng phóng to, thu nhỏ và chuyển trang nhanh.")
    p = doc.add_paragraph()
    p.add_run("2. Cột phải — Trợ lý AI theo ngữ cảnh tài liệu: ").bold = True
    p.add_run("AI tự động tải ngữ cảnh cuốn sách đang mở để giải thích ngay các đoạn khó hiểu. Các nút hỗ trợ nhanh gồm: 'Liệt kê các ý chính trong tệp này', 'Tạo kế hoạch học tập cho tệp này', 'Tóm tắt nội dung sách' và 'Giải thích đơn giản hơn'.")
    p = doc.add_paragraph()
    p.add_run("3. Đồng hồ đếm ngược Pomodoro (25:00): ").bold = True
    p.add_run("Tích hợp ngay trên thanh tiêu đề của Workspace, giúp học sinh duy trì phiên học 25 phút tập trung và 5 phút nghỉ ngơi.")
    p = doc.add_paragraph()
    p.add_run("4. Chế độ Toàn màn hình: ").bold = True
    p.add_run("Bấm nút mũi tên 4 hướng để mở rộng không gian học tập toàn bộ màn hình máy tính, loại bỏ mọi xao nhãng xung quanh.")

    doc.add_page_break()

    # ================= CHƯƠNG 6 =================
    p_c6 = doc.add_paragraph()
    r_c6 = p_c6.add_run("CHƯƠNG 6: PHÂN HỆ LUYỆN TẬP & THỬ THÁCH (QUIZ TRẮC NGHIỆM)")
    r_c6.font.size = Pt(14)
    r_c6.font.bold = True
    r_c6.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Module Luyện tập cho phép học sinh tự tạo các đề thi trắc nghiệm tương tác bám sát nội dung từng bài học, "
        "nhận kết quả tức thì kèm lời giải thích cặn kẽ của Trí tuệ Nhân tạo."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "07_quiz_practice.png"),
        "Hình 7: Giao diện Khởi tạo bài test và làm bài trắc nghiệm có chấm điểm và giải thích tự động"
    )

    doc.add_paragraph("Các bước thực hiện bài luyện tập:")
    p = doc.add_paragraph()
    p.add_run("1. Khởi tạo đề kiểm tra (Cột bên trái):\n").bold = True
    p.add_run("• Nhập chủ đề: Ví dụ 'Hàm số và Đạo hàm - Toán 11' hoặc dán một đoạn văn bản kiến thức.\n")
    p.add_run("• Chọn độ khó: Dễ (Nhận biết), Trung bình (Thông hiểu), hoặc Vận dụng.\n")
    p.add_run("• Chọn số lượng câu hỏi: 5 câu, 10 câu hoặc 15 câu.\n")
    p.add_run("• Bấm nút 'Tạo đề ngay'.")

    p = doc.add_paragraph()
    p.add_run("2. Tương tác làm bài (Cột bên phải):\n").bold = True
    p.add_run("• Câu hỏi hiển thị rõ ràng với công thức toán học ($y = x^3 - 3x^2 + 2$).\n")
    p.add_run("• Chọn 1 trong 4 phương án (A, B, C, D). Hệ thống hiển thị viền xanh lá kèm dấu tích khi chọn đúng.\n")
    p.add_run("• Khung 'Gia sư AI giải thích' bên dưới trình bày từng bước tính đạo hàm, lập bảng biến thiên và chỉ ra tọa độ cực đại.")

    p = doc.add_paragraph()
    p.add_run("3. Tính năng Flashcards: ").bold = True
    p.add_run("Bấm tab 'Thẻ học tập Flashcards' để lật thẻ ghi nhớ nhanh các công thức và định lý then chốt.")

    doc.add_page_break()

    # ================= CHƯƠNG 7 =================
    p_c7 = doc.add_paragraph()
    r_c7 = p_c7.add_run("CHƯƠNG 7: PHÂN TÍCH ĐIỂM MÙ KIẾN THỨC & THEO DÕI TIẾN ĐỘ")
    r_c7.font.size = Pt(14)
    r_c7.font.bold = True
    r_c7.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Nhằm giúp học sinh không chỉ học chăm mà còn học đúng trọng tâm, "
        "hệ thống trang bị biểu đồ phân tích Điểm mù kiến thức (Knowledge Gap Radar) và báo cáo thời gian học tập."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "08_progress_analytics.png"),
        "Hình 8: Bảng theo dõi tiến độ tuần và Biểu đồ mạng nhện phân tích điểm mù kiến thức"
    )

    doc.add_paragraph("Ý nghĩa các chỉ số đo lường:")
    p = doc.add_paragraph()
    p.add_run("• Chuỗi ngày học tập: ").bold = True
    p.add_run("Ghi nhận số ngày học liên tục để khích lệ tinh thần kiên trì.")
    p = doc.add_paragraph()
    p.add_run("• Tổng thời gian tự học trong tuần: ").bold = True
    p.add_run("Thống kê số giờ học thực tế và tỷ lệ tăng giảm phần trăm so với tuần trước.")
    p = doc.add_paragraph()
    p.add_run("• Điểm kinh nghiệm (XP): ").bold = True
    p.add_run("Tích lũy điểm để nâng cấp bậc học sinh (Tập sự, Chuyên cần, Thông thái).")
    p = doc.add_paragraph()
    p.add_run("• Biểu đồ phân bổ theo ngày: ").bold = True
    p.add_run("Theo dõi thời lượng tự học từ Thứ 2 đến Chủ nhật.")
    p = doc.add_paragraph()
    p.add_run("• Biểu đồ mạng nhện Điểm mù (Knowledge Gap): ").bold = True
    p.add_run("Trực quan hóa mức độ nắm vững các môn học. Nhánh môn nào bị lõm vào sẽ là gợi ý trực quan để học sinh và phụ huynh biết cần đầu tư thêm thời gian cho môn đó.")

    doc.add_page_break()

    # ================= CHƯƠNG 8 =================
    p_c8 = doc.add_paragraph()
    r_c8 = p_c8.add_run("CHƯƠNG 8: QUẢN LÝ HỒ SƠ CÁ NHÂN & CÀI ĐẶT MỤC TIÊU")
    r_c8.font.size = Pt(14)
    r_c8.font.bold = True
    r_c8.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Trang Hồ sơ cá nhân cho phép người học xem thông tin định danh, tùy chỉnh khối lớp và thiết lập mục tiêu tự học mỗi ngày."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "09_profile_settings.png"),
        "Hình 9: Màn hình Hồ sơ cá nhân và Cài đặt mục tiêu thời gian học tập mỗi ngày"
    )

    doc.add_paragraph("Các tính năng tùy chỉnh trong Hồ sơ:")
    p = doc.add_paragraph()
    p.add_run("• Thông tin tài khoản: ").bold = True
    p.add_run("Hiển thị họ tên, email, ngày tạo tài khoản và khối lớp hiện tại.")
    p = doc.add_paragraph()
    p.add_run("• Chuyển đổi khối lớp: ").bold = True
    p.add_run("Khi lên lớp mới, học sinh có thể dễ dàng chuyển đổi lớp học từ Lớp 1 đến Lớp 12 mà không mất lịch sử trò chuyện cũ.")
    p = doc.add_paragraph()
    p.add_run("• Thiết lập mục tiêu tự học hàng ngày: ").bold = True
    p.add_run("Đặt mục tiêu số phút học (ví dụ: 30 phút, 45 phút, 60 phút). Hệ thống sẽ căn cứ vào đây để thông báo nhắc nhở.")
    p = doc.add_paragraph()
    p.add_run("• Nút Đăng xuất an toàn: ").bold = True
    p.add_run("Đảm bảo bảo mật tài khoản cá nhân khi sử dụng máy tính công cộng hoặc phòng tin học nhà trường.")

    doc.add_page_break()

    # ================= CHƯƠNG 9 =================
    p_c9 = doc.add_paragraph()
    r_c9 = p_c9.add_run("CHƯƠNG 9: BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN (ADMIN PANEL)")
    r_c9.font.size = Pt(14)
    r_c9.font.bold = True
    r_c9.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Bảng điều khiển Quản trị viên chỉ hiển thị đối với các tài khoản được cấp quyền Admin, "
        "giúp giáo viên quản lý và quản trị viên kỹ thuật giám sát toàn diện hoạt động của hệ thống."
    )

    add_image_with_caption(
        doc,
        os.path.join(base_img_dir, "10_admin_panel.png"),
        "Hình 10: Bảng điều khiển Quản trị hệ thống giám sát hiệu suất RAG và lưu lượng học viên"
    )

    doc.add_paragraph("Các công cụ quản trị cốt lõi:")
    p = doc.add_paragraph()
    p.add_run("• Giám sát hiệu suất RAG & LLM: ").bold = True
    p.add_run("Hiển thị tổng số tài liệu RAG đã nạp (130 tài liệu), tổng số học viên đăng ký (129 học viên) và biểu đồ đường theo dõi lượt sử dụng trong 7 ngày qua.")
    p = doc.add_paragraph()
    p.add_run("• Cấu hình AI: ").bold = True
    p.add_run("Kiểm soát prompt chỉ dẫn phương pháp Socratic, điều chỉnh nhiệt độ sinh văn bản (temperature) và cơ chế định tuyến câu hỏi.")
    p = doc.add_paragraph()
    p.add_run("• Quản lý Kho dữ liệu (RAG): ").bold = True
    p.add_run("Quản lý các tài liệu SGK, chuyên đề học tập và các đoạn trích dữ liệu vector (chunks) trong cơ sở dữ liệu.")
    p = doc.add_paragraph()
    p.add_run("• Quản lý Học viên: ").bold = True
    p.add_run("Theo dõi danh sách học sinh theo từng lớp, kiểm tra trạng thái tài khoản và phân quyền người dùng.")
    p = doc.add_paragraph()
    p.add_run("• Nhật ký lỗi (Error Log): ").bold = True
    p.add_run("Ghi nhận các sự cố kỹ thuật (lỗi tải tệp, lỗi timeout) để kỹ thuật viên xử lý kịp thời.")

    doc.add_page_break()

    # ================= CHƯƠNG 10 =================
    p_c10 = doc.add_paragraph()
    r_c10 = p_c10.add_run("CHƯƠNG 10: BẢNG TỔNG HỢP MẸO & PHÍM TẮT HỌC TẬP HIỆU QUẢ")
    r_c10.font.size = Pt(14)
    r_c10.font.bold = True
    r_c10.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Để đạt được hiệu quả tự học cao nhất cùng Gia Sư Ảo, học sinh và thầy cô có thể tham khảo bảng tổng hợp các mẹo và thao tác thực hành dưới đây:"
    )

    tips_data = [
        ("Gõ công thức Toán / Hóa", "Sử dụng cú pháp LaTeX kẹp giữa cặp dấu $ (ví dụ $x^2 - 4x + 3 = 0$ hoặc $\\Delta_r H^0$). Hệ thống sẽ tự động hiển thị công thức chuẩn mực KaTeX."),
        ("Khai thác gợi ý Socratic", "Không nên chỉ hỏi 'Đáp án câu này là gì?'. Hãy hỏi 'Em chưa hiểu bước biến đổi này' hoặc 'Công thức nào áp dụng cho dạng bài này?' để AI gợi mở tư duy sâu sắc nhất."),
        ("Sử dụng Pomodoro đều đặn", "Bật đồng hồ đếm ngược 25 phút trong Không gian học tập Workspace để rèn luyện sự tập trung cao độ, tránh xao nhãng lướt mạng xã hội khi học bài online."),
        ("Kiểm tra Điểm mù định kỳ", "Mỗi cuối tuần, hãy ghé thăm mục 'Khám phá điểm mù' để xem bộ môn nào đang có lỗ hổng kiến thức và nhờ Gia sư AI sinh thêm 1 bài Quiz trắc nghiệm về phần đó."),
        ("Chế độ Trải nghiệm Khách", "Nếu dùng máy tính mượn của bạn bè, hãy dùng chế độ 'Học thử 30 phút' để trải nghiệm mà không cần để lại thông tin cá nhân trên trình duyệt."),
        ("Đọc sách kết hợp hỏi AI", "Trong Workspace, hãy nhấp vào các nút gợi ý nhanh như 'Tóm tắt nội dung sách' hoặc 'Liệt kê các ý chính' để nắm bắt nhanh dàn ý bài học trước khi đọc chi tiết.")
    ]

    tbl_tips = doc.add_table(rows=len(tips_data) + 1, cols=2)
    tbl_tips.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Header row
    hdr = tbl_tips.rows[0]
    hdr.cells[0].width = Inches(2.2)
    hdr.cells[1].width = Inches(4.0)
    set_cell_background(hdr.cells[0], "1E40AF")
    set_cell_background(hdr.cells[1], "1E40AF")
    
    p0 = hdr.cells[0].paragraphs[0]
    p0.paragraph_format.space_before = Pt(4)
    p0.paragraph_format.space_after = Pt(4)
    r0 = p0.add_run("Thao tác / Kỹ năng")
    r0.bold = True
    r0.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    
    p1 = hdr.cells[1].paragraphs[0]
    p1.paragraph_format.space_before = Pt(4)
    p1.paragraph_format.space_after = Pt(4)
    r1 = p1.add_run("Hướng dẫn thực hành chi tiết")
    r1.bold = True
    r1.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    # Data rows
    for idx, (skill, desc) in enumerate(tips_data):
        row = tbl_tips.rows[idx + 1]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.0)
        set_cell_background(c0, "F8FAFC" if idx % 2 == 1 else "FFFFFF")
        set_cell_background(c1, "F8FAFC" if idx % 2 == 1 else "FFFFFF")
        
        p_c0 = c0.paragraphs[0]
        p_c0.paragraph_format.space_before = Pt(4)
        p_c0.paragraph_format.space_after = Pt(4)
        r_c0 = p_c0.add_run(skill)
        r_c0.bold = True
        r_c0.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
        
        p_c1 = c1.paragraphs[0]
        p_c1.paragraph_format.space_before = Pt(4)
        p_c1.paragraph_format.space_after = Pt(4)
        r_c1 = p_c1.add_run(desc)
        r_c1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_before = Pt(30)
    p_end.paragraph_format.space_after = Pt(10)
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_end = p_end.add_run("--- HẾT TÀI LIỆU HƯỚNG DẪN ---\nChúc các bạn học sinh có những giờ tự học hào hứng và hiệu quả cùng Gia Sư Ảo!")
    r_end.font.size = Pt(11)
    r_end.italic = True
    r_end.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # Save
    out_docx_path = r"c:\Users\Admin\Downloads\All-Project\duan-giasuao\SO_TAY_HUONG_DAN_SU_DUNG_GIA_SU_AO.docx"
    doc.save(out_docx_path)
    print(f"Word document saved successfully to: {out_docx_path}")

if __name__ == "__main__":
    build_word_handbook()
