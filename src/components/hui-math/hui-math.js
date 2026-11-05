/**
 * HUI Math — Hiển thị công thức LaTeX bằng MathML gốc của trình duyệt (Atom, zero-dependency).
 * Phủ ký hiệu Toán THCS / THPT: phân số, căn, mũ, hệ phương trình, ma trận, vector, tích phân, giới hạn,
 * chữ Hy Lạp, tập số ℝ ℕ ℤ… Lệnh chưa hỗ trợ hiện nguyên văn màu đỏ thay vì làm hỏng cả công thức.
 *
 *   <hui-math value="\frac{-b \pm \sqrt{\Delta}}{2a}"></hui-math>
 *   <hui-math display>\int_0^1 x^2 \, dx = \frac{1}{3}</hui-math>
 */

import styles from './hui-math.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { latexToMathML } from './latex.js';

/**
 * Công thức LaTeX. Nguồn: property / attribute `value`, hoặc chữ bên trong thẻ.
 *
 * @csspart base - Khung chứa phần tử <math>
 * @cssprop --hui-math-font-size - Cỡ chữ công thức (mặc định 1.05em)
 * @cssprop --hui-math-color - Màu công thức (mặc định kế thừa)
 */
class HuiMath extends HuiElement {
  static properties = {
    /** Công thức LaTeX (không gồm dấu $). Bỏ trống → lấy chữ bên trong thẻ */
    value: { type: String },
    /** Dạng khối: căn giữa, phân số và cận hiển thị to */
    display: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._base = createElement('span', { className: 'math', part: 'base' });
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

  /** LaTeX đang hiển thị (chỉ đọc) */
  get tex() {
    return this.value ?? this.textContent ?? '';
  }

  _build() {
    if (!this._base) return;
    this._base.classList.toggle('math--display', this.display);
    this._base.replaceChildren(latexToMathML(this.tex.trim(), { display: this.display }));
  }
}

defineElement('hui-math', HuiMath);

export default HuiMath;
