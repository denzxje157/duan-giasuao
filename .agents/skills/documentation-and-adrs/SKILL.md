---
name: tai-lieu-va-adr
description: Ghi lại các quyết định và tài liệu hướng dẫn. Sử dụng khi đưa ra các quyết định về kiến trúc, thay đổi API công khai, phát hành tính năng hoặc khi bạn cần ghi lại ngữ cảnh mà các kỹ sư và AI trong tương lai sẽ cần để hiểu codebase.
---

# Tài liệu và ADR (Architecture Decision Records)

## Tổng quan

Tài liệu hóa các quyết định, không chỉ là mã nguồn. Tài liệu có giá trị nhất là tài liệu nắm bắt được lý do (*tại sao*) — ngữ cảnh, các ràng buộc và sự đánh đổi (trade-offs) dẫn đến một quyết định. Mã nguồn cho biết cái gì (*what*) đã được xây dựng; tài liệu giải thích *tại sao nó được xây dựng theo cách này* và *những phương án thay thế nào đã được cân nhắc*. Ngữ cảnh này là thiết yếu cho con người và AI trong tương lai khi làm việc trên codebase này.

## Khi nào cần sử dụng

- Đưa ra một quyết định kiến trúc quan trọng.
- Lựa chọn giữa các phương pháp tiếp cận cạnh tranh nhau.
- Thêm hoặc thay đổi một API công khai.
- Phát hành một tính năng làm thay đổi hành vi đối với người dùng.
- Đào tạo (onboarding) các thành viên mới (hoặc AI mới) cho dự án.
- Khi bạn thấy mình phải giải thích cùng một điều lặp đi lặp lại.

**Khi nào KHÔNG nên sử dụng:** Đừng tài liệu hóa những mã nguồn đã quá hiển nhiên. Đừng thêm các comment chỉ để nhắc lại những gì mã nguồn đã thể hiện. Đừng viết tài liệu cho các bản prototype dùng một lần.

## Bản ghi Quyết định Kiến trúc (ADR - Architecture Decision Records)

ADR ghi lại lý luận đằng sau các quyết định kỹ thuật quan trọng. Chúng là loại tài liệu có giá trị nhất mà bạn có thể viết.

### Khi nào cần viết ADR

- Chọn một framework, thư viện hoặc một dependency lớn.
- Thiết kế mô hình dữ liệu hoặc schema cơ sở dữ liệu.
- Lựa chọn chiến lược xác thực (authentication).
- Quyết định kiến trúc API (REST vs. GraphQL vs. tRPC).
- Chọn giữa các công cụ build, nền tảng lưu trữ (hosting) hoặc hạ tầng.
- Bất kỳ quyết định nào mà việc đảo ngược sẽ rất tốn kém.

### Mẫu ADR

Lưu trữ các ADR trong thư mục `docs/decisions/` với số thứ tự tăng dần:

```markdown
# ADR-001: Sử dụng PostgreSQL cho cơ sở dữ liệu chính

## Trạng thái
Đã chấp nhận (Accepted) | Được thay thế bởi ADR-XXX | Đã ngưng sử dụng (Deprecated)

## Ngày
2025-01-15

## Ngữ cảnh
Chúng ta cần một cơ sở dữ liệu chính cho ứng dụng quản lý nhiệm vụ. Các yêu cầu chính:
- Mô hình dữ liệu quan hệ (người dùng, nhiệm vụ, nhóm với các mối quan hệ)
- Giao dịch ACID cho các thay đổi trạng thái nhiệm vụ
- Hỗ trợ tìm kiếm toàn văn (full-text search) cho nội dung nhiệm vụ
- Có dịch vụ lưu trữ được quản lý (cho nhóm nhỏ, năng lực vận hành hạn chế)

## Quyết định
Sử dụng PostgreSQL với Prisma ORM.

## Các phương án đã cân nhắc

### MongoDB
- Ưu điểm: Schema linh hoạt, dễ dàng bắt đầu
- Nhược điểm: Dữ liệu của chúng ta về bản chất là quan hệ; sẽ cần quản lý các mối quan hệ thủ công
- Loại bỏ: Dữ liệu quan hệ trong một kho lưu trữ tài liệu (document store) dẫn đến các lệnh join phức tạp hoặc trùng lặp dữ liệu

### SQLite
- Ưu điểm: Không cần cấu hình, nhúng sẵn, đọc nhanh
- Nhược điểm: Hỗ trợ ghi song song hạn chế, không có dịch vụ lưu trữ quản lý cho production
- Loại bỏ: Không phù hợp cho ứng dụng web đa người dùng trên môi trường production

### MySQL
- Ưu điểm: Trưởng thành, được hỗ trợ rộng rãi
- Nhược điểm: PostgreSQL có hỗ trợ JSON tốt hơn, tìm kiếm toàn văn tốt hơn và các công cụ hệ sinh thái mạnh mẽ hơn
- Loại bỏ: PostgreSQL phù hợp hơn với các yêu cầu tính năng của chúng ta

## Hệ quả
- Prisma cung cấp quyền truy cập cơ sở dữ liệu an toàn về kiểu dữ liệu (type-safe) và quản lý di trú
- Chúng ta có thể dùng tìm kiếm toàn văn của PostgreSQL thay vì thêm Elasticsearch
- Nhóm cần kiến thức về PostgreSQL (kỹ năng phổ biến, rủi ro thấp)
- Lưu trữ trên dịch vụ quản lý (Supabase, Neon, hoặc RDS)
```

