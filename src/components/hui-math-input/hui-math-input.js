/**
 * HUI Math Input — Ô gõ công thức (Molecule): ô chữ LaTeX + bàn phím ký hiệu Toán (phân số, căn, mũ, chỉ số,
 * π, ≤ ≥ ≠, ∈ ℝ, hệ phương trình…) + xem trước bằng MathML. Bấm phím = chèn mẫu LaTeX vào chỗ con trỏ, con trỏ
 * nhảy vào ô trống đầu tiên của mẫu. Tham gia <form> native như ô nhập thường.
 *
 *   <hui-math-input label="Đáp số" value="\frac{1}{2}"></hui-math-input>
 *   el.addEventListener('input', (e) => console.log(e.detail.value));
 */

import styles from './hui-math-input.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { latexToMathML } from '../hui-math/latex.js';

const FALLBACK = {
  'mathInput.keyboard': { vi: 'Bàn phím công thức', en: 'Math keyboard' },
  'mathInput.structures': { vi: 'Cấu trúc', en: 'Structures' },
  'mathInput.symbols': { vi: 'Ký hiệu', en: 'Symbols' },
  'mathInput.functions': { vi: 'Hàm', en: 'Functions' },
  'mathInput.preview': { vi: 'Xem trước', en: 'Preview' },
  'mathInput.placeholder': { vi: 'Gõ công thức, ví dụ \\frac{1}{2} hoặc x^2 + 1', en: 'Type a formula, e.g. \\frac{1}{2} or x^2 + 1' },
};
const msg = (key) => {
  const v = t(key);
  if (v !== key) return v;
  return FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

/**
 * Phím: `label` hiện trên nút, `tex` chèn vào, `at` = vị trí con trỏ trong `tex` sau khi chèn (mặc định cuối),
 * `title` = mô tả. Có `{}` trống thì con trỏ vào ô trống đầu tiên.
 */
export const KEY_GROUPS = {
  structures: [
    { label: 'a/b', tex: '\\frac{}{}', title: 'Phân số' },
    { label: 'x²', tex: '^{2}', title: 'Bình phương' },
    { label: 'xⁿ', tex: '^{}', title: 'Lũy thừa' },
    { label: 'xₙ', tex: '_{}', title: 'Chỉ số dưới' },
    { label: '√', tex: '\\sqrt{}', title: 'Căn bậc hai' },
    { label: 'ⁿ√', tex: '\\sqrt[]{}', title: 'Căn bậc n' },
    { label: '( )', tex: '\\left(  \\right)', at: 7, title: 'Ngoặc co giãn' },
    { label: '|x|', tex: '\\left|  \\right|', at: 7, title: 'Giá trị tuyệt đối' },
    { label: '{ hệ', tex: '\\begin{cases}  \\\\  \\end{cases}', at: 14, title: 'Hệ phương trình' },
    { label: 'AB⃗', tex: '\\vec{}', title: 'Vectơ' },
    { label: 'x̄', tex: '\\overline{}', title: 'Gạch trên' },
  ],
  symbols: [
    { label: 'π', tex: '\\pi ' },
    { label: '∞', tex: '\\infty ' },
    { label: 'Δ', tex: '\\Delta ' },
    { label: 'α', tex: '\\alpha ' },
    { label: 'β', tex: '\\beta ' },
    { label: '±', tex: '\\pm ' },
    { label: '·', tex: '\\cdot ' },
    { label: '≤', tex: '\\le ' },
    { label: '≥', tex: '\\ge ' },
    { label: '≠', tex: '\\ne ' },
    { label: '≈', tex: '\\approx ' },
    { label: '∈', tex: '\\in ' },
    { label: '∉', tex: '\\notin ' },
    { label: '⊂', tex: '\\subset ' },
    { label: '∪', tex: '\\cup ' },
    { label: '∩', tex: '\\cap ' },
    { label: 'ℝ', tex: '\\mathbb{R}' },
    { label: '∅', tex: '\\varnothing ' },
    { label: '→', tex: '\\to ' },
    { label: '⇒', tex: '\\Rightarrow ' },
    { label: '⇔', tex: '\\Leftrightarrow ' },
    { label: '°', tex: '^{\\circ}' },
    { label: '∠', tex: '\\angle ' },
    { label: '△', tex: '\\triangle ' },
    { label: '⊥', tex: '\\perp ' },
    { label: '∥', tex: '\\parallel ' },
  ],
  functions: [
    { label: 'sin', tex: '\\sin ' },
    { label: 'cos', tex: '\\cos ' },
    { label: 'tan', tex: '\\tan ' },
    { label: 'cot', tex: '\\cot ' },
    { label: 'log', tex: '\\log_{}' },
    { label: 'ln', tex: '\\ln ' },
    { label: 'lim', tex: '\\lim_{x \\to }', at: 13 },
    { label: '∑', tex: '\\sum_{i=1}^{n} ' },
    { label: '∫', tex: '\\int_{}^{} ', at: 6 },
  ],
};

/** Vị trí con trỏ sau khi chèn: `at` nếu có, không thì ô `{}` / `[]` trống đầu tiên, không thì cuối mẫu. */
export function caretOffset(key) {
  if (Number.isInteger(key.at)) return key.at;
  const m = /\{\}|\[\]/.exec(key.tex);
  return m ? m.index + 1 : key.tex.length;
}

/** Chèn `key` vào `value` tại [start, end) (thay chữ đang chọn). Trả về { value, caret }. */
export function insertKey(value, start, end, key) {
  const v = String(value ?? '');
  const s = Math.max(0, Math.min(start ?? v.length, v.length));
  const e = Math.max(s, Math.min(end ?? s, v.length));
  const selected = v.slice(s, e);
  let tex = key.tex;
  let caret = caretOffset(key);
  // Đang chọn chữ + phím có ô trống: bọc chữ đã chọn vào ô đầu tiên (chọn "x+1" rồi bấm √ → \sqrt{x+1})
  if (selected && /\{\}|\[\]/.test(tex) && !Number.isInteger(key.at)) {
    tex = tex.slice(0, caret) + selected + tex.slice(caret);
    // Con trỏ sang ô trống kế tiếp (mẫu số của phân số), không còn thì ra sau dấu đóng
    const after = caret + selected.length + 1;
    const next = /\{\}|\[\]/.exec(tex.slice(after));
    caret = next ? after + next.index + 1 : after;
  }
  return { value: v.slice(0, s) + tex + v.slice(e), caret: s + caret };
}

/**
 * Ô gõ công thức LaTeX có bàn phím ký hiệu và xem trước.
 *
 * @fires input - Khi gõ / bấm phím, detail: { value }
 * @fires change - Khi rời ô (giá trị đã đổi) hoặc bấm phím, detail: { value }
 * @fires hui-submit - Ctrl + Enter trong ô, detail: { value }
 * @csspart base - Khung ngoài
 * @csspart label - Nhãn
 * @csspart keyboard - Bàn phím ký hiệu
 * @csspart key - Mỗi phím
 * @csspart field - Ô chữ LaTeX
 * @csspart preview - Ô xem trước
 * @cssprop --hui-math-input-key-size - Cỡ chữ trên phím (mặc định 15px)
 */
class HuiMathInput extends HuiFormElement {
  static properties = {
    label: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    /** Số dòng của ô chữ */
    rows: { type: Number, default: 2 },
    /** Ẩn bàn phím (vẫn gõ được LaTeX) */
    noKeyboard: { type: Boolean },
    /** Ẩn ô xem trước */
    noPreview: { type: Boolean },
    /** Nhóm phím hiện (phân cách dấu phẩy): structures, symbols, functions */
    keys: { type: String, default: 'structures,symbols,functions' },
    /** Thông báo lỗi dưới ô */
    error: { type: String, default: '' },
  };

  static styles = styles;

  render() {
    this._label = createElement('label', { className: 'label', part: 'label', for: 'field' });
    this._keyboard = createElement('div', { className: 'keyboard', part: 'keyboard', role: 'toolbar' });
    this._field = createElement('textarea', { className: 'field', part: 'field', id: 'field', spellcheck: 'false', autocapitalize: 'off' });
    this.relayNativeEvents(this._field);
    this._field.addEventListener('input', () => this._renderPreview());
    this._field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.emit('hui-submit', { value: this.value });
      }
    });
    this._previewBox = createElement('div', { className: 'preview', part: 'preview', 'aria-live': 'polite' });
    this._message = createElement('div', { className: 'message', role: 'alert' });
    // Bấm phím không làm mất focus / vùng chọn của ô chữ
    this._keyboard.addEventListener('mousedown', (e) => e.preventDefault());
    this._keyboard.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-group]');
      if (!btn) return;
      const key = KEY_GROUPS[btn.dataset.group]?.[Number(btn.dataset.index)];
      if (key) this.insert(key);
    });
    return createElement('div', { className: 'base', part: 'base' }, this._label, this._keyboard, this._field, this._previewBox, this._message);
  }

  /** Chèn một phím (hoặc chuỗi LaTeX) vào chỗ con trỏ. */
  insert(key) {
    if (this.disabled || this.readonly) return;
    const k = typeof key === 'string' ? { tex: key } : key;
    const f = this._field;
    const { value, caret } = insertKey(f.value, f.selectionStart, f.selectionEnd, k);
    f.value = value;
    this.value = value;
    f.focus();
    f.setSelectionRange(caret, caret);
    this._renderPreview();
    this.emit('input', { value });
    this.emit('change', { value });
  }

  focus(options) {
    this._field?.focus(options);
  }

  _renderKeyboard() {
    const groups = String(this.keys || '')
      .split(',')
      .map((g) => g.trim())
      .filter((g) => KEY_GROUPS[g]);
    const sig = `${groups.join()}|${getLocaleName()}`;
    if (this._keyboard.dataset.sig === sig) return;
    this._keyboard.dataset.sig = sig;
    this._keyboard.setAttribute('aria-label', msg('mathInput.keyboard'));
    this._keyboard.replaceChildren(
      ...groups.map((g) =>
        createElement(
          'div',
          { className: 'group', role: 'group', 'aria-label': msg(`mathInput.${g}`) },
          ...KEY_GROUPS[g].map((k, i) =>
            createElement(
              'button',
              { type: 'button', className: 'key', part: 'key', dataset: { group: g, index: String(i) }, title: k.title ?? k.tex.trim(), 'aria-label': k.title ?? k.tex.trim() },
              k.label,
            ),
          ),
        ),
      ),
    );
  }

  _renderPreview() {
    const tex = String(this._field?.value ?? '').trim();
    this._previewBox.hidden = this.noPreview || !tex;
    if (this._previewBox.hidden) {
      this._previewBox.replaceChildren();
      return;
    }
    this._previewBox.replaceChildren(latexToMathML(tex, { display: true }));
  }

  updated(changed) {
    const f = this._field;
    if (changed.has('value')) {
      const v = this.value == null ? '' : String(this.value);
      if (f.value !== v) f.value = v;
    }
    f.rows = Math.max(1, this.rows || 2);
    f.placeholder = this.placeholder || msg('mathInput.placeholder');
    f.disabled = this.isDisabled;
    f.readOnly = this.readonly;
    this._label.textContent = this.label || '';
    this._label.hidden = !this.label;
    this._keyboard.hidden = this.noKeyboard || this.readonly;
    this._renderKeyboard();
    for (const b of this._keyboard.querySelectorAll('button')) b.disabled = this.isDisabled;
    this._message.textContent = this.error || '';
    this._message.hidden = !this.error;
    this.toggleAttribute('invalid', Boolean(this.error));
    f.setAttribute('aria-invalid', String(Boolean(this.error)));
    this._renderPreview();
    super.updated(changed);
  }
}

defineElement('hui-math-input', HuiMathInput);

export default HuiMathInput;
