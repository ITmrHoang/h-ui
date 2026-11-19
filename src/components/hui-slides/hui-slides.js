/**
 * HUI Slides — Trình chiếu (Organism): mỗi phần tử con là một slide, khung 16:9 thiết kế ở 1280 × 720 rồi tự co giãn
 * theo chỗ đặt; chuyển slide bằng nút, phím (← → Space PageUp PageDown Home End) hoặc vuốt; toàn màn hình (F),
 * xem lưới (G). Zero-dependency — nội dung slide do ứng dụng dựng (ví dụ `hui-markdown`).
 *
 *   <hui-slides>
 *     <section><h1>Bài 3</h1></section>
 *     <section><hui-markdown value="$x^2 - 4 = 0$"></hui-markdown></section>
 *   </hui-slides>
 */

import styles from './hui-slides.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';

const FALLBACK = {
  'slides.label': { vi: 'Trình chiếu', en: 'Slides' },
  'slides.prev': { vi: 'Slide trước', en: 'Previous slide' },
  'slides.next': { vi: 'Slide sau', en: 'Next slide' },
  'slides.fullscreen': { vi: 'Toàn màn hình (F)', en: 'Fullscreen (F)' },
  'slides.overview': { vi: 'Xem tất cả slide (G)', en: 'All slides (G)' },
  'slides.empty': { vi: 'Chưa có slide nào', en: 'No slides' },
};
const msg = (key) => {
  const v = t(key);
  if (v !== key) return v;
  return FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

/** Kích thước thiết kế của một slide (px) */
export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;
const SWIPE_PX = 50;

/**
 * Trình chiếu.
 *
 * @fires hui-slide-change - Đổi slide (do người dùng hoặc gọi hàm). detail: { index, total }
 *
 * @slot - Các slide (mỗi phần tử con một slide)
 * @csspart viewport - Khung 16:9
 * @csspart controls - Thanh điều khiển
 * @csspart progress - Thanh tiến độ
 * @csspart counter - Số trang "3 / 10"
 * @cssprop --hui-slides-bg - Nền slide (mặc định trắng)
 * @cssprop --hui-slides-font-size - Cỡ chữ trong slide (theo khung 1280 × 720, mặc định 30px)
 * @cssprop --hui-slides-padding - Lề trong slide (mặc định 48px 72px)
 */
class HuiSlides extends HuiElement {
  static localized = true;

  static properties = {
    /** Slide đang xem (bắt đầu từ 0) */
    index: { type: Number, default: 0, reflect: true },
    /** Ẩn thanh điều khiển (ứng dụng tự điều khiển, ví dụ học sinh xem theo giáo viên) */
    noControls: { type: Boolean },
    /** Không nhận phím / vuốt từ người xem */
    readonly: { type: Boolean },
    /** Đang xem lưới tất cả slide */
    overview: { type: Boolean, reflect: true },
  };

  static styles = styles;

  constructor() {
    super();
    this._swipe = null;
  }

  /** Số slide */
  get total() {
    return this._slides().length;
  }

  _slides() {
    return [...this.children].filter((c) => !c.hasAttribute('slot'));
  }

  render() {
    this._slot = createElement('slot');
    this._stage = createElement('div', { className: 'stage' }, this._slot);
    this._empty = createElement('div', { className: 'empty' });
    this._viewport = createElement('div', { className: 'viewport', part: 'viewport' }, this._stage, this._empty);
    this._prevBtn = createElement('button', { type: 'button', className: 'btn' }, '‹');
    this._nextBtn = createElement('button', { type: 'button', className: 'btn' }, '›');
    this._counter = createElement('span', { className: 'counter', part: 'counter', 'aria-live': 'polite' });
    this._gridBtn = createElement('button', { type: 'button', className: 'btn' }, '▦');
    this._fullBtn = createElement('button', { type: 'button', className: 'btn' }, '⛶');
    this._bar = createElement('div', { className: 'bar' });
    this._progress = createElement('div', { className: 'progress', part: 'progress' }, this._bar);
    this._controls = createElement(
      'div',
      { className: 'controls', part: 'controls' },
      this._prevBtn,
      this._counter,
      this._nextBtn,
      this._progress,
      this._gridBtn,
      this._fullBtn,
    );

    this._prevBtn.addEventListener('click', () => this.prev());
    this._nextBtn.addEventListener('click', () => this.next());
    this._gridBtn.addEventListener('click', () => this.toggleOverview());
    this._fullBtn.addEventListener('click', () => this.toggleFullscreen());
    this._slot.addEventListener('slotchange', () => this._sync());
    this.addEventListener('keydown', (e) => this._key(e));
    this.addEventListener('click', (e) => this._pickInOverview(e));
    this._viewport.addEventListener('pointerdown', (e) => {
      this._swipe = this.overview || this.readonly ? null : { x: e.clientX, y: e.clientY };
    });
    this._viewport.addEventListener('pointerup', (e) => this._endSwipe(e));
    this._viewport.addEventListener('pointercancel', () => (this._swipe = null));
    return [this._viewport, this._controls];
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.listen(document, 'fullscreenchange', () => {
      this.toggleAttribute('fullscreen', document.fullscreenElement === this);
      this._fit();
    });
    if (this._ro) this._ro.observe(this._viewport);
  }

  firstUpdated() {
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._fit());
      this._ro.observe(this._viewport);
    }
    this._fit();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
  }

  updated(changed) {
    if (changed.has('index') || changed.has('overview')) this._sync();
    if (changed.has('overview')) this._fit();
    this._controls.hidden = this.noControls;
    for (const [btn, key] of [[this._prevBtn, 'prev'], [this._nextBtn, 'next'], [this._gridBtn, 'overview'], [this._fullBtn, 'fullscreen']]) {
      btn.title = msg(`slides.${key}`);
      btn.setAttribute('aria-label', btn.title);
    }
    this._gridBtn.setAttribute('aria-pressed', String(this.overview));
    this.setAttribute('role', 'region');
    this.setAttribute('aria-roledescription', msg('slides.label'));
    this._empty.textContent = msg('slides.empty');
  }

  /** Hiện slide đang xem, ẩn các slide khác; cập nhật số trang. */
  _sync() {
    const slides = this._slides();
    const total = slides.length;
    const index = total ? Math.min(Math.max(0, this.index), total - 1) : 0;
    if (index !== this.index && total) {
      this.index = index;
      return;
    }
    slides.forEach((s, i) => {
      const show = this.overview || i === index;
      s.hidden = !show;
      s.toggleAttribute('data-active', i === index);
      s.setAttribute('aria-hidden', String(!show));
    });
    this._empty.hidden = total > 0;
    this._counter.textContent = total ? `${index + 1} / ${total}` : '0 / 0';
    this._bar.style.width = total ? `${((index + 1) / total) * 100}%` : '0';
    this._prevBtn.disabled = index <= 0;
    this._nextBtn.disabled = index >= total - 1;
  }

  /** Co khung thiết kế 1280 × 720 vừa chỗ đặt. */
  _fit() {
    const w = this._viewport.clientWidth;
    if (!w) return;
    const scale = this.overview ? 1 : w / SLIDE_WIDTH;
    this._stage.style.transform = this.overview ? '' : `scale(${scale})`;
  }

  /** Chuyển tới slide `i` (phát `hui-slide-change` nếu đổi). */
  goTo(i) {
    const total = this.total;
    if (!total) return;
    const next = Math.min(Math.max(0, i), total - 1);
    if (next === this.index) return;
    this.index = next;
    this._sync();
    this.emit('hui-slide-change', { index: next, total });
  }

  next() {
    this.goTo(this.index + 1);
  }

  prev() {
    this.goTo(this.index - 1);
  }

  toggleOverview(force) {
    this.overview = force ?? !this.overview;
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement === this) await document.exitFullscreen();
      else await this.requestFullscreen?.();
    } catch {
      /* trình duyệt chặn (không có thao tác của người dùng) */
    }
  }

  _key(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    // Đang gõ trong ô nhập bên trong slide thì không chuyển slide
    const target = e.composedPath()[0];
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
    const key = e.key;
    if (key === 'f' || key === 'F') {
      this.toggleFullscreen();
    } else if (key === 'g' || key === 'G') {
      this.toggleOverview();
    } else if (key === 'Escape' && this.overview) {
      this.overview = false;
    } else if (this.readonly) {
      return;
    } else if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(key)) {
      this.next();
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(key)) {
      this.prev();
    } else if (key === 'Home') {
      this.goTo(0);
    } else if (key === 'End') {
      this.goTo(this.total - 1);
    } else {
      return;
    }
    e.preventDefault();
  }

  _endSwipe(e) {
    const s = this._swipe;
    this._swipe = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(e.clientY - s.y)) return;
    if (dx < 0) this.next();
    else this.prev();
  }

  /** Đang xem lưới: bấm vào slide nào thì mở slide đó. */
  _pickInOverview(e) {
    if (!this.overview) return;
    const slide = this._slides().find((s) => e.composedPath().includes(s));
    if (!slide) return;
    this.overview = false;
    this.goTo(this._slides().indexOf(slide));
  }
}

defineElement('hui-slides', HuiSlides);

export default HuiSlides;
