---
"@itmrhoang/h-ui": minor
---

Thêm `hui-slides` — trình chiếu bài giảng:

- Mỗi phần tử con là một slide; khung 16:9 thiết kế ở 1280 × 720, tự co giãn theo chỗ đặt.
- Chuyển slide bằng nút, phím (← → Space PageUp PageDown Home End), vuốt; F toàn màn hình, G xem lưới (bấm một slide để mở).
- Property `index`, `noControls`, `readonly`, `overview`; method `next()`, `prev()`, `goTo(i)`, `toggleFullscreen()`, `toggleOverview()`; sự kiện `hui-slide-change { index, total }` — đồng bộ được giữa giáo viên và học sinh.
- Nằm trong nhóm CDN `learning`.
