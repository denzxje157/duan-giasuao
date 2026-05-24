---
name: bao-mat-va-gia-co
description: Gia cố mã nguồn chống lại các lỗ hổng bảo mật. Sử dụng khi xử lý dữ liệu nhập từ người dùng, xác thực, lưu trữ dữ liệu hoặc tích hợp bên ngoài. Sử dụng khi xây dựng bất kỳ tính năng nào chấp nhận dữ liệu không đáng tin cậy, quản lý phiên người dùng hoặc tương tác với các dịch vụ bên thứ ba.
---

# Bảo mật và Gia cố

## Tổng quan

Các thực hành phát triển ưu tiên bảo mật (Security-first) cho ứng dụng web. Hãy coi mọi dữ liệu nhập từ bên ngoài là thù địch, mọi bí mật (secret) là thiêng liêng và mọi bước kiểm tra phân quyền là bắt buộc. Bảo mật không phải là một giai đoạn — đó là một ràng buộc trên từng dòng code chạm đến dữ liệu người dùng, xác thực hoặc các hệ thống bên ngoài.

## Khi nào cần sử dụng

- Xây dựng bất cứ thứ gì chấp nhận dữ liệu nhập từ người dùng.
- Triển khai xác thực (authentication) hoặc phân quyền (authorization).
- Lưu trữ hoặc truyền tải dữ liệu nhạy cảm.
- Tích hợp với các API hoặc dịch vụ bên ngoài.
- Thêm tính năng tải lên tệp (file upload), webhook hoặc callback.
- Xử lý dữ liệu thanh toán hoặc dữ liệu định danh cá nhân (PII).

## Hệ thống ranh giới ba tầng

### Luôn luôn làm (Không ngoại lệ)

- **Xác thực tất cả dữ liệu nhập từ bên ngoài** tại ranh giới hệ thống (API routes, form handlers).
- **Tham số hóa tất cả các truy vấn cơ sở dữ liệu** — tuyệt đối không cộng chuỗi dữ liệu nhập từ người dùng vào câu lệnh SQL.
- **Mã hóa đầu ra (Encode output)** để ngăn chặn XSS (sử dụng tính năng tự động thoát của framework, đừng bỏ qua nó).
- **Sử dụng HTTPS** cho mọi giao tiếp bên ngoài.
- **Băm mật khẩu (Hash passwords)** bằng bcrypt/scrypt/argon2 (tuyệt đối không lưu mật khẩu văn bản thuần túy).
- **Thiết lập các header bảo mật** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- **Sử dụng cookie httpOnly, secure, sameSite** cho các phiên làm việc (session).
- **Chạy `npm audit`** (hoặc lệnh tương đương) trước mỗi lần phát hành (release).

### Hỏi trước (Cần sự phê duyệt của con người)

- Thêm luồng xác thực mới hoặc thay đổi logic xác thực.
- Lưu trữ các loại dữ liệu nhạy cảm mới (PII, thông tin thanh toán).
- Thêm tích hợp dịch vụ bên ngoài mới.
- Thay đổi cấu hình CORS.
- Thêm trình xử lý tải lên tệp.
- Thay đổi giới hạn tốc độ (rate limiting) hoặc điều tiết (throttling).
- Cấp quyền hạn hoặc vai trò (role) cao cấp hơn.

### Tuyệt đối không làm

- **Không bao giờ commit các bí mật (secrets)** vào hệ thống quản lý phiên bản (API keys, passwords, tokens).
- **Không bao giờ log dữ liệu nhạy cảm** (mật khẩu, token, số thẻ tín dụng đầy đủ).
- **Không bao giờ tin tưởng xác thực phía client** như một ranh giới bảo mật.
- **Không bao giờ vô hiệu hóa các header bảo mật** vì sự tiện lợi.
- **Không bao giờ sử dụng `eval()` hoặc `innerHTML`** với dữ liệu do người dùng cung cấp.
- **Không bao giờ lưu phiên làm việc trong bộ lưu trữ mà client có thể truy cập** (như localStorage cho auth tokens).
- **Không bao giờ để lộ stack traces** hoặc chi tiết lỗi nội bộ cho người dùng.

## Phòng chống OWASP Top 10

### 1. Injection (Tiêm mã - SQL, NoSQL, OS Command)

```typescript
// TỆ: SQL injection qua cộng chuỗi
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// TỐT: Truy vấn có tham số (Parameterized query)
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// TỐT: Sử dụng ORM với đầu vào được tham số hóa
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### 2. Broken Authentication (Lỗi xác thực)

```typescript
// Băm mật khẩu
import { hash, compare } from 'bcrypt';

const SALT_ROUNDS = 12;
const hashedPassword = await hash(plaintext, SALT_ROUNDS);
const isValid = await compare(plaintext, hashedPassword);

