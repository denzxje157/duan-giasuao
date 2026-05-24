---
name: don-gian-hoa-ma-nguon
description: Đơn giản hóa mã nguồn để làm rõ ràng hơn. Sử dụng khi tái cấu trúc mã nguồn để làm rõ ý nghĩa mà không thay đổi hành vi. Sử dụng khi mã hoạt động nhưng khó đọc, bảo trì hoặc mở rộng hơn mức cần thiết. Sử dụng khi review mã nguồn đã tích tụ những độ phức tạp không cần thiết.
---

# Đơn giản hóa Mã nguồn

> Được truyền cảm hứng bởi [Claude Code Simplifier plugin](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md). Được điều chỉnh ở đây như một kỹ năng dựa trên quy trình, không phụ thuộc vào mô hình cho bất kỳ AI coding agent nào.

## Tổng quan

Đơn giản hóa mã nguồn bằng cách giảm độ phức tạp trong khi vẫn giữ nguyên chính xác hành vi. Mục tiêu không phải là viết ít dòng code hơn — mà là tạo ra mã nguồn dễ đọc, dễ hiểu, dễ sửa đổi và dễ gỡ lỗi hơn. Mọi sự đơn giản hóa phải vượt qua một bài kiểm tra đơn giản: "Liệu một thành viên mới trong nhóm có hiểu điều này nhanh hơn bản gốc không?"

## Khi nào cần sử dụng

- Sau khi một tính năng đã hoạt động và các bài test đã vượt qua, nhưng phần triển khai cảm thấy nặng nề hơn mức cần thiết.
- Trong quá trình review code khi các vấn đề về tính dễ đọc hoặc độ phức tạp được gắn thẻ (flag).
- Khi bạn gặp phải logic lồng nhau quá sâu, các hàm quá dài hoặc tên gọi không rõ ràng.
- Khi tái cấu trúc mã nguồn được viết dưới áp lực thời gian.
- Khi hợp nhất các logic liên quan bị phân tán ở nhiều file.
- Sau khi merge các thay đổi gây ra sự trùng lặp hoặc không nhất quán.

**Khi nào KHÔNG nên sử dụng:**

- Mã nguồn đã sạch sẽ và dễ đọc — đừng đơn giản hóa chỉ để cho có.
- Bạn chưa hiểu mã đó làm gì — hãy hiểu trước khi đơn giản hóa.
- Mã nguồn yêu cầu khắt khe về hiệu suất và phiên bản "đơn giản hơn" sẽ chậm hơn một cách đáng kể.
- Bạn sắp sửa viết lại toàn bộ module — việc đơn giản hóa mã nguồn sắp bỏ đi là lãng phí công sức.

## Năm Nguyên tắc

### 1. Giữ nguyên hành vi tuyệt đối (Preserve Behavior Exactly)

Đừng thay đổi những gì mã nguồn làm — chỉ thay đổi cách nó diễn đạt điều đó. Tất cả đầu vào, đầu ra, hiệu ứng phụ (side effects), hành vi lỗi và các trường hợp biên phải được giữ nguyên. Nếu bạn không chắc một sự đơn giản hóa có giữ nguyên hành vi hay không, đừng thực hiện nó.

```
HỎI TRƯỚC MỖI THAY ĐỔI:
→ Điều này có tạo ra cùng một đầu ra cho mọi đầu vào không?
→ Điều này có duy trì cùng một hành vi lỗi không?
→ Điều này có giữ nguyên các hiệu ứng phụ và thứ tự xử lý không?
→ Tất cả các bài test hiện tại vẫn vượt qua mà không cần sửa đổi chứ?
```

### 2. Tuân thủ Quy ước Dự án (Follow Project Conventions)

Đơn giản hóa có nghĩa là làm cho mã nguồn nhất quán hơn với codebase hiện tại, chứ không phải áp đặt sở thích cá nhân từ bên ngoài. Trước khi đơn giản hóa:

```
1. Đọc CLAUDE.md / các quy ước dự án
2. Nghiên cứu cách các mã nguồn lân cận xử lý các mô hình tương tự
3. Khớp với phong cách của dự án về:
   - Thứ tự import và hệ thống module
   - Phong cách khai báo hàm
   - Quy ước đặt tên
   - Mô hình xử lý lỗi
   - Độ chi tiết của chú thích kiểu dữ liệu (type annotation)
```

Sự đơn giản hóa làm hỏng tính nhất quán của dự án không phải là đơn giản hóa — đó là sự xáo trộn (churn).

### 3. Ưu tiên Sự rõ ràng hơn là Sự "thông minh" (Prefer Clarity Over Cleverness)

Mã nguồn rõ ràng (explicit) tốt hơn mã nguồn súc tích (compact) khi phiên bản súc tích yêu cầu người đọc phải dừng lại suy nghĩ để phân tích.

```typescript
// KHÔNG RÕ RÀNG: Chuỗi ternary dày đặc
const label = isNew ? 'New' : isUpdated ? 'Updated' : isArchived ? 'Archived' : 'Active';

// RÕ RÀNG: Ánh xạ dễ đọc
function getStatusLabel(item: Item): string {
  if (item.isNew) return 'New';
  if (item.isUpdated) return 'Updated';
  if (item.isArchived) return 'Archived';
  return 'Active';
}
```

```typescript
// KHÔNG RÕ RÀNG: Chuỗi reduce kèm logic nội dòng
const result = items.reduce((acc, item) => ({
  ...acc,
  [item.id]: { ...acc[item.id], count: (acc[item.id]?.count ?? 0) + 1 }
}), {});

// RÕ RÀNG: Các bước trung gian có tên gọi rõ ràng
const countById = new Map<string, number>();
for (const item of items) {
  countById.set(item.id, (countById.get(item.id) ?? 0) + 1);
}
```

### 4. Giữ sự cân bằng (Maintain Balance)

Đơn giản hóa có một kiểu thất bại: đơn giản hóa quá mức. Hãy cảnh giác với những cái bẫy sau:

- **Inlining quá mức** — việc xóa một hàm trợ giúp (helper) vốn dùng để đặt tên cho một khái niệm sẽ làm cho nơi gọi hàm đó khó đọc hơn.
- **Kết hợp các logic không liên quan** — hai hàm đơn giản được gộp thành một hàm phức tạp thì không hề đơn giản hơn.
- **Xóa bỏ các trừu tượng hóa "không cần thiết"** — một số trừu tượng hóa tồn tại vì khả năng mở rộng hoặc khả năng kiểm thử, chứ không phải vì độ phức tạp.
- **Tối ưu hóa số lượng dòng code** — ít dòng hơn không phải là mục tiêu; mục tiêu là dễ hiểu hơn.

### 5. Giới hạn trong Phạm vi Thay đổi (Scope to What Changed)

Mặc định là đơn giản hóa mã nguồn vừa được sửa đổi gần đây. Tránh việc tái cấu trúc "tiện tay" các đoạn mã không liên quan trừ khi được yêu cầu rõ ràng để mở rộng phạm vi. Việc đơn giản hóa không giới hạn phạm vi sẽ tạo ra nhiễu trong diff và rủi ro gây ra các lỗi hồi quy không mong muốn.

## Quy trình Đơn giản hóa

### Bước 1: Hiểu trước khi Chạm vào (Hàng rào của Chesterton - Chesterton's Fence)

Trước khi thay đổi hoặc xóa bỏ bất cứ thứ gì, hãy hiểu tại sao nó tồn tại. Đây là nguyên lý Hàng rào của Chesterton: nếu bạn thấy một hàng rào chắn ngang đường và không hiểu tại sao nó ở đó, đừng phá nó đi. Đầu tiên hãy hiểu lý do, sau đó mới quyết định xem lý do đó còn áp dụng được hay không.

```
TRƯỚC KHI ĐƠN GIẢN HÓA, HÃY TRẢ LỜI:
- Trách nhiệm của đoạn mã này là gì?
- Cái gì gọi nó? Nó gọi cái gì?
- Các trường hợp biên và luồng lỗi là gì?
- Có các bài test định nghĩa hành vi mong đợi không?
- Tại sao nó có thể đã được viết theo cách này? (Hiệu suất? Ràng buộc nền tảng? Lý do lịch sử?)
- Kiểm tra git blame: ngữ cảnh ban đầu của đoạn mã này là gì?
```

