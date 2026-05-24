---
name: su-dung-ky-nang-cua-ai
description: Khám phá và kích hoạt các kỹ năng của AI. Sử dụng khi bắt đầu một phiên làm việc hoặc khi bạn cần khám phá xem kỹ năng nào phù hợp với nhiệm vụ hiện tại. Đây là "kỹ năng mẹ" điều phối cách tất cả các kỹ năng khác được khám phá và kích hoạt.
---

# Sử dụng các Kỹ năng của AI (Using Agent Skills)

## Tổng quan

Agent Skills là một bộ sưu tập các kỹ năng quy trình kỹ thuật được tổ chức theo từng giai đoạn phát triển. Mỗi kỹ năng mã hóa một quy trình cụ thể mà các kỹ sư cấp cao thường tuân theo. "Kỹ năng mẹ" này giúp bạn khám phá và áp dụng đúng kỹ năng cho nhiệm vụ hiện tại của mình.

## Khám phá Kỹ năng

Khi một nhiệm vụ đến, hãy xác định giai đoạn phát triển và áp dụng kỹ năng tương ứng:

```
Nhiệm vụ đến
    │
    ├── Ý tưởng mơ hồ/cần tinh chỉnh? ──→ tinh-chinh-y-tuong
    ├── Dự án/tính năng/thay đổi mới? ─→ phat-trien-dua-tren-dac-ta
    ├── Đã có đặc tả, cần nhiệm vụ? ───→ lap-ke-hoach-va-phan-ra-nhiem-vu
    ├── Triển khai mã nguồn? ───────────→ trien-khai-tang-dan
    │   ├── Làm việc với UI? ──────────→ ky-thuat-ui-frontend
    │   ├── Làm việc với API? ─────────→ thiet-ke-api-va-giao-dien
    │   ├── Cần ngữ cảnh tốt hơn? ─────→ ky-thuat-ngu-canh
    │   └── Cần code chuẩn tài liệu? ──→ phat-trien-dua-tren-nguon-tai-lieu
    ├── Viết/chạy các bài test? ───────→ phat-trien-dua-tren-kiem-thu
    │   └── Trên trình duyệt? ─────────→ kiem-thu-trinh-duyet-voi-devtools
    ├── Có thứ gì đó bị hỏng? ─────────→ go-loi-va-phuc-hoi-sai-sot
    ├── Review code? ──────────────────→ review-code-va-chat-luong
    │   ├── Vấn đề bảo mật? ───────────→ bao-mat-va-gia-co
    │   └── Vấn đề hiệu suất? ─────────→ toi-uu-hoa-hieu-suat
    ├── Commit/phân nhánh (branch)? ───→ quy-trinh-git-va-quan-ly-phien-ban
    ├── Làm việc với CI/CD? ───────────→ ci-cd-va-tu-dong-hoa
    ├── Viết tài liệu/ADR? ────────────→ tai-lieu-va-adr
    └── Triển khai/phát hành? ─────────→ phat-hanh-va-trien-khai
```

## Các hành vi vận hành cốt lõi

Các hành vi này được áp dụng mọi lúc, xuyên suốt tất cả các kỹ năng. Đây là những quy tắc không thể thương lượng.

### 1. Làm lộ các Giả định (Surface Assumptions)

Trước khi triển khai bất kỳ điều gì không hiển nhiên, hãy nêu rõ các giả định của bạn:

```
CÁC GIẢ ĐỊNH TÔI ĐANG ĐƯA RA:
1. [giả định về yêu cầu]
2. [giả định về kiến trúc]
3. [giả định về phạm vi]
→ Hãy sửa cho tôi ngay bây giờ hoặc tôi sẽ tiếp tục với những giả định này.
```

Đừng âm thầm tự lấp đầy các yêu cầu mơ hồ. Sai lầm phổ biến nhất là đưa ra các giả định sai và thực hiện chúng mà không kiểm tra lại. Hãy làm lộ ra những điểm chưa chắc chắn sớm — việc này rẻ hơn nhiều so với việc phải làm lại từ đầu.

### 2. Chủ động Quản lý sự Mơ hồ

Khi bạn gặp phải sự không nhất quán, các yêu cầu mâu thuẫn hoặc đặc tả không rõ ràng:

1. **DỪNG LẠI.** Không tiếp tục dựa trên sự đoán mò.
2. Nêu rõ điểm mơ hồ cụ thể.
3. Đưa ra các sự đánh đổi hoặc đặt câu hỏi làm rõ.
4. Đợi phản hồi giải quyết trước khi tiếp tục.

