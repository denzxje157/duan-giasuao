---
name: devops-automation
description: Tự động hóa quy trình CI/CD và chiến lược phát hành sản phẩm. Kết hợp các rào cản chất lượng tự động với quy trình triển khai an toàn, giám sát và kế hoạch hoàn tác (rollback).
---

# DevOps và Tự động hóa (DevOps Automation)

## Tổng quan

Kỹ năng này kết hợp hai trụ cột quan trọng của kỹ thuật phần mềm hiện đại: **Tự động hóa CI/CD** và **Chiến lược Phát hành An toàn**. Mục tiêu là xây dựng một "dây chuyền sản xuất" phần mềm đáng tin cậy, nơi mọi thay đổi đều được kiểm tra tự động trước khi merge và được triển khai lên production với sự kiểm soát tuyệt đối, khả năng quan sát cao và kế hoạch hoàn tác sẵn sàng.

---

## PHẦN 1: CI/CD VÀ TỰ ĐỘNG HÓA

Tự động hóa các rào cản chất lượng (quality gates) để không có thay đổi nào có thể đến được môi trường production mà không vượt qua các bài kiểm tra: lint, kiểm tra kiểu dữ liệu (type check), unit test và build. CI/CD là cơ chế thực thi cho mọi kỹ năng khác — nó bắt được những gì con người và AI bỏ sót, và nó làm điều đó một cách nhất quán cho mọi thay đổi.

**Shift Left (Đẩy về bên trái):** Phát hiện vấn đề càng sớm càng tốt trong quy trình. Một lỗi được phát hiện khi lint chỉ tốn vài phút; cùng một lỗi đó nếu để lọt ra production sẽ tốn hàng giờ. Hãy đẩy các bước kiểm tra lên thượng nguồn — phân tích tĩnh trước khi test, test trước khi đưa lên staging, staging trước khi ra production.

**Nhanh hơn là An toàn hơn:** Các lô thay đổi nhỏ hơn và phát hành thường xuyên hơn giúp giảm rủi ro, chứ không phải tăng rủi ro. Một đợt triển khai với 3 thay đổi sẽ dễ gỡ lỗi hơn nhiều so với một đợt có 30 thay đổi. Phát hành thường xuyên giúp xây dựng sự tự tin vào chính quy trình phát hành đó.

### 1.1 Khi nào cần sử dụng

- Thiết lập quy trình CI cho một dự án mới.
- Thêm hoặc sửa đổi các bước kiểm tra tự động.
- Cấu hình các quy trình triển khai (deployment pipelines).
- Khi một thay đổi cần kích hoạt việc xác minh tự động.
- Gỡ lỗi khi quy trình CI bị thất bại.

### 1.2 Quy trình Rào cản Chất lượng (The Quality Gate Pipeline)

Mọi thay đổi đều phải đi qua các rào cản này trước khi được merge:

```
Mở Pull Request
    │
    ▼
┌───────────────────────┐
│   KIỂM TRA LINT       │  eslint, prettier
│   ↓ vượt qua          │
│   KIỂM TRA KIỂU (TYPE)│  tsc --noEmit
│   ↓ vượt qua          │
│   UNIT TESTS          │  jest/vitest
│   ↓ vượt qua          │
│   BUILD               │  npm run build
│   ↓ vượt qua          │
│   KIỂM TRA TÍCH HỢP   │  API/DB tests
│   ↓ vượt qua          │
│   E2E (tùy chọn)      │  Playwright/Cypress
│   ↓ vượt qua          │
│   KIỂM TRA BẢO MẬT    │  npm audit
│   ↓ vượt qua          │
│   KÍCH THƯỚC BUNDLE   │  bundlesize check
└───────────────────────┘
    │
    ▼
 Sẵn sàng để review
```

**Không rào cản nào được phép bỏ qua.** Nếu lint thất bại, hãy sửa lint — đừng tắt rule. Nếu một bài test thất bại, hãy sửa mã nguồn — đừng bỏ qua bài test.

### 1.3 Cấu hình GitHub Actions

#### Quy trình CI Cơ bản

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Test
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      - name: Security audit
        run: npm audit --audit-level=high
