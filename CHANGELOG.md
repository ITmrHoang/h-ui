# @itmrhoang/h-ui

## 0.6.0

### Minor Changes

- 8880254: Thêm `hui-flashcard` — thẻ ghi nhớ cho ôn tập lặp lại ngắt quãng (dùng trong Smart Learning Space):
  
  - Mặt trước / mặt sau là Markdown + công thức (hiển thị bằng `hui-markdown`); bấm hoặc Space / Enter để lật (hiệu ứng lật 3D, tắt khi người dùng chọn giảm chuyển động).
  - Sau khi lật hiện 4 nút tự chấm Quên / Khó / Được / Dễ (phím 1–4), gợi ý lần ôn tới qua property `intervals`; `no-rating` để chỉ lật xem; `disabled` khi đang lưu.
  - Sự kiện `hui-flip { flipped }`, `hui-rate { rating }`; method `flip(force?)`, `reset()`.
  - Nằm trong nhóm CDN `learning`.
- 2abf0d2: Thêm 2 component cho nội dung học tập (dùng trong Smart Learning Space):
  
  - `hui-math`: hiển thị công thức LaTeX bằng MathML gốc của trình duyệt, không cần thư viện ngoài. Phủ ký hiệu Toán THCS / THPT: phân số, căn (bậc n), mũ / chỉ số, chữ Hy Lạp, toán tử & quan hệ, hàm (`\sin`, `\log`…), `\lim` / `\sum` / `\int` có cận, `\left( \right)`, ma trận, hệ phương trình (`cases`), vector, `\widehat`, `\mathbb{R}`, `\text`. Lệnh chưa hỗ trợ hiện nguyên văn màu đỏ. Hàm thuần `latexToMathML(tex, { display })`.
  - `hui-markdown`: Markdown rút gọn + công thức `$…$` / `$$…$$` + ảnh + bảng; xuống dòng đơn giữ nguyên; thuộc tính `inline` cho phương án trả lời. Dựng DOM bằng `createElement` + `textContent` (không `innerHTML`), link / ảnh chỉ nhận http(s), mailto, đường dẫn tương đối (ảnh thêm `data:image`). Hàm thuần `renderMarkdown(src, { inline, breaks })`.
  - Nhóm CDN mới `learning` (`h-ui-learning.min.js`).
- c336342: **BREAKING — API overlay thống nhất + quy ước đặt tên** (`.agents/rules/naming_rule.md`).
  
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
- 29b870c: Thêm `hui-timetable` — lịch biểu tuần / ngày có khung giờ (dùng cho lịch dạy / lịch học của Smart Learning Space):
  
  - Sự kiện `[{ id, title, start, end, subtitle, color, status }]` đặt theo giờ; sự kiện chồng giờ tự chia cột; sự kiện qua nửa đêm cắt sang ngày sau; `status: 'cancelled'` gạch ngang.
  - Khung giờ `start-hour` / `end-hour` tự nới để chứa mọi sự kiện; vạch giờ hiện tại; tự cuộn tới sự kiện đầu tiên / giờ hiện tại.
  - Thanh điều hướng Trước / Hôm nay / Sau + đổi Tuần ↔ Ngày (bấm đầu cột để xem riêng ngày đó); `no-toolbar`, `no-view-switch`; ngày đầu tuần theo ngôn ngữ hoặc `week-start`.
  - `selectable`: kéo chọn khung giờ trống (bước `slot-minutes`) → `hui-slot-select { start, end }`; bấm sự kiện → `hui-event-click`; đổi tuần / ngày → `hui-range-change { view, date, from, to }`.
  - Method `prev()`, `next()`, `goToday()`, `scrollToTime(hour)`; getter `range`. Hàm thuần `normalizeEvents`, `daySegments`, `layoutColumns`.
  - Nằm trong nhóm CDN `data`.

### Patch Changes

- 0d3b7aa: Sửa lỗi khi dùng với Vue 3 (và framework gán property nói chung):
  
  - `hui-modal`, `hui-command-palette`: gán property `el.open = true / false` (Vue `:open`, React 19 `open={...}`) mở / đóng được — trước đây ghi đè mất method `open()` và không mở. Xem mục **BREAKING — API overlay** (changeset overlay-api-naming).
  - `hui-input`: nhấn Enter gửi `<form>` chứa nó như `<input>` native (implicit submission): đi qua nút submit đầu tiên, nút đang `disabled` / `loading` thì không gửi, không có nút submit thì chỉ gửi khi form có 1 ô nhập; bỏ qua khi đang gõ IME, khi kèm phím bổ trợ, hoặc khi `keydown` bị `preventDefault()`.
  - README (mục Vue): boolean nhiều từ viết camelCase (`:confirmLoading="x"`) — kebab-case `:confirm-loading="false"` thành attribute `"false"`, vẫn là `true` theo chuẩn HTML.

## 0.5.1

### Patch Changes

- 91e89c4: Tài liệu: README tiếng Anh (trên) + tiếng Việt (dưới), thêm README.ko.md (tiếng Hàn); Storybook có mục Templates nhúng 10 trang mẫu.

## 0.5.0

### Minor Changes

- 10a72aa: Đổi bảng màu mặc định: theme sáng nền pastel xanh dương trời (khối nội dung trắng, chữ xanh navy đậm thay cho xám nhạt, primary `#0864ad`); theme tối xanh than ngả tím có chiều sâu (nền `#0d0f26` → khối `#15183a` → lớp nổi `#1d2050`), chữ trắng, primary xanh trời sáng `#8cc8ff`. Mọi cặp chữ/nền mặc định đạt WCAG AA.