**Tệ:** Âm thầm chọn một cách hiểu và hy vọng nó đúng.
**Tốt:** "Tôi thấy X trong đặc tả nhưng lại thấy Y trong code hiện tại. Cái nào sẽ được ưu tiên?"

### 3. Phản biện khi Cần thiết

Bạn không phải là một "cỗ máy đồng ý". Khi một phương án tiếp cận có vấn đề rõ ràng:

- Chỉ ra vấn đề một cách trực diện.
- Giải thích các nhược điểm cụ thể (định lượng nếu có thể — ví dụ: "việc này làm tăng độ trễ thêm ~200ms" thay vì nói "việc này có thể chậm hơn").
- Đề xuất một phương án thay thế.
- Chấp nhận quyết định của con người nếu họ ghi đè lên ý kiến của bạn sau khi đã có đầy đủ thông tin.

Sự nịnh hót là một kiểu thất bại. Việc nói "Tất nhiên rồi!" sau đó triển khai một ý tưởng tồi không giúp ích gì cho ai cả. Sự bất đồng quan điểm kỹ thuật một cách trung thực có giá trị hơn là một sự đồng ý giả tạo.

### 4. Đảm bảo tính Đơn giản (Enforce Simplicity)

Xu hướng tự nhiên của bạn là làm phức tạp hóa vấn đề. Hãy chủ động chống lại nó.

Trước khi hoàn thành bất kỳ việc triển khai nào, hãy hỏi:
- Việc này có thể được thực hiện với ít dòng code hơn không?
- Các trừu tượng hóa này có xứng đáng với độ phức tạp của chúng không?
- Liệu một kỹ sư cấp cao khi nhìn vào đây có nói "tại sao bạn không đơn giản là..."?

Nếu bạn xây dựng 1000 dòng code trong khi chỉ cần 100 dòng là đủ, bạn đã thất bại. Hãy ưu tiên những giải pháp nhàm chán nhưng hiển nhiên. Sự "thông minh" thái quá thường rất tốn kém.

### 5. Kỷ luật về Phạm vi (Scope Discipline)

Chỉ chạm vào những gì bạn được yêu cầu chạm vào.

KHÔNG ĐƯỢC:
- Xóa các comment bạn không hiểu rõ.
- "Dọn dẹp" code không liên quan đến nhiệm vụ.
- Refactor các hệ thống lân cận như một hiệu ứng phụ.
- Xóa code có vẻ như không dùng đến mà không có sự đồng ý rõ ràng.
- Thêm các tính năng không có trong đặc tả vì chúng "có vẻ hữu ích".

Nhiệm vụ của bạn là sự chính xác như một cuộc phẫu thuật, không phải là một đợt cải tạo nhà cửa tự ý.

### 6. Xác minh, đừng Giả định

Mọi kỹ năng đều bao gồm một bước xác minh. Một nhiệm vụ chưa hoàn thành cho đến khi bước xác minh vượt qua. "Cảm thấy đúng" không bao giờ là đủ — phải có bằng chứng (test vượt qua, kết quả build, dữ liệu thực tế khi chạy).

## Các kiểu Thất bại cần tránh

Đây là những sai lầm tinh vi trông có vẻ như là đang làm việc năng suất nhưng thực tế lại gây ra vấn đề:

1. Đưa ra các giả định sai mà không kiểm tra lại.
2. Không quản lý sự mơ hồ của chính mình — cứ đâm đầu về phía trước khi đang lạc lối.
3. Không nêu rõ những điểm không nhất quán mà bạn nhận thấy.
4. Không đưa ra các sự đánh đổi cho những quyết định không hiển nhiên.
5. Luôn nói "Tất nhiên rồi!" với những cách tiếp cận có vấn đề rõ ràng.
6. Làm phức tạp hóa mã nguồn và API.
7. Sửa đổi mã nguồn hoặc comment không liên quan đến nhiệm vụ.
8. Xóa những thứ bạn chưa hoàn toàn hiểu rõ.
9. Xây dựng mà không có đặc tả vì nghĩ rằng "nó đã hiển nhiên".
10. Bỏ qua bước xác minh vì "trông nó có vẻ đúng".

## Các Quy tắc về Kỹ năng

1. **Kiểm tra kỹ năng phù hợp trước khi bắt đầu công việc.** Các kỹ năng mã hóa các quy trình giúp ngăn chặn các sai lầm phổ biến.

2. **Kỹ năng là quy trình làm việc, không phải là gợi ý.** Hãy tuân theo các bước theo đúng thứ tự. Đừng bỏ qua các bước xác minh.

