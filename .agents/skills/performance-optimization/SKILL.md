---
name: toi-uu-hoa-hieu-suat
description: Tối ưu hóa hiệu suất ứng dụng. Sử dụng khi có các yêu cầu về hiệu suất, khi bạn nghi ngờ có sự sụt giảm hiệu suất, hoặc khi các chỉ số Core Web Vitals hoặc thời gian tải cần được cải thiện. Sử dụng khi việc phân tích (profiling) phát hiện ra các nút thắt cổ chai cần được khắc phục.
---

# Tối ưu hóa hiệu suất

## Tổng quan

Hãy đo lường trước khi tối ưu hóa. Làm việc về hiệu suất mà không có số liệu đo lường chỉ là đoán mò — và đoán mò dẫn đến tối ưu hóa sớm (premature optimization), làm tăng độ phức tạp mà không cải thiện được những gì thực sự quan trọng. Hãy phân tích trước, xác định nút thắt cổ chai thực sự, khắc phục nó, rồi đo lường lại. Chỉ tối ưu hóa những gì mà số liệu thực tế chứng minh là có vấn đề.

## Khi nào cần sử dụng

- Các yêu cầu về hiệu suất tồn tại trong đặc tả (ngân sách thời gian tải, cam kết SLA về thời gian phản hồi).
- Người dùng hoặc hệ thống giám sát báo cáo ứng dụng chạy chậm.
- Điểm Core Web Vitals nằm dưới ngưỡng yêu cầu.
- Bạn nghi ngờ một thay đổi gần đây đã gây ra sự sụt giảm hiệu suất (regression).
- Xây dựng các tính năng xử lý tập dữ liệu lớn hoặc lưu lượng truy cập cao.

**Khi nào KHÔNG nên sử dụng:** Đừng tối ưu hóa trước khi bạn có bằng chứng về vấn đề. Tối ưu hóa sớm sẽ làm tăng độ phức tạp với chi phí cao hơn nhiều so với lợi ích hiệu suất mang lại.

## Mục tiêu Core Web Vitals

| Chỉ số | Tốt (Good) | Cần cải thiện | Kém (Poor) |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

## Quy trình tối ưu hóa

```
1. ĐO LƯỜNG (MEASURE)  → Thiết lập mức cơ sở với dữ liệu thực tế
2. XÁC ĐỊNH (IDENTIFY) → Tìm nút thắt cổ chai thực sự (không phải giả định)
3. KHẮC PHỤC (FIX)     → Giải quyết nút thắt cổ chai cụ thể đó
4. XÁC MINH (VERIFY)   → Đo lường lại, xác nhận sự cải thiện
5. BẢO VỆ (GUARD)      → Thêm giám sát hoặc kiểm thử để ngăn chặn sụt giảm trở lại
```

### Bước 1: Đo lường

Sử dụng kết hợp cả hai phương pháp sau:

- **Tổng hợp (Synthetic - Lighthouse, DevTools Performance):** Điều kiện kiểm soát, có thể tái lặp. Tốt nhất để phát hiện lỗi trong CI và cô lập các vấn đề cụ thể.
- **RUM (Real User Monitoring - thư viện web-vitals, CrUX):** Dữ liệu người dùng thực trong điều kiện thực tế. Cần thiết để xác nhận xem bản sửa lỗi có thực sự cải thiện trải nghiệm người dùng hay không.

**Frontend:**
```bash
# Synthetic: Lighthouse trong Chrome DevTools (hoặc CI)
# Chrome DevTools → Performance tab → Record
# Chrome DevTools MCP → Performance trace

# RUM: Sử dụng thư viện Web Vitals trong mã nguồn
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

**Backend:**
```bash
# Ghi nhật ký thời gian phản hồi (Response time logging)
# Giám sát hiệu suất ứng dụng (APM)
# Ghi nhật ký truy vấn cơ sở dữ liệu kèm thời gian thực hiện

