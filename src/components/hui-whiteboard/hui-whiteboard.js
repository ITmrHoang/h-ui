/**
 * HUI Whiteboard — Bảng vẽ (Organism) cho dạy trực tuyến: bút, bút dạ quang, tẩy (xóa cả nét), đoạn thẳng,
 * mũi tên, hình chữ nhật, elip, chữ, đồ thị hàm số, công thức (LaTeX), hình học (điểm có nhãn, đường tròn, đa
 * giác, bắt dính điểm), ảnh; công cụ chọn (di chuyển / đổi cỡ / xóa / nhân bản); nền trang (ô vuông, ô ly, dòng
 * kẻ, chấm, hệ trục); màu + độ dày; hoàn tác / làm lại; nhiều trang; xuất ảnh PNG.
 *
 * Zero-dependency: component tự lo vẽ (Canvas 2D), công cụ và mô hình dữ liệu; mỗi thay đổi phát `hui-change`
 * kèm một **thao tác** (op) để app gửi cho máy khác (LiveKit data, WebSocket, Yjs…), máy kia gọi
 * `applyRemote(op)`. Tọa độ chuẩn hóa theo trang 1600 × 900 (16:9) nên mọi màn hình thấy giống nhau.
 *
 *   <hui-whiteboard author="u:123"></hui-whiteboard>
 *   board.addEventListener('hui-change', (e) => send(e.detail.op));
 *   onMessage((op) => board.applyRemote(op));
 */

import styles from './hui-whiteboard.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-math-input/hui-math-input.js';
import {
  BACKGROUNDS,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  bbox,
  clone,
  drawBackground,
  drawElement,
  drawSelection,
  hitTest,
  nextLabel,
  onHandle,
  resizable,
  scale,
  snapAngle,
  snapPoint,
  snapTargets,
  translate,
  unionBox,
} from './elements.js';
import { createImageCache, createMathCache, measureMath } from './math-image.js';

export { BACKGROUNDS, PAGE_HEIGHT, PAGE_WIDTH, hitTest };

const FALLBACK = {
  'whiteboard.label': { vi: 'Bảng', en: 'Whiteboard' },
  'whiteboard.select': { vi: 'Chọn / di chuyển (Delete xóa, Ctrl + D nhân bản)', en: 'Select / move (Delete, Ctrl + D duplicate)' },
  'whiteboard.pen': { vi: 'Bút', en: 'Pen' },
  'whiteboard.highlighter': { vi: 'Bút dạ quang', en: 'Highlighter' },
  'whiteboard.eraser': { vi: 'Tẩy', en: 'Eraser' },
  'whiteboard.line': { vi: 'Đoạn thẳng (bắt dính điểm, Shift: góc 15°)', en: 'Line (snaps to points, Shift: 15°)' },
  'whiteboard.arrow': { vi: 'Mũi tên', en: 'Arrow' },
  'whiteboard.rect': { vi: 'Hình chữ nhật', en: 'Rectangle' },
  'whiteboard.ellipse': { vi: 'Elip', en: 'Ellipse' },
  'whiteboard.circle': { vi: 'Đường tròn (kéo từ tâm)', en: 'Circle (drag from center)' },
  'whiteboard.polygon': { vi: 'Đa giác (bấm từng đỉnh, bấm đỉnh đầu / Enter để xong)', en: 'Polygon (click vertices, click first / Enter to finish)' },
  'whiteboard.point': { vi: 'Điểm (tự đặt tên A, B, C…)', en: 'Point (auto label A, B, C…)' },
  'whiteboard.text': { vi: 'Chữ', en: 'Text' },
  'whiteboard.math': { vi: 'Công thức', en: 'Formula' },
  'whiteboard.plot': { vi: 'Đồ thị hàm số', en: 'Function graph' },
  'whiteboard.image': { vi: 'Chèn ảnh', en: 'Insert image' },
  'whiteboard.background': { vi: 'Nền trang', en: 'Page background' },
  'whiteboard.bg.none': { vi: 'Nền trắng', en: 'Blank' },
  'whiteboard.bg.grid': { vi: 'Ô vuông', en: 'Grid' },
  'whiteboard.bg.oly': { vi: 'Ô ly', en: 'Fine grid' },
  'whiteboard.bg.lines': { vi: 'Dòng kẻ', en: 'Lined' },
  'whiteboard.bg.dots': { vi: 'Chấm', en: 'Dots' },
  'whiteboard.bg.axes': { vi: 'Hệ trục Oxy', en: 'Coordinate axes' },
  'whiteboard.plotPlaceholder': {
    vi: 'Mỗi dòng một đồ thị: y = 2x + 1, y = x^2, A(1; 2)… — Ctrl + Enter để vẽ',
    en: 'One graph per line: y = 2x + 1, y = x^2, A(1; 2)… — Ctrl + Enter to draw',
  },
  'whiteboard.mathOk': { vi: 'Đặt lên bảng (Ctrl + Enter)', en: 'Place (Ctrl + Enter)' },
  'whiteboard.cancel': { vi: 'Hủy', en: 'Cancel' },
  'whiteboard.color': { vi: 'Màu', en: 'Color' },
  'whiteboard.size': { vi: 'Độ dày', en: 'Size' },
  'whiteboard.undo': { vi: 'Hoàn tác', en: 'Undo' },
  'whiteboard.redo': { vi: 'Làm lại', en: 'Redo' },
  'whiteboard.clear': { vi: 'Xóa trang (giữ ảnh nền khóa)', en: 'Clear page (keeps locked background)' },
  'whiteboard.prev': { vi: 'Trang trước', en: 'Previous page' },
  'whiteboard.next': { vi: 'Trang sau', en: 'Next page' },
  'whiteboard.addPage': { vi: 'Thêm trang', en: 'Add page' },
  'whiteboard.page': { vi: 'Trang', en: 'Page' },
  'whiteboard.textPlaceholder': { vi: 'Gõ chữ rồi nhấn Enter', en: 'Type, then press Enter' },
};
const msg = (key) => {
  const v = t(key);
  if (v !== key) return v;
  return FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

export const TOOLS = ['select', 'pen', 'highlighter', 'eraser', 'line', 'arrow', 'rect', 'ellipse', 'circle', 'polygon', 'point', 'text', 'math', 'plot'];
const TOOL_ICONS = {
  select: '⬉',
  pen: '✎',
  highlighter: '▌',
  eraser: '⌫',
  line: '╱',
  arrow: '➚',
  rect: '▭',
  ellipse: '◯',
  circle: '⊙',
  polygon: '⬠',
  point: '•',
  text: 'T',
  math: '∑',
  plot: 'ƒ',
};
/** Nhóm nút trên thanh công cụ */
const TOOL_GROUPS = [
  ['select', 'pen', 'highlighter', 'eraser'],
  ['line', 'arrow', 'rect', 'ellipse'],
  ['point', 'circle', 'polygon'],
  ['text', 'math', 'plot'],
];
const DEFAULT_PALETTE = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];
const SIZES = [2, 4, 8, 14];
const SHAPES = ['line', 'arrow', 'rect', 'ellipse'];
/** Khung đồ thị mặc định khi chỉ chạm (không kéo) */
const PLOT_BOX = { w: 640, h: 400 };