// Quản lý phiên làm việc (Session)
app.use(session({
  secret: process.env.SESSION_SECRET,  // Lấy từ môi trường, không ghi trong code
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     // Không thể truy cập qua JavaScript
    secure: true,       // Chỉ qua HTTPS
    sameSite: 'lax',    // Bảo vệ chống CSRF
    maxAge: 24 * 60 * 60 * 1000,  // 24 giờ
  },
}));
```

### 3. Cross-Site Scripting (XSS)

```typescript
// TỆ: Render dữ liệu người dùng trực tiếp thành HTML
element.innerHTML = userInput;

// TỐT: Sử dụng tính năng tự động thoát của framework (React mặc định làm điều này)
return <div>{userInput}</div>;

// Nếu BẮT BUỘC phải render HTML, hãy làm sạch (sanitize) trước
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### 4. Broken Access Control (Lỗi kiểm soát truy cập)

```typescript
// Luôn kiểm tra phân quyền, không chỉ xác thực
app.patch('/api/tasks/:id', authenticate, async (req, res) => {
  const task = await taskService.findById(req.params.id);

  // Kiểm tra xem người dùng đã xác thực có sở hữu tài nguyên này không
  if (task.ownerId !== req.user.id) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Bạn không có quyền sửa task này' }
    });
  }

  // Tiếp tục cập nhật
  const updated = await taskService.update(req.params.id, req.body);
  return res.json(updated);
});
```

### 5. Security Misconfiguration (Cấu hình bảo mật sai)

```typescript
// Header bảo mật (sử dụng helmet cho Express)
import helmet from 'helmet';
app.use(helmet());

// Chính sách bảo mật nội dung (Content Security Policy)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],  // Thắt chặt nếu có thể
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
  },
}));

// CORS — giới hạn ở các origin đã biết
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
```

### 6. Sensitive Data Exposure (Lộ dữ liệu nhạy cảm)

```typescript
// Không bao giờ trả về các trường nhạy cảm trong phản hồi API
function sanitizeUser(user: UserRecord): PublicUser {
  const { passwordHash, resetToken, ...publicFields } = user;
  return publicFields;
}

// Sử dụng biến môi trường cho các bí mật
const API_KEY = process.env.STRIPE_API_KEY;
if (!API_KEY) throw new Error('STRIPE_API_KEY chưa được cấu hình');
```

## Các mẫu xác thực dữ liệu nhập (Input Validation Patterns)

### Xác thực Schema tại ranh giới hệ thống

```typescript
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

// Xác thực tại trình xử lý route (route handler)
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu nhập không hợp lệ',
        details: result.error.flatten(),
      },
    });
  }
  // result.data hiện đã được định kiểu và xác thực
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

### An toàn khi tải lên tệp (File Upload Safety)

```typescript
// Giới hạn loại tệp và kích thước
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateUpload(file: UploadedFile) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new ValidationError('Loại tệp không được phép');
  }
  if (file.size > MAX_SIZE) {
    throw new ValidationError('Tệp quá lớn (tối đa 5MB)');
  }
  // Đừng tin vào phần mở rộng tệp — hãy kiểm tra magic bytes nếu quan trọng
}
```

## Phân loại kết quả npm audit

Không phải mọi kết quả audit đều cần hành động ngay lập tức. Sử dụng cây quyết định này:

```
npm audit báo cáo một lỗ hổng
├── Mức độ: critical (nghiêm trọng) hoặc high (cao)
│   ├── Mã chứa lỗ hổng có thể truy cập được trong ứng dụng của bạn không?
│   │   ├── CÓ --> Khắc phục ngay lập tức (cập nhật, patch, hoặc thay thế dependency)
│   │   └── KHÔNG (dep chỉ dùng cho dev, nhánh mã không sử dụng) --> Khắc phục sớm, nhưng không phải rào cản
│   └── Có bản sửa lỗi chưa?
│       ├── CÓ --> Cập nhật lên phiên bản đã được vá
│       └── KHÔNG --> Kiểm tra giải pháp thay thế, cân nhắc thay thế dependency, hoặc thêm vào allowlist kèm ngày đánh giá lại
├── Mức độ: moderate (trung bình)
│   ├── Có thể truy cập trong production không? --> Khắc phục trong chu kỳ release tiếp theo
│   └── Chỉ dùng cho dev? --> Khắc phục khi thuận tiện, theo dõi trong backlog
└── Mức độ: low (thấp)
    └── Theo dõi và khắc phục trong các đợt cập nhật dependency định kỳ
```

**Câu hỏi then chốt:**
- Hàm chứa lỗ hổng có thực sự được gọi trong luồng mã của bạn không?
- Dependency đó là runtime dependency hay chỉ dùng cho phát triển (dev-only)?
- Lỗ hổng có thể khai thác được trong ngữ cảnh triển khai của bạn không (ví dụ: lỗ hổng phía server trong một ứng dụng chỉ chạy phía client)?

Khi bạn trì hoãn việc sửa lỗi, hãy ghi lại lý do và thiết lập ngày đánh giá lại.

## Giới hạn tốc độ (Rate Limiting)

```typescript
import rateLimit from 'express-rate-limit';

// Giới hạn tốc độ API chung
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,                   // 100 yêu cầu mỗi cửa sổ thời gian
  standardHeaders: true,
  legacyHeaders: false,
}));