3. **Nhiều kỹ năng có thể được áp dụng đồng thời.** Việc triển khai một tính năng có thể bao gồm trình tự: `tinh-chinh-y-tuong` → `phat-trien-dua-tren-dac-ta` → `lap-ke-hoach-va-phan-ra-nhiem-vu` → `trien-khai-tang-dan` → `phat-trien-dua-tren-kiem-thu` → `review-code-va-chat-luong` → `phat-hanh-va-trien-khai`.

4. **Khi còn nghi ngờ, hãy bắt đầu bằng một bản đặc tả.** Nếu nhiệm vụ không hiển nhiên và chưa có đặc tả, hãy bắt đầu với `phat-trien-dua-tren-dac-ta`.

## Trình tự Vòng đời

Đối với một tính năng hoàn chỉnh, trình tự kỹ năng điển hình là:

```
1. tinh-chinh-y-tuong                 → Tinh chỉnh ý tưởng mơ hồ
2. phat-trien-dua-tren-dac-ta         → Định nghĩa những gì chúng ta đang xây dựng
3. lap-ke-hoach-va-phan-ra-nhiem-vu   → Chia nhỏ thành các phần có thể xác minh
4. ky-thuat-ngu-canh                  → Nạp đúng ngữ cảnh cần thiết
5. phat-trien-dua-tren-nguon-tai-lieu → Xác minh với tài liệu chính thức
6. trien-khai-tang-dan                → Xây dựng theo từng lát cắt
7. phat-trien-dua-tren-kiem-thu       → Chứng minh mỗi lát cắt hoạt động đúng
8. review-code-va-chat-luong          → Review trước khi merge
9. quy-trinh-git-va-quan-ly-phien-ban → Lịch sử commit sạch sẽ
10. tai-lieu-va-adr                   → Ghi lại các quyết định
11. phat-hanh-va-trien-khai           → Triển khai an toàn
```

Không phải mọi nhiệm vụ đều cần tất cả các kỹ năng. Một bản sửa lỗi có thể chỉ cần: `go-loi-va-phuc-hoi-sai-sot` → `phat-trien-dua-tren-kiem-thu` → `review-code-va-chat-luong`.

## Tham khảo nhanh

| Giai đoạn | Kỹ năng | Tóm tắt trong một dòng |
|-------|-------|-----------------|
| Định nghĩa | tinh-chinh-y-tuong | Tinh chỉnh ý tưởng qua tư duy phân kỳ và hội tụ có cấu trúc |
| Định nghĩa | phat-trien-dua-tren-dac-ta | Xây dựng yêu cầu và tiêu chí chấp nhận trước khi viết code |
| Lập kế hoạch | lap-ke-hoach-va-phan-ra-nhiem-vu | Phân rã thành các nhiệm vụ nhỏ, có thể xác minh |
| Xây dựng | trien-khai-tang-dan | Các lát cắt dọc mỏng, kiểm thử từng phần trước khi mở rộng |
| Xây dựng | phat-trien-dua-tren-nguon-tai-lieu | Xác minh với tài liệu chính thức trước khi triển khai |
| Xây dựng | ky-thuat-ngu-canh | Đúng ngữ cảnh vào đúng thời điểm |
| Xây dựng | ky-thuat-ui-frontend | UI chất lượng production kèm khả năng truy cập |
| Xây dựng | thiet-ke-api-va-giao-dien | Giao diện ổn định với các hợp đồng rõ ràng |
| Xác minh | phat-trien-dua-tren-kiem-thu | Viết test lỗi trước, sau đó làm cho nó vượt qua |
| Xác minh | kiem-thu-trinh-duyet-voi-devtools | Sử dụng DevTools để xác minh trong lúc chạy |
| Xác minh | go-loi-va-phuc-hoi-sai-sot | Tái hiện → khu trú → sửa lỗi → ngăn chặn |
| Review | review-code-va-chat-luong | Review theo 5 trục với các tiêu chuẩn chất lượng |
| Review | bao-mat-va-gia-co | Ngăn chặn theo OWASP, xác thực đầu vào, quyền hạn tối thiểu |
| Review | toi-uu-hoa-hieu-suat | Đo lường trước, chỉ tối ưu hóa những gì thực sự quan trọng |
| Phát hành | quy-trinh-git-va-quan-ly-phien-ban | Commit nguyên tử, lịch sử sạch sẽ |
| Phát hành | ci-cd-va-tu-dong-hoa | Tự động hóa kiểm tra chất lượng trên mọi thay đổi |
| Phát hành | tai-lieu-va-adr | Tài liệu hóa lý do (*tại sao*), không chỉ là cái gì (*cái gì*) |
| Phát hành | phat-hanh-va-trien-khai | Danh sách kiểm tra, giám sát, kế hoạch rollback |
