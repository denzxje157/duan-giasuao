---
name: review-code-va-chat-luong
description: Thực hiện đánh giá mã nguồn đa chiều. Sử dụng trước khi merge bất kỳ thay đổi nào. Sử dụng khi review code do chính bạn, một AI khác hoặc con người viết. Sử dụng khi bạn cần đánh giá chất lượng mã nguồn trên nhiều phương diện trước khi đưa vào nhánh chính.
---

# Review Code và Chất lượng

## Tổng quan

Đánh giá mã nguồn đa chiều với các rào cản chất lượng. Mọi thay đổi đều phải được review trước khi merge — không có ngoại lệ. Việc review bao gồm năm trục: tính đúng đắn, tính dễ đọc, kiến trúc, bảo mật và hiệu suất.

**Tiêu chuẩn phê duyệt:** Phê duyệt một thay đổi khi nó chắc chắn cải thiện sức khỏe tổng thể của mã nguồn, ngay cả khi nó chưa hoàn hảo. Mã nguồn hoàn hảo không tồn tại — mục tiêu là sự cải thiện liên tục. Đừng chặn một thay đổi chỉ vì nó không giống hệt cách bạn sẽ viết. Nếu nó cải thiện codebase và tuân thủ các quy ước của dự án, hãy phê duyệt nó.

## Khi nào cần sử dụng

- Trước khi merge bất kỳ PR hoặc thay đổi nào.
- Sau khi hoàn thành triển khai một tính năng.
- Khi một AI hoặc mô hình khác tạo ra mã nguồn mà bạn cần đánh giá.
- Khi tái cấu trúc (refactor) mã nguồn hiện có.
- Sau khi sửa bất kỳ lỗi nào (review cả bản sửa lỗi và bài test hồi quy).

## Đánh giá Năm Trục (The Five-Axis Review)

Mỗi lần review đều đánh giá mã nguồn dựa trên các phương diện sau:

### 1. Tính đúng đắn (Correctness)

Mã nguồn có thực hiện đúng những gì nó tuyên bố không?

- Nó có khớp với đặc tả hoặc yêu cầu nhiệm vụ không?
- Các trường hợp biên (edge cases) đã được xử lý chưa (null, rỗng, giá trị giới hạn)?
- Các luồng lỗi (error paths) đã được xử lý chưa (không chỉ là luồng hoạt động bình thường)?
- Nó có vượt qua tất cả các bài test không? Các bài test có thực sự kiểm tra đúng thứ cần thiết không?
- Có lỗi "off-by-one", tranh chấp (race conditions) hoặc trạng thái không nhất quán không?

### 2. Tính dễ đọc & Sự đơn giản (Readability & Simplicity)

Một kỹ sư khác (hoặc AI khác) có thể hiểu mã nguồn này mà không cần tác giả giải thích không?

- Tên gọi có tính mô tả và nhất quán với quy ước dự án không? (Không dùng `temp`, `data`, `result` mà không có ngữ cảnh)
- Luồng điều khiển có rõ ràng không (tránh ternary lồng nhau, callback quá sâu)?
- Mã nguồn có được tổ chức logic không (mã liên quan được nhóm lại, ranh giới module rõ ràng)?
- Có các mẹo "thông minh" nào cần được đơn giản hóa không?
- **Điều này có thể được thực hiện với ít dòng code hơn không?** (1000 dòng code trong khi 100 dòng là đủ được coi là một thất bại)
- **Các trừu tượng hóa (abstractions) có xứng đáng với độ phức tạp của chúng không?** (Đừng tổng quát hóa cho đến khi có trường hợp sử dụng thứ ba)
- Các bình luận (comment) có giúp làm rõ ý định không rõ ràng không? (Nhưng đừng comment những mã nguồn đã quá hiển nhiên.)
- Có các tàn dư mã chết không: biến không sử dụng (`_unused`), các đoạn mã hỗ trợ tương thích ngược cũ, hoặc các comment `// removed`?

