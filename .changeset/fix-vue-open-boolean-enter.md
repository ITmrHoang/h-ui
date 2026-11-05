---
"@itmrhoang/h-ui": patch
---

Sửa lỗi khi dùng với Vue 3 (và framework gán property nói chung):

- `hui-modal`, `hui-command-palette`: gán property `el.open = true / false` (Vue `:open`, React 19 `open={...}`) mở / đóng được — trước đây ghi đè mất method `open()` và không mở. Xem mục **BREAKING — API overlay** (changeset overlay-api-naming).
- `hui-input`: nhấn Enter gửi `<form>` chứa nó như `<input>` native (implicit submission): đi qua nút submit đầu tiên, nút đang `disabled` / `loading` thì không gửi, không có nút submit thì chỉ gửi khi form có 1 ô nhập; bỏ qua khi đang gõ IME, khi kèm phím bổ trợ, hoặc khi `keydown` bị `preventDefault()`.
- README (mục Vue): boolean nhiều từ viết camelCase (`:confirmLoading="x"`) — kebab-case `:confirm-loading="false"` thành attribute `"false"`, vẫn là `true` theo chuẩn HTML.
