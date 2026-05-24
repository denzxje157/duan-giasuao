---
name: fullstack-architecture
description: Hướng dẫn thiết kế kiến trúc toàn diện từ API cho đến giao diện người dùng (UI). Sử dụng khi thiết kế hệ thống, ranh giới module, hợp đồng dữ liệu REST/GraphQL, và xây dựng các component UI chất lượng production.
---

# Kiến trúc Fullstack (Fullstack Architecture)

## Tổng quan

Kiến trúc Fullstack là sự kết hợp hài hòa giữa việc thiết kế các **Giao diện/API ổn định** và việc triển khai **UI Frontend chuyên nghiệp**. Mục tiêu là xây dựng các hệ thống mà ở đó giao tiếp giữa các module rõ ràng, khó bị sử dụng sai, và giao diện người dùng có tính thẩm mỹ, hiệu suất và khả năng truy cập cao.

---

## PHẦN 1: THIẾT KẾ API VÀ GIAO DIỆN (INTERFACE DESIGN)

Thiết kế các giao diện ổn định, được tài liệu hóa tốt và khó bị sử dụng sai. Giao diện tốt giúp việc làm đúng trở nên dễ dàng và việc làm sai trở nên khó khăn. Điều này áp dụng cho REST API, schema GraphQL, ranh giới module, props của component và bất kỳ bề mặt nào mà một đoạn mã này giao tiếp với một đoạn mã khác.

### 1.1 Khi nào cần sử dụng

- Thiết kế các endpoint API mới.
- Định nghĩa ranh giới module hoặc hợp đồng giữa các nhóm phát triển.
- Tạo giao diện props cho component.
- Thiết lập schema cơ sở dữ liệu làm nền tảng cho cấu trúc API.
- Thay đổi các giao diện công khai hiện có.

### 1.2 Các nguyên tắc cốt lõi

#### Định luật Hyrum (Hyrum's Law)

> Với một số lượng người dùng đủ lớn của một API, tất cả các hành vi có thể quan sát được của hệ thống sẽ có ai đó phụ thuộc vào, bất kể bạn hứa gì trong hợp đồng.

Điều này có nghĩa là: mọi hành vi công khai — bao gồm cả những đặc điểm không được tài liệu hóa, văn bản thông báo lỗi, thời gian phản hồi và thứ tự xử lý — đều trở thành một hợp đồng thực tế (de facto contract) một khi người dùng đã phụ thuộc vào nó. Hệ quả trong thiết kế:

- **Hãy có chủ đích về những gì bạn công khai.** Mọi hành vi có thể quan sát được đều là một cam kết tiềm năng.
- **Đừng để lộ chi tiết triển khai.** Nếu người dùng có thể quan sát thấy, họ sẽ phụ thuộc vào nó.
- **Lên kế hoạch gỡ bỏ (deprecation) ngay từ khi thiết kế.** Xem `deprecation-and-migration` để biết cách gỡ bỏ an toàn những thứ người dùng đang phụ thuộc vào.
- **Kiểm thử là chưa đủ.** Ngay cả với các bài kiểm thử hợp đồng hoàn hảo, Định luật Hyrum có nghĩa là những thay đổi "an toàn" vẫn có thể làm hỏng người dùng thực tế nếu họ phụ thuộc vào các hành vi không được tài liệu hóa.

#### Quy tắc Một Phiên bản (The One-Version Rule)

Tránh ép người tiêu dùng phải chọn giữa nhiều phiên bản của cùng một dependency hoặc API. Vấn đề "diamond dependency" nảy sinh khi các người tiêu dùng khác nhau cần các phiên bản khác nhau của cùng một thứ. Hãy thiết kế cho một thế giới mà chỉ có một phiên bản tồn tại tại một thời điểm — ưu tiên mở rộng (extend) thay vì phân nhánh (fork).

### 1.3 Quy trình Thiết kế

#### 1. Ưu tiên Hợp đồng (Contract First)

Định nghĩa giao diện trước khi triển khai. Hợp đồng là đặc tả — việc triển khai sẽ tuân theo sau.

```typescript
// Định nghĩa hợp đồng trước
interface TaskAPI {
  // Tạo một task và trả về task đã tạo kèm theo các trường do server tạo ra
  createTask(input: CreateTaskInput): Promise<Task>;

  // Trả về danh sách task có phân trang khớp với bộ lọc
  listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>>;

  // Trả về một task duy nhất hoặc ném lỗi NotFoundError
  getTask(id: string): Promise<Task>;

  // Cập nhật một phần — chỉ những trường được cung cấp mới thay đổi
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;

  // Xóa có tính lũy đẳng (Idempotent) — thành công ngay cả khi đã bị xóa trước đó
  deleteTask(id: string): Promise<void>;
}
```

