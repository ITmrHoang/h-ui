---
"@itmrhoang/h-ui": minor
---

Thêm `hui-whiteboard` — bảng vẽ cho dạy trực tuyến (dùng trong phòng học của Smart Learning Space):

- Bút, bút dạ quang, tẩy (xóa cả nét), đoạn thẳng, mũi tên, hình chữ nhật, elip, chữ; bảng màu + độ dày; hoàn tác / làm lại (Ctrl + Z / Ctrl + Y); nhiều trang; `readonly` để chỉ xem.
- Zero-dependency, vẽ bằng Canvas 2D, tọa độ chuẩn hóa theo trang 1600 × 900. Mỗi thay đổi phát `hui-change { op }` (`add` / `remove` / `clear` / `page-add`) để app đồng bộ; máy khác gọi `applyRemote(op)`. Sự kiện `hui-page { page }`.
- `getSnapshot()` / `loadSnapshot()` (gửi người vào sau, lưu lại), `toDataURL(page)` xuất ảnh, `elements(page)`.
- Nằm trong nhóm CDN `learning`.
