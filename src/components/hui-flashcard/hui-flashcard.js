/**
 * HUI Flashcard — Thẻ ghi nhớ (Molecule): mặt trước / mặt sau là Markdown + công thức (dùng hui-markdown),
 * bấm (hoặc Space / Enter) để lật, sau khi lật hiện 4 nút tự chấm Quên / Khó / Được / Dễ (phím 1–4)
 * kèm gợi ý lần ôn tới. Dùng cho ôn tập lặp lại ngắt quãng — lịch ôn do ứng dụng tính.
 *
 *   <hui-flashcard front="$a^m \cdot a^n$" back="$a^{m+n}$"></hui-flashcard>
 *   el.intervals = ['10 phút', '1 ngày', '3 ngày', '4 ngày'];
 *   el.addEventListener('hui-rate', (e) => save(e.detail.rating));
 */

import styles from './hui-flashcard.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-markdown/index.js';

const FALLBACK = {
  'flashcard.label': { vi: 'Thẻ ghi nhớ', en: 'Flashcard' },
  'flashcard.front': { vi: 'Mặt trước', en: 'Front' },
  'flashcard.back': { vi: 'Mặt sau', en: 'Back' },
  'flashcard.flip': { vi: 'Bấm hoặc nhấn Space để lật thẻ', en: 'Click or press Space to flip' },
  'flashcard.showAnswer': { vi: 'Xem mặt sau', en: 'Show answer' },
  'flashcard.rate': { vi: 'Bạn nhớ thẻ này thế nào?', en: 'How well did you remember?' },
  'flashcard.again': { vi: 'Quên', en: 'Again' },
  'flashcard.hard': { vi: 'Khó', en: 'Hard' },
  'flashcard.good': { vi: 'Được', en: 'Good' },
  'flashcard.easy': { vi: 'Dễ', en: 'Easy' },
};
const msg = (key) => {
  const v = t(key);
  if (v !== key) return v;
  return FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

/** Thứ tự nút chấm = phím 1–4 */
export const RATINGS = ['again', 'hard', 'good', 'easy'];

/**
 * Thẻ ghi nhớ.
 *
 * @fires hui-flip - Thẻ được lật (do người dùng hoặc `flip()`). detail: { flipped }
 * @fires hui-rate - Người học tự chấm sau khi lật. detail: { rating } — again | hard | good | easy
 *
 * @csspart base - Khung thẻ (vùng bấm để lật)
 * @csspart face - Mỗi mặt thẻ
 * @csspart front - Mặt trước
 * @csspart back - Mặt sau
 * @csspart hint - Dòng hướng dẫn lật thẻ
 * @csspart ratings - Nhóm nút chấm
 * @csspart rating - Mỗi nút chấm (thêm part rating-again | rating-hard | rating-good | rating-easy)
 * @cssprop --hui-flashcard-min-height - Chiều cao tối thiểu của thẻ (mặc định 220px)
 * @cssprop --hui-flashcard-bg - Nền mặt trước
 * @cssprop --hui-flashcard-back-bg - Nền mặt sau
 * @cssprop --hui-flashcard-radius - Bo góc
 * @cssprop --hui-flashcard-font-size - Cỡ chữ nội dung
 */
class HuiFlashcard extends HuiElement {
  static localized = true;

  static properties = {
    /** Mặt trước (Markdown + `$công thức$`) */
    front: { type: String, default: '' },
    /** Mặt sau (Markdown + `$công thức$`) */
    back: { type: String, default: '' },
    /** Đang hiện mặt sau */
    flipped: { type: Boolean, reflect: true },
    /** Gợi ý dưới 4 nút (vd. ['10 phút', '1 ngày', '3 ngày', '4 ngày']) — chỉ gán bằng property */
    intervals: { type: Array, attribute: false, default: null },
    /** Ẩn nút chấm (chỉ lật xem) */
    noRating: { type: Boolean },
    /** Khóa thao tác (vd. đang lưu) */
    disabled: { type: Boolean, reflect: true },
  };

  static styles = styles;

  render() {
    this._frontBody = createElement('hui-markdown', { className: 'content' });
    this._backBody = createElement('hui-markdown', { className: 'content' });
    this._frontLabel = createElement('span', { className: 'side' });
    this._backLabel = createElement('span', { className: 'side' });
    this._front = createElement('div', { className: 'face face--front', part: 'face front' }, this._frontLabel, this._frontBody);
    this._back = createElement('div', { className: 'face face--back', part: 'face back' }, this._backLabel, this._backBody);
    this._inner = createElement('div', { className: 'inner' }, this._front, this._back);
    this._base = createElement('div', {
      className: 'card', part: 'base', role: 'button', tabindex: '0', 'aria-live': 'polite',
    }, this._inner);
    this._hint = createElement('p', { className: 'hint', part: 'hint' });
    this._buttons = RATINGS.map((r, i) => createElement('button', {
      type: 'button', className: `rate rate--${r}`, part: `rating rating-${r}`, dataset: { rating: r },
    },
    createElement('span', { className: 'rate-label' }),
    createElement('span', { className: 'rate-hint' }),
    createElement('kbd', { className: 'rate-key', 'aria-hidden': 'true' }, String(i + 1))));
    this._ratings = createElement('div', { className: 'ratings', part: 'ratings', role: 'group' }, ...this._buttons);

    this._base.addEventListener('click', () => this._toggle());
    this._ratings.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rating]');
      if (btn) this._rate(btn.dataset.rating);
    });
    this.addEventListener('keydown', (e) => this._onKey(e));
    return [this._base, this._hint, this._ratings];
  }

  updated(changed) {
    if (changed.has('front')) this._frontBody.value = this.front ?? '';
    if (changed.has('back')) this._backBody.value = this.back ?? '';
    this._frontLabel.textContent = msg('flashcard.front');
    this._backLabel.textContent = msg('flashcard.back');
    this._base.classList.toggle('card--flipped', this.flipped);
    this._front.setAttribute('aria-hidden', String(this.flipped));
    this._back.setAttribute('aria-hidden', String(!this.flipped));
    this._base.setAttribute('aria-label', `${msg('flashcard.label')}: ${this.flipped ? msg('flashcard.back') : msg('flashcard.front')}`);
    this._base.setAttribute('aria-pressed', String(this.flipped));
    this._base.toggleAttribute('aria-disabled', this.disabled);
    this._hint.textContent = msg('flashcard.flip');
    this._hint.hidden = this.flipped && !this.noRating;
    this._ratings.hidden = !this.flipped || this.noRating;
    this._ratings.setAttribute('aria-label', msg('flashcard.rate'));
    const hints = Array.isArray(this.intervals) ? this.intervals : [];
    this._buttons.forEach((btn, i) => {
      btn.querySelector('.rate-label').textContent = msg(`flashcard.${RATINGS[i]}`);
      const hint = btn.querySelector('.rate-hint');
      hint.textContent = hints[i] ?? '';
      hint.hidden = !hints[i];
      btn.disabled = this.disabled;
    });
  }

  /** Lật thẻ (không tham số = đảo mặt) */
  flip(force) {
    const next = typeof force === 'boolean' ? force : !this.flipped;
    if (next === this.flipped) return;
    this.flipped = next;
    this.emit('hui-flip', { flipped: next });
  }

  /** Về mặt trước ngay, không có hiệu ứng lật (gọi trước khi đổi sang thẻ mới để không lộ mặt sau) */
  reset() {
    if (!this.flipped) return;
    this._inner.classList.add('inner--instant');
    this.flipped = false;
    this._base.classList.remove('card--flipped');
    // Bật lại hiệu ứng sau khi trình duyệt đã vẽ mặt trước
    requestAnimationFrame(() => requestAnimationFrame(() => this._inner.classList.remove('inner--instant')));
  }

  _toggle() {
    if (this.disabled) return;
    this.flip();
  }

  _rate(rating) {
    if (this.disabled || !this.flipped || this.noRating || !RATINGS.includes(rating)) return;
    this.emit('hui-rate', { rating });
  }

  _onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const inCard = e.composedPath().includes(this._base);
    if ((e.key === ' ' || e.key === 'Enter') && inCard) {
      e.preventDefault();
      this._toggle();
      return;
    }
    const n = Number(e.key);
    if (n >= 1 && n <= 4 && this.flipped) {
      e.preventDefault();
      this._rate(RATINGS[n - 1]);
    }
  }
}

defineElement('hui-flashcard', HuiFlashcard);

export default HuiFlashcard;
