---
"@itmrhoang/h-ui": minor
---

Bảng dạy Toán (`hui-whiteboard`) + ô gõ công thức mới `hui-math-input`:

- `hui-math-input`: ô gõ LaTeX có bàn phím ký hiệu Toán (phân số, căn, mũ, chỉ số, ngoặc, hệ phương trình, vectơ, π ≤ ≥ ≠ ∈ ℝ…, sin cos log lim ∑ ∫) và xem trước bằng MathML; bấm phím chèn mẫu tại con trỏ / bọc chữ đang chọn; `hui-submit` khi Ctrl + Enter; tham gia `<form>`.
- `hui-whiteboard`:
  - Công cụ **chọn**: chạm / Shift / kéo khung, kéo để dời, kéo góc để đổi cỡ, Delete xóa, Ctrl + D nhân bản, bấm màu để đổi màu. Thao tác `update` nhận cả `elements` (nhiều phần tử).
  - **Hình học**: điểm tự đặt tên (A, B, C…), đường tròn kéo từ tâm, đa giác; đoạn thẳng / đường tròn / đa giác bắt dính vào điểm có sẵn, Shift để thẳng góc 15°.
  - **Công thức** (∑): gõ bằng `hui-math-input`, vẽ lên canvas bằng MathML (có trong ảnh xuất).
  - **Nền trang**: ô vuông, ô ly, dòng kẻ, chấm, hệ trục Oxy — `setBackground()`, thao tác `page-bg`, ảnh chụp có `backgrounds`.
  - **Ảnh**: `addImage(src, { width, height, locked })`, nút 🖼 phát `hui-image-request`, dán ảnh phát `hui-paste-image`; ảnh nền `locked` nằm dưới mọi nét, không chọn / tẩy được, "Xóa trang" giữ lại.
  - `toDataURLAsync()` chờ ảnh / công thức tải xong.