### 3. Kiến trúc (Architecture)

Thay đổi có phù hợp với thiết kế của hệ thống không?

- Nó tuân theo các mô hình hiện có hay giới thiệu một mô hình mới? Nếu mới, nó có lý do chính đáng không?
- Nó có duy trì ranh giới module sạch sẽ không?
- Có sự trùng lặp mã nguồn nào nên được dùng chung không?
- Các dependency có chảy đúng hướng không (không có vòng lặp dependency)?
- Mức độ trừu tượng có phù hợp không (không bị thiết kế quá mức - over-engineered, không quá phụ thuộc lẫn nhau - coupled)?

### 4. Bảo mật (Security)

Để biết hướng dẫn chi tiết về bảo mật, hãy xem `bao-mat-va-gia-co`. Thay đổi có gây ra lỗ hổng không?

- Dữ liệu nhập từ người dùng đã được xác thực và làm sạch chưa?
- Các bí mật (secrets) có được để ngoài mã nguồn, nhật ký và hệ thống quản lý phiên bản không?
- Việc xác thực/phân quyền đã được kiểm tra ở những nơi cần thiết chưa?
- Các truy vấn SQL đã được tham số hóa chưa (không cộng chuỗi)?
- Đầu ra đã được mã hóa để ngăn chặn XSS chưa?
- Các dependency có nguồn gốc đáng tin cậy và không có lỗ hổng bảo mật đã biết không?
- Dữ liệu từ các nguồn bên ngoài (API, nhật ký, nội dung người dùng, tệp cấu hình) có được coi là không đáng tin cậy không?
- Các luồng dữ liệu bên ngoài đã được xác thực tại ranh giới hệ thống trước khi sử dụng trong logic hoặc render chưa?

### 5. Hiệu suất (Performance)

Để biết chi tiết về profiling và tối ưu hóa, hãy xem `toi-uu-hoa-hieu-suat`. Thay đổi có gây ra vấn đề về hiệu suất không?

- Có mô hình truy vấn N+1 không?
- Có vòng lặp không giới hạn hoặc việc lấy dữ liệu không ràng buộc không?
- Có các thao tác đồng bộ nào đáng lẽ nên là bất đồng bộ không?
- Có các lần re-render không cần thiết trong các component UI không?
- Có thiếu phân trang trên các endpoint danh sách không?
- Có các đối tượng lớn nào được tạo ra trong các luồng xử lý quan trọng (hot paths) không?

## Quy mô Thay đổi (Change Sizing)

Các thay đổi nhỏ và tập trung sẽ dễ review hơn, merge nhanh hơn và triển khai an toàn hơn. Hãy nhắm tới các quy mô sau:

```
Thay đổi khoảng 100 dòng  → Tốt. Có thể review trong một lần ngồi.
Thay đổi khoảng 300 dòng  → Chấp nhận được nếu đó là một thay đổi logic duy nhất.
Thay đổi khoảng 1000 dòng → Quá lớn. Hãy chia nhỏ nó ra.
```

**Thế nào được tính là "một thay đổi":** Một sửa đổi độc lập giải quyết một vấn đề duy nhất, bao gồm các bài test liên quan và giữ cho hệ thống hoạt động ổn định sau khi gửi. Một phần của một tính năng — không phải toàn bộ tính năng.

**Chiến lược chia nhỏ khi thay đổi quá lớn:**

| Chiến lược | Cách thực hiện | Khi nào áp dụng |
|----------|-----|------|
| **Xếp chồng (Stack)** | Gửi một thay đổi nhỏ, bắt đầu thay đổi tiếp theo dựa trên nó | Các phụ thuộc tuần tự |
| **Theo nhóm file** | Tách các thay đổi cho các nhóm cần các reviewer khác nhau | Các vấn đề mang tính cắt ngang (cross-cutting) |
| **Ngang (Horizontal)** | Tạo mã dùng chung/stub trước, sau đó mới đến người dùng | Kiến trúc phân tầng |
| **Dọc (Vertical)** | Chia thành các lát cắt full-stack nhỏ hơn của tính năng | Công việc phát triển tính năng |