### Vòng đời của ADR

```
ĐỀ XUẤT (PROPOSED) → ĐÃ CHẤP NHẬN (ACCEPTED) → (BỊ THAY THẾ hoặc NGƯNG SỬ DỤNG)
```

- **Đừng xóa các ADR cũ.** Chúng lưu giữ ngữ cảnh lịch sử.
- Khi một quyết định thay đổi, hãy viết một ADR mới tham chiếu và thay thế cái cũ.

## Tài liệu Nội dòng (Inline Documentation)

### Khi nào nên Comment

Comment về lý do (*tại sao*), không phải về cái gì (*cái gì*):

```typescript
// TỆ: Nhắc lại mã nguồn
// Tăng biến đếm thêm 1
counter += 1;

// TỐT: Giải thích ý định không hiển nhiên
// Giới hạn tốc độ (Rate limit) sử dụng cửa sổ trượt (sliding window) — reset biến đếm tại biên của cửa sổ,
// chứ không theo lịch trình cố định, để ngăn chặn các cuộc tấn công bùng phát tại biên của cửa sổ
if (now - windowStart > WINDOW_SIZE_MS) {
  counter = 0;
  windowStart = now;
}
```

### Khi nào KHÔNG nên Comment

```typescript
// Đừng comment mã nguồn đã tự giải thích được
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Đừng để lại các comment TODO cho những thứ bạn nên làm ngay lúc này
// TODO: thêm xử lý lỗi  ← Hãy thêm nó luôn đi

// Đừng để lại mã nguồn đã bị comment
// const oldImplementation = () => { ... }  ← Hãy xóa nó đi, git đã có lịch sử rồi
```

### Tài liệu hóa các "Bẫy" (Gotchas) đã biết

```typescript
/**
 * QUAN TRỌNG: Hàm này phải được gọi trước lần render đầu tiên.
 * Nếu gọi sau khi hydration, nó sẽ gây ra hiện tượng nháy nội dung chưa có style (FOUC)
 * vì ngữ cảnh theme không khả dụng trong quá trình SSR.
 *
 * Xem ADR-003 để biết đầy đủ lý do thiết kế.
 */
export function initializeTheme(theme: Theme): void {
  // ...
}
```

## Tài liệu API

Đối với các API công khai (REST, GraphQL, giao diện thư viện):

### Nội dòng với Types (Ưu tiên cho TypeScript)

```typescript
/**
 * Tạo một nhiệm vụ mới.
 *
 * @param input - Dữ liệu tạo nhiệm vụ (tiêu đề là bắt buộc, mô tả là tùy chọn)
 * @returns Nhiệm vụ đã tạo kèm theo ID và dấu thời gian do server tạo ra
 * @throws {ValidationError} Nếu tiêu đề trống hoặc vượt quá 200 ký tự
 * @throws {AuthenticationError} Nếu người dùng chưa được xác thực
 *
 * @example
 * const task = await createTask({ title: 'Mua thực phẩm' });
 * console.log(task.id); // "task_abc123"
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  // ...
}
```

### OpenAPI / Swagger cho REST APIs

```yaml
paths:
  /api/tasks:
    post:
      summary: Tạo một nhiệm vụ
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskInput'
      responses:
        '201':
          description: Đã tạo nhiệm vụ
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '422':
          description: Lỗi xác thực
```

## Cấu trúc README

Mọi dự án nên có một file README bao quát:

```markdown
# Tên Dự án

Mô tả một đoạn văn về những gì dự án này làm.

## Bắt đầu nhanh (Quick Start)
1. Clone repo
2. Cài đặt dependency: `npm install`
3. Thiết lập môi trường: `cp .env.example .env`
4. Chạy dev server: `npm run dev`

## Các lệnh (Commands)
| Lệnh | Mô tả |
|---------|-------------|
| `npm run dev` | Khởi động server phát triển |
| `npm test` | Chạy các bài kiểm thử |
| `npm run build` | Build cho production |
| `npm run lint` | Chạy linter |

## Kiến trúc (Architecture)
Tổng quan ngắn gọn về cấu trúc dự án và các quyết định thiết kế chính.
Liên kết đến các ADR để biết chi tiết.

## Đóng góp (Contributing)
Cách đóng góp, tiêu chuẩn code, quy trình PR.
```

## Bảo trì Changelog

Đối với các tính năng đã phát hành:

```markdown
# Nhật ký thay đổi (Changelog)

## [1.2.0] - 2025-01-20
### Thêm mới (Added)
- Chia sẻ nhiệm vụ: người dùng có thể chia sẻ nhiệm vụ với thành viên nhóm (#123)
- Thông báo qua email khi được phân công nhiệm vụ (#124)

### Đã sửa (Fixed)
- Lỗi trùng lặp nhiệm vụ khi nhấn nút tạo liên tục (#125)

### Thay đổi (Changed)
- Danh sách nhiệm vụ hiện tải 50 mục mỗi trang (trước đây là 20) để có trải nghiệm người dùng tốt hơn (#126)
```

## Tài liệu dành cho AI (Documentation for Agents)

Cân nhắc đặc biệt cho ngữ cảnh của AI:

- **CLAUDE.md / các file quy tắc** — Tài liệu hóa các quy ước dự án để AI tuân theo.
- **Các file đặc tả (Spec)** — Giữ các đặc tả luôn cập nhật để AI xây dựng đúng thứ cần thiết.
- **Các ADR** — Giúp AI hiểu tại sao các quyết định trong quá khứ được đưa ra (ngăn chặn việc quyết định lại từ đầu).
- **Các "bẫy" nội dòng** — Ngăn AI rơi vào các lỗi đã biết.

## Các lý do ngụy biện phổ biến

| Lý do ngụy biện | Thực tế |
|---|---|
| "Mã nguồn đã tự giải thích rồi" | Mã nguồn cho thấy cái gì. Nó không cho thấy tại sao, những phương án nào bị loại bỏ, hay những ràng buộc nào đang áp dụng. |
| "Chúng ta sẽ viết tài liệu khi API ổn định" | API ổn định nhanh hơn khi bạn tài liệu hóa nó. Tài liệu là bài kiểm thử đầu tiên của thiết kế. |
| "Chẳng ai đọc tài liệu đâu" | AI có đọc. Các kỹ sư tương lai có đọc. Và chính bạn của 3 tháng sau cũng sẽ đọc. |
| "ADR là gánh nặng" | Một ADR tốn 10 phút chuẩn bị sẽ ngăn chặn một cuộc tranh luận kéo dài 2 giờ về chính quyết định đó sau sáu tháng. |
| "Comment sẽ bị lỗi thời" | Comment về lý do (*tại sao*) thường rất ổn định. Comment về cái gì (*cái gì*) mới dễ bị lỗi thời — đó là lý do tại sao bạn chỉ nên viết loại đầu tiên. |

## Dấu hiệu cảnh báo (Red Flags)

- Các quyết định kiến trúc không có lý do bằng văn bản.
- Các API công khai không có tài liệu hướng dẫn hoặc kiểu dữ liệu (types).
- File README không giải thích cách chạy dự án.
- Để lại mã nguồn bị comment thay vì xóa bỏ.
- Các comment TODO đã nằm đó hàng tuần liền.
- Không có ADR nào trong một dự án có nhiều lựa chọn kiến trúc quan trọng.
- Tài liệu nhắc lại mã nguồn thay vì giải thích ý định.

## Xác minh

Sau khi tài liệu hóa:

- [ ] ADR đã tồn tại cho mọi quyết định kiến trúc quan trọng.
- [ ] README bao quát các phần bắt đầu nhanh, các lệnh và tổng quan kiến trúc.
- [ ] Các hàm API có tài liệu về tham số và kiểu dữ liệu trả về.
- [ ] Các "bẫy" (gotchas) đã biết được tài liệu hóa nội dòng ở những nơi quan trọng.
- [ ] Không còn mã nguồn bị comment.
- [ ] Các file quy tắc (CLAUDE.md v.v.) hiện tại và chính xác.