// Giới hạn nghiêm ngặt hơn cho các endpoint xác thực
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // 10 lần thử trong 15 phút
}));
```

## Quản lý bí mật (Secrets Management)

```
Các tệp .env:
  ├── .env.example  → Được commit (mẫu với các giá trị giả định)
  ├── .env          → KHÔNG được commit (chứa bí mật thực tế)
  └── .env.local    → KHÔNG được commit (ghi đè cục bộ)

.gitignore phải bao gồm:
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
```

**Luôn kiểm tra trước khi commit:**
```bash
# Kiểm tra các bí mật vô tình bị đưa vào stage
git diff --cached | grep -i "password\|secret\|api_key\|token"
```

## Danh sách kiểm tra đánh giá bảo mật (Security Review Checklist)

```markdown
### Xác thực (Authentication)
- [ ] Mật khẩu được băm bằng bcrypt/scrypt/argon2 (salt rounds ≥ 12)
- [ ] Session token là httpOnly, secure, sameSite
- [ ] Đăng nhập có giới hạn tốc độ (rate limiting)
- [ ] Token đặt lại mật khẩu có thời gian hết hạn

### Phân quyền (Authorization)
- [ ] Mọi endpoint đều kiểm tra quyền người dùng
- [ ] Người dùng chỉ có thể truy cập tài nguyên của chính họ
- [ ] Các hành động admin yêu cầu xác minh vai trò admin

### Dữ liệu nhập (Input)
- [ ] Tất cả dữ liệu người dùng được xác thực tại ranh giới
- [ ] Truy vấn SQL được tham số hóa
- [ ] Đầu ra HTML được mã hóa/thoát (encoded/escaped)

### Dữ liệu (Data)
- [ ] Không có bí mật trong code hoặc hệ thống quản lý phiên bản
- [ ] Các trường nhạy cảm được loại bỏ khỏi phản hồi API
- [ ] PII được mã hóa khi lưu trữ (nếu áp dụng)

### Hạ tầng (Infrastructure)
- [ ] Các header bảo mật được cấu hình (CSP, HSTS, v.v.)
- [ ] CORS được giới hạn ở các origin đã biết
- [ ] Các dependency được audit lỗ hổng bảo mật
- [ ] Thông báo lỗi không làm lộ chi tiết nội bộ hệ thống
```

## Xem thêm (See Also)

Để biết danh sách kiểm tra bảo mật chi tiết và các bước xác minh trước khi commit, hãy xem `references/security-checklist.md`.

## Các lý do ngụy biện phổ biến

| Lý do ngụy biện | Thực tế |
|---|---|
| "Đây là công cụ nội bộ, bảo mật không quan trọng" | Các công cụ nội bộ vẫn có thể bị xâm nhập. Kẻ tấn công luôn nhắm vào mắt xích yếu nhất. |
| "Chúng ta sẽ thêm bảo mật sau" | Gia cố bảo mật sau khi hoàn thành khó gấp 10 lần so với việc xây dựng nó ngay từ đầu. Hãy thêm ngay bây giờ. |
| "Không ai rảnh mà đi khai thác cái này đâu" | Các trình quét tự động sẽ tìm ra nó. Bảo mật dựa trên sự mù mờ (security by obscurity) không phải là bảo mật. |
| "Framework đã lo liệu bảo mật rồi" | Framework cung cấp công cụ, không phải sự đảm bảo. Bạn vẫn cần sử dụng chúng đúng cách. |
| "Chỉ là bản demo thôi mà" | Bản demo thường trở thành bản chạy thực tế. Hãy hình thành thói quen bảo mật từ ngày đầu tiên. |

## Dấu hiệu cảnh báo (Red Flags)

- Dữ liệu người dùng được đưa trực tiếp vào truy vấn cơ sở dữ liệu, lệnh shell hoặc render HTML.
- Bí mật nằm trong mã nguồn hoặc lịch sử commit.
- Các endpoint API không có bước kiểm tra xác thực hoặc phân quyền.
- Thiếu cấu hình CORS hoặc sử dụng wildcard (`*`) cho origin.
- Không có giới hạn tốc độ trên các endpoint xác thực.
- Stack traces hoặc lỗi nội bộ bị lộ cho người dùng.
- Sử dụng các dependency có lỗ hổng bảo mật nghiêm trọng đã biết.

## Xác minh

Sau khi triển khai mã liên quan đến bảo mật:

- [ ] `npm audit` không hiển thị lỗ hổng nghiêm trọng (critical) hoặc cao (high).
- [ ] Không có bí mật trong mã nguồn hoặc lịch sử git.
- [ ] Tất cả dữ liệu người dùng được xác thực tại ranh giới hệ thống.
- [ ] Xác thực và phân quyền được kiểm tra trên mọi endpoint được bảo vệ.
- [ ] Các header bảo mật có mặt trong phản hồi (kiểm tra bằng DevTools trình duyệt).
- [ ] Các phản hồi lỗi không làm lộ chi tiết nội bộ.
- [ ] Giới hạn tốc độ hoạt động trên các endpoint xác thực.
