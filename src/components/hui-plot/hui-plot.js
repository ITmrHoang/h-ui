/**
 * HUI Plot — Đồ thị hàm số (Molecule): hệ trục Oxy + đồ thị từ công thức gõ tự nhiên, nhiều đồ thị một hệ trục,
 * miền nghiệm, điểm, tham số tự sinh **thanh trượt**; kéo để di chuyển, cuộn / nút ± để phóng to.
 * Zero-dependency: tự phân tích biểu thức (không eval), vẽ Canvas 2D.
 *
 *   <hui-plot value="y = 2x + 1
 *   y = a*x^2 - 3
 *   A(1; 3)"></hui-plot>
 *
 * Trong hui-markdown: khối code ```plot … ``` hiện thành <hui-plot> (app cần import hui-plot).
 */

import styles from './hui-plot.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { DEFAULT_VIEW, drawPlot, fitView, parsePlot } from './plot-core.js';

const FALLBACK = {
  'plot.label': { vi: 'Đồ thị', en: 'Graph' },
  'plot.zoomIn': { vi: 'Phóng to', en: 'Zoom in' },
  'plot.zoomOut': { vi: 'Thu nhỏ', en: 'Zoom out' },
  'plot.reset': { vi: 'Về khung ban đầu', en: 'Reset view' },
  'plot.error': { vi: 'Không vẽ được', en: 'Cannot plot' },
};
const msg = (key) => {
  const v = t(key);
  if (v !== key) return v;
  return FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

/**
 * Đồ thị hàm số.
 *
 * @fires hui-view-change - Người dùng kéo / phóng to. detail: { xMin, xMax, yMin, yMax }
 * @fires hui-param-change - Kéo thanh trượt tham số. detail: { name, value, params }
 *
 * @csspart canvas - Canvas đồ thị
 * @csspart controls - Nút phóng to / thu nhỏ
 * @csspart sliders - Khu thanh trượt tham số
 * @cssprop --hui-plot-height - Chiều cao (mặc định 320px)
 */
class HuiPlot extends HuiElement {
  static localized = true;

  static properties = {
    /** Mỗi dòng một đối tượng: `y = …`, `x = …`, `y > …`, `A(1; 2)`, `a = 2`, khung `x: -2 .. 5` */
    value: { type: String, default: '' },
    xMin: { type: Number, attribute: 'x-min', default: DEFAULT_VIEW.xMin },
    xMax: { type: Number, attribute: 'x-max', default: DEFAULT_VIEW.xMax },
    /** Bỏ trống: tự tính theo tỉ lệ khung để đơn vị hai trục bằng nhau */
    yMin: { type: Number, attribute: 'y-min' },
    yMax: { type: Number, attribute: 'y-max' },
    /** Tắt kéo / phóng to (đồ thị tĩnh) */
    locked: { type: Boolean },
    /** Ẩn thanh trượt tham số */
    noSliders: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._plot = { items: [], params: {}, errors: [], view: {} };
    this._view = { ...DEFAULT_VIEW };
    this._drag = null;
  }

  /** Giá trị tham số hiện tại */
  get params() {
    return { ...this._plot.params };
  }

  get view() {
    return { ...this._view };
  }

  render() {
    this._canvas = createElement('canvas', { part: 'canvas' });
    this._zoomIn = createElement('button', { type: 'button', className: 'btn' }, '+');
    this._zoomOut = createElement('button', { type: 'button', className: 'btn' }, '−');
    this._reset = createElement('button', { type: 'button', className: 'btn' }, '⟲');
    this._controls = createElement('div', { className: 'controls', part: 'controls' }, this._zoomIn, this._zoomOut, this._reset);
    this._stage = createElement('div', { className: 'stage' }, this._canvas, this._controls);
    this._sliders = createElement('div', { className: 'sliders', part: 'sliders' });
    this._errors = createElement('div', { className: 'errors', role: 'alert' });

    this._zoomIn.addEventListener('click', () => this._zoom(0.7));
    this._zoomOut.addEventListener('click', () => this._zoom(1 / 0.7));
    this._reset.addEventListener('click', () => this.resetView());
    this._canvas.addEventListener('pointerdown', (e) => this._down(e));
    this._canvas.addEventListener('pointermove', (e) => this._move(e));
    this._canvas.addEventListener('pointerup', () => (this._drag = null));
    this._canvas.addEventListener('pointercancel', () => (this._drag = null));
    this._canvas.addEventListener('wheel', (e) => this._wheel(e), { passive: false });
    return [this._stage, this._sliders, this._errors];
  }

  firstUpdated() {
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this._stage);
    }
    this._resize();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._ro) this._ro.observe(this._stage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
  }

  updated(changed) {
    let viewChanged = ['xMin', 'xMax', 'yMin', 'yMax'].some((k) => changed.has(k));
    if (changed.has('value')) {
      const prev = this._plot;
      this._plot = parsePlot(this.value);
      // Giữ giá trị thanh trượt người dùng đã kéo
      for (const k of Object.keys(this._plot.params)) if (k in prev.params) this._plot.params[k] = prev.params[k];
      if (JSON.stringify(prev.view) !== JSON.stringify(this._plot.view)) viewChanged = true;
      this._renderSliders();
      this._renderErrors();
    }
    if (viewChanged) this.resetView(false);
    this._controls.hidden = this.locked;
    this._sliders.hidden = this.noSliders || !Object.keys(this._plot.params).length;
    for (const [btn, key] of [[this._zoomIn, 'zoomIn'], [this._zoomOut, 'zoomOut'], [this._reset, 'reset']]) {
      btn.title = msg(`plot.${key}`);
      btn.setAttribute('aria-label', btn.title);
    }
    this._canvas.setAttribute('role', 'img');
    this._canvas.setAttribute('aria-label', `${msg('plot.label')}: ${this._plot.items.map((i) => i.label).join('; ')}`);
    this._paint();
  }

  /**
   * Về khung ban đầu: dòng `x: a .. b` / `y: …` trong value, không có thì theo x-min … y-max;
   * thiếu cạnh y thì tính theo tỉ lệ khung (đơn vị hai trục bằng nhau).
   */
  resetView(emit = true) {
    const v = this._plot.view ?? {};
    const ratio = this._stage?.clientWidth ? this._stage.clientHeight / this._stage.clientWidth : 0.5;
    this._view = fitView(
      {
        xMin: v.xMin ?? this.xMin,
        xMax: v.xMax ?? this.xMax,
        yMin: v.yMin ?? this.yMin,
        yMax: v.yMax ?? this.yMax,
      },
      ratio,
    );
    this._moved = false;
    this._paint();
    if (emit) this.emit('hui-view-change', this.view);
  }

  /** Đặt giá trị tham số (như kéo thanh trượt) */
  setParam(name, value) {
    if (!(name in this._plot.params)) return;
    this._plot.params[name] = value;
    const input = this._sliders.querySelector(`input[data-name="${name}"]`);
    if (input) input.value = String(value);
    this._syncSliderLabels();
    this._paint();
  }

  _renderSliders() {
    const names = Object.keys(this._plot.params).sort();
    this._sliders.replaceChildren(
      ...names.map((name) => {
        const input = createElement('input', {
          type: 'range',
          min: '-10',
          max: '10',
          step: '0.1',
          value: String(this._plot.params[name]),
          dataset: { name },
          'aria-label': name,
        });
        input.addEventListener('input', () => {
          this._plot.params[name] = Number(input.value);
          this._syncSliderLabels();
          this._paint();
          this.emit('hui-param-change', { name, value: Number(input.value), params: this.params });
        });
        return createElement(
          'label',
          { className: 'slider' },
          createElement('span', { className: 'name' }, name),
          input,
          createElement('output', { dataset: { for: name } }),
        );
      }),
    );
    this._syncSliderLabels();
  }

  _syncSliderLabels() {
    for (const out of this._sliders.querySelectorAll('output')) {
      out.textContent = `= ${String(this._plot.params[out.dataset.for]).replace('.', ',')}`;
    }
  }

  _renderErrors() {
    this._errors.replaceChildren(
      ...this._plot.errors.map((e) => createElement('div', { className: 'error' }, `${msg('plot.error')} “${e.line}”: ${e.message}`)),
    );
    this._errors.hidden = !this._plot.errors.length;
  }

  _resize() {
    const w = this._stage.clientWidth;
    const h = this._stage.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = Math.round(w * dpr);
    this._canvas.height = Math.round(h * dpr);
    // Khung đổi cỡ mà người dùng chưa kéo / phóng to: tính lại trục y cho đúng tỉ lệ
    if (!this._moved) this.resetView(false);
    else this._paint();
  }

  _paint() {
    const canvas = this._canvas;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas.width) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPlot(ctx, this._plot, this._view, {
      w: canvas.width / dpr,
      h: canvas.height / dpr,
      background: '#ffffff',
    });
  }

  _zoom(factor, cx = 0.5, cy = 0.5) {
    if (this.locked) return;
    const v = this._view;
    const x = v.xMin + (v.xMax - v.xMin) * cx;
    const y = v.yMin + (v.yMax - v.yMin) * (1 - cy);
    this._view = {
      xMin: x - (x - v.xMin) * factor,
      xMax: x + (v.xMax - x) * factor,
      yMin: y - (y - v.yMin) * factor,
      yMax: y + (v.yMax - y) * factor,
    };
    this._moved = true;
    this._paint();
    this.emit('hui-view-change', this.view);
  }

  _wheel(e) {
    if (this.locked) return;
    e.preventDefault();
    const r = this._canvas.getBoundingClientRect();
    this._zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, (e.clientX - r.left) / (r.width || 1), (e.clientY - r.top) / (r.height || 1));
  }

  _down(e) {
    if (this.locked) return;
    this._canvas.setPointerCapture?.(e.pointerId);
    this._drag = { x: e.clientX, y: e.clientY, view: { ...this._view } };
  }

  _move(e) {
    if (!this._drag) return;
    const r = this._canvas.getBoundingClientRect();
    const v = this._drag.view;
    const dx = ((e.clientX - this._drag.x) / (r.width || 1)) * (v.xMax - v.xMin);
    const dy = ((e.clientY - this._drag.y) / (r.height || 1)) * (v.yMax - v.yMin);
    this._view = { xMin: v.xMin - dx, xMax: v.xMax - dx, yMin: v.yMin + dy, yMax: v.yMax + dy };
    this._moved = true;
    this._paint();
    this.emit('hui-view-change', this.view);
  }
}

defineElement('hui-plot', HuiPlot);

export default HuiPlot;