let seq = 0;
const newId = () => `${Date.now().toString(36)}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Bảng vẽ.
 *
 * @fires hui-change - Bảng thay đổi do người dùng (vẽ, tẩy, xóa trang, hoàn tác, thêm trang, đổi nền). detail: { op }
 *   op = { kind: 'add', page, elements } | { kind: 'remove', page, ids } | { kind: 'update', page, element }
 *        | { kind: 'update', page, elements } | { kind: 'clear', page } | { kind: 'page-add', background? }
 *        | { kind: 'page-bg', page, background }
 * @fires hui-page - Người dùng chuyển trang. detail: { page }
 * @fires hui-image-request - Bấm nút chèn ảnh (app mở hộp chọn file, tải lên rồi gọi `addImage`).
 * @fires hui-paste-image - Dán ảnh (Ctrl + V) vào bảng. detail: { file }
 *
 * @csspart toolbar - Thanh công cụ
 * @csspart tool - Mỗi nút công cụ
 * @csspart stage - Khung chứa canvas (tỉ lệ 16:9)
 * @csspart canvas - Canvas
 * @cssprop --hui-whiteboard-bg - Nền khung ngoài
 * @cssprop --hui-whiteboard-radius - Bo góc
 */
class HuiWhiteboard extends HuiElement {
  static localized = true;

  static properties = {
    /** Chỉ xem (không vẽ, ẩn thanh công cụ) */
    readonly: { type: Boolean, reflect: true },
    /** select | pen | highlighter | eraser | line | arrow | rect | ellipse | circle | polygon | point | text | math | plot */
    tool: { type: String, default: 'pen' },
    color: { type: String, default: '#111827' },
    /** Độ dày nét (đơn vị trang 1600 × 900); chữ dùng cỡ chữ = 16 + size × 4 */
    size: { type: Number, default: 4 },
    /** Gắn vào phần tử mới vẽ (ví dụ danh tính người vẽ) */
    author: { type: String, default: '' },
    /** Trang đang xem (bắt đầu từ 0) */
    page: { type: Number, default: 0, reflect: true },
    /** Ẩn thanh công cụ có sẵn (app tự làm) */
    noToolbar: { type: Boolean },
    /** Ẩn nút chèn ảnh (app không hỗ trợ tải ảnh lên) */
    noImage: { type: Boolean },
    /** Bảng màu — chỉ gán bằng property */
    palette: { type: Array, attribute: false, default: null },
    /** Màu nền trang (cả khi xuất ảnh) */
    background: { type: String, default: '#ffffff' },
  };

  static styles = styles;

  constructor() {
    super();
    /** @type {Array<Array<object>>} */
    this._pages = [[]];
    /** Nền từng trang (BACKGROUNDS) */
    this._bgs = ['none'];
    this._undo = [];
    this._redo = [];
    this._draft = null;
    this._erased = null;
    /** id phần tử đang chọn (công cụ chọn) */
    this._selected = new Set();
    /** Kéo khi chọn: { mode: move | resize | marquee, start, originals, box, current } */
    this._drag = null;
    /** Đa giác đang vẽ: { el, hover } */
    this._poly = null;
    const repaint = () => this._paint();
    this._images = createImageCache(repaint);
    this._maths = createMathCache(repaint);
    this._res = { image: (src) => this._images.image(src), math: (el) => this._maths.image(el) };
  }

  // ---------- Dữ liệu ----------

  get pageCount() {
    return this._pages.length;
  }

  /** Phần tử của trang (mặc định trang đang xem) — bản sao */
  elements(page = this.page) {
    return clone(this._pages[page] ?? []);
  }

  /** Nền của trang */
  backgroundOf(page = this.page) {
    return this._bgs[page] ?? 'none';
  }

  /** id các phần tử đang chọn */
  get selection() {
    return [...this._selected];
  }

  getSnapshot() {
    return { pages: clone(this._pages), page: this.page, backgrounds: [...this._bgs] };
  }

  loadSnapshot(snapshot) {
    const pages = Array.isArray(snapshot?.pages) && snapshot.pages.length ? clone(snapshot.pages) : [[]];
    this._pages = pages;
    const bgs = Array.isArray(snapshot?.backgrounds) ? snapshot.backgrounds : [];
    this._bgs = pages.map((_, i) => (BACKGROUNDS.includes(bgs[i]) ? bgs[i] : 'none'));
    this._undo = [];
    this._redo = [];
    this._selected.clear();
    this.page = Math.min(Math.max(0, snapshot?.page ?? 0), pages.length - 1);
    this._paint();
    this._syncToolbar();
  }

  /** Áp thao tác từ máy khác (không phát sự kiện, không vào lịch sử hoàn tác). */
  applyRemote(op) {
    this._apply(op);
  }

  _ensurePage(page) {
    while (page >= this._pages.length) {
      this._pages.push([]);
      this._bgs.push('none');
    }
  }

  _apply(op) {
    if (!op || typeof op !== 'object') return;
    if (op.kind === 'page-add') {
      this._pages.push([]);
      this._bgs.push(BACKGROUNDS.includes(op.background) ? op.background : 'none');
    } else {
      if (!Number.isInteger(op.page) || op.page < 0) return;
      this._ensurePage(op.page);
      const list = this._pages[op.page];
      if (op.kind === 'add') {
        const ids = new Set(list.map((e) => e.id));
        const fresh = (op.elements ?? []).filter((el) => !ids.has(el.id)).map(clone);
        // `under`: đặt dưới mọi nét (ảnh nền trang)
        if (op.under) list.unshift(...fresh);
        else list.push(...fresh);
      } else if (op.kind === 'remove') {
        const ids = new Set(op.ids ?? []);
        this._pages[op.page] = list.filter((e) => !ids.has(e.id));
      } else if (op.kind === 'update') {
        for (const el of op.elements ?? (op.element ? [op.element] : [])) {
          const i = list.findIndex((e) => e.id === el.id);
          if (i >= 0) list[i] = clone(el);
        }
      } else if (op.kind === 'clear') {
        // Ảnh nền khóa (trang PDF) được giữ
        this._pages[op.page] = list.filter((e) => e.locked);
      } else if (op.kind === 'page-bg') {
        this._bgs[op.page] = BACKGROUNDS.includes(op.background) ? op.background : 'none';
      }
    }
    // Phần tử đang chọn bị máy khác xóa → bỏ chọn
    const here = new Set((this._pages[this.page] ?? []).map((e) => e.id));
    for (const id of this._selected) if (!here.has(id)) this._selected.delete(id);
    if (op.kind === 'page-add' || op.page === this.page) this._paint();
    this._syncToolbar();
  }

  /** Thao tác của người dùng: áp + ghi lịch sử + phát sự kiện. */
  _commit(op, inverse) {
    this._apply(op);
    if (inverse) {
      this._undo.push({ op, inverse });
      this._redo = [];
    }
    this.emit('hui-change', { op });
    this._syncToolbar();
  }

  undo() {
    const entry = this._undo.pop();
    if (!entry) return;
    this._redo.push(entry);
    this._apply(entry.inverse);
    this.emit('hui-change', { op: entry.inverse });
    this._syncToolbar();
  }

  redo() {
    const entry = this._redo.pop();
    if (!entry) return;
    this._undo.push(entry);
    this._apply(entry.op);
    this.emit('hui-change', { op: entry.op });
    this._syncToolbar();
  }

  /** Xóa nét vẽ của trang (giữ ảnh nền khóa). */
  clearPage() {
    const removed = (this._pages[this.page] ?? []).filter((e) => !e.locked);
    if (!removed.length) return;
    this._selected.clear();
    this._commit({ kind: 'clear', page: this.page }, { kind: 'add', page: this.page, elements: clone(removed) });
  }

  /** Thêm trang (nền tùy chọn) và chuyển sang trang đó. */
  addPage(background = 'none') {
    const bg = BACKGROUNDS.includes(background) ? background : 'none';
    this._commit(bg === 'none' ? { kind: 'page-add' } : { kind: 'page-add', background: bg });
    this._goto(this._pages.length - 1);
  }

  /** Đổi nền trang (none | grid | oly | lines | dots | axes). */
  setBackground(background, page = this.page) {
    const bg = BACKGROUNDS.includes(background) ? background : 'none';
    const before = this.backgroundOf(page);
    if (bg === before) return;
    this._commit({ kind: 'page-bg', page, background: bg }, { kind: 'page-bg', page, background: before });
  }

  /**
   * Thêm đồ thị hàm số vào trang đang xem (như dùng công cụ ƒ).
   * @param {string} value - công thức, mỗi dòng một đồ thị (cú pháp của hui-plot)
   * @param {{ x1, y1, x2, y2 }} [box] - khung theo tọa độ trang; mặc định 640 × 400 giữa trang
   * @returns {string|null} id phần tử
   */
  addPlot(value, box = null) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const b = box ?? {
      x1: (PAGE_WIDTH - PLOT_BOX.w) / 2,
      y1: (PAGE_HEIGHT - PLOT_BOX.h) / 2,
      x2: (PAGE_WIDTH + PLOT_BOX.w) / 2,
      y2: (PAGE_HEIGHT + PLOT_BOX.h) / 2,
    };
    const el = { id: newId(), type: 'plot', x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, value: text, color: this.color, size: 0, author: this.author };
    this._commit({ kind: 'add', page: this.page, elements: [el] }, { kind: 'remove', page: this.page, ids: [el.id] });
    return el.id;
  }

  /**
   * Thêm ảnh (link cùng tên miền để còn xuất được PNG).
   * @param {string} src
   * @param {{ width?: number, height?: number, box?: object, locked?: boolean, page?: number }} [opts]
   *   width / height: kích thước gốc của ảnh để giữ tỉ lệ. `locked`: ảnh nền phủ cả trang, không chọn / tẩy được.
   * @returns {string|null} id phần tử
   */
  addImage(src, opts = {}) {
    if (!src) return null;
    const page = Number.isInteger(opts.page) ? opts.page : this.page;
    this._ensurePage(page);
    const ratio = opts.width && opts.height ? opts.width / opts.height : 16 / 9;
    let box = opts.box;
    if (!box) {
      const maxW = opts.locked ? PAGE_WIDTH : 1100;
      const maxH = opts.locked ? PAGE_HEIGHT : 640;
      let w = Math.min(maxW, opts.width || maxW);
      let h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      box = { x1: (PAGE_WIDTH - w) / 2, y1: (PAGE_HEIGHT - h) / 2, x2: (PAGE_WIDTH + w) / 2, y2: (PAGE_HEIGHT + h) / 2 };
    }
    const el = { id: newId(), type: 'image', src, x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2, color: this.color, size: 0, author: this.author };
    // Ảnh nền khóa nằm dưới mọi nét vẽ (`under`)
    const op = opts.locked ? { kind: 'add', page, elements: [{ ...el, locked: true }], under: true } : { kind: 'add', page, elements: [el] };
    this._commit(op, { kind: 'remove', page, ids: [el.id] });
    return el.id;
  }

  _goto(page) {
    const next = Math.min(Math.max(0, page), this._pages.length - 1);
    if (next === this.page) return;
    this.page = next;
    this.emit('hui-page', { page: next });
  }

  /** Vẽ cả trang lên ctx (đã đặt tỉ lệ theo trang). */
  _drawPage(ctx, page, overrides = null) {
    drawBackground(ctx, this._bgs[page]);
    for (const el of this._pages[page] ?? []) drawElement(ctx, overrides?.get(el.id) ?? el, this._res);
  }

  /** Ảnh PNG / JPEG của một trang (kích thước gốc 1600 × 900). Ảnh / công thức chưa tải xong sẽ thiếu — dùng `toDataURLAsync`. */
  toDataURL(page = this.page, type = 'image/png', quality = 0.92) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.background || '#ffffff';
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    this._drawPage(ctx, page);
    return canvas.toDataURL(type, quality);
  }

  /** Như `toDataURL` nhưng chờ ảnh / công thức của trang tải xong. */
  async toDataURLAsync(page = this.page, type = 'image/png', quality = 0.92) {
    const els = this._pages[page] ?? [];
    await Promise.race([
      Promise.all([this._images.ready(els), this._maths.ready(els)]),
      new Promise((r) => setTimeout(r, 8000)),
    ]);
    return this.toDataURL(page, type, quality);
  }

  // ---------- Giao diện ----------

  render() {
    const toolButtons = TOOLS.map((tool) =>
      createElement('button', { type: 'button', className: 'btn tool', part: 'tool', dataset: { tool } }, TOOL_ICONS[tool]),
    );
    this._toolButtons = toolButtons;
    const byTool = Object.fromEntries(toolButtons.map((b) => [b.dataset.tool, b]));
    this._imageBtn = createElement('button', { type: 'button', className: 'btn' }, '🖼');
    this._swatches = createElement('span', { className: 'swatches' });
    this._sizeSelect = createElement(
      'select',
      { className: 'size' },
      ...SIZES.map((s) => createElement('option', { value: String(s) }, `${s}`)),
    );
    this._bgSelect = createElement(
      'select',
      { className: 'size bg' },
      ...BACKGROUNDS.map((b) => createElement('option', { value: b }, b)),
    );
    this._undoBtn = createElement('button', { type: 'button', className: 'btn' }, '↶');
    this._redoBtn = createElement('button', { type: 'button', className: 'btn' }, '↷');
    this._clearBtn = createElement('button', { type: 'button', className: 'btn' }, '🗑');
    this._prevBtn = createElement('button', { type: 'button', className: 'btn' }, '‹');
    this._nextBtn = createElement('button', { type: 'button', className: 'btn' }, '›');
    this._addPageBtn = createElement('button', { type: 'button', className: 'btn' }, '+');
    this._pageLabel = createElement('span', { className: 'page-label' });
    this._toolbar = createElement(
      'div',
      { className: 'toolbar', part: 'toolbar', role: 'toolbar' },
      ...TOOL_GROUPS.map((g) => createElement('span', { className: 'group' }, ...g.map((tool) => byTool[tool]))),
      createElement('span', { className: 'group' }, this._imageBtn, this._bgSelect),
      this._swatches,
      this._sizeSelect,
      createElement('span', { className: 'group' }, this._undoBtn, this._redoBtn, this._clearBtn),
      createElement('span', { className: 'group pages' }, this._prevBtn, this._pageLabel, this._nextBtn, this._addPageBtn),
    );

    this._canvas = createElement('canvas', { part: 'canvas' });
    this._textInput = createElement('input', { type: 'text', className: 'text-input', hidden: true });
    this._plotInput = createElement('textarea', { className: 'plot-input', hidden: true, rows: '4', spellcheck: 'false' });
    this._mathInput = createElement('hui-math-input', { rows: '2' });
    this._mathOk = createElement('button', { type: 'button', className: 'btn primary' }, '✓');
    this._mathCancel = createElement('button', { type: 'button', className: 'btn' }, '✕');
    this._mathBox = createElement(
      'div',
      { className: 'math-box', hidden: true },
      this._mathInput,
      createElement('div', { className: 'math-actions' }, this._mathCancel, this._mathOk),
    );
    this._stage = createElement(
      'div',
      { className: 'stage', part: 'stage', tabindex: '0' },
      this._canvas,
      this._textInput,
      this._plotInput,
      this._mathBox,
    );

    this._toolbar.addEventListener('click', (e) => this._onToolbar(e));
    this._sizeSelect.addEventListener('change', () => {
      this.size = Number(this._sizeSelect.value);
    });
    this._bgSelect.addEventListener('change', () => this.setBackground(this._bgSelect.value));
    this._canvas.addEventListener('pointerdown', (e) => this._down(e));
    this._canvas.addEventListener('pointermove', (e) => this._move(e));
    this._canvas.addEventListener('pointerup', (e) => this._up(e));
    this._canvas.addEventListener('pointercancel', (e) => this._up(e));
    this._canvas.addEventListener('dblclick', () => this._finishPolygon());
    this._textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._commitText();
      if (e.key === 'Escape') this._closeText();
      e.stopPropagation();
    });
    this._textInput.addEventListener('blur', () => this._commitText());
    this._plotInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) this._commitPlot();
      if (e.key === 'Escape') this._closePlot();
      e.stopPropagation();
    });
    this._plotInput.addEventListener('blur', () => this._commitPlot());
    this._mathBox.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._closeMath();
      e.stopPropagation();
    });
    this._mathInput.addEventListener('hui-submit', () => this._commitMath());
    this._mathOk.addEventListener('click', () => this._commitMath());
    this._mathCancel.addEventListener('click', () => this._closeMath());
    this._stage.addEventListener('keydown', (e) => this._onKey(e));
    this._stage.addEventListener('paste', (e) => this._onPaste(e));
    return [this._toolbar, this._stage];
  }

  firstUpdated() {
    if (typeof ResizeObserver === 'function') {
      this._resizeObserver = new ResizeObserver(() => this._resize());
      this._resizeObserver.observe(this._stage);
    }
    this._resize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._resizeObserver) this._resizeObserver.observe(this._stage);
  }

  updated(changed) {
    if (changed.has('page')) {
      const max = this._pages.length - 1;
      if (this.page > max || this.page < 0) {
        this.page = Math.min(Math.max(0, this.page), max);
        return;
      }
      this._resetTransient();
      this._paint();
    }
    if (changed.has('tool')) {
      if (this.tool !== 'select') this._selected.clear();
      if (this.tool !== 'polygon') this._poly = null;
      this._paint();
    }
    if (changed.has('background')) this._paint();
    if (changed.has('readonly') && this.readonly) this._resetTransient();
    this._toolbar.hidden = this.readonly || this.noToolbar;
    this._stage.classList.toggle('readonly', this.readonly);
    this._stage.dataset.tool = this.tool;
    this._stage.setAttribute('aria-label', `${msg('whiteboard.label')} — ${msg('whiteboard.page')} ${this.page + 1}`);
    this._syncToolbar();
  }

  /** Bỏ mọi thứ đang dở (chữ / đồ thị / công thức đang gõ, đa giác, vùng chọn). */
  _resetTransient() {
    this._draft = null;
    this._drag = null;
    this._poly = null;
    this._selected.clear();
    this._closeText();
    this._closePlot();
    this._closeMath();
  }

  _syncToolbar() {
    if (!this._toolbar) return;
    this._toolButtons.forEach((b) => {
      const tool = b.dataset.tool;
      const label = msg(`whiteboard.${tool}`);
      b.title = label;
      b.setAttribute('aria-label', label);
      b.setAttribute('aria-pressed', String(tool === this.tool));
    });
    const colors = Array.isArray(this.palette) && this.palette.length ? this.palette : DEFAULT_PALETTE;
    if (this._swatches.dataset.colors !== colors.join()) {
      this._swatches.dataset.colors = colors.join();
      this._swatches.replaceChildren(
        ...colors.map((c) =>
          createElement('button', { type: 'button', className: 'swatch', dataset: { color: c }, style: `--c: ${c}` }),
        ),
      );
    }
    for (const s of this._swatches.children) {
      s.setAttribute('aria-pressed', String(s.dataset.color === this.color));
      s.title = `${msg('whiteboard.color')} ${s.dataset.color}`;
      s.setAttribute('aria-label', s.title);
    }
    this._sizeSelect.value = String(SIZES.includes(this.size) ? this.size : SIZES[1]);
    this._sizeSelect.title = msg('whiteboard.size');
    this._sizeSelect.setAttribute('aria-label', msg('whiteboard.size'));
    for (const o of this._bgSelect.options) o.textContent = msg(`whiteboard.bg.${o.value}`);
    this._bgSelect.value = this.backgroundOf();
    this._bgSelect.title = msg('whiteboard.background');
    this._bgSelect.setAttribute('aria-label', msg('whiteboard.background'));
    this._imageBtn.hidden = this.noImage;
    this._imageBtn.title = msg('whiteboard.image');
    this._imageBtn.setAttribute('aria-label', this._imageBtn.title);
    for (const [btn, key, disabled] of [
      [this._undoBtn, 'undo', !this._undo.length],
      [this._redoBtn, 'redo', !this._redo.length],
      [this._clearBtn, 'clear', !(this._pages[this.page] ?? []).some((e) => !e.locked)],
      [this._prevBtn, 'prev', this.page <= 0],
      [this._nextBtn, 'next', this.page >= this._pages.length - 1],
      [this._addPageBtn, 'addPage', false],
    ]) {
      btn.title = msg(`whiteboard.${key}`);
      btn.setAttribute('aria-label', btn.title);
      btn.disabled = disabled;
    }
    this._pageLabel.textContent = `${this.page + 1} / ${this._pages.length}`;
    this._textInput.placeholder = msg('whiteboard.textPlaceholder');
    this._plotInput.placeholder = msg('whiteboard.plotPlaceholder');
    this._plotInput.setAttribute('aria-label', msg('whiteboard.plot'));
    this._mathOk.title = msg('whiteboard.mathOk');
    this._mathOk.setAttribute('aria-label', this._mathOk.title);
    this._mathCancel.title = msg('whiteboard.cancel');
    this._mathCancel.setAttribute('aria-label', this._mathCancel.title);
  }

  _onToolbar(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.tool) this.tool = btn.dataset.tool;
    else if (btn.dataset.color) this._setColor(btn.dataset.color);
    else if (btn === this._imageBtn) this.emit('hui-image-request', { page: this.page });
    else if (btn === this._undoBtn) this.undo();
    else if (btn === this._redoBtn) this.redo();
    else if (btn === this._clearBtn) this.clearPage();
    else if (btn === this._prevBtn) this._goto(this.page - 1);
    else if (btn === this._nextBtn) this._goto(this.page + 1);
    else if (btn === this._addPageBtn) this.addPage(this.backgroundOf());
  }

  /** Chọn màu; đang chọn phần tử nét → đổi màu các phần tử đó. */
  _setColor(color) {
    this.color = color;
    if (this.tool !== 'select' || !this._selected.size) return;
    const list = this._pages[this.page] ?? [];
    const before = list.filter((e) => this._selected.has(e.id) && 'color' in e && e.type !== 'image' && e.type !== 'plot');
    if (!before.length) return;
    const after = before.map((e) => ({ ...clone(e), color }));
    this._commit({ kind: 'update', page: this.page, elements: after }, { kind: 'update', page: this.page, elements: clone(before) });
  }

  _onKey(e) {
    if (this.readonly) return;
    const key = e.key.toLowerCase();
    if (this.tool === 'polygon' && this._poly) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._finishPolygon();
        return;
      }
      if (e.key === 'Escape') {
        this._poly = null;
        this._paint();
        return;
      }
    }
    if (this.tool === 'select' && this._selected.size) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.deleteSelected();
        return;
      }
      if (e.key === 'Escape') {
        this._selected.clear();
        this._paint();
        return;
      }
      if (key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.duplicateSelected();
        return;
      }
    }
    if (!(e.ctrlKey || e.metaKey)) return;
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      this.redo();
    }
  }

  _onPaste(e) {
    if (this.readonly || this.noImage) return;
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    this.emit('hui-paste-image', { file, page: this.page });
  }

  /** Xóa các phần tử đang chọn. */
  deleteSelected() {
    const list = this._pages[this.page] ?? [];
    const removed = list.filter((e) => this._selected.has(e.id) && !e.locked);
    this._selected.clear();
    if (!removed.length) return this._paint();
    this._commit(
      { kind: 'remove', page: this.page, ids: removed.map((e) => e.id) },
      { kind: 'add', page: this.page, elements: clone(removed) },
    );
  }

  /** Nhân bản các phần tử đang chọn (lệch 24) và chọn bản mới. */
  duplicateSelected() {
    const list = this._pages[this.page] ?? [];
    const copies = list
      .filter((e) => this._selected.has(e.id) && !e.locked)
      .map((e) => {
        const c = translate(e, 24, 24);
        c.id = newId();
        c.author = this.author;
        if (c.type === 'point') c.label = nextLabel(list);
        return c;
      });
    if (!copies.length) return;
    this._commit({ kind: 'add', page: this.page, elements: copies }, { kind: 'remove', page: this.page, ids: copies.map((c) => c.id) });
    this._selected = new Set(copies.map((c) => c.id));
    this._paint();
  }

  _resize() {
    const width = this._stage.clientWidth;
    if (!width) return;
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = Math.round(width * dpr);
    this._canvas.height = Math.round(((width * PAGE_HEIGHT) / PAGE_WIDTH) * dpr);
    this._paint();
  }

  /** Bản xem trước của các phần tử đang kéo (công cụ chọn). */
  _previewMap() {
    if (!this._drag?.current) return null;
    return this._drag.current;
  }

  _paint() {
    const canvas = this._canvas;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas.width) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.background || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(canvas.width / PAGE_WIDTH, 0, 0, canvas.height / PAGE_HEIGHT, 0, 0);
    const preview = this._previewMap();
    this._drawPage(ctx, this.page, preview);
    if (this._draft) drawElement(ctx, this._draft, this._res);
    if (this._poly) {
      const pts = [...this._poly.el.points, ...(this._poly.hover ? [this._poly.hover] : [])];
      if (pts.length > 1) drawElement(ctx, { ...this._poly.el, points: pts, closed: false }, this._res);
      ctx.save();
      ctx.fillStyle = this._poly.el.color;
      for (const p of this._poly.el.points) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (this.tool === 'select' && !this.readonly) {
      const els = (this._pages[this.page] ?? []).filter((e) => this._selected.has(e.id)).map((e) => preview?.get(e.id) ?? e);
      const box = unionBox(els);
      drawSelection(ctx, box, { handle: els.length > 0 && els.every(resizable) });
      if (this._drag?.mode === 'marquee' && this._drag.to) {
        const [a, b] = [this._drag.start, this._drag.to];
        drawSelection(ctx, { x1: Math.min(a[0], b[0]), y1: Math.min(a[1], b[1]), x2: Math.max(a[0], b[0]), y2: Math.max(a[1], b[1]) }, { handle: false });
      }
    }
  }

  /** Tọa độ trang của sự kiện con trỏ. */
  _point(e) {
    const rect = this._canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / (rect.width || 1)) * PAGE_WIDTH;
    const y = ((e.clientY - rect.top) / (rect.height || 1)) * PAGE_HEIGHT;
    return [Math.round(Math.min(Math.max(x, 0), PAGE_WIDTH) * 10) / 10, Math.round(Math.min(Math.max(y, 0), PAGE_HEIGHT) * 10) / 10];
  }

  /** Điểm bắt dính (điểm / đỉnh / đầu đoạn / tâm) gần p. */
  _snap(p) {
    return snapPoint(p, snapTargets(this._pages[this.page] ?? []));
  }

  _down(e) {
    if (this.readonly || (e.button !== undefined && e.button > 0)) return;
    e.preventDefault();
    this._canvas.setPointerCapture?.(e.pointerId);
    this._stage.focus({ preventScroll: true });
    const p = this._point(e);
    const base = { id: newId(), color: this.color, size: this.size, author: this.author };
    const list = this._pages[this.page] ?? [];
    if (this.tool === 'select') {
      this._selectDown(p, e.shiftKey);
      return;
    }
    if (this.tool === 'pen') this._draft = { ...base, type: 'pen', points: [p] };
    else if (this.tool === 'highlighter') this._draft = { ...base, type: 'highlighter', size: this.size * 4, points: [p] };
    else if (SHAPES.includes(this.tool)) {
      const s = this.tool === 'line' || this.tool === 'arrow' ? this._snap(p) : p;
      this._draft = { ...base, type: this.tool, x1: s[0], y1: s[1], x2: s[0], y2: s[1] };
    } else if (this.tool === 'circle') {
      const c = this._snap(p);
      this._draft = { ...base, type: 'circle', cx: c[0], cy: c[1], r: 0 };
    } else if (this.tool === 'point') {
      const el = { ...base, type: 'point', x: p[0], y: p[1], label: nextLabel(list) };
      this._commit({ kind: 'add', page: this.page, elements: [el] }, { kind: 'remove', page: this.page, ids: [el.id] });
      return;
    } else if (this.tool === 'polygon') {
      this._polyClick(this._snap(p), base);
      return;
    } else if (this.tool === 'eraser') {
      this._erased = [];
      this._eraseAt(p);
    } else if (this.tool === 'text') {
      this._openText(p);
      return;
    } else if (this.tool === 'math') {
      const hit = [...list].reverse().find((el) => el.type === 'math' && !el.locked && hitTest(el, p, 0));
      this._openMath(hit ?? { ...base, type: 'math', size: 16 + this.size * 4, x: p[0], y: p[1], tex: '' });
      return;
    } else if (this.tool === 'plot') {
      // Chạm vào đồ thị có sẵn → sửa công thức; chỗ trống → kéo khung mới
      const hit = [...list].reverse().find((el) => el.type === 'plot' && hitTest(el, p, 0));
      if (hit) {
        this._openPlot(hit);
        return;
      }
      this._draft = { ...base, type: 'plot', size: 0, value: '', x1: p[0], y1: p[1], x2: p[0], y2: p[1] };
    }
    this._paint();
  }

  _move(e) {
    if (this._erased) {
      this._eraseAt(this._point(e));
      return;
    }
    const p = this._point(e);
    if (this._drag) {
      this._selectMove(p, e.shiftKey);
      return;
    }
    if (this._poly) {
      this._poly.hover = this._snap(p);
      this._paint();
      return;
    }
    if (!this._draft) return;
    if (this._draft.points) {
      const last = this._draft.points[this._draft.points.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
      this._draft.points.push(p);
    } else if (this._draft.type === 'circle') {
      const q = this._snap(p);
      this._draft.r = Math.round(Math.hypot(q[0] - this._draft.cx, q[1] - this._draft.cy) * 10) / 10;
    } else {
      let q = p;
      if (this._draft.type === 'line' || this._draft.type === 'arrow') {
        q = e.shiftKey ? snapAngle([this._draft.x1, this._draft.y1], p) : this._snap(p);
      }
      this._draft.x2 = q[0];
      this._draft.y2 = q[1];
    }
    this._paint();
  }

  _up() {
    if (this._erased) {
      const removed = this._erased;
      this._erased = null;
      if (removed.length) {
        // Đã gỡ khỏi trang khi kéo tẩy; giờ ghi thành một thao tác (gỡ lần nữa không sao).
        this._pages[this.page].push(...removed);
        this._commit(
          { kind: 'remove', page: this.page, ids: removed.map((el) => el.id) },
          { kind: 'add', page: this.page, elements: clone(removed) },
        );
      }
      return;
    }
    if (this._drag) {
      this._selectUp();
      return;
    }
    const draft = this._draft;
    this._draft = null;
    if (!draft) return;
    if (draft.type === 'plot') {
      if (Math.abs(draft.x2 - draft.x1) < 40 || Math.abs(draft.y2 - draft.y1) < 40) {
        // Chỉ chạm: khung mặc định tại điểm chạm, không tràn khỏi trang
        const x1 = Math.min(draft.x1, PAGE_WIDTH - PLOT_BOX.w);
        const y1 = Math.min(draft.y1, PAGE_HEIGHT - PLOT_BOX.h);
        Object.assign(draft, { x1, y1, x2: x1 + PLOT_BOX.w, y2: y1 + PLOT_BOX.h });
      } else {
        Object.assign(draft, {
          x1: Math.min(draft.x1, draft.x2),
          y1: Math.min(draft.y1, draft.y2),
          x2: Math.max(draft.x1, draft.x2),
          y2: Math.max(draft.y1, draft.y2),
        });
      }
      this._openPlot(draft);
      return;
    }
    if (draft.type === 'circle' && draft.r < 3) {
      this._paint();
      return;
    }
    if (!draft.points && draft.type !== 'circle' && Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) < 3) {
      this._paint();
      return;
    }
    this._commit({ kind: 'add', page: this.page, elements: [draft] }, { kind: 'remove', page: this.page, ids: [draft.id] });
  }

  // ---------- Công cụ chọn ----------

  _selectDown(p, shift) {
    const list = this._pages[this.page] ?? [];
    const selected = list.filter((e) => this._selected.has(e.id));
    const box = unionBox(selected);
    if (box && selected.every(resizable) && onHandle(box, p)) {
      this._drag = { mode: 'resize', start: p, box, originals: new Map(selected.map((e) => [e.id, clone(e)])), current: null };
      return;
    }
    const hit = [...list].reverse().find((e) => !e.locked && hitTest(e, p, 8));
    if (hit) {
      if (shift) {
        if (this._selected.has(hit.id)) this._selected.delete(hit.id);
        else this._selected.add(hit.id);
      } else if (!this._selected.has(hit.id)) {
        this._selected = new Set([hit.id]);
      }
      const moving = list.filter((e) => this._selected.has(e.id));
      this._drag = { mode: 'move', start: p, originals: new Map(moving.map((e) => [e.id, clone(e)])), current: null };
    } else {
      if (!shift) this._selected.clear();
      this._drag = { mode: 'marquee', start: p, to: p, additive: shift };
    }
    this._paint();
  }

  _selectMove(p, shift) {
    const d = this._drag;
    if (d.mode === 'marquee') {
      d.to = p;
    } else if (d.mode === 'move') {
      const dx = p[0] - d.start[0];
      const dy = p[1] - d.start[1];
      d.current = new Map([...d.originals].map(([id, el]) => [id, translate(el, dx, dy)]));
    } else if (d.mode === 'resize') {
      const b = d.box;
      let w = Math.max(10, p[0] - b.x1);
      let h = Math.max(10, p[1] - b.y1);
      // Ảnh / công thức / chữ / Shift: giữ tỉ lệ
      const keep = shift || [...d.originals.values()].some((e) => ['image', 'math', 'text', 'circle'].includes(e.type));
      if (keep) {
        const k = Math.max(w / (b.x2 - b.x1 || 1), h / (b.y2 - b.y1 || 1));
        w = (b.x2 - b.x1) * k;
        h = (b.y2 - b.y1) * k;
      }
      const to = { x1: b.x1, y1: b.y1, x2: b.x1 + w, y2: b.y1 + h };
      d.current = new Map([...d.originals].map(([id, el]) => [id, scale(el, b, to)]));
    }
    this._paint();
  }

  _selectUp() {
    const d = this._drag;
    this._drag = null;
    if (d.mode === 'marquee') {
      const [a, b] = [d.start, d.to];
      const box = { x1: Math.min(a[0], b[0]), y1: Math.min(a[1], b[1]), x2: Math.max(a[0], b[0]), y2: Math.max(a[1], b[1]) };
      if (box.x2 - box.x1 > 4 || box.y2 - box.y1 > 4) {
        for (const e of this._pages[this.page] ?? []) {
          if (e.locked) continue;
          const eb = bbox(e);
          if (eb.x1 >= box.x1 && eb.y1 >= box.y1 && eb.x2 <= box.x2 && eb.y2 <= box.y2) this._selected.add(e.id);
        }
      }
      this._paint();
      return;
    }
    if (!d.current) {
      this._paint();
      return;
    }
    const after = [...d.current.values()];
    const before = [...d.originals.values()];
    const same = JSON.stringify(after) === JSON.stringify(before);
    if (same) {
      this._paint();
      return;
    }
    // Công thức đổi cỡ: đo lại khung theo cỡ chữ mới cho nét
    this._commit({ kind: 'update', page: this.page, elements: after }, { kind: 'update', page: this.page, elements: before });
  }

  // ---------- Đa giác ----------

  _polyClick(p, base) {
    if (!this._poly) {
      this._poly = { el: { ...base, type: 'polygon', points: [p] }, hover: null };
      this._paint();
      return;
    }
    const pts = this._poly.el.points;
    const first = pts[0];
    if (pts.length >= 3 && Math.hypot(p[0] - first[0], p[1] - first[1]) <= 16) {
      this._finishPolygon();
      return;
    }
    const last = pts[pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 2) pts.push(p);
    this._paint();
  }

  _finishPolygon() {
    const poly = this._poly;
    this._poly = null;
    if (!poly || poly.el.points.length < 3) {
      this._paint();
      return;
    }
    const el = poly.el;
    this._commit({ kind: 'add', page: this.page, elements: [el] }, { kind: 'remove', page: this.page, ids: [el.id] });
  }

  // ---------- Tẩy ----------

  _eraseAt(p) {
    const list = this._pages[this.page] ?? [];
    const keep = [];
    for (const el of list) {
      if (!el.locked && hitTest(el, p, 10)) this._erased.push(el);
      else keep.push(el);
    }
    if (keep.length !== list.length) {
      this._pages[this.page] = keep;
      this._paint();
    }
  }

  // ---------- Chữ ----------

  _openText(p) {
    this._textPoint = p;
    const rect = this._canvas.getBoundingClientRect();
    const k = rect.width / PAGE_WIDTH || 1;
    Object.assign(this._textInput.style, {
      left: `${p[0] * k}px`,
      top: `${p[1] * k}px`,
      color: this.color,
      fontSize: `${Math.max(12, (16 + this.size * 4) * k)}px`,
    });
    this._textInput.value = '';
    this._textInput.hidden = false;
    requestAnimationFrame(() => this._textInput.focus());
  }

  _closeText() {
    if (!this._textInput) return;
    // Xóa trạng thái TRƯỚC khi ẩn: ẩn ô đang focus phát `blur` → _commitText chạy lại, phải thấy rỗng.
    this._textPoint = null;
    this._textInput.value = '';
    this._textInput.hidden = true;
  }

  _commitText() {
    const text = this._textInput?.value.trim();
    const p = this._textPoint;
    this._closeText();
    if (!text || !p) return;
    const el = { id: newId(), type: 'text', color: this.color, size: 16 + this.size * 4, x: p[0], y: p[1], text, author: this.author };
    this._commit({ kind: 'add', page: this.page, elements: [el] }, { kind: 'remove', page: this.page, ids: [el.id] });
  }

  // ---------- Công thức ----------

  /** Ô gõ công thức (có bàn phím) tại vị trí phần tử — mới hoặc đang sửa. */
  _openMath(el) {
    this._closeText();
    this._closePlot();
    this._mathEl = el;
    const rect = this._canvas.getBoundingClientRect();
    const k = rect.width / PAGE_WIDTH || 1;
    const left = Math.max(0, Math.min(el.x * k, rect.width - 380));
    Object.assign(this._mathBox.style, { left: `${left}px`, top: `${Math.max(0, Math.min(el.y * k, rect.height - 60))}px` });
    this._mathInput.value = el.tex ?? '';
    this._mathBox.hidden = false;
    requestAnimationFrame(() => this._mathInput.focus());
  }

  _closeMath() {
    if (!this._mathBox) return;
    this._mathEl = null;
    this._mathBox.hidden = true;
    if (this._mathInput) this._mathInput.value = '';
  }

  _commitMath() {
    const tex = String(this._mathInput?.value ?? '').trim();
    const el = this._mathEl;
    this._closeMath();
    if (!el) return;
    const existing = (this._pages[this.page] ?? []).find((e) => e.id === el.id);
    if (!existing) {
      if (!tex) return;
      const { w, h } = measureMath(tex, el.size);
      const next = { ...el, tex, w, h, color: el.color || this.color };
      this._commit({ kind: 'add', page: this.page, elements: [next] }, { kind: 'remove', page: this.page, ids: [next.id] });
      return;
    }
    if (tex === existing.tex) return;
    if (!tex) {
      this._commit({ kind: 'remove', page: this.page, ids: [existing.id] }, { kind: 'add', page: this.page, elements: [clone(existing)] });
      return;
    }
    const { w, h } = measureMath(tex, existing.size);
    const next = { ...clone(existing), tex, w, h };
    this._commit({ kind: 'update', page: this.page, element: next }, { kind: 'update', page: this.page, element: clone(existing) });
  }

  // ---------- Đồ thị ----------

  /** Ô nhập công thức phủ lên khung đồ thị (khung mới vẽ hoặc đồ thị có sẵn đang sửa). */
  _openPlot(el) {
    this._closeText();
    this._plotEl = el;
    const rect = this._canvas.getBoundingClientRect();
    const k = rect.width / PAGE_WIDTH || 1;
    Object.assign(this._plotInput.style, {
      left: `${Math.min(el.x1, el.x2) * k}px`,
      top: `${Math.min(el.y1, el.y2) * k}px`,
      width: `${Math.max(240, Math.abs(el.x2 - el.x1) * k)}px`,
    });
    this._plotInput.value = el.value ?? '';
    this._plotInput.hidden = false;
    // Khung mới (chưa có công thức) hiện nét đứt trong lúc gõ
    this._draft = el.value ? null : el;
    this._paint();
    this._plotInput.focus();
    requestAnimationFrame(() => this._plotInput.focus());
  }

  _closePlot() {
    if (!this._plotInput) return;
    // Như _closeText: xóa trạng thái TRƯỚC khi ẩn (ẩn ô đang focus phát `blur` → _commitPlot chạy lại)
    this._plotEl = null;
    this._plotInput.value = '';
    this._plotInput.hidden = true;
    if (this._draft?.type === 'plot') {
      this._draft = null;
      this._paint();
    }
  }

  _commitPlot() {
    const value = this._plotInput?.value.trim();
    const el = this._plotEl;
    this._closePlot();
    if (!el) return;
    const existing = (this._pages[this.page] ?? []).find((e) => e.id === el.id);
    if (!existing) {
      if (value) this.addPlot(value, el);
      return;
    }
    if (value === existing.value) return;
    if (!value) {
      // Xóa hết công thức = xóa đồ thị
      this._commit({ kind: 'remove', page: this.page, ids: [el.id] }, { kind: 'add', page: this.page, elements: [clone(existing)] });
      return;
    }
    const next = { ...clone(existing), value };
    this._commit({ kind: 'update', page: this.page, element: next }, { kind: 'update', page: this.page, element: clone(existing) });
  }
}

defineElement('hui-whiteboard', HuiWhiteboard);

export default HuiWhiteboard;
