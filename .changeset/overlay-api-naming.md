---
"@itmrhoang/h-ui": minor
---

**BREAKING — API overlay thống nhất + quy ước đặt tên** (`.agents/rules/naming_rule.md`).

Mọi overlay (modal, drawer, cart-drawer, command-palette, lightbox, cookie-consent, popover, dropdown, dropdown-button, popconfirm, hover-card, tooltip, tour, float-group, navbar, color-picker, date / range / time-picker, search-overlay) dùng chung:

- property / attribute `open` là boolean thật (`el.open` đọc ra `true` / `false`), gán để mở / đóng;
- method `show()` / `hide()` / `toggle()` (bổ sung `toggle()` cho modal, lightbox, hover-card, popconfirm, color-picker, search-overlay, cookie-consent, tour; bổ sung cả bộ cho navbar, dropdown-button, date / range / time-picker);
- sự kiện `hui-open` → `hui-after-open`, `hui-close` → `hui-after-close` (bổ sung cho popover, dropdown, tooltip, hover-card, float-group, popconfirm, navbar, tour, cookie-consent; thêm `hui-after-open` / `hui-after-close` nơi còn thiếu). Phát mỗi lần trạng thái đổi (người dùng, method hay gán `open`), không phát cho trạng thái ban đầu lúc render.

Chuyển đổi từ 0.5.1:

| Cũ | Mới |
|----|-----|
| `modal.open()`, `palette.open()` | `show()` — method `open()` đã bỏ (trùng tên property) |
| `cookieConsent.open()` | `show()` |
| `close()` (modal, command-palette, lightbox, tour) | `hide()` — `close()` vẫn chạy (deprecated) |
| `isOpen` (modal, command-palette, cookie-consent) | `open` — `isOpen` vẫn đọc được (deprecated) |
| sự kiện `open-change` (popover, dropdown, tooltip, float-group, popconfirm, navbar, dropdown-button) | `hui-open` / `hui-close` — `open-change` vẫn phát (deprecated) |
| sự kiện `hui-open-change` (hover-card) | `hui-open` / `hui-close` — `hui-open-change` vẫn phát (deprecated) |
| tour: `hui-close` chỉ phát khi người dùng đóng | phát mọi lần đóng, `reason: 'close'` khi đóng bằng `hide()` / gán `open = false` |
| search-overlay: `hui-close` phát khi đã đóng xong | `hui-close` khi bắt đầu đóng, `hui-after-close` khi xong |

Khác:

- 4 sự kiện mở / đóng của overlay **không nổi bọt** (vẫn composed, giống `close` của `<dialog>`): tooltip / dropdown / date-picker nằm trong modal đóng thì `@hui-close` của modal không còn bị gọi nhầm. Nghe trực tiếp trên thẻ overlay (Vue `@hui-close` trên thẻ vẫn chạy); ai bắt `hui-open` / `hui-close` của modal / drawer ở phần tử cha (event delegation) cần chuyển listener về chính thẻ.
- `detail` của sự kiện luôn là object (`HuiElement.emit()` đổi `null` / bỏ trống thành `{}`).
- `HuiElement` gỡ cách bọc tạm "property trùng tên method"; thay bằng `console.warn` lúc define và test quét mọi component (`test/naming-conflicts.test.js`), cùng test hợp đồng overlay (`test/overlay-contract.test.js`).
- Sự kiện mở / đóng của hộp tùy chỉnh bên trong `hui-cookie-consent` không còn lọt ra ngoài (trùng tên với sự kiện của banner).