#### 2. Ngữ nghĩa lỗi nhất quán (Consistent Error Semantics)

Chọn một chiến lược xử lý lỗi và sử dụng nó ở mọi nơi:

```typescript
// REST: Mã trạng thái HTTP + thân lỗi có cấu trúc
// Mọi phản hồi lỗi đều tuân theo cùng một cấu trúc
interface APIError {
  error: {
    code: string;        // Máy có thể đọc: "VALIDATION_ERROR"
    message: string;     // Người có thể đọc: "Email là bắt buộc"
    details?: unknown;   // Ngữ cảnh bổ sung nếu cần thiết
  };
}

// Ánh xạ mã trạng thái (Status code)
// 400 → Client gửi dữ liệu không hợp lệ
// 401 → Chưa xác thực
// 403 → Đã xác thực nhưng không có quyền
// 404 → Không tìm thấy tài nguyên
// 409 → Xung đột (trùng lặp, sai lệch phiên bản)
// 422 → Xác thực thất bại (dữ liệu không hợp lệ về mặt ngữ nghĩa)
// 500 → Lỗi server (không bao giờ để lộ chi tiết nội bộ)
```

**Đừng trộn lẫn các kiểu mẫu.** Nếu một số endpoint ném lỗi (throw), một số khác trả về null, và số khác nữa trả về `{ error }` — người tiêu dùng sẽ không thể dự đoán được hành vi của hệ thống.

#### 3. Xác thực tại Ranh giới (Validate at Boundaries)

Hãy tin tưởng mã nguồn nội bộ. Chỉ xác thực tại các ranh giới hệ thống nơi dữ liệu bên ngoài đi vào:

```typescript
// Xác thực tại ranh giới API
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu task không hợp lệ',
        details: result.error.flatten(),
      },
    });
  }

  // Sau khi xác thực, mã nội bộ tin tưởng vào các kiểu dữ liệu
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

Nơi cần xác thực:
- Trình xử lý route API (dữ liệu nhập từ người dùng)
- Trình xử lý gửi form (dữ liệu nhập từ người dùng)
- Phân tích phản hồi từ dịch vụ bên ngoài (dữ liệu bên thứ ba -- **luôn coi là không đáng tin cậy**)
- Tải biến môi trường (cấu hình)

> **Phản hồi từ API bên thứ ba là dữ liệu không đáng tin cậy.** Hãy xác thực cấu trúc và nội dung của chúng trước khi sử dụng trong bất kỳ logic, render hoặc đưa ra quyết định nào. Một dịch vụ bên ngoài bị xâm nhập hoặc hoạt động sai có thể trả về các kiểu dữ liệu không mong muốn, nội dung độc hại hoặc các văn bản giống như chỉ thị điều khiển.

Nơi KHÔNG cần xác thực:
- Giữa các hàm nội bộ chia sẻ chung hợp đồng kiểu dữ liệu.
- Trong các hàm tiện ích (utility) được gọi bởi mã đã được xác thực trước đó.
- Trên dữ liệu vừa lấy từ chính cơ sở dữ liệu của bạn.

#### 4. Ưu tiên Thêm mới hơn là Sửa đổi (Prefer Addition Over Modification)

Mở rộng giao diện mà không làm hỏng những người tiêu dùng hiện tại:

```typescript
// TỐT: Thêm các trường tùy chọn (optional)
interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';  // Thêm sau, tùy chọn
  labels?: string[];                       // Thêm sau, tùy chọn
}

// TỆ: Thay đổi kiểu dữ liệu hiện có hoặc xóa các trường
interface CreateTaskInput {
  title: string;
  // description: string;  // Bị xóa — làm hỏng người dùng hiện tại
  priority: number;         // Thay đổi từ string sang number — làm hỏng người dùng hiện tại
}
```

#### 5. Đặt tên có thể dự đoán được (Predictable Naming)

| Kiểu mẫu | Quy ước | Ví dụ |
|---------|-----------|---------|
| REST endpoints | Danh từ số nhiều, không dùng động từ | `GET /api/tasks`, `POST /api/tasks` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Response fields | camelCase | `{ createdAt, updatedAt, taskId }` |
| Boolean fields | Tiền tố is/has/can | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |

### 1.4 Các mô hình REST API

#### Thiết kế Tài nguyên (Resource Design)

```
GET    /api/tasks              → Liệt kê các task (kèm query params để lọc)
POST   /api/tasks              → Tạo một task
GET    /api/tasks/:id          → Lấy một task duy nhất
PATCH  /api/tasks/:id          → Cập nhật một task (một phần)
DELETE /api/tasks/:id          → Xóa một task