Nếu bạn không thể trả lời những câu hỏi này, bạn chưa sẵn sàng để đơn giản hóa. Hãy đọc thêm ngữ cảnh trước.

### Bước 2: Xác định các cơ hội Đơn giản hóa

Quét các mô hình sau — mỗi cái là một tín hiệu cụ thể, không phải là một cảm giác mơ hồ:

**Độ phức tạp về cấu trúc:**

| Mô hình | Tín hiệu | Đơn giản hóa |
|---------|--------|----------------|
| Lồng nhau quá sâu (3+ cấp) | Luồng điều khiển khó theo dõi | Trích xuất các điều kiện thành guard clauses hoặc hàm trợ giúp |
| Hàm quá dài (50+ dòng) | Đảm nhận quá nhiều trách nhiệm | Chia nhỏ thành các hàm tập trung với tên gọi mô tả |
| Ternary lồng nhau | Đòi hỏi bộ nhớ đệm tâm trí để phân tích | Thay thế bằng chuỗi if/else, switch, hoặc các đối tượng tra cứu (lookup objects) |
| Các flag tham số kiểu boolean | `doThing(true, false, true)` | Thay thế bằng các đối tượng options hoặc các hàm riêng biệt |
| Các điều kiện lặp lại | Cùng một kiểm tra `if` ở nhiều nơi | Trích xuất thành một hàm dự đoán (predicate function) được đặt tên tốt |

**Đặt tên và tính dễ đọc:**

| Mô hình | Tín hiệu | Đơn giản hóa |
|---------|--------|----------------|
| Tên chung chung | `data`, `result`, `temp`, `val`, `item` | Đổi tên để mô tả nội dung: `userProfile`, `validationErrors` |
| Tên viết tắt | `usr`, `cfg`, `btn`, `evt` | Sử dụng từ đầy đủ trừ khi chữ viết tắt là phổ biến (`id`, `url`, `api`) |
| Tên gây hiểu lầm | Hàm tên là `get` nhưng lại thay đổi trạng thái | Đổi tên để phản ánh hành vi thực tế |
| Comment giải thích "cái gì" | `// tăng biến đếm` phía trên `count++` | Xóa comment đó — mã nguồn đã đủ rõ ràng |
| Comment giải thích "tại sao" | `// Thử lại vì API không ổn định khi tải nặng` | Giữ lại những comment này — chúng mang ý định mà mã nguồn không thể diễn tả |

**Sự dư thừa:**

| Mô hình | Tín hiệu | Đơn giản hóa |
|---------|--------|----------------|
| Logic trùng lặp | Cùng 5+ dòng code ở nhiều nơi | Trích xuất thành một hàm dùng chung |
| Mã chết (Dead code) | Các nhánh không thể truy cập, biến không dùng, các khối code bị comment | Loại bỏ (sau khi xác nhận nó thực sự là mã chết) |
| Trừu tượng hóa không cần thiết | Một wrapper không thêm giá trị gì | Inline wrapper đó, gọi trực tiếp hàm bên dưới |
| Các pattern bị quá đà | Factory-cho-một-factory, strategy-với-một-strategy | Thay thế bằng cách tiếp cận trực tiếp đơn giản |
| Các khẳng định kiểu dữ liệu thừa | Ép kiểu cho một thứ đã được suy luận sẵn | Loại bỏ khẳng định đó |

### Bước 3: Áp dụng thay đổi dần dần

Thực hiện từng sự đơn giản hóa một. Chạy test sau mỗi thay đổi. **Gửi các thay đổi tái cấu trúc riêng biệt với các thay đổi tính năng hoặc sửa lỗi.** Một PR vừa refactor vừa thêm tính năng là hai PR — hãy tách chúng ra.

```
VỚI MỖI SỰ ĐƠN GIẢN HÓA:
1. Thực hiện thay đổi
2. Chạy bộ test
3. Nếu test vượt qua → commit (hoặc tiếp tục sự đơn giản hóa tiếp theo)
4. Nếu test thất bại → revert và xem xét lại
```

