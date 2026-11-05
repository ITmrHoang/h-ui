---
"@itmrhoang/h-ui": minor
---

Thêm 2 component cho nội dung học tập (dùng trong Smart Learning Space):

- `hui-math`: hiển thị công thức LaTeX bằng MathML gốc của trình duyệt, không cần thư viện ngoài. Phủ ký hiệu Toán THCS / THPT: phân số, căn (bậc n), mũ / chỉ số, chữ Hy Lạp, toán tử & quan hệ, hàm (`\sin`, `\log`…), `\lim` / `\sum` / `\int` có cận, `\left( \right)`, ma trận, hệ phương trình (`cases`), vector, `\widehat`, `\mathbb{R}`, `\text`. Lệnh chưa hỗ trợ hiện nguyên văn màu đỏ. Hàm thuần `latexToMathML(tex, { display })`.
- `hui-markdown`: Markdown rút gọn + công thức `$…$` / `$$…$$` + ảnh + bảng; xuống dòng đơn giữ nguyên; thuộc tính `inline` cho phương án trả lời. Dựng DOM bằng `createElement` + `textContent` (không `innerHTML`), link / ảnh chỉ nhận http(s), mailto, đường dẫn tương đối (ảnh thêm `data:image`). Hàm thuần `renderMarkdown(src, { inline, breaks })`.
- Nhóm CDN mới `learning` (`h-ui-learning.min.js`).