# Đo thời gian đơn giản
console.time('db-query');
const result = await db.query(...);
console.timeEnd('db-query');
```

### Bắt đầu đo lường từ đâu?

Dựa vào triệu chứng để quyết định nơi đo lường trước:

```
Cái gì đang chậm?
├── Lần tải trang đầu tiên
│   ├── Bundle quá lớn? --> Kiểm tra kích thước bundle, kiểm tra việc tách mã (code splitting)
│   ├── Phản hồi máy chủ chậm? --> Đo TTFB trong Network waterfall của DevTools
│   │   ├── DNS lâu? --> Thêm dns-prefetch / preconnect cho các origin đã biết
│   │   ├── TCP/TLS lâu? --> Bật HTTP/2, kiểm tra triển khai edge, keep-alive
│   │   └── Đợi máy chủ xử lý lâu? --> Phân tích backend, kiểm tra truy vấn và bộ nhớ đệm
│   └── Tài nguyên chặn render? --> Kiểm tra CSS/JS chặn hiển thị trong network waterfall
├── Tương tác cảm thấy chậm chạp
│   ├── UI bị "đơ" khi click? --> Phân tích main thread, tìm các tác vụ dài (long tasks > 50ms)
│   ├── Độ trễ khi nhập liệu? --> Kiểm tra việc re-render, chi phí của controlled component
│   └── Hiệu ứng bị giật (jank)? --> Kiểm tra layout thrashing, forced reflows
├── Trang sau khi điều hướng
│   ├── Đang tải dữ liệu? --> Đo thời gian phản hồi API, kiểm tra tình trạng waterfall requests
│   └── Render phía client? --> Phân tích thời gian render component, kiểm tra N+1 fetches
└── Backend / API
    ├── Một endpoint duy nhất chậm? --> Phân tích truy vấn DB, kiểm tra index
    ├── Tất cả endpoint đều chậm? --> Kiểm tra connection pool, bộ nhớ (RAM), CPU
    └── Chậm chờn lúc nhanh lúc chậm? --> Kiểm tra tranh chấp khóa (lock contention), GC pauses, phụ thuộc bên ngoài
```

### Bước 2: Xác định nút thắt cổ chai

Các nút thắt cổ chai phổ biến theo danh mục:

**Frontend:**

| Triệu chứng | Nguyên nhân có khả năng | Cách điều tra |
|---------|-------------|---------------|
| LCP chậm | Ảnh lớn, tài nguyên chặn render, máy chủ chậm | Kiểm tra network waterfall, kích thước ảnh |
| CLS cao | Ảnh không có kích thước, nội dung tải muộn, thay đổi font | Kiểm tra layout shift attribution |
| INP kém | JavaScript nặng trên main thread, cập nhật DOM lớn | Kiểm tra các "long tasks" trong Performance trace |
| Tải ban đầu chậm | Bundle quá lớn, quá nhiều yêu cầu mạng | Kiểm tra kích thước bundle, code splitting |

**Backend:**

| Triệu chứng | Nguyên nhân có khả năng | Cách điều tra |
|---------|-------------|---------------|
| API phản hồi chậm | Truy vấn N+1, thiếu index, truy vấn chưa tối ưu | Kiểm tra nhật ký truy vấn cơ sở dữ liệu |
| Bộ nhớ tăng dần | Rò rỉ tham chiếu (leak), cache không giới hạn, payload lớn | Phân tích Heap snapshot |
| CPU tăng đột biến | Tính toán nặng đồng bộ, regex backtracking | CPU profiling |
| Độ trễ cao | Thiếu bộ nhớ đệm, tính toán thừa, nhiều chặng mạng | Trace yêu cầu xuyên suốt hệ thống (Distributed tracing) |

### Bước 3: Khắc phục các Anti-Pattern phổ biến

#### Truy vấn N+1 (Backend)

```typescript
// TỆ: N+1 — mỗi task lại tốn thêm một truy vấn để lấy thông tin chủ sở hữu
const tasks = await db.tasks.findMany();
for (const task of tasks) {
  task.owner = await db.users.findUnique({ where: { id: task.ownerId } });
}

