---
"@itmrhoang/h-ui": minor
---

Thêm `hui-plot` — đồ thị hàm số cho bài giảng / bài tập Toán:

- Gõ công thức theo cách viết quen thuộc (nhân ngầm `2x`, dấu phẩy thập phân, `^ ² ³`, `√`, `|x|`, sin cos tan cot, ln, log…), mỗi dòng một đối tượng: hàm số, đường thẳng `x = c`, miền nghiệm `y > …` (tô màu), điểm `A(1; 2)`, tham số `a = 2` (tự sinh thanh trượt), khung trục `x: -2 .. 5`.
- Tự phân tích biểu thức, **không dùng eval**; vẽ Canvas 2D; kéo để di chuyển, cuộn / nút ± để phóng to, `locked` cho đồ thị tĩnh. Sự kiện `hui-view-change`, `hui-param-change`.
- `hui-markdown`: khối code ` ```plot ` hiện thành `<hui-plot>` (chưa import `hui-plot` thì vẫn thấy khối code).
- `hui-whiteboard`: công cụ **ƒ Đồ thị** (kéo khung → gõ công thức; chạm lại để sửa), method `addPlot(value, box?)`, thao tác mới `update { page, element }`.
- Nằm trong nhóm CDN `learning`.