**Khi các thay đổi lớn có thể chấp nhận được:** Xóa toàn bộ file và tái cấu trúc tự động (automated refactoring) nơi reviewer chỉ cần xác nhận ý định, không phải xem từng dòng.

**Tách biệt việc tái cấu trúc (refactoring) khỏi việc phát triển tính năng.** Một thay đổi vừa refactor mã cũ vừa thêm hành vi mới là hai thay đổi — hãy gửi chúng riêng biệt. Các dọn dẹp nhỏ (đổi tên biến) có thể được bao gồm tùy theo quyết định của reviewer.

## Mô tả Thay đổi (Change Descriptions)

Mọi thay đổi đều cần một mô tả có thể đứng độc lập trong lịch sử quản lý phiên bản.

**Dòng đầu tiên:** Ngắn gọn, ở thể mệnh lệnh, độc lập. "Xóa FizzBuzz RPC" thay vì "Đang xóa FizzBuzz RPC." Phải đủ thông tin để ai đó khi tìm kiếm lịch sử có thể hiểu được thay đổi mà không cần đọc diff.

**Phần thân:** Những gì đang thay đổi và tại sao. Bao gồm ngữ cảnh, quyết định và lý do không hiển thị trong chính mã nguồn. Liên kết đến số ID của lỗi, kết quả benchmark hoặc tài liệu thiết kế nếu có liên quan. Thừa nhận các thiếu sót trong phương pháp tiếp cận nếu có.

**Các anti-pattern:** "Sửa lỗi," "Sửa build," "Thêm bản vá," "Di chuyển code từ A sang B," "Giai đoạn 1," "Thêm các hàm tiện ích."

## Quy trình Review (Review Process)

### Bước 1: Hiểu Ngữ cảnh

Trước khi xem mã nguồn, hãy hiểu ý định:

```
- Thay đổi này đang cố gắng đạt được điều gì?
- Nó triển khai đặc tả hoặc nhiệm vụ nào?
- Hành vi mong đợi sẽ thay đổi như thế nào?
```

### Bước 2: Review các bài Test trước

Các bài test tiết lộ ý định và mức độ bao phủ:

```
- Có bài test nào cho thay đổi này không?
- Chúng có kiểm tra hành vi không (chứ không phải chi tiết triển khai)?
- Các trường hợp biên đã được bao phủ chưa?
- Các bài test có tên gọi mang tính mô tả không?
- Các bài test có bắt được lỗi hồi quy nếu mã nguồn thay đổi không?
```

### Bước 3: Review phần Triển khai

Duyệt qua mã nguồn với năm trục đánh giá trong đầu:

```
Với mỗi file thay đổi:
1. Tính đúng đắn: Mã này có làm đúng những gì bài test nói nó nên làm không?
2. Tính dễ đọc: Tôi có thể hiểu điều này mà không cần trợ giúp không?
3. Kiến trúc: Điều này có phù hợp với hệ thống không?
4. Bảo mật: Có lỗ hổng nào không?
5. Hiệu suất: Có nút thắt cổ chai nào không?
```

### Bước 4: Phân loại các Phát hiện (Categorize Findings)

Dán nhãn cho mọi comment với mức độ nghiêm trọng để tác giả biết điều gì là bắt buộc và điều gì là tùy chọn:

| Tiền tố | Ý nghĩa | Hành động của tác giả |
|--------|---------|---------------|
| *(không tiền tố)* | Thay đổi bắt buộc | Phải giải quyết trước khi merge |
| **Critical:** | Chặn việc merge | Lỗ hổng bảo mật, mất dữ liệu, hỏng chức năng |
| **Nit:** | Lỗi nhỏ, tùy chọn | Tác giả có thể bỏ qua — định dạng, sở thích phong cách |
| **Optional:** / **Consider:** | Gợi ý | Đáng để cân nhắc nhưng không bắt buộc |
| **FYI** | Chỉ mang tính thông tin | Không cần hành động — ngữ cảnh để tham khảo trong tương lai |

