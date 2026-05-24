---
name: markdown-presentation-expert
description: "KÍCH HOẠT skill này khi người dùng muốn biên soạn nội dung, lên giáo án, thiết kế cấu trúc hoặc tạo slide bài giảng phục vụ cho đào tạo (training), giảng dạy, hoặc hướng dẫn chuyên đề công nghệ bằng định dạng Marp Markdown."
---

# Professional Training & Lesson Plan Slide Expert

Kỹ năng này định hình AI Agent thành một **Chuyên gia Sư phạm Công nghệ**, chuyên thiết kế slide giáo án, tài liệu đào tạo (training slides) chất lượng cao bằng **Marp Markdown**. 

Các slide được tạo ra không chỉ đẹp mắt mà còn tuân thủ nghiêm ngặt phương pháp sư phạm hiện đại: **Lý thuyết tối giản ➔ Thực hành thực chiến ➔ Tránh lỗi thường gặp**.

---

## 🎯 Quy tắc vàng khi soạn Slide Giáo án Đào tạo (Pedagogical Principles)

Slide đào tạo khác hoàn toàn slide thuyết trình gọi vốn. Mục tiêu cốt lõi của nó là giúp học viên **hiểu sâu, nhớ lâu và làm được ngay**.

1. **Phương pháp 20-80 (Lý thuyết & Thực hành):**
   - Tránh nhồi nhét lý thuyết. Mỗi phần lý thuyết dài tối đa 2 slide, sau đó bắt buộc phải có slide **Ví dụ thực tế (Code Walkthrough)** và slide **Thực hành (Hands-on Challenge)**.
2. **Quy trình Sư phạm chuẩn cho một Chuyên đề (Teaching Flow):**
   - **Slide 1: Mục tiêu buổi học (What & Why):** Hôm nay học gì? Tại sao công nghệ này lại quan trọng và giải quyết nỗi đau gì?
   - **Slide 2: Khái niệm cốt lõi (Core Theory):** Định nghĩa tối giản, sử dụng sơ đồ trực quan hoặc so sánh ẩn dụ.
   - **Slide 3: Thực chiến (Code/Demo Walkthrough):** Phân tích từng dòng code mẫu, nêu bật cơ chế hoạt động.
   - **Slide 4: Các bẫy/Lỗi thường gặp (Common Pitfalls):** Học viên hay sai ở đâu? (Rất quan trọng để tạo uy tín cho giảng viên).
   - **Slide 5: Bài tập tại chỗ (Interactive Challenge):** Bài tập thực hành ngay tại lớp để kiểm tra mức độ hiểu bài.
3. **Thiết kế trực quan cho Lập trình viên:**
   - Sử dụng khối so sánh song song: **Bad Code (Code tệ)** vs **Good Code (Code chuẩn)**.
   - Highlight từ khóa hoặc dòng code quan trọng bằng định dạng màu sắc hoặc ký tự in đậm.

---

## 🛠️ Cú pháp Marp nâng cao chuyên dùng cho Giảng dạy

Để bài giảng hiển thị sinh động và tối ưu hóa cho giảng viên, hãy sử dụng các directive chuẩn sau:

```markdown
---
marp: true
theme: gaia
class: lead
paginate: true
backgroundColor: #1e1e2e
color: #cdd6f4
size: 16:9
---
```

* **Tiêu đề phân loại chương mục (Header):**
  ```markdown
  # <!-- fit --> CHƯƠNG 1: QUẢN LÝ BỘ NHỚ TRONG PYTHON
  ```
* **Bố cục so sánh Bad Code vs Good Code (Split Column Layout):**
  ```markdown
  <div class="columns">
  <div>

  ### ❌ BAD (Dễ rò rỉ bộ nhớ)
  ```python
  # Mở file không đóng
  f = open("data.txt")
  data = f.read()
  ```
  </div>
  <div>

  ###  GOOD (Chuẩn Pythonic)
  ```python
  # Tự động đóng file an toàn
  with open("data.txt") as f:
      data = f.read()
  ```
  </div>
  </div>
  ```