// TỐT: Truy vấn duy nhất bằng cách join/include
const tasks = await db.tasks.findMany({
  include: { owner: true },
});
```

#### Lấy dữ liệu không giới hạn

```typescript
// TỆ: Lấy tất cả bản ghi cùng lúc
const allTasks = await db.tasks.findMany();

// TỐT: Phân trang kèm giới hạn
const tasks = await db.tasks.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' },
});
```

#### Thiếu tối ưu hóa hình ảnh (Frontend)

```html
<!-- TỆ: Không khai báo kích thước, không tối ưu định dạng -->
<img src="/hero.jpg" />

<!-- TỐT: Ảnh Hero / LCP — kết hợp art direction + chuyển đổi độ phân giải, ưu tiên cao -->
<!--
  Hai kỹ thuật được kết hợp:
  - Art direction (media): các kiểu cắt/bố cục khác nhau cho mỗi breakpoint
  - Resolution switching (srcset + sizes): chọn kích thước file phù hợp với mật độ màn hình
-->
<picture>
  <!-- Mobile: cắt ảnh dọc (8:10) -->
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.avif 400w, /hero-mobile-800.avif 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/avif"
  />
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.webp 400w, /hero-mobile-800.webp 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/webp"
  />
  <!-- Desktop: cắt ảnh ngang (2:1) -->
  <source
    srcset="/hero-800.avif 800w, /hero-1200.avif 1200w, /hero-1600.avif 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/avif"
  />
  <source
    srcset="/hero-800.webp 800w, /hero-1200.webp 1200w, /hero-1600.webp 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/webp"
  />
  <img
    src="/hero-desktop.jpg"
    width="1200"
    height="600"
    fetchpriority="high"
    alt="Mô tả ảnh hero"
  />
</picture>

<!-- TỐT: Ảnh dưới nếp gấp (below-the-fold) — tải lười + giải mã bất đồng bộ -->
<img
  src="/content.webp"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
  alt="Mô tả nội dung ảnh"
/>
```

#### Re-render không cần thiết (React)

```tsx
// TỆ: Tạo object mới ở mỗi lần render, khiến các component con phải re-render
function TaskList() {
  return <TaskFilters options={{ sortBy: 'date', order: 'desc' }} />;
}

// TỐT: Tham chiếu ổn định
const DEFAULT_OPTIONS = { sortBy: 'date', order: 'desc' } as const;
function TaskList() {
  return <TaskFilters options={DEFAULT_OPTIONS} />;
}

// Sử dụng React.memo cho các component nặng
const TaskItem = React.memo(function TaskItem({ task }: Props) {
  return <div>{/* render nặng */}</div>;
});

// Sử dụng useMemo cho các tính toán đắt đỏ
function TaskStats({ tasks }: Props) {
  const stats = useMemo(() => calculateStats(tasks), [tasks]);
  return <div>{stats.completed} / {stats.total}</div>;
}
```

#### Kích thước Bundle lớn

```typescript
// Các công cụ đóng gói hiện đại (Vite, webpack 5+) tự động xử lý tree-shaking với named imports,
// miễn là dependency đó cung cấp ESM và được đánh dấu `sideEffects: false` trong package.json.
// Hãy phân tích trước khi thay đổi phong cách import — lợi ích thực sự đến từ tách mã và tải lười (lazy loading).

// TỐT: Import động cho các tính năng nặng, ít dùng
const ChartLibrary = lazy(() => import('./ChartLibrary'));

// TỐT: Tách mã ở mức Route được bọc trong Suspense
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
```

#### Thiếu bộ nhớ đệm (Caching - Backend)

```typescript
// Cache dữ liệu đọc thường xuyên, ít thay đổi
const CACHE_TTL = 5 * 60 * 1000; // 5 phút
let cachedConfig: AppConfig | null = null;
let cacheExpiry = 0;