Điều này ngăn tác giả coi tất cả các phản hồi đều là bắt buộc và lãng phí thời gian vào các gợi ý tùy chọn.

### Bước 5: Xác minh việc Xác minh

Kiểm tra câu chuyện xác minh của tác giả:

```
- Những bài test nào đã được chạy?
- Build có vượt qua không?
- Thay đổi đã được kiểm tra thủ công chưa?
- Có ảnh chụp màn hình cho các thay đổi UI không?
- Có sự so sánh trước/sau không?
```

## Mô hình Review Đa mô hình (Multi-Model Review Pattern)

Sử dụng các mô hình khác nhau cho các góc nhìn review khác nhau:

```
Model A viết mã nguồn
    │
    ▼
Model B review tính đúng đắn và kiến trúc
    │
    ▼
Model A giải quyết các phản hồi
    │
    ▼
Con người đưa ra quyết định cuối cùng
```

Điều này giúp bắt được các vấn đề mà một mô hình duy nhất có thể bỏ sót — các mô hình khác nhau có các điểm mù khác nhau.

**Ví dụ prompt cho AI review:**
```
Hãy review thay đổi mã nguồn này về tính đúng đắn, bảo mật và sự tuân thủ
các quy ước của dự án chúng tôi. Đặc tả nói [X]. Thay đổi nên là [Y].
Hãy gắn thẻ các vấn đề là Nghiêm trọng (Critical), Quan trọng (Important), hoặc Gợi ý (Suggestion).
```

## Vệ sinh Mã chết (Dead Code Hygiene)

Sau bất kỳ đợt tái cấu trúc hoặc thay đổi triển khai nào, hãy kiểm tra các đoạn mã bị mồ côi:

1. Xác định mã nguồn hiện không thể truy cập hoặc không còn sử dụng.
2. Liệt kê chúng một cách rõ ràng.
3. **Hỏi trước khi xóa:** "Tôi có nên xóa các phần tử hiện không còn sử dụng này không: [danh sách]?"

Đừng để mã chết nằm rải rác — nó làm bối rối những người đọc và các AI trong tương lai. Nhưng đừng âm thầm xóa những thứ bạn không chắc chắn. Khi nghi ngờ, hãy hỏi.

```
MÃ CHẾT ĐƯỢC XÁC ĐỊNH:
- formatLegacyDate() trong src/utils/date.ts — được thay thế bởi formatDate()
- Component OldTaskCard trong src/components/ — được thay thế bởi TaskCard
- Hằng số LEGACY_API_URL trong src/config.ts — không còn tham chiếu nào
→ Có an toàn để xóa những thứ này không?
```

## Tốc độ Review (Review Speed)

Review chậm sẽ chặn toàn bộ các nhóm làm việc. Chi phí chuyển đổi ngữ cảnh để review nhỏ hơn chi phí chờ đợi gây ra cho người khác.

- **Phản hồi trong vòng một ngày làm việc** — đây là mức tối đa, không phải là mục tiêu.
- **Nhịp độ lý tưởng:** Phản hồi ngay sau khi yêu cầu review đến, trừ khi đang tập trung cao độ vào viết code. Một thay đổi thông thường nên hoàn thành nhiều vòng review trong vòng một ngày.
- **Ưu tiên phản hồi nhanh cho từng cá nhân** hơn là việc phê duyệt cuối cùng nhanh chóng. Phản hồi nhanh giúp giảm bớt sự ức chế ngay cả khi cần nhiều vòng review.
- **Các thay đổi lớn:** Hãy yêu cầu tác giả chia nhỏ chúng thay vì review một tập hợp thay đổi khổng lồ.

## Xử lý Bất đồng (Handling Disagreements)