Tránh việc gom nhiều sự đơn giản hóa vào một thay đổi duy nhất chưa qua kiểm thử. Nếu có gì đó hỏng, bạn cần biết sự đơn giản hóa nào đã gây ra nó.

**Quy tắc 500:** Nếu một đợt tái cấu trúc chạm đến hơn 500 dòng code, hãy đầu tư vào tự động hóa (codemods, sed scripts, AST transforms) thay vì thực hiện thủ công. Các chỉnh sửa thủ công ở quy mô đó rất dễ gây lỗi và gây kiệt sức khi review.

### Bước 4: Xác minh Kết quả

Sau tất cả các bước đơn giản hóa, hãy lùi lại và đánh giá tổng thể:

```
SO SÁNH TRƯỚC VÀ SAU:
- Phiên bản đơn giản hóa có thực sự dễ hiểu hơn không?
- Bạn có đưa vào các mô hình mới không nhất quán với codebase không?
- Diff có sạch sẽ và dễ review không?
- Liệu một đồng nghiệp có phê duyệt thay đổi này không?
```

Nếu phiên bản "đơn giản hóa" khó hiểu hoặc khó review hơn, hãy revert. không phải mọi nỗ lực đơn giản hóa đều thành công.

## Hướng dẫn cụ thể theo ngôn ngữ

### TypeScript / JavaScript

```typescript
// ĐƠN GIẢN HÓA: Wrapper async không cần thiết
// Trước
async function getUser(id: string): Promise<User> {
  return await userService.findById(id);
}
// Sau
function getUser(id: string): Promise<User> {
  return userService.findById(id);
}

// ĐƠN GIẢN HÓA: Gán điều kiện dài dòng
// Trước
let displayName: string;
if (user.nickname) {
  displayName = user.nickname;
} else {
  displayName = user.fullName;
}
// Sau
const displayName = user.nickname || user.fullName;

// ĐƠN GIẢN HÓA: Xây dựng mảng thủ công
// Trước
const activeUsers: User[] = [];
for (const user of users) {
  if (user.isActive) {
    activeUsers.push(user);
  }
}
// Sau
const activeUsers = users.filter((user) => user.isActive);

// ĐƠN GIẢN HÓA: Trả về boolean thừa
// Trước
function isValid(input: string): boolean {
  if (input.length > 0 && input.length < 100) {
    return true;
  }
  return false;
}
// Sau
function isValid(input: string): boolean {
  return input.length > 0 && input.length < 100;
}
```

### Python

```python
# ĐƠN GIẢN HÓA: Xây dựng dictionary dài dòng
# Trước
result = {}
for item in items:
    result[item.id] = item.name
# Sau
result = {item.id: item.name for item in items}

# ĐƠN GIẢN HÓA: Điều kiện lồng nhau với early return
# Trước
def process(data):
    if data is not None:
        if data.is_valid():
            if data.has_permission():
                return do_work(data)
            else:
                raise PermissionError("No permission")
        else:
            raise ValueError("Invalid data")
    else:
        raise TypeError("Data is None")
# Sau
def process(data):
    if data is None:
        raise TypeError("Data is None")
    if not data.is_valid():
        raise ValueError("Invalid data")
    if not data.has_permission():
        raise PermissionError("No permission")
    return do_work(data)
```

### React / JSX

```tsx
// ĐƠN GIẢN HÓA: Render điều kiện dài dòng
// Trước
function UserBadge({ user }: Props) {
  if (user.isAdmin) {
    return <Badge variant="admin">Admin</Badge>;
  } else {
    return <Badge variant="default">User</Badge>;
  }
}
// Sau
function UserBadge({ user }: Props) {
  const variant = user.isAdmin ? 'admin' : 'default';
  const label = user.isAdmin ? 'Admin' : 'User';
  return <Badge variant={variant}>{label}</Badge>;
}

// ĐƠN GIẢN HÓA: Prop drilling qua các component trung gian
// Trước — cân nhắc xem context hoặc composition có giải quyết tốt hơn không.
// Đây là một quyết định dựa trên phán đoán — hãy gắn thẻ nó, đừng tự động refactor.
```

