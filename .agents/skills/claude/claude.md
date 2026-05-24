# CLAUDE.md

## Các câu lệnh (Commands)

```bash
bun test                # Chạy các bài kiểm thử (tests)
bun run typecheck       # Kiểm tra kiểu dữ liệu TypeScript
bun run format          # Định dạng mã nguồn với prettier
bun run format:check    # Kiểm tra việc định dạng
```

## Đây là gì (What This Is)

Một GitHub Action cho phép Claude phản hồi các lượt nhắc `@claude` trên các issues/PRs (chế độ tag) hoặc chạy các tác vụ thông qua đầu vào `prompt` (chế độ agent). Chế độ được tự động phát hiện: nếu `prompt` được cung cấp, đó là chế độ agent; nếu được kích hoạt bởi một sự kiện comment/issue với `@claude`, đó là chế độ tag. Xem `src/modes/detector.ts`.

## Cách thức hoạt động (How It Runs)

Điểm truy cập duy nhất (Single entrypoint): `src/entrypoints/run.ts` điều phối mọi thứ — chuẩn bị (xác thực, quyền hạn, kiểm tra kích hoạt, tạo nhánh/bình luận), cài đặt Claude Code CLI, thực thi Claude thông qua các hàm `base-action/` (được import trực tiếp, không phải là một tiến trình con - subprocess), sau đó dọn dẹp (cập nhật bình luận theo dõi, viết tóm tắt bước). Việc dọn dẹp xác nhận SSH và thu hồi token là các bước `always()` riêng biệt trong `action.yml`.

`base-action/` cũng được phát hành độc lập dưới dạng `@anthropic-ai/claude-code-base-action`. Đừng phá vỡ public API của nó. Nó đọc cấu hình từ các biến môi trường có tiền tố `INPUT_` (được thiết lập bởi `action.yml`), không trực tiếp từ các đầu vào (inputs) của action.

## Các khái niệm chính (Key Concepts)

**Ưu tiên xác thực (Auth priority)**: Đầu vào `github_token` (do người dùng cung cấp) > token OIDC của GitHub App (mặc định). `claude_code_oauth_token` và `anthropic_api_key` dùng cho Claude API, không phải cho GitHub. Thiết lập token nằm trong `src/github/token.ts`.

**Vòng đời chế độ (Mode lifecycle)**: `detectMode()` trong `src/modes/detector.ts` chọn tên chế độ ("tag" hoặc "agent"). Kiểm tra kích hoạt và điều phối quá trình chuẩn bị được nội suy trong `run.ts`: chế độ tag gọi `prepareTagMode()` từ `src/modes/tag/`, chế độ agent gọi `prepareAgentMode()` từ `src/modes/agent/`.

**Xây dựng prompt (Prompt construction)**: `prepareTagMode()` của chế độ tag xây dựng prompt bằng cách lấy dữ liệu GitHub (`src/github/data/fetcher.ts`), định dạng nó thành markdown (`src/github/data/formatter.ts`), và ghi nó vào một tệp tạm thời qua `createPrompt()`. Chế độ agent ghi trực tiếp prompt của người dùng. Prompt bao gồm nội dung issue/PR, các bình luận, sự khác biệt (diff) và trạng thái CI. Đây là phần quan trọng nhất của action — nó là những gì Claude nhìn thấy.

## Những điều cần lưu ý (Things That Will Bite You)

- **TypeScript nghiêm ngặt (Strict TypeScript)**: `noUnusedLocals` và `noUnusedParameters` được bật. Việc kiểm tra kiểu (typecheck) sẽ thất bại nếu có các biến không được sử dụng.
- **Discriminated unions cho context GitHub**: `GitHubContext` là một union type — hãy gọi `isEntityContext(context)` trước khi truy cập vào các trường cụ thể của thực thể như `context.issue` hoặc `context.pullRequest`.
- **Vòng đời token rất quan trọng (Token lifecycle matters)**: Token của GitHub App được lấy từ sớm và bị thu hồi trong một bước `always()` riêng biệt ở `action.yml`. Nếu bạn chuyển việc thu hồi token vào `run.ts`, nó sẽ không chạy nếu tiến trình gặp sự cố (crash). Tương tự đối với việc dọn dẹp xác nhận SSH.
- **Phân bổ pha lỗi (Error phase attribution)**: Khối catch trong `run.ts` sử dụng `prepareCompleted` để phân biệt các lỗi chuẩn bị với các lỗi thực thi. Bình luận theo dõi hiển thị các thông báo khác nhau cho mỗi loại.
- **Đầu ra `action.yml` tham chiếu ID bước (`action.yml` outputs reference step IDs)**: Các đầu ra như `execution_file`, `branch_name`, `github_token` tham chiếu tới `steps.run.outputs.*`. Nếu bạn đổi tên ID bước, hãy cập nhật cả phần đầu ra (outputs section).
- **Kiểm thử tích hợp (Integration testing)** diễn ra trong một kho lưu trữ riêng (`install-test`), không phải ở đây. Các bài test trong kho này là unit tests.

## Quy ước viết mã (Code Conventions)

- Môi trường chạy (Runtime) là Bun, không phải Node. Dùng `bun test`, đừng dùng `jest`.
- `moduleResolution: "bundler"` — các câu lệnh import không cần có đuôi `.js`.
- Các lệnh gọi API của GitHub nên sử dụng logic thử lại (retry logic) (`src/utils/retry.ts`).
- Các MCP server được tự động cài đặt lúc chạy (runtime) vào `~/.claude/mcp/github-{type}-server/`.