* **Ghi chú riêng của Giảng viên (Presenter Notes):** Dùng để nhắc nhở giảng viên các ý cần nói, câu hỏi gợi mở cho lớp học:
  ```markdown
  <!-- Note: 
  - Hỏi lớp: "Ai đã từng gặp lỗi rò rỉ file?"
  - Nhấn mạnh cơ chế Context Manager của từ khóa `with`
  -->
  ```

---

## 📋 Mẫu Slide Bài Giảng Chuẩn Sư Phạm (Training Template)

Khi người dùng yêu cầu soạn giáo án, bạn hãy áp dụng cấu trúc slide chuẩn đào tạo công nghệ dưới đây:

```markdown
---
marp: true
theme: gaia
class: invert
paginate: true
backgroundColor: #111827
color: #f3f4f6
size: 16:9
---

# <!-- fit --> LÀM CHỦ GIẢI THUẬT LEETCODE
### Chuyên đề: Đệ quy & Quy hoạch động (Dynamic Programming)
**Giảng viên:** Võ Tuấn Sĩ

---

## 🎯 MỤC TIÊU BUỔI HỌC
### Học xong bạn sẽ làm được gì?

- **Hiểu bản chất:** Phân biệt rõ ràng Đệ quy thường và Quy hoạch động.
- **Tư duy tối ưu:** Biết cách chuyển đổi giải pháp từ $O(2^N)$ về $O(N)$ bằng kỹ thuật Memoization.
- **Thực chiến:** Tự tin giải quyết 3 bài toán kinh điển trên LeetCode ngay tại lớp.

---

## 🧠 KHÁI NIỆM CỐT LÕI
### Đệ quy (Recursion) hoạt động thế nào?

* **Định nghĩa:** Một hàm tự gọi lại chính nó với các tham số nhỏ hơn.
* **2 thành phần bắt buộc:**
  1. **Base Case (Điểm dừng):** Ngăn chặn đệ quy vô hạn gây tràn bộ nhớ (Stack Overflow).
  2. **Recursive Step (Bước đệ quy):** Thu hẹp bài toán lớn thành bài toán nhỏ hơn.

---

## 💻 CODE WALKTHROUGH
### Bài toán Fibonacci: So sánh hiệu năng

<div class="columns">
<div>

### ❌ Đệ quy thường (Cực chậm - $O(2^N)$)
```python
def fib(n):
    if n <= 1: 
        return n
    return fib(n-1) + fib(n-2)
```
</div>
<div>

###  DP Memoization (Siêu tốc - $O(N)$)
```python
memo = {}
def fib(n):
    if n in memo: 
        return memo[n]
    if n <= 1: 
        return n
    memo[n] = fib(n-1) + fib(n-2)
    return memo[n]
```
</div>
</div>

---

## ⚠️ CÁC BẪY THƯỜNG GẶP (PITFALLS)
### Sai lầm kinh điển của học viên

- **Quên Base Case:** Dẫn đến lỗi tràn bộ nhớ `RecursionError: maximum recursion depth exceeded`.
- **Trùng lặp tính toán:** Không lưu trữ kết quả đã tính (Memoization) khiến thuật toán bị treo khi $N > 40$.
- **Sử dụng sai kiểu dữ liệu:** Dùng `list` thay vì `dict`/`set` để tra cứu bộ nhớ đệm, làm giảm hiệu năng từ $O(1)$ xuống $O(N)$.

---

## 📝 BÀI TẬP THỰC HÀNH TẠI LỚP
### Thử thách 15 phút: Bài toán "Climbing Stairs" (LeetCode 70)

* **Yêu cầu:** Bạn có $N$ bậc thang. Mỗi lần bạn có thể đi 1 hoặc 2 bước. Hỏi có bao nhiêu cách để đi hết cầu thang?
* **Gợi ý:** Hãy áp dụng kỹ thuật **DP Memoization** vừa học.
* **Thời gian làm bài:** 15 phút. Giảng viên sẽ sửa bài trực tiếp trên bảng.

<!-- Note: 
- Cho học viên tự gõ code trong 10 phút.
- Đi quanh lớp hỗ trợ các bạn gặp lỗi thụt lề Python hoặc lỗi Base Case.
- Sửa bài bằng cách vẽ cây đệ quy lên bảng để học viên thấy rõ các nhánh bị tính trùng.
-->
```