## 0.4.0

### Minor Changes

- 6b84d3d: Thêm ~48 component (đợt 2):
  
  - Tương tác: `hui-hotkey`, `hui-editable`, `hui-sortable`, `hui-confirm-action`, `hui-command-palette`, `hui-kanban`
  - Landing: `hui-feature-card`, `hui-testimonial`, `hui-profile-card`, `hui-media-card`, `hui-hero`, `hui-feature-grid`, `hui-pricing-table`, `hui-logo-cloud`, `hui-cta-banner`, `hui-testimonial-slider`, `hui-footer-links`, `hui-team-grid`
  - Trang web: `hui-cookie-consent`, `hui-language-switch`, `hui-page-loader`, `hui-mega-menu`, `hui-bottom-nav`, `hui-search-overlay`, `hui-hover-card`, `hui-toolbar`, `hui-media-object`, `hui-map`, `hui-comparison-table`
  - Nhập liệu: `hui-segmented`, `hui-button-group`, `hui-toggle-button-group`, `hui-autocomplete`, `hui-search`, `hui-input-group`, `hui-filter-chips`, `hui-filter-bar`, `hui-upload`, `hui-chip-input`
  - Hiển thị: `hui-aspect-ratio`, `hui-dot`, `hui-color-swatch`, `hui-timeline`, `hui-timeline-feed`, `hui-review-list`, `hui-reaction`, `hui-description-card`, `hui-image-hotspot`
  - Sửa: `hui-cart-drawer` giữ focus ở nút Hoàn tác (không còn bị trả về nút đóng), bỏ thông báo trùng khi đã có dòng hoàn tác
- 784a6d5: Thêm nhóm component phức tạp (G3):
  
  - `hui-table`: sắp xếp/lọc, phân trang, chọn dòng, mở rộng + dữ liệu cây, cột cố định, kéo đổi độ rộng, dòng tổng, virtual 10k+ dòng, sửa ô, xuất CSV
  - Ngày giờ (không thư viện): `hui-calendar`, `hui-date-picker`, `hui-range-picker`, `hui-time-picker`
  - `hui-tree`, `hui-tree-select`, `hui-cascader`, `hui-transfer`
  - `hui-color-picker` (HEX/RGB/HSB/HSL, alpha, EyeDropper), `hui-mentions`
  - `hui-tour`, `hui-watermark`, `hui-qrcode` (bộ mã hóa QR tự viết)
  - Sửa: `createElement` bỏ qua thuộc tính `undefined`/`null` (option trong `hui-editable` không còn bị vô hiệu); DataController ghi `aria-busy="true"`; type sinh tự động nhận đúng lớp form kế thừa gián tiếp
- 1bf03c8: Hoàn thiện phần còn lại: `hui-highlight`, `hui-virtual-list`, chip trong `hui-tag`, vuốt thao tác `hui-list`, RTL `hui-scroller`; tích hợp Vue (`@itmrhoang/h-ui/vue`), React (`@itmrhoang/h-ui/react` + JSX types), `undefined.css` cho Nuxt; CDN tách nhóm (core/form/data/marketing/shop); tải động component con trong các organism lớn; sửa độ tương phản token, race hui-modal, toast bấm được khi mở modal, scroll-steps ngang theo trang; trang tài liệu + trang mẫu mới.

## 0.3.0

### Minor Changes

- 0293091: Thêm ~50 component website (đợt 1):
  
  - Cuộn & bố cục: `hui-marquee`, `hui-infinite-scroll`, `hui-sticky`, `hui-masonry`, `hui-scrolly`, `hui-splitter`
  - Hiệu ứng chữ / nền: `hui-typewriter`, `hui-text-rotate`, `hui-gradient-text`, `hui-split-text`, `hui-gradient-bg`, `hui-blob`, `hui-pattern`, `hui-parallax`, `hui-confetti`
  - Thương mại & form: `hui-price`, `hui-quantity`, `hui-variant-picker`, `hui-image-zoom`, `hui-add-to-cart`, `hui-wishlist-toggle`, `hui-cart-drawer`, `hui-free-ship-bar`, `hui-coupon-input`, `hui-otp-input`, `hui-phone-input`, `hui-password-strength`, `hui-newsletter`, `hui-contact-form`
  - Media: `hui-image`, `hui-lightbox`, `hui-gallery`, `hui-carousel`, `hui-video`, `hui-compare-slider`
  - Nội dung: `hui-number`, `hui-time`, `hui-countdown`, `hui-stats-counter`, `hui-copy`, `hui-kbd`, `hui-code-block`, `hui-prose`, `hui-share`, `hui-toc`
  - Sửa: `hui-input` nhận tên icon cho prefix/suffix, cỡ chữ nhãn `hui-checkbox` theo `size`, `hui-statistic` thêm `align`

## 0.2.0

### Minor Changes

- 545897f: Phát hành công khai đầu tiên trên npm với tên `@itmrhoang/h-ui`: 110+ Web Components (form native, dữ liệu,
  điều hướng, phản hồi, card, chart, cuộn từng bước, hiệu ứng), theme + dark mode, locale vi/en,
  bản CDN một file `dist/cdn/h-ui.min.js`, types cho Vue/React và custom-elements.json.