GET    /api/tasks/:id/comments → Liệt kê các bình luận của một task (tài nguyên con)
POST   /api/tasks/:id/comments → Thêm bình luận vào một task
```

#### Phân trang (Pagination)

Sử dụng phân trang cho các endpoint liệt kê danh sách:

```typescript
// Yêu cầu (Request)
GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

// Phản hồi (Response)
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

#### Bộ lọc (Filtering)

Sử dụng query parameters cho các bộ lọc:

```
GET /api/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
```

#### Cập nhật một phần (PATCH)

Chấp nhận các đối tượng chứa một phần dữ liệu — chỉ cập nhật những gì được cung cấp:

```typescript
// Chỉ thay đổi tiêu đề (title), mọi thứ khác được giữ nguyên
PATCH /api/tasks/123
{ "title": "Tiêu đề đã cập nhật" }
```

### 1.5 Các mô hình Interface TypeScript

#### Sử dụng Discriminated Unions cho các biến thể

```typescript
// TỐT: Mỗi biến thể đều rõ ràng
type TaskStatus =
  | { type: 'pending' }
  | { type: 'in_progress'; assignee: string; startedAt: Date }
  | { type: 'completed'; completedAt: Date; completedBy: string }
  | { type: 'cancelled'; reason: string; cancelledAt: Date };

// Người dùng được hưởng lợi từ việc thu hẹp kiểu dữ liệu (type narrowing)
function getStatusLabel(status: TaskStatus): string {
  switch (status.type) {
    case 'pending': return 'Đang chờ';
    case 'in_progress': return `Đang xử lý (${status.assignee})`;
    case 'completed': return `Hoàn thành lúc ${status.completedAt}`;
    case 'cancelled': return `Đã hủy: ${status.reason}`;
  }
}
```

#### Tách biệt Đầu vào và Đầu ra (Input/Output Separation)

```typescript
// Input: những gì người gọi cung cấp
interface CreateTaskInput {
  title: string;
  description?: string;
}

// Output: những gì hệ thống trả về (bao gồm các trường do server tạo ra)
interface Task {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

#### Sử dụng Branded Types cho ID

```typescript
type TaskId = string & { readonly __brand: 'TaskId' };
type UserId = string & { readonly __brand: 'UserId' };

// Ngăn chặn việc vô tình truyền UserId vào nơi cần TaskId
function getTask(id: TaskId): Promise<Task> { ... }
```

### 1.6 Lý do ngụy biện & Red Flags (API)

| Lý do ngụy biện | Thực tế |
|---|---|
| "Chúng ta sẽ viết tài liệu API sau" | Các kiểu dữ liệu CHÍNH LÀ tài liệu. Hãy định nghĩa chúng trước. |
| "Hiện tại chưa cần phân trang đâu" | Bạn sẽ cần nó ngay khi có ai đó tạo ra hơn 100 mục. Hãy thêm nó ngay từ đầu. |
| "PATCH phức tạp quá, dùng PUT đi" | PUT yêu cầu gửi lại toàn bộ đối tượng mỗi lần. PATCH mới là thứ client thực sự cần. |
| "Khi nào cần chúng ta mới đánh số phiên bản API" | Thay đổi gây hỏng (breaking changes) mà không có phiên bản sẽ làm hỏng người dùng. Hãy thiết kế để mở rộng ngay từ đầu. |
| "Không ai để ý đến hành vi không tài liệu hóa đó đâu" | Định luật Hyrum: nếu nó có thể quan sát được, sẽ có ai đó phụ thuộc vào nó. Hãy coi mọi hành vi công khai là một cam kết. |

**Dấu hiệu cảnh báo (Red Flags):**
- Các endpoint trả về cấu trúc khác nhau tùy thuộc vào điều kiện.
- Định dạng lỗi không nhất quán giữa các endpoint.
- Xác thực nằm rải rác trong mã nội bộ thay vì tại các ranh giới.
- Các thay đổi gây hỏng cho các trường hiện có.
- Sử dụng động từ trong URL REST (`/api/createTask`).

### 1.7 Xác minh (API)

- [ ] Mọi endpoint đều có schema đầu vào và đầu ra được định kiểu rõ ràng.
- [ ] Phản hồi lỗi tuân theo một định dạng nhất quán duy nhất.
- [ ] Việc xác thực chỉ diễn ra tại ranh giới hệ thống.
- [ ] Các endpoint danh sách hỗ trợ phân trang.
- [ ] Tài liệu API hoặc các kiểu dữ liệu được commit cùng với phần triển khai.

---

## PHẦN 2: KỸ THUẬT UI FRONTEND (FRONTEND ENGINEERING)

Xây dựng giao diện người dùng chất lượng production: có khả năng truy cập (accessible), hiệu suất cao và được trau chuốt về mặt thẩm mỹ. Mục tiêu là tạo ra UI trông giống như được xây dựng bởi một kỹ sư am hiểu thiết kế — chứ không mang "thẩm mỹ AI" chung chung.

### 2.1 Kiến trúc Component

#### Cấu trúc File

Đặt mọi thứ liên quan đến một component ở cùng một chỗ:

```
src/components/
  TaskList/
    TaskList.tsx          # Triển khai component
    TaskList.test.tsx     # Các bài kiểm thử
    TaskList.stories.tsx  # Các câu chuyện Storybook
    use-task-list.ts      # Hook tùy chỉnh
    types.ts              # Các kiểu dữ liệu riêng