Khi giải quyết các tranh chấp trong review, hãy áp dụng thứ bậc ưu tiên này:

1. **Sự thật kỹ thuật và dữ liệu** ghi đè ý kiến và sở thích cá nhân.
2. **Hướng dẫn phong cách (Style guides)** là thẩm quyền tuyệt đối về các vấn đề phong cách.
3. **Thiết kế phần mềm** phải được đánh giá dựa trên các nguyên tắc kỹ thuật, không phải sở thích cá nhân.
4. **Sự nhất quán của codebase** là chấp nhận được nếu nó không làm giảm sức khỏe tổng thể.

**Đừng chấp nhận câu "Tôi sẽ dọn dẹp sau."** Kinh nghiệm cho thấy việc dọn dẹp bị trì hoãn hiếm khi xảy ra. Hãy yêu cầu dọn dẹp trước khi gửi, trừ khi đó là tình huống khẩn cấp thực sự. Nếu các vấn đề xung quanh không thể được giải quyết trong thay đổi này, hãy yêu cầu tạo một task/bug và tự phân công xử lý.

## Tính trung thực trong Review (Honesty in Review)

Khi review mã nguồn — dù là do bạn, một AI khác hoặc con người viết:

- **Đừng "đóng dấu" bừa bãi (rubber-stamp).** "LGTM" (trông có vẻ ổn) mà không có bằng chứng review thực tế chẳng giúp ích gì cho ai.
- **Đừng giảm nhẹ các vấn đề thực sự.** "Đây có lẽ là một mối quan tâm nhỏ" trong khi đó là một lỗi sẽ ảnh hưởng đến production là không trung thực.
- **Định lượng các vấn đề khi có thể.** "Truy vấn N+1 này sẽ thêm ~50ms cho mỗi mục trong danh sách" sẽ tốt hơn là nói "cái này có thể chậm."
- **Phản đối các phương pháp tiếp cận có vấn đề rõ ràng.** Sự nịnh bợ là một kiểu thất bại trong review. Nếu việc triển khai có vấn đề, hãy nói thẳng và đề xuất các giải pháp thay thế.
- **Chấp nhận sự ghi đè một cách nhã nhặn.** Nếu tác giả có đầy đủ ngữ cảnh và không đồng ý, hãy tôn trọng phán quyết của họ. Hãy comment vào mã nguồn, không phải con người — hãy điều chỉnh các phê bình cá nhân để tập trung vào chính mã nguồn.

## Kỷ luật về Dependency (Dependency Discipline)

Một phần của review mã nguồn là review các dependency:

**Trước khi thêm bất kỳ dependency nào:**
1. Stack hiện tại có giải quyết được vấn đề này không? (Thường là có.)
2. Dependency lớn mức nào? (Kiểm tra tác động đến bundle.)
3. Nó có được bảo trì tích cực không? (Kiểm tra commit cuối, các vấn đề đang mở.)
4. Nó có lỗ hổng bảo mật nào đã biết không? (`npm audit`)
5. Giấy phép (license) là gì? (Phải tương thích với dự án.)

**Quy tắc:** Ưu tiên thư viện chuẩn và các tiện ích hiện có hơn là các dependency mới. Mỗi dependency là một trách nhiệm pháp lý.

## Danh sách Kiểm tra Review (The Review Checklist)