## Các lý do ngụy biện phổ biến

| Lý do ngụy biện | Thực tế |
|---|---|
| "Nó đang chạy, không cần chạm vào" | Mã đang chạy nhưng khó đọc sẽ rất khó sửa khi nó hỏng. Đơn giản hóa bây giờ sẽ tiết kiệm thời gian cho mọi thay đổi trong tương lai. |
| "Ít dòng hơn luôn đơn giản hơn" | Một dòng ternary lồng nhau không hề đơn giản hơn 5 dòng if/else. Sự đơn giản là về tốc độ hiểu, không phải số lượng dòng. |
| "Tôi sẽ tiện tay đơn giản hóa luôn đoạn mã không liên quan này" | Đơn giản hóa không giới hạn phạm vi tạo ra các diff gây nhiễu và rủi ro lỗi hồi quy trong đoạn mã bạn không định thay đổi. Hãy tập trung. |
| "Các kiểu dữ liệu giúp nó tự tài liệu hóa (self-documenting) rồi" | Kiểu dữ liệu tài liệu hóa cấu trúc, không phải ý định. Một hàm được đặt tên tốt giải thích *tại sao* tốt hơn là một chữ ký kiểu giải thích *cái gì*. |
| "Trừu tượng hóa này có thể hữu ích sau này" | Đừng giữ lại các trừu tượng hóa mang tính đầu cơ. Nếu bây giờ chưa dùng đến, nó là độ phức tạp không giá trị. Hãy xóa đi và thêm lại khi cần. |
| "Tác giả ban đầu chắc chắn phải có lý do" | Có thể. Hãy kiểm tra git blame — áp dụng Hàng rào của Chesterton. Nhưng độ phức tạp tích tụ thường chẳng có lý do gì; nó chỉ là tàn dư của quá trình lặp lại dưới áp lực. |
| "Tôi sẽ vừa refactor vừa thêm tính năng này" | Hãy tách biệt việc tái cấu trúc khỏi việc phát triển tính năng. Các thay đổi trộn lẫn sẽ khó review, khó revert và khó hiểu khi xem lại lịch sử. |

## Dấu hiệu cảnh báo (Red Flags)

- Sự đơn giản hóa yêu cầu phải sửa đổi các bài test để vượt qua (có khả năng bạn đã thay đổi hành vi).
- Mã nguồn "đơn giản hóa" dài hơn và khó theo dõi hơn bản gốc.
- Đổi tên mọi thứ theo sở thích cá nhân thay vì tuân theo quy ước dự án.
- Xóa bỏ việc xử lý lỗi vì "nó làm mã nguồn trông sạch hơn".
- Đơn giản hóa mã nguồn mà bạn không hoàn toàn hiểu rõ.
- Gom quá nhiều sự đơn giản hóa vào một commit lớn, khó review.
- Tái cấu trúc mã nguồn nằm ngoài phạm vi nhiệm vụ hiện tại mà không được yêu cầu.

## Xác minh

Sau khi hoàn thành một đợt đơn giản hóa:

- [ ] Tất cả các bài test hiện có vượt qua mà không cần sửa đổi.
- [ ] Build thành công và không có cảnh báo mới.
- [ ] Vượt qua các bước kiểm tra linter/formatter (không có sự sụt giảm về phong cách).
- [ ] Mỗi sự đơn giản hóa là một thay đổi tăng dần, có thể review được.
- [ ] Diff sạch sẽ — không trộn lẫn các thay đổi không liên quan.
- [ ] Mã đơn giản hóa tuân thủ các quy ước dự án (kiểm tra so với CLAUDE.md hoặc tương đương).
- [ ] Không có bước xử lý lỗi nào bị xóa bỏ hoặc làm yếu đi.
- [ ] Không để lại mã chết (import không dùng, nhánh không thể truy cập).
- [ ] Một đồng nghiệp hoặc AI review sẽ phê duyệt thay đổi này như một sự cải thiện thực sự.