async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }
  cachedConfig = await db.config.findFirst();
  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedConfig;
}

// Headers cache HTTP cho tài sản tĩnh
app.use('/static', express.static('public', {
  maxAge: '1y',           // Cache trong 1 năm
  immutable: true,        // Không bao giờ cần xác thực lại (sử dụng content hashing trong tên file)
}));

// Cache-Control cho phản hồi API
res.set('Cache-Control', 'public, max-age=300'); // 5 phút
```

## Ngân sách hiệu suất (Performance Budget)

Thiết lập ngân sách và thực thi chúng:

```
JavaScript bundle: < 200KB gzipped (tải ban đầu)
CSS: < 50KB gzipped
Images: < 200KB mỗi ảnh (trên nếp gấp)
Fonts: < 100KB tổng cộng
API response time: < 200ms (p95)
Time to Interactive: < 3.5s trên mạng 4G
Lighthouse Performance score: ≥ 90
```

**Thực thi trong CI:**
```bash
# Kiểm tra kích thước bundle
npx bundlesize --config bundlesize.config.json

# Lighthouse CI
npx lhci autorun
```

## Xem thêm (See Also)

Để biết danh sách kiểm tra hiệu suất chi tiết, các lệnh tối ưu hóa và tham khảo các anti-pattern, hãy xem `references/performance-checklist.md`.

## Ngụy biện phổ biến

| Ngụy biện | Thực tế |
|---|---|
| "Chúng ta sẽ tối ưu hóa sau" | Nợ hiệu suất (Performance debt) sẽ tích tụ dần. Hãy khắc phục các anti-pattern rõ ràng ngay bây giờ, trì hoãn các tối ưu hóa siêu nhỏ. |
| "Nó chạy nhanh trên máy tôi" | Máy của bạn không phải máy của người dùng. Hãy phân tích trên phần cứng và mạng đại diện cho người dùng thực tế. |
| "Tối ưu hóa này quá hiển nhiên" | Nếu bạn không đo lường, bạn không thể biết chắc. Hãy phân tích trước. |
| "Người dùng không nhận ra 100ms đâu" | Nghiên cứu cho thấy độ trễ 100ms ảnh hưởng trực tiếp đến tỷ lệ chuyển đổi. Người dùng nhận ra nhiều hơn bạn nghĩ. |
| "Framework đã lo liệu hiệu suất rồi" | Framework ngăn chặn một số vấn đề nhưng không thể sửa được truy vấn N+1 hoặc bundle quá khổ. |

## Dấu hiệu cảnh báo (Red Flags)

- Tối ưu hóa mà không có dữ liệu phân tích để chứng minh sự cần thiết.
- Xuất hiện mô hình truy vấn N+1 khi lấy dữ liệu.
- Các endpoint danh sách không có phân trang.
- Hình ảnh không khai báo kích thước, không tải lười (lazy load), hoặc không có kích thước phản hồi.
- Kích thước bundle tăng liên tục mà không được kiểm soát.
- Không có hệ thống giám sát hiệu suất trong môi trường production.
- Lạm dụng `React.memo` và `useMemo` ở khắp mọi nơi (dùng quá nhiều cũng tệ như không dùng).

## Xác minh

Sau bất kỳ thay đổi nào liên quan đến hiệu suất:

- [ ] Đã có số liệu đo lường Trước và Sau (con số cụ thể).
- [ ] Nút thắt cổ chai cụ thể đã được xác định và xử lý.
- [ ] Các chỉ số Core Web Vitals nằm trong ngưỡng "Tốt" (Good).
- [ ] Kích thước bundle không tăng lên đáng kể.
- [ ] Không xuất hiện truy vấn N+1 trong mã nguồn mới.
- [ ] Ngân sách hiệu suất vượt qua các bài kiểm tra CI (nếu được cấu hình).
- [ ] Các bài kiểm tra hiện tại vẫn vượt qua (tối ưu hóa không làm hỏng hành vi).
