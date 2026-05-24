---
name: lap-ke-hoach-trien-khai
description: Sử dụng khi bạn đã có đặc tả (spec) hoặc yêu cầu cho một nhiệm vụ gồm nhiều bước, trước khi bắt đầu chạm vào code.
---

# Lập Kế hoạch Triển khai (Writing Plans)

## Tổng quan

Viết kế hoạch triển khai toàn diện, giả định rằng kỹ sư thực hiện chưa có chút ngữ cảnh nào về codebase của chúng ta và có thể có gu thẩm mỹ chưa chuẩn. Tài liệu hóa mọi thứ họ cần biết: những tệp nào cần tác động cho mỗi nhiệm vụ, code, kiểm thử, tài liệu họ có thể cần kiểm tra và cách thức kiểm thử. Cung cấp cho họ toàn bộ kế hoạch dưới dạng các nhiệm vụ nhỏ gọn (bite-sized). Tuân thủ DRY, YAGNI, TDD và thực hiện commit thường xuyên.

Giả định rằng họ là một nhà phát triển có kỹ năng, nhưng hầu như không biết gì về bộ công cụ hoặc lĩnh vực bài toán của chúng ta. Giả định rằng họ chưa nắm vững cách thiết kế bài kiểm thử (test design) tốt.

**Thông báo khi bắt đầu:** "Tôi đang sử dụng kỹ năng lap-ke-hoach-trien-khai để tạo kế hoạch triển khai."

**Ngữ cảnh:** Bước này nên được thực hiện trong một worktree chuyên dụng (được tạo bởi kỹ năng brainstorming).

**Lưu tệp kế hoạch tại:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- (Lưu ý: Các thiết lập ưu tiên của người dùng về vị trí lưu kế hoạch sẽ ghi đè lên mặc định này)

## Kiểm tra Phạm vi (Scope Check)

Nếu bản đặc tả (spec) bao gồm nhiều hệ thống con độc lập, nó nên được chia nhỏ thành các spec cho dự án con trong quá trình brainstorming. Nếu chưa được chia, hãy đề xuất chia nhỏ thành các kế hoạch riêng biệt — mỗi hệ thống con một kế hoạch. Mỗi kế hoạch phải tạo ra một phần mềm hoạt động được và có thể kiểm thử độc lập.

## Cấu trúc Tệp (File Structure)

Trước khi định nghĩa các nhiệm vụ, hãy lập bản đồ các tệp sẽ được tạo mới hoặc sửa đổi và trách nhiệm của từng tệp. Đây là nơi các quyết định về phân rã (decomposition) được chốt lại.

- Thiết kế các đơn vị với ranh giới rõ ràng và giao diện được định nghĩa tốt. Mỗi tệp nên có một trách nhiệm duy nhất và rõ ràng.
- Bạn sẽ tư duy tốt nhất về mã nguồn khi có thể nắm bắt toàn bộ ngữ cảnh cùng lúc, và các chỉnh sửa sẽ đáng tin cậy hơn khi các tệp được tập trung. Ưu tiên các tệp nhỏ, tập trung thay vì các tệp lớn làm quá nhiều việc.
- Các tệp thay đổi cùng nhau nên nằm cùng nhau. Chia theo trách nhiệm, không chia theo lớp kỹ thuật.
- Trong các codebase hiện có, hãy tuân theo các mô hình đã thiết lập. Nếu codebase sử dụng các tệp lớn, đừng đơn phương cấu trúc lại — nhưng nếu một tệp bạn đang sửa đổi đã trở nên quá cồng kềnh, việc đưa bước chia tách tệp vào kế hoạch là hợp lý.

Cấu trúc này sẽ định hướng cho việc phân chia nhiệm vụ. Mỗi nhiệm vụ nên tạo ra những thay đổi tự thân nó có ý nghĩa và có thể hoạt động độc lập.

## Độ chia nhỏ của nhiệm vụ (Bite-Sized Task Granularity)

**Mỗi bước là một hành động (từ 2-5 phút):**
- "Viết một bài kiểm thử thất bại (failing test)" - một bước
- "Chạy thử để chắc chắn nó thất bại" - một bước
- "Triển khai lượng mã nguồn tối thiểu để bài kiểm thử vượt qua" - một bước
- "Chạy lại các bài kiểm thử và đảm bảo chúng vượt qua" - một bước
- "Commit" - một bước

## Tiêu đề của tài liệu kế hoạch (Plan Document Header)

**Mọi kế hoạch BẮT BUỘC phải bắt đầu bằng tiêu đề này:**

```markdown
# Kế hoạch Triển khai [Tên tính năng]

> **Dành cho các tác vụ agentic:** YÊU CẦU KỸ NĂNG PHỤ: Sử dụng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans để triển khai kế hoạch này theo từng nhiệm vụ. Các bước sử dụng cú pháp dấu tích (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu:** [Một câu mô tả những gì kế hoạch này sẽ xây dựng]

**Kiến trúc:** [2-3 câu về phương pháp tiếp cận]

**Công nghệ sử dụng:** [Các công nghệ/thư viện chính]

---
```

## Cấu trúc Nhiệm vụ (Task Structure)

