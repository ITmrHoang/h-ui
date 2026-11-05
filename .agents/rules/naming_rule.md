---
description: "Quy ước đặt tên property / attribute / method / sự kiện cho mọi component H-UI"
---

# RULE: Đặt Tên Property · Method · Sự Kiện

> **Phạm vi áp dụng:** Mọi component trong `src/components/` (tạo mới hoặc sửa) và mọi lớp kế thừa `HuiElement`.
> Kiểm tra tự động: `test/naming-conflicts.test.js` (trùng tên property / method), `test/overlay-contract.test.js`
> (API overlay). Lúc chạy, `HuiElement` cũng `console.warn` khi phát hiện property trùng tên method.

## 1. Property & attribute

| Quy tắc | Ví dụ đúng | Tránh |
|---------|-----------|-------|
| camelCase, là **danh từ / tính từ** | `open`, `value`, `loading`, `pageSize`, `confirmLoading` | `isOpen`, `doLoad` |
| Boolean **không** thêm tiền tố `is` / `has` | `open`, `disabled`, `noFooter` | `isOpen`, `hasFooter` |
| Attribute = kebab-case của **đúng** property đó | `pageSize` ↔ `page-size` | đặt tên attribute khác property |
| Chỉ chuỗi / số / boolean mới có attribute | `size="sm"`, `max-count="5"`, `disabled` | |
| Mảng / object / hàm: **chỉ property** (`attribute: false` hoặc mặc định không reflect) | `el.options = [...]`, `el.fetchFn = fn` | `options='[...]'` làm cách chính |
| Boolean attribute: **có mặt là bật** (chuẩn HTML) | `<hui-x disabled>` | `disabled="false"` để tắt — xóa attribute hoặc gán `el.disabled = false` |

Boolean cần 3 trạng thái (mặc định theo ngữ cảnh / bật / tắt) thì dùng kiểu **String** `'true' | 'false'`
(vd: `closable` của hui-modal), không dùng Boolean.

## 2. Method

- camelCase, là **động từ**: `show()`, `hide()`, `toggle()`, `reset()`, `exportCsv()`, `goTo(i)`.
- **Không bao giờ trùng tên property** (kể cả property kế thừa, và method có sẵn của HTMLElement như `click`,
  `remove`). Trùng tên → `el.open = true` (Vue `:open`, React 19) ghi đè mất method, hoặc method che mất property.
- Có hiệu ứng / việc bất đồng bộ thì trả về `Promise`.
- Getter chỉ đọc là danh từ: `count`, `results`, `currentItem` (không phải `getCount()`).

## 3. Sự kiện

| Loại | Tên | Ví dụ |
|------|-----|-------|
| Giống sự kiện của trình duyệt | giữ tên gốc | `input`, `change` |
| Sự kiện riêng | `hui-` + kebab-case, là **việc đã xảy ra**, **không** có tiền tố `on` | `hui-select`, `hui-search`, `hui-consent` |
| Bắt đầu / xong hiệu ứng | `hui-<việc>` → `hui-after-<việc>` | `hui-close` → `hui-after-close` |
| Yêu cầu có thể chặn | `cancelable: true`, `preventDefault()` để chặn | `hui-cancel`, `hui-ok` |

- `detail` **luôn là object** (`HuiElement.emit()` tự đổi `null` / bỏ trống thành `{}`).
- Sự kiện phát bằng `this.emit(...)` (bubbles + composed) — nổi bọt qua Shadow DOM.

## 4. Overlay (modal, drawer, popover, dropdown, tooltip, picker, tour, cookie-consent…)

Mọi component mở / đóng được theo **cùng một API**:

| Thành phần | Quy ước |
|-----------|---------|
| Trạng thái | property / attribute `open` (boolean thật — `el.open` đọc ra `true` / `false`) |
| Method | `show()`, `hide()`, `toggle()` — **không** có method `open()`; `close()` nếu còn thì chỉ là alias deprecated của `hide()` |
| Sự kiện | `hui-open` (bắt đầu mở) → `hui-after-open` (hết hiệu ứng mở) · `hui-close` (bắt đầu đóng) → `hui-after-close` (hết hiệu ứng đóng) |
| Khi nào phát | Mỗi lần trạng thái đổi — do người dùng, method hay gán `open`. Không phát cho trạng thái ban đầu lúc render lần đầu |
| Nổi bọt | **Không** (`bubbles: false`, vẫn composed) — giống `close` của `<dialog>`: tooltip / dropdown trong modal đóng thì `@hui-close` của modal không bị gọi nhầm. Nghe trực tiếp trên thẻ overlay |
| Người dùng muốn đóng (X / Esc / mask) | `hui-cancel` cancelable trước khi đóng (nếu component có) |
| Đọc trạng thái | `el.open` (không thêm getter `isOpen`) |

Cài đặt: gọi `this._emitOpenEvents(open, donePromise, detail?)` của `HuiElement` ngay khi bắt đầu mở / đóng,
với `donePromise` là Promise của hiệu ứng — helper tự phát `hui-after-*` khi xong và bỏ qua nếu trạng thái đã đổi tiếp.

```js
// Vue: đồng bộ state khi người dùng tự đóng (X / Esc / mask)
<hui-modal :open="visible" @hui-close="visible = false">…</hui-modal>
```

## 5. Checklist khi thêm / đổi component

- [ ] Không property nào trùng tên method (`npm test` chạy `test/naming-conflicts.test.js`)
- [ ] Overlay: `open` + `show()` / `hide()` / `toggle()` + 4 sự kiện; thêm thẻ vào `test/overlay-contract.test.js`
- [ ] Sự kiện mới: tên `hui-*`, `detail` là object, ghi `@fires` trong JSDoc và bảng Events trong story
- [ ] Đổi tên API cũ: giữ alias `@deprecated` một thời gian nếu được, ghi hướng dẫn chuyển trong changeset