```markdown
## Review: [Tiêu đề PR/Thay đổi]

### Ngữ cảnh
- [ ] Tôi hiểu thay đổi này làm gì và tại sao

### Tính đúng đắn (Correctness)
- [ ] Thay đổi khớp với yêu cầu đặc tả/nhiệm vụ
- [ ] Các trường hợp biên đã được xử lý
- [ ] Các luồng lỗi đã được xử lý
- [ ] Các bài test bao phủ đầy đủ thay đổi

### Tính dễ đọc (Readability)
- [ ] Tên gọi rõ ràng và nhất quán
- [ ] Logic dễ hiểu
- [ ] Không có độ phức tạp không cần thiết

### Kiến trúc (Architecture)
- [ ] Tuân theo các mô hình hiện có
- [ ] Không có sự phụ thuộc hoặc kết nối không cần thiết
- [ ] Mức độ trừu tượng phù hợp

### Bảo mật (Security)
- [ ] Không có bí mật trong mã nguồn
- [ ] Dữ liệu nhập được xác thực tại ranh giới
- [ ] Không có lỗ hổng tiêm mã (injection)
- [ ] Các bước kiểm tra xác thực/phân quyền đã sẵn sàng
- [ ] Các nguồn dữ liệu bên ngoài được coi là không đáng tin cậy

### Hiệu suất (Performance)
- [ ] Không có mô hình N+1
- [ ] Không có các thao tác không giới hạn
- [ ] Có phân trang trên các endpoint danh sách

### Xác minh (Verification)
- [ ] Các bài test vượt qua
- [ ] Build thành công
- [ ] Đã xác minh thủ công (nếu áp dụng)

### Phán quyết (Verdict)
- [ ] **Approve** — Sẵn sàng để merge
- [ ] **Request changes** — Các vấn đề phải được giải quyết
```

## Xem thêm (See Also)

- Để biết hướng dẫn review bảo mật chi tiết, hãy xem `references/security-checklist.md`
- Để biết các bước kiểm tra hiệu suất, hãy xem `references/performance-checklist.md`

## Các lý do ngụy biện phổ biến

| Lý do ngụy biện | Thực tế |
|---|---|
| "Nó hoạt động là đủ tốt rồi" | Mã hoạt động được nhưng khó đọc, không an toàn hoặc sai kiến trúc sẽ tạo ra nợ kỹ thuật tích tụ. |
| "Tôi viết nên tôi biết nó đúng" | Tác giả thường mù quáng trước những giả định của chính mình. Mọi thay đổi đều có lợi từ một góc nhìn khác. |
| "Chúng ta sẽ dọn dẹp sau" | "Sau này" không bao giờ đến. Việc review chính là rào cản chất lượng — hãy sử dụng nó. Yêu cầu dọn dẹp trước khi merge, không phải sau đó. |
| "Mã do AI tạo ra chắc là ổn rồi" | Mã AI cần được xem xét kỹ lưỡng hơn, không phải ít hơn. Nó rất tự tin và có vẻ hợp lý, ngay cả khi sai. |
| "Các bài test vượt qua nên nó ổn" | Test là cần thiết nhưng chưa đủ. Chúng không bắt được các vấn đề kiến trúc, bảo mật hay tính dễ đọc. |

## Dấu hiệu cảnh báo (Red Flags)

- Các PR được merge mà không qua bất kỳ sự review nào.
- Review chỉ kiểm tra xem các bài test có vượt qua hay không (bỏ qua các trục khác).
- "LGTM" mà không có bằng chứng review thực tế.
- Các thay đổi nhạy cảm về bảo mật mà không có sự review tập trung vào bảo mật.
- Các PR lớn "quá to để review tử tế" (hãy chia nhỏ chúng).
- Không có bài test hồi quy cho các PR sửa lỗi.
- Các comment review không có nhãn mức độ nghiêm trọng — làm không rõ ràng điều gì là bắt buộc và điều gì là tùy chọn.
- Chấp nhận câu "Tôi sẽ sửa sau" — điều đó không bao giờ xảy ra.

## Xác minh

Sau khi hoàn thành review:

- [ ] Mọi vấn đề Nghiêm trọng (Critical) đều đã được giải quyết.
- [ ] Mọi vấn đề Quan trọng (Important) đều đã được giải quyết hoặc trì hoãn rõ ràng với lý do chính đáng.
- [ ] Các bài test vượt qua.
- [ ] Build thành công.
- [ ] Câu chuyện xác minh được ghi lại (những gì đã thay đổi, cách nó được xác minh).