````markdown
### Nhiệm vụ N: [Tên Component]

**Các tệp:**
- Tạo mới: `path/to/file.py`
- Sửa đổi: `path/to/existing.py:123-145`
- Kiểm thử: `tests/path/to/test.py`

- [ ] **Bước 1: Viết bài kiểm thử thất bại**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Bước 2: Chạy bài kiểm thử để xác nhận nó thất bại**

Chạy: `pytest tests/path/test.py::test_name -v`
Kết quả mong đợi: THẤT BẠI với lỗi "function not defined"

- [ ] **Bước 3: Viết mã nguồn triển khai tối thiểu**

```python
def function(input):
    return expected
```

- [ ] **Bước 4: Chạy bài kiểm thử để xác nhận nó vượt qua**

Chạy: `pytest tests/path/test.py::test_name -v`
Kết quả mong đợi: VƯỢT QUA (PASS)

- [ ] **Bước 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## Không sử dụng chỗ trống (No Placeholders)

Mọi bước phải chứa nội dung thực tế mà một kỹ sư cần. Dưới đây là những lỗi gây **thất bại cho kế hoạch** — tuyệt đối không viết chúng:
- "TBD", "TODO", "triển khai sau", "điền chi tiết vào đây"
- "Thêm xử lý lỗi phù hợp" / "thêm xác thực" / "xử lý các trường hợp biên"
- "Viết bài kiểm thử cho phần trên" (mà không có mã nguồn kiểm thử thực tế)
- "Tương tự như Nhiệm vụ N" (hãy lặp lại mã nguồn — vì kỹ sư có thể đọc các nhiệm vụ không theo thứ tự)
- Các bước mô tả việc cần làm mà không chỉ ra cách làm (bắt buộc phải có khối code cho các bước về code)
- Tham chiếu đến các kiểu dữ liệu, hàm hoặc phương thức chưa được định nghĩa trong bất kỳ nhiệm vụ nào.

## Ghi nhớ
- Luôn chỉ rõ đường dẫn tệp chính xác.
- Mã nguồn đầy đủ trong mọi bước — nếu một bước thay đổi code, hãy hiển thị đoạn code đó.
- Các lệnh chính xác kèm theo kết quả mong đợi.
- Tuân thủ DRY, YAGNI, TDD và commit thường xuyên.

## Tự đánh giá (Self-Review)

Sau khi viết xong kế hoạch, hãy đọc lại bản đặc tả (spec) với cái nhìn khách quan và đối chiếu kế hoạch với nó. Đây là một danh sách kiểm tra bạn tự thực hiện.

**1. Độ bao phủ của Spec:** Lướt qua từng phần/yêu cầu trong spec. Bạn có thể chỉ ra nhiệm vụ nào triển khai yêu cầu đó không? Liệt kê bất kỳ lỗ hổng nào.

**2. Quét các chỗ trống (Placeholder):** Tìm kiếm trong kế hoạch các dấu hiệu cảnh báo — bất kỳ mẫu nào từ phần "Không sử dụng chỗ trống" ở trên. Hãy sửa chúng.

**3. Tính nhất quán của kiểu dữ liệu:** Các kiểu dữ liệu, chữ ký phương thức và tên thuộc tính bạn sử dụng trong các nhiệm vụ sau có khớp với những gì bạn đã định nghĩa ở các nhiệm vụ trước không? Ví dụ: một hàm gọi là `clearLayers()` ở Nhiệm vụ 3 nhưng lại là `clearFullLayers()` ở Nhiệm vụ 7 là một lỗi.

Nếu bạn tìm thấy vấn đề, hãy sửa trực tiếp ngay tại đó. Không cần phải đánh giá lại từ đầu — chỉ cần sửa và tiếp tục. Nếu bạn thấy một yêu cầu trong spec chưa có nhiệm vụ nào đảm nhận, hãy thêm nhiệm vụ đó.

## Chuyển giao Thực hiện (Execution Handoff)

Sau khi lưu kế hoạch, hãy đưa ra lựa chọn thực hiện:

**"Kế hoạch đã hoàn tất và được lưu tại `docs/superpowers/plans/<filename>.md`. Có hai tùy chọn thực hiện:**

**1. Điều phối bởi Subagent (Khuyến nghị)** - Tôi sẽ điều phối một subagent mới cho mỗi nhiệm vụ, review giữa các nhiệm vụ, giúp lặp lại nhanh chóng.

**2. Thực hiện trực tiếp (Inline Execution)** - Thực hiện các nhiệm vụ ngay trong phiên làm việc này bằng kỹ năng executing-plans, thực hiện theo lô kèm theo các điểm kiểm tra (checkpoints).

**Bạn chọn phương án nào?"**

**Nếu chọn Điều phối bởi Subagent:**
- **YÊU CẦU KỸ NĂNG PHỤ:** Sử dụng superpowers:subagent-driven-development
- Mỗi nhiệm vụ một subagent mới + quy trình review hai giai đoạn.

**Nếu chọn Thực hiện trực tiếp:**
- **YÊU CẦU KỸ NĂNG PHỤ:** Sử dụng superpowers:executing-plans
- Thực hiện theo lô với các điểm kiểm tra để review.