```

#### Với Kiểm thử Tích hợp Cơ sở dữ liệu

```yaml
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: ci_user
          POSTGRES_PASSWORD: ${{ secrets.CI_DB_PASSWORD }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://ci_user:${{ secrets.CI_DB_PASSWORD }}@localhost:5432/testdb
      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://ci_user:${{ secrets.CI_DB_PASSWORD }}@localhost:5432/testdb
```

> **Lưu ý:** Ngay cả đối với các database kiểm thử chỉ dùng trong CI, hãy sử dụng GitHub Secrets cho các thông tin xác thực thay vì ghi cứng giá trị. Điều này tạo thói quen tốt và ngăn chặn việc vô tình tái sử dụng thông tin xác thực kiểm thử trong các ngữ cảnh khác.

#### Kiểm thử E2E

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      - name: Build
        run: npm run build
      - name: Run E2E tests
        run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 1.4 Phản hồi lỗi CI cho AI

Sức mạnh của CI khi kết hợp với AI là vòng lặp phản hồi. Khi CI thất bại:

```
CI thất bại
    │
    ▼
Sao chép đầu ra của lỗi
    │
    ▼
Gửi cho AI:
"Quy trình CI đã thất bại với lỗi sau:
[dán lỗi cụ thể]
Hãy sửa lỗi và xác minh cục bộ trước khi push lại."
    │
    ▼
AI sửa lỗi → push → CI chạy lại
```

**Các mô hình xử lý chính:**

```
Lỗi Lint  → AI chạy `npm run lint --fix` và commit
Lỗi kiểu (Type) → AI đọc vị trí lỗi và sửa kiểu dữ liệu
Lỗi Test  → AI tuân theo kỹ năng debugging-and-error-recovery
Lỗi Build → AI kiểm tra cấu hình và các dependency
```

### 1.5 Chiến lược Triển khai (Deployment Strategies)

#### Triển khai Xem trước (Preview Deployments)

Mọi PR đều có một bản triển khai xem trước để kiểm thử thủ công:

```yaml
# Triển khai xem trước cho mỗi PR (Vercel/Netlify/v.v.)
deploy-preview:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v4
    - name: Deploy preview
      run: npx vercel --token=${{ secrets.VERCEL_TOKEN }}
```

#### Feature Flags (CI Perspective)

Feature flags tách biệt việc triển khai (deployment) khỏi việc phát hành (release). Triển khai các tính năng chưa hoàn thiện hoặc có rủi ro sau các flag để bạn có thể:

- **Ship code mà không cần kích hoạt nó.** Merge vào main sớm, kích hoạt khi sẵn sàng.
- **Roll back mà không cần triển khai lại.** Vô hiệu hóa flag thay vì revert code.
- **Thử nghiệm tính năng mới (Canary).** Kích hoạt cho 1% người dùng, sau đó là 10%, rồi 100%.
- **Chạy A/B tests.** So sánh hành vi khi có và không có tính năng.

```typescript
// Mô hình feature flag đơn giản
if (featureFlags.isEnabled('new-checkout-flow', { userId })) {
  return renderNewCheckout();
}
return renderLegacyCheckout();
```

**Vòng đời của Flag:** Tạo → Kích hoạt để kiểm thử → Canary → Triển khai toàn bộ → Xóa flag và mã nguồn thừa. Các flag tồn tại mãi mãi sẽ trở thành nợ kỹ thuật — hãy thiết lập ngày dọn dẹp khi bạn tạo chúng.

#### Triển khai theo giai đoạn (Staged Rollouts)

```
PR được merge vào main
    │
    ▼
  Triển khai Staging (tự động)
    │ Xác minh thủ công
    ▼
  Triển khai Production (kích hoạt thủ công hoặc tự động sau staging)
    │
    ▼
  Giám sát lỗi (trong vòng 15 phút)
    │
    ├── Phát hiện lỗi → Rollback
    └── Sạch lỗi → Hoàn tất
```

#### Kế hoạch Rollback (CI Perspective)

Mọi đợt triển khai đều phải có khả năng đảo ngược:

```yaml
# Quy trình rollback thủ công
name: Rollback
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Phiên bản để rollback về'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Rollback deployment
        run: |
          # Triển khai phiên bản cũ được chỉ định
          npx vercel rollback ${{ inputs.version }}
```

### 1.6 Quản lý môi trường (Environment Management)

```
.env.example       → Được commit (mẫu cho các lập trình viên)
.env                → KHÔNG được commit (phát triển cục bộ)
.env.test           → Được commit (môi trường test, không chứa bí mật thực)
CI secrets          → Lưu trữ trong GitHub Secrets / vault
Production secrets  → Lưu trữ trong nền tảng triển khai / vault
```

CI không bao giờ được phép có các bí mật của môi trường production. Sử dụng các bí mật riêng biệt cho việc kiểm thử CI.

### 1.7 Tự động hóa ngoài CI

#### Dependabot / Renovate

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

#### Vai trò "Build Cop"

Chỉ định một người chịu trách nhiệm giữ cho CI luôn xanh (luôn vượt qua). Khi build bị hỏng, nhiệm vụ của Build Cop là sửa hoặc revert — chứ không phải là người có thay đổi gây ra lỗi. Điều này ngăn chặn việc tích tụ các bản build bị hỏng trong khi mọi người đều cho rằng ai đó khác sẽ sửa nó.

#### Các bước kiểm tra PR (PR Checks)

- **Yêu cầu review:** Ít nhất 1 phê duyệt trước khi merge.
- **Yêu cầu trạng thái:** CI phải vượt qua trước khi merge.
- **Bảo vệ nhánh (Branch protection):** Không cho phép force-push vào main.
- **Tự động merge (Auto-merge):** Nếu mọi kiểm tra đều vượt qua và được phê duyệt, hệ thống sẽ tự động merge.

### 1.8 Tối ưu hóa CI

Khi quy trình vượt quá 10 phút, hãy áp dụng các chiến lược sau theo thứ tự mức độ ảnh hưởng:

```
Quy trình CI chậm?
├── Cache các dependency
│   └── Sử dụng actions/cache hoặc tùy chọn cache setup-node cho node_modules
├── Chạy các job song song
│   └── Tách lint, typecheck, test, build thành các job song song riêng biệt
├── Chỉ chạy những gì đã thay đổi
│   └── Sử dụng bộ lọc đường dẫn (path filters) để bỏ qua các job không liên quan
├── Sử dụng matrix builds
│   └── Chia nhỏ bộ test trên nhiều trình chạy (runners)
├── Tối ưu hóa bộ test
│   └── Loại bỏ các bài test chậm khỏi quy trình quan trọng, chạy chúng theo lịch trình
└── Sử dụng runner lớn hơn
    └── Sử dụng runner lớn hơn của GitHub hoặc tự lưu trữ (self-hosted) cho các tác vụ nặng CPU
```

**Ví dụ: caching và song song hóa**
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --coverage
```

### 1.9 Lý do ngụy biện & Red Flags (CI)

| Lý do ngụy biện | Thực tế |
|---|---|
| "CI quá chậm" | Hãy tối ưu quy trình, đừng bỏ qua nó. Một quy trình 5 phút có thể ngăn chặn hàng giờ gỡ lỗi sau này. |
| "Thay đổi này nhỏ nhặt thôi, bỏ qua CI đi" | Những thay đổi nhỏ nhặt thường làm hỏng build. Dù sao CI cũng rất nhanh đối với các thay đổi nhỏ. |
| "Bài test này bị chập chờn (flaky), cứ chạy lại là được" | Test chập chờn sẽ che giấu các lỗi thực sự và làm lãng phí thời gian của mọi người. Hãy sửa sự chập chờn đó. |
| "Chúng ta sẽ thêm CI sau" | Các dự án không có CI sẽ tích tụ các trạng thái bị hỏng. Hãy thiết lập nó ngay từ ngày đầu tiên. |
| "Kiểm thử thủ công là đủ rồi" | Kiểm thử thủ công không thể mở rộng và không có tính lặp lại. Hãy tự động hóa những gì có thể. |

**Dấu hiệu cảnh báo (Red Flags):**
- Không có quy trình CI trong dự án.
- Các thất bại CI bị lờ đi hoặc bị tắt thông báo.
- Các bài test bị vô hiệu hóa trong CI để quy trình được vượt qua.
- Triển khai lên production mà không qua xác minh staging.
- Không có cơ chế rollback.
- Bí mật được lưu trữ trong mã nguồn hoặc tệp cấu hình CI.
- Thời gian chạy CI dài mà không có nỗ lực tối ưu hóa.

### 1.10 Xác minh (CI)

- [ ] Mọi rào cản chất lượng đều hiện diện (lint, types, tests, build, audit).
- [ ] Quy trình chạy trên mọi PR và mỗi lần push vào main.
- [ ] Thất bại sẽ chặn việc merge (đã cấu hình bảo vệ nhánh).
- [ ] Kết quả CI được phản hồi ngược lại quy trình phát triển.
- [ ] Bí mật được lưu trữ trong trình quản lý bí mật, không phải trong code.
- [ ] Việc triển khai có cơ chế rollback.
- [ ] Quy trình chạy bộ test trong vòng dưới 10 phút.

---

## PHẦN 2: PHÁT HÀNH VÀ TRIỂN KHAI (SHIPPING AND LAUNCH)

Phát hành với sự tự tin. Mục tiêu không chỉ là triển khai (deploy) — mà là triển khai một cách an toàn, có hệ thống giám sát sẵn sàng, có kế hoạch hoàn tác (rollback) chuẩn bị kỹ lưỡng và hiểu rõ thành công trông như thế nào. Mọi đợt ra mắt đều phải có khả năng đảo ngược, có thể quan sát được và thực hiện theo từng bước tăng dần.

### 2.1 Khi nào cần sử dụng

- Triển khai một tính năng lên production lần đầu tiên.
- Phát hành một thay đổi quan trọng cho người dùng.
- Di trú dữ liệu hoặc hạ tầng.
- Mở một chương trình beta hoặc truy cập sớm (early access).
- Bất kỳ đợt triển khai nào có mang theo rủi ro (thực tế là tất cả mọi đợt triển khai).

### 2.2 Danh sách Kiểm tra trước khi Ra mắt (Pre-Launch Checklist)

#### Chất lượng Code
- [ ] Tất cả các bài test vượt qua (unit, integration, e2e).
- [ ] Build thành công không có cảnh báo.
- [ ] Lint và kiểm tra kiểu dữ liệu (type checking) vượt qua.
- [ ] Code đã được review và phê duyệt.
- [ ] Không còn các comment TODO nào cần giải quyết trước khi ra mắt.
- [ ] Không còn các lệnh `console.log` dùng để debug trong mã nguồn production.
- [ ] Việc xử lý lỗi đã bao quát các tình huống thất bại dự kiến.

#### Bảo mật
- [ ] Không có bí mật (secrets) trong mã nguồn hoặc hệ thống quản lý phiên bản.
- [ ] `npm audit` không hiển thị lỗ hổng nghiêm trọng (critical) hoặc cao (high).
- [ ] Xác thực dữ liệu đầu vào trên tất cả các endpoint phía người dùng.
- [ ] Các bước kiểm tra xác thực (authentication) và phân quyền (authorization) đã sẵn sàng.
- [ ] Các header bảo mật đã được cấu hình (CSP, HSTS, v.v.).
- [ ] Giới hạn tốc độ (Rate limiting) trên các endpoint xác thực.
- [ ] CORS được cấu hình cho các origin cụ thể (không dùng wildcard `*`).

#### Hiệu suất
- [ ] Các chỉ số Core Web Vitals nằm trong ngưỡng "Tốt" (Good).
- [ ] Không có truy vấn N+1 trong các luồng xử lý quan trọng.
- [ ] Hình ảnh được tối ưu hóa (nén, kích thước đáp ứng, lazy loading).
- [ ] Kích thước bundle nằm trong ngân sách cho phép.
- [ ] Các truy vấn cơ sở dữ liệu có các index phù hợp.
- [ ] Cấu hình caching cho các tài nguyên tĩnh và các truy vấn lặp lại.

#### Khả năng truy cập (Accessibility)
- [ ] Điều hướng bằng bàn phím hoạt động cho tất cả các phần tử tương tác.
- [ ] Trình đọc màn hình (Screen reader) có thể truyền tải nội dung và cấu trúc trang.
- [ ] Độ tương phản màu sắc đáp ứng WCAG 2.1 AA (4.5:1 cho văn bản).
- [ ] Quản lý focus đúng cách cho các modal và nội dung động.
- [ ] Các thông báo lỗi mang tính mô tả và được liên kết với các trường trong form.
- [ ] Không có cảnh báo về khả năng truy cập trong axe-core hoặc Lighthouse.

#### Hạ tầng
- [ ] Các biến môi trường đã được thiết lập trên production.
- [ ] Các bản di trú cơ sở dữ liệu (migrations) đã được áp dụng (hoặc sẵn sàng để áp dụng).
- [ ] DNS và SSL đã được cấu hình.
- [ ] CDN được cấu hình cho các tài nguyên tĩnh.
- [ ] Đã cấu hình nhật ký (logging) và báo cáo lỗi.
- [ ] Endpoint kiểm tra sức khỏe (health check) tồn tại và phản hồi tốt.

#### Tài liệu hướng dẫn
- [ ] README được cập nhật với bất kỳ yêu cầu thiết lập mới nào.
- [ ] Tài liệu API được cập nhật bản mới nhất.
- [ ] Các ADR được viết cho bất kỳ quyết định kiến trúc nào.
- [ ] Changelog đã được cập nhật.
- [ ] Tài liệu hướng dẫn cho người dùng đã được cập nhật (nếu áp dụng).

### 2.3 Chiến lược Feature Flag (Shipping Perspective)

Triển khai đằng sau các feature flag để tách biệt việc cài đặt code (deployment) khỏi việc kích hoạt tính năng (release):

```typescript
// Kiểm tra feature flag
const flags = await getFeatureFlags(userId);

if (flags.taskSharing) {
  // Tính năng mới: chia sẻ nhiệm vụ
  return <TaskSharingPanel task={task} />;
}

// Mặc định: hành vi hiện tại
return null;
```

**Vòng đời của Feature flag:**
1. TRIỂN KHAI với flag TẮT     → Code đã lên production nhưng chưa hoạt động
2. BẬT cho nội bộ/beta        → Kiểm thử nội bộ trong môi trường production
3. PHÁT HÀNH DẦN DẦN          → 5% → 25% → 50% → 100% người dùng
4. GIÁM SÁT tại mỗi giai đoạn → Theo dõi tỷ lệ lỗi, hiệu suất, phản hồi người dùng
5. DỌN DẸP                    → Xóa flag và mã nguồn thừa sau khi đã phát hành 100%

**Các quy tắc:**
- Mỗi feature flag phải có một chủ sở hữu và ngày hết hạn.
- Dọn dẹp các flag trong vòng 2 tuần sau khi phát hành toàn bộ.
- Đừng lồng các feature flag vào nhau.
- Kiểm thử cả hai trạng thái của flag (bật và tắt) trong CI.

### 2.4 Triển khai theo giai đoạn (Staged Rollout Detail)

#### Trình tự Triển khai
1. TRIỂN KHAI lên staging
   └── Chạy toàn bộ bộ test trong môi trường staging
   └── Kiểm thử thủ công (smoke test) các luồng quan trọng

2. TRIỂN KHAI lên production (feature flag TẮT)
   └── Xác minh triển khai thành công (health check)
   └── Kiểm tra giám sát lỗi (không có lỗi mới phát sinh)

3. BẬT cho nội bộ (flag BẬT cho người dùng nội bộ)
   └── Nhóm phát triển sử dụng tính năng trên production
   └── Cửa sổ giám sát trong 24 giờ

4. Triển khai CANARY (flag BẬT cho 5% người dùng)
   └── Giám sát tỷ lệ lỗi, độ trễ, hành vi người dùng
   └── So sánh các chỉ số: canary vs. baseline (nhóm đối chứng)
   └── Cửa sổ giám sát trong 24-48 giờ
   └── Chỉ tiến tiếp nếu tất cả các ngưỡng đều đạt (xem bảng bên dưới)

5. Tăng dần TỶ LỆ (25% -> 50% -> 100%)
   └── Thực hiện giám sát tương tự tại mỗi bước
   └── Có khả năng quay lại tỷ lệ phần trăm trước đó tại bất kỳ thời điểm nào

6. PHÁT HÀNH TOÀN BỘ (flag BẬT cho tất cả người dùng)
   └── Giám sát trong 1 tuần
   └── Dọn dẹp feature flag

#### Các ngưỡng Quyết định Triển khai
Sử dụng các ngưỡng này để quyết định xem nên tiến tiếp, tạm dừng hay hoàn tác:

| Chỉ số | Tiến tiếp (xanh) | Tạm dừng & Điều tra (vàng) | Hoàn tác (đỏ) |
|--------|-----------------|-------------------------------|-----------------|
| Tỷ lệ lỗi | Trong khoảng 10% của baseline | Cao hơn baseline 10-100% | >2x baseline |
| Độ trễ P95 | Trong khoảng 20% của baseline | Cao hơn baseline 20-50% | >50% trên baseline |
| Lỗi JS phía client | Không có loại lỗi mới | Lỗi mới xuất hiện ở <0.1% phiên | Lỗi mới ở >0.1% phiên |
| Chỉ số kinh doanh | Trung tính hoặc tích cực | Giảm <5% (có thể là nhiễu) | Giảm >5% |

#### Khi nào cần Hoàn tác (Rollback)
Hoàn tác ngay lập tức nếu:
- Tỷ lệ lỗi tăng hơn gấp đôi so với mức bình thường (baseline).
- Độ trễ P95 tăng hơn 50%.
- Các vấn đề do người dùng báo cáo tăng đột biến.
- Phát hiện các vấn đề về tính toàn vẹn dữ liệu.
- Phát hiện lỗ hổng bảo mật.

### 2.5 Giám sát và Khả năng quan sát (Monitoring and Observability)

#### Những gì cần Giám sát
```
Các chỉ số ứng dụng:
├── Tỷ lệ lỗi (tổng số và theo từng endpoint)
├── Thời gian phản hồi (p50, p95, p99)
├── Lưu lượng yêu cầu (Request volume)
├── Số người dùng hoạt động
└── Các chỉ số kinh doanh then chốt (tỷ lệ chuyển đổi, tương tác)

Các chỉ số hạ tầng:
├── Sử dụng CPU và bộ nhớ
├── Sử dụng pool kết nối cơ sở dữ liệu
├── Dung lượng đĩa trống
├── Độ trễ mạng
└── Độ dài hàng đợi (nếu áp dụng)

Các chỉ số phía client:
├── Core Web Vitals (LCP, INP, CLS)
├── Các lỗi JavaScript
├── Tỷ lệ lỗi API từ góc nhìn phía client
└── Thời gian tải trang
```

#### Báo cáo Lỗi
```typescript
// Thiết lập Error boundary kèm báo cáo lỗi
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, {
      componentStack: info.componentStack,
      userId: getCurrentUser()?.id,
      page: window.location.pathname,
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

// Báo cáo lỗi phía server
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  reportError(err, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
  });

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra' },
  });
});
```

#### Xác minh sau khi Ra mắt
Trong giờ đầu tiên:
1. Kiểm tra endpoint health trả về 200
2. Kiểm tra dashboard giám sát lỗi (không có loại lỗi mới)
3. Kiểm tra dashboard độ trễ (không có sự sụt giảm hiệu suất)
4. Kiểm thử thủ công luồng người dùng quan trọng
5. Xác minh nhật ký (logs) đang chảy và có thể đọc được
6. Xác nhận cơ chế rollback hoạt động tốt

### 2.6 Chiến lược Hoàn tác Chi tiết (Rollback Strategy)

Mọi đợt triển khai đều cần một kế hoạch hoàn tác:

```markdown
## Kế hoạch Hoàn tác cho [Tính năng/Bản phát hành]

### Các điều kiện kích hoạt
- Tỷ lệ lỗi > 2x baseline
- Độ trễ P95 > [X]ms
- Người dùng báo cáo về [vấn đề cụ thể]

### Các bước Hoàn tác
1. Vô hiệu hóa feature flag (nếu áp dụng)
   HOẶC
1. Triển khai phiên bản trước đó: `git revert <commit> && git push`
2. Xác minh việc hoàn tác: kiểm tra health check, giám sát lỗi
3. Thông báo: thông báo cho nhóm về việc hoàn tác

### Lưu ý về Cơ sở dữ liệu
- Bản di trú [X] có lệnh rollback: `npx prisma migrate rollback`
- Dữ liệu được chèn bởi tính năng mới: [giữ lại / dọn dẹp]

### Thời gian thực hiện Hoàn tác
- Feature flag: < 1 phút
- Triển khai lại phiên bản trước: < 5 phút
- Hoàn tác cơ sở dữ liệu: < 15 phút
```

### 2.7 Lý do ngụy biện & Red Flags (Shipping)

| Lý do ngụy biện | Thực tế |
|---|---|
| "Nó chạy tốt ở staging thì sẽ ổn ở production thôi" | Production có dữ liệu và lưu lượng khác hẳn. Hãy giám sát sau khi deploy. |
| "Chúng ta không cần feature flag cho cái này" | Mọi tính năng đều có lợi từ một nút "ngắt khẩn cấp". |
| "Giám sát là một gánh nặng" | Không có giám sát nghĩa là bạn phát hiện vấn đề qua phàn nàn của người dùng. |
| "Chúng ta sẽ thêm giám sát sau" | Thêm nó trước khi ra mắt. Bạn không thể gỡ lỗi những thứ bạn không nhìn thấy. |
| "Hoàn tác là thừa nhận thất bại" | Hoàn tác là trách nhiệm. Phát hành code hỏng mới là thất bại thực sự. |

**Dấu hiệu cảnh báo (Red Flags):**
- Triển khai mà không có kế hoạch hoàn tác.
- Không có hệ thống giám sát hoặc báo cáo lỗi trên production.
- Phát hành kiểu "Big-bang" (không qua staging).
- Các feature flag không có ngày hết hạn.
- Không có ai theo dõi việc triển khai trong giờ đầu tiên.
- Cấu hình môi trường production được thực hiện theo trí nhớ.
- "Chiều thứ Sáu rồi, triển khai luôn thôi!"

### 2.8 Xác minh (Shipping)

Trước khi triển khai:
- [ ] Danh sách kiểm tra trước khi ra mắt đã hoàn thành.
- [ ] Feature flag đã được cấu hình.
- [ ] Kế hoạch hoàn tác đã được tài liệu hóa.
- [ ] Các dashboard giám sát đã được thiết lập.
- [ ] Nhóm đã được thông báo.

Sau khi triển khai:
- [ ] Health check trả về 200.
- [ ] Tỷ lệ lỗi và độ trễ ở mức bình thường.
- [ ] Luồng người dùng quan trọng hoạt động tốt.
- [ ] Nhật ký (logs) đang chảy ổn định.
- [ ] Việc hoàn tác đã được kiểm tra sẵn sàng.

---

## TỔNG KẾT: DANH SÁCH KIỂM TRA DEVOPS CUỐI CÙNG

- [ ] **CI:** Mọi PR đều vượt qua rào cản chất lượng (lint, types, tests, build, security).
- [ ] **Tự động hóa:** Các bí mật được quản lý an toàn, quy trình build chạy dưới 10 phút.
- [ ] **Sẵn sàng:** Danh sách Pre-Launch Checklist đã được kiểm tra toàn bộ.
- [ ] **Flag:** Tính năng quan trọng nằm sau Feature Flags với kế hoạch dọn dẹp.
- [ ] **Rollout:** Chiến lược triển khai theo giai đoạn (Canary/Staged) đã sẵn sàng.
- [ ] **Giám sát:** Các dashboard về lỗi, độ trễ và chỉ số kinh doanh đã hoạt động.
- [ ] **Rollback:** Kế hoạch hoàn tác đã được tài liệu hóa và xác minh tính khả thi.

---
**VẬN HÀNH XUẤT SẮC:** Sự kết hợp giữa tự động hóa nghiêm ngặt và quy trình phát hành thận trọng là cách duy nhất để duy trì tốc độ phát triển cao mà không làm giảm chất lượng sản phẩm.
