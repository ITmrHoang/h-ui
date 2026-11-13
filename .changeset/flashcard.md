---
"@itmrhoang/h-ui": minor
---

Thêm `hui-flashcard` — thẻ ghi nhớ cho ôn tập lặp lại ngắt quãng (dùng trong Smart Learning Space):

- Mặt trước / mặt sau là Markdown + công thức (hiển thị bằng `hui-markdown`); bấm hoặc Space / Enter để lật (hiệu ứng lật 3D, tắt khi người dùng chọn giảm chuyển động).
- Sau khi lật hiện 4 nút tự chấm Quên / Khó / Được / Dễ (phím 1–4), gợi ý lần ôn tới qua property `intervals`; `no-rating` để chỉ lật xem; `disabled` khi đang lưu.
- Sự kiện `hui-flip { flipped }`, `hui-rate { rating }`; method `flip(force?)`, `reset()`.
- Nằm trong nhóm CDN `learning`.
