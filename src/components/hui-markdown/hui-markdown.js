/**
 * HUI Markdown — Hiển thị nội dung bài học / câu hỏi: Markdown rút gọn + công thức `$…$` / `$$…$$` + ảnh + bảng
 * (Molecule, zero-dependency). Công thức vẽ bằng MathML qua bộ chuyển của `hui-math`.
 * An toàn: dựng DOM bằng createElement + textContent, không dùng innerHTML; HTML trong nội dung hiện như chữ.
 *
 *   <hui-markdown value="**Ví dụ**: $\sqrt{16} = 4$"></hui-markdown>
 *   <hui-markdown inline value="Phương án $x = \frac{1}{2}$"></hui-markdown>
 */

import styles from './hui-markdown.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { renderMarkdown } from './markdown.js';

/**
 * @csspart base - Khung chứa nội dung đã dựng
 * @cssprop --hui-markdown-font-size - Cỡ chữ (mặc định kế thừa)
 * @cssprop --hui-markdown-line-height - Giãn dòng (mặc định 1.65)
 * @cssprop --hui-markdown-code-bg - Nền code
 * @cssprop --hui-markdown-border-color - Viền bảng, trích dẫn
 */
class HuiMarkdown extends HuiElement {
  static properties = {
    /** Nội dung Markdown. Bỏ trống → lấy chữ bên trong thẻ */
    value: { type: String },
    /** Chỉ xử lý trong dòng (không tạo đoạn văn / tiêu đề) — dùng cho phương án trả lời, nhãn ngắn */
    inline: { type: Boolean },
    /** Không đổi xuống dòng đơn thành <br> (mặc định có, hợp với cách giáo viên gõ) */
    noBreaks: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._base = createElement('div', { className: 'md', part: 'base' });
    return [this._base];
  }

  connectedCallback() {
    super.connectedCallback();
    this._mo = new MutationObserver(() => {
      if (this.value == null) this._build();
    });
    this._mo.observe(this, { childList: true, subtree: true, characterData: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mo?.disconnect();
    this._mo = null;
  }

  updated() {
    this._build();
  }

  /** Markdown đang hiển thị (chỉ đọc) */
  get source() {
    return this.value ?? this.textContent ?? '';
  }

  _build() {
    if (!this._base) return;
    this._base.classList.toggle('md--inline', this.inline);
    this._base.replaceChildren(...renderMarkdown(this.source, { inline: this.inline, breaks: !this.noBreaks }));
  }
}

defineElement('hui-markdown', HuiMarkdown);

export default HuiMarkdown;