```

#### Các mô hình Component

**Ưu tiên sự kết hợp (composition) hơn là cấu hình (configuration):**

```tsx
// TỐT: Có tính kết hợp cao
<Card>
  <CardHeader>
    <CardTitle>Nhiệm vụ</CardTitle>
  </CardHeader>
  <CardBody>
    <TaskList tasks={tasks} />
  </CardBody>
</Card>

// Nên tránh: Cấu hình quá mức
<Card title="Nhiệm vụ" content={<TaskList tasks={tasks} />} />
```

**Tách biệt việc lấy dữ liệu khỏi việc hiển thị (Container/Presenter):**

```tsx
// Container: xử lý dữ liệu
export function TaskListContainer() {
  const { tasks, isLoading, error } = useTasks();
  if (isLoading) return <TaskListSkeleton />;
  if (error) return <ErrorState message="Tải nhiệm vụ thất bại" />;
  return <TaskList tasks={tasks} />;
}

// Presentation: xử lý việc render
export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul role="list" className="divide-y">
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </ul>
  );
}
```

### 2.2 Quản lý Trạng thái (State Management)

**Chọn phương pháp đơn giản nhất có thể hoạt động:**

```
Local state (useState)           → Trạng thái UI riêng của component
Lifted state                     → Dùng chung giữa 2-3 component anh em
Context                          → Theme, auth, ngôn ngữ (đọc nhiều, ghi ít)
URL state (searchParams)         → Bộ lọc, phân trang, trạng thái UI có thể chia sẻ
Server state (React Query, SWR)  → Dữ liệu từ xa kèm theo cơ chế caching
Global store (Zustand, Redux)    → Trạng thái client phức tạp dùng cho toàn bộ app
```

### 2.3 Tuân thủ Hệ thống Thiết kế (Design System)

#### Tránh "Thẩm mỹ AI" (The AI Aesthetic)

Giao diện do AI tạo ra thường có những mô hình dễ nhận biết. Hãy tránh tất cả chúng:

| Mặc định của AI | Tại sao nó là vấn đề | Chất lượng Production |
|---|---|---|
| Màu tím/chàm (indigo) | Mô hình mặc định chọn bảng màu "an toàn" | Sử dụng bảng màu thực tế của dự án |
| Gradient quá mức | Gây nhiễu thị giác | Sử dụng màu phẳng hoặc gradient nhẹ nhàng |
| Bo góc quá mức (2xl) | Bỏ qua hệ thống phân cấp thiết kế | Độ bo góc nhất quán theo hệ thống thiết kế |
| Padding quá lớn đồng đều | Lãng phí không gian màn hình | Thang đo khoảng cách (spacing scale) nhất quán |
| Đổ bóng dày đặc | Làm chậm việc render và cạnh tranh nội dung | Đổ bóng nhẹ nhàng hoặc không dùng |
| Nội dung Lorem ipsum | Che giấu các vấn đề về bố cục thực tế | Sử dụng nội dung giả mang tính thực tế |

#### Khoảng cách và Bố cục (Spacing and Layout)

Sử dụng một thang đo khoảng cách nhất quán (bội số của 0.25rem). Đừng tự chế ra các giá trị pixel lẻ.

#### Màu sắc

- Sử dụng các token màu ngữ nghĩa (semantic): `text-primary`, `bg-surface`.
- Đảm bảo độ tương phản đầy đủ (4.5:1 cho văn bản bình thường).

### 2.4 Khả năng truy cập (Accessibility - WCAG 2.1 AA)

#### Điều hướng bằng Bàn phím

Mọi phần tử tương tác đều phải có thể truy cập bằng bàn phím. Sử dụng `<button>` cho hành động, `<a>` cho chuyển trang. Nếu dùng `<div>`, phải có `role="button"` và `tabIndex={0}` kèm xử lý phím Enter/Space.

#### Nhãn ARIA (ARIA Labels)

Gán nhãn cho các phần tử không có văn bản hiển thị: `<button aria-label="Đóng"><XIcon /></button>`. Liên kết label với input qua `htmlFor` và `id`.

#### Các trạng thái Trống và Lỗi

Đừng hiển thị màn hình trắng. Sử dụng icon, tiêu đề và nút hành động (ví dụ: "Thử lại" hoặc "Tạo mới") để hướng dẫn người dùng.

### 2.5 Thiết kế Đáp ứng (Responsive Design)

Thiết kế ưu tiên cho mobile trước (mobile-first). Kiểm thử tại các điểm ngắt: 320px, 768px, 1024px, 1440px.

### 2.6 Trạng thái Tải và Chuyển cảnh (Loading and Transitions)

- **Skeleton loading:** Sử dụng các khung xám động thay thế cho spinner cho nội dung chính.
- **Cập nhật lạc quan (Optimistic updates):** Cập nhật UI ngay lập tức trước khi có phản hồi từ server (ví dụ: đánh dấu hoàn thành nhiệm vụ).

### 2.7 Lý do ngụy biện & Red Flags (UI)

| Lý do ngụy biện | Thực tế |
|---|---|
| "Khả năng truy cập là thứ có thì tốt" | Đó là yêu cầu pháp lý và tiêu chuẩn chất lượng. |
| "Chúng ta sẽ làm Responsive sau" | Sửa code cũ để hỗ trợ responsive khó gấp 3 lần. |
| "Thẩm mỹ AI hiện tại cũng ổn" | Nó cho thấy chất lượng thấp. Hãy dùng hệ thống thiết kế thực tế. |

**Dấu hiệu cảnh báo (Red Flags):**
- Sử dụng inline styles hoặc các giá trị pixel tùy tiện.
- Thiếu các trạng thái lỗi, tải hoặc trống.
- Không kiểm thử điều hướng bằng bàn phím.
- "Vẻ ngoài AI" chung chung (gradient tím, card quá khổ).

### 2.8 Xác minh (UI)

- [ ] Component render không có lỗi console.
- [ ] Mọi phần tử tương tác đều có thể truy cập bằng bàn phím.
- [ ] Responsive hoạt động tốt tại các kích thước màn hình phổ biến.
- [ ] Các trạng thái tải, lỗi và trống đều được xử lý.
- [ ] Tuân thủ hệ thống thiết kế của dự án (spacing, màu sắc, font).

---

## TỔNG KẾT: DANH SÁCH KIỂM TRA KIẾN TRÚC CUỐI CÙNG

- [ ] **Hợp đồng:** API endpoint và component props được định kiểu rõ ràng, tách biệt Input/Output.
- [ ] **Xác thực:** Dữ liệu được xác thực nghiêm ngặt tại các ranh giới hệ thống (API route, Form submit).
- [ ] **Lỗi:** Hệ thống xử lý lỗi nhất quán, không để lộ chi tiết nội bộ cho người dùng.
- [ ] **Component:** Kiến trúc component có tính kết hợp cao, tách biệt logic dữ liệu và hiển thị.
- [ ] **Thẩm mỹ:** Giao diện tuân thủ hệ thống thiết kế, loại bỏ hoàn toàn "vẻ ngoài AI" mặc định.
- [ ] **A11y:** Đáp ứng tiêu chuẩn WCAG 2.1 AA (bàn phím, nhãn ARIA, độ tương phản).
- [ ] **Responsive:** Bố cục đáp ứng linh hoạt từ mobile đến desktop.

---
**KIẾN TRÚC BỀN VỮNG:** Sự kết hợp giữa thiết kế hợp đồng chặt chẽ và giao diện người dùng tinh tế là nền tảng để xây dựng những ứng dụng chất lượng cao, có thể mở rộng và bảo trì lâu dài.
