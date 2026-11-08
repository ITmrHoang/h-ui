---
"@itmrhoang/h-ui": minor
---

Thêm `hui-timetable` — lịch biểu tuần / ngày có khung giờ (dùng cho lịch dạy / lịch học của Smart Learning Space):

- Sự kiện `[{ id, title, start, end, subtitle, color, status }]` đặt theo giờ; sự kiện chồng giờ tự chia cột; sự kiện qua nửa đêm cắt sang ngày sau; `status: 'cancelled'` gạch ngang.
- Khung giờ `start-hour` / `end-hour` tự nới để chứa mọi sự kiện; vạch giờ hiện tại; tự cuộn tới sự kiện đầu tiên / giờ hiện tại.
- Thanh điều hướng Trước / Hôm nay / Sau + đổi Tuần ↔ Ngày (bấm đầu cột để xem riêng ngày đó); `no-toolbar`, `no-view-switch`; ngày đầu tuần theo ngôn ngữ hoặc `week-start`.
- `selectable`: kéo chọn khung giờ trống (bước `slot-minutes`) → `hui-slot-select { start, end }`; bấm sự kiện → `hui-event-click`; đổi tuần / ngày → `hui-range-change { view, date, from, to }`.
- Method `prev()`, `next()`, `goToday()`, `scrollToTime(hour)`; getter `range`. Hàm thuần `normalizeEvents`, `daySegments`, `layoutColumns`.
- Nằm trong nhóm CDN `data`.
