/**
 * HUI Whiteboard — Bảng vẽ (Organism) cho dạy trực tuyến: bút, bút dạ quang, tẩy (xóa cả nét), đoạn thẳng,
 * mũi tên, hình chữ nhật, elip, chữ; màu + độ dày; hoàn tác / làm lại; nhiều trang; xuất ảnh PNG.
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

const FALLBACK = {
  'whiteboard.label': { vi: 'Bảng', en: 'Whiteboard' },
  'whiteboard.pen': { vi: 'Bút', en: 'Pen' },
  'whiteboard.highlighter': { vi: 'Bút dạ quang', en: 'Highlighter' },
  'whiteboard.eraser': { vi: 'Tẩy', en: 'Eraser' },
  'whiteboard.line': { vi: 'Đoạn thẳng', en: 'Line' },
  'whiteboard.arrow': { vi: 'Mũi tên', en: 'Arrow' },
  'whiteboard.rect': { vi: 'Hình chữ nhật', en: 'Rectangle' },
  'whiteboard.ellipse': { vi: 'Elip', en: 'Ellipse' },
  'whiteboard.text': { vi: 'Chữ', en: 'Text' },
  'whiteboard.color': { vi: 'Màu', en: 'Color' },
  'whiteboard.size': { vi: 'Độ dày', en: 'Size' },
  'whiteboard.undo': { vi: 'Hoàn tác', en: 'Undo' },
  'whiteboard.redo': { vi: 'Làm lại', en: 'Redo' },
  'whiteboard.clear': { vi: 'Xóa trang', en: 'Clear page' },
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

export const PAGE_WIDTH = 1600;
export const PAGE_HEIGHT = 900;
export const TOOLS = ['pen', 'highlighter', 'eraser', 'line', 'arrow', 'rect', 'ellipse', 'text'];
const TOOL_ICONS = { pen: '✎', highlighter: '▌', eraser: '⌫', line: '╱', arrow: '➚', rect: '▭', ellipse: '◯', text: 'T' };
const DEFAULT_PALETTE = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];
const SIZES = [2, 4, 8, 14];
const SHAPES = ['line', 'arrow', 'rect', 'ellipse'];

let seq = 0;
const newId = () => `${Date.now().toString(36)}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clone = (v) => JSON.parse(JSON.stringify(v));

/** Khoảng cách từ điểm p tới đoạn ab. */
function distToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const k = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
}

/** Các đoạn thẳng gần đúng của một phần tử (dùng cho tẩy). */
function segmentsOf(el) {
  if (el.points) {
    const pts = el.points.length === 1 ? [el.points[0], el.points[0]] : el.points;
    return pts.slice(1).map((p, i) => [pts[i], p]);
  }
  const { x1, y1, x2, y2 } = el;
  if (el.type === 'line' || el.type === 'arrow') return [[[x1, y1], [x2, y2]]];
  if (el.type === 'rect') {
    const c = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    return c.map((p, i) => [p, c[(i + 1) % 4]]);
  }
  if (el.type === 'ellipse') {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    const pts = Array.from({ length: 33 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
    return pts.slice(1).map((p, i) => [pts[i], p]);
  }
  return [];
}

/** Điểm p có chạm phần tử không (bán kính `r` theo đơn vị trang). */
export function hitTest(el, p, r = 10) {
  if (el.type === 'text') {
    const lines = String(el.text).split('\n');
    const w = Math.max(...lines.map((l) => l.length)) * el.size * 0.6;
    const h = lines.length * el.size * 1.25;
    return p[0] >= el.x - r && p[0] <= el.x + w + r && p[1] >= el.y - r && p[1] <= el.y + h + r;
  }
  const reach = r + (el.size || 0) / 2;
  return segmentsOf(el).some(([a, b]) => distToSegment(p, a, b) <= reach);
}

function drawElement(ctx, el) {
  ctx.save();
  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = el.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (el.type === 'pen' || el.type === 'highlighter') {
    if (el.type === 'highlighter') ctx.globalAlpha = 0.35;
    const pts = el.points;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) {
      ctx.lineTo(pts[0][0] + 0.01, pts[0][1]);
    } else {
      // Làm mượt bằng đường cong qua trung điểm các đoạn
      for (let i = 1; i < pts.length - 1; i += 1) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last[0], last[1]);
    }
    ctx.stroke();
  } else if (el.type === 'line' || el.type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(el.x1, el.y1);
    ctx.lineTo(el.x2, el.y2);
    if (el.type === 'arrow') {
      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const head = Math.max(14, el.size * 3.5);
      for (const s of [-1, 1]) {
        ctx.moveTo(el.x2, el.y2);
        ctx.lineTo(el.x2 - head * Math.cos(angle + (s * Math.PI) / 7), el.y2 - head * Math.sin(angle + (s * Math.PI) / 7));
      }
    }
    ctx.stroke();
  } else if (el.type === 'rect') {
    ctx.strokeRect(Math.min(el.x1, el.x2), Math.min(el.y1, el.y2), Math.abs(el.x2 - el.x1), Math.abs(el.y2 - el.y1));
  } else if (el.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(
      (el.x1 + el.x2) / 2,
      (el.y1 + el.y2) / 2,
      Math.abs(el.x2 - el.x1) / 2,
      Math.abs(el.y2 - el.y1) / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  } else if (el.type === 'text') {
    ctx.font = `${el.size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    ctx.textBaseline = 'top';
    String(el.text)
      .split('\n')
      .forEach((line, i) => ctx.fillText(line, el.x, el.y + i * el.size * 1.25));
  }
  ctx.restore();
}

/**
 * Bảng vẽ.
 *
 * @fires hui-change - Bảng thay đổi do người dùng (vẽ, tẩy, xóa trang, hoàn tác, thêm trang). detail: { op }
 *   op = { kind: 'add', page, elements } | { kind: 'remove', page, ids } | { kind: 'clear', page } | { kind: 'page-add' }
 * @fires hui-page - Người dùng chuyển trang. detail: { page }
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
    /** pen | highlighter | eraser | line | arrow | rect | ellipse | text */
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
    this._undo = [];
    this._redo = [];
    this._draft = null;
    this._erased = null;
  }

  // ---------- Dữ liệu ----------

  get pageCount() {
    return this._pages.length;
  }

  /** Phần tử của trang (mặc định trang đang xem) — bản sao */
  elements(page = this.page) {
    return clone(this._pages[page] ?? []);
  }

  getSnapshot() {
    return { pages: clone(this._pages), page: this.page };
  }

  loadSnapshot(snapshot) {
    const pages = Array.isArray(snapshot?.pages) && snapshot.pages.length ? clone(snapshot.pages) : [[]];
    this._pages = pages;
    this._undo = [];
    this._redo = [];
    this.page = Math.min(Math.max(0, snapshot?.page ?? 0), pages.length - 1);
    this._paint();
    this._syncToolbar();
  }

  /** Áp thao tác từ máy khác (không phát sự kiện, không vào lịch sử hoàn tác). */
  applyRemote(op) {
    this._apply(op);
  }

  _apply(op) {
    if (!op || typeof op !== 'object') return;
    if (op.kind === 'page-add') {
      this._pages.push([]);
    } else {
      while (op.page >= this._pages.length) this._pages.push([]);
      const list = this._pages[op.page];
      if (!list) return;
      if (op.kind === 'add') {
        const ids = new Set(list.map((e) => e.id));
        for (const el of op.elements ?? []) if (!ids.has(el.id)) list.push(clone(el));
      } else if (op.kind === 'remove') {
        const ids = new Set(op.ids ?? []);
        this._pages[op.page] = list.filter((e) => !ids.has(e.id));
      } else if (op.kind === 'clear') {
        this._pages[op.page] = [];
      }
    }
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

  clearPage() {
    const before = this._pages[this.page] ?? [];
    if (!before.length) return;
    this._commit({ kind: 'clear', page: this.page }, { kind: 'add', page: this.page, elements: clone(before) });
  }

  addPage() {
    this._commit({ kind: 'page-add' });
    this._goto(this._pages.length - 1);
  }

  _goto(page) {
    const next = Math.min(Math.max(0, page), this._pages.length - 1);
    if (next === this.page) return;
    this.page = next;
    this.emit('hui-page', { page: next });
  }

  /** Ảnh PNG / JPEG của một trang (kích thước gốc 1600 × 900). */
  toDataURL(page = this.page, type = 'image/png', quality = 0.92) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.background || '#ffffff';
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    for (const el of this._pages[page] ?? []) drawElement(ctx, el);
    return canvas.toDataURL(type, quality);
  }

  // ---------- Giao diện ----------

  render() {
    const toolButtons = TOOLS.map((tool) =>
      createElement('button', { type: 'button', className: 'btn tool', part: 'tool', dataset: { tool } }, TOOL_ICONS[tool]),
    );
    this._toolButtons = toolButtons;
    this._swatches = createElement('span', { className: 'swatches' });
    this._sizeSelect = createElement(
      'select',
      { className: 'size' },
      ...SIZES.map((s) => createElement('option', { value: String(s) }, `${s}`)),
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
      createElement('span', { className: 'group' }, ...toolButtons),
      this._swatches,
      this._sizeSelect,
      createElement('span', { className: 'group' }, this._undoBtn, this._redoBtn, this._clearBtn),
      createElement('span', { className: 'group pages' }, this._prevBtn, this._pageLabel, this._nextBtn, this._addPageBtn),
    );

    this._canvas = createElement('canvas', { part: 'canvas' });
    this._textInput = createElement('input', { type: 'text', className: 'text-input', hidden: true });
    this._stage = createElement('div', { className: 'stage', part: 'stage', tabindex: '0' }, this._canvas, this._textInput);

    this._toolbar.addEventListener('click', (e) => this._onToolbar(e));
    this._sizeSelect.addEventListener('change', () => {
      this.size = Number(this._sizeSelect.value);
    });
    this._canvas.addEventListener('pointerdown', (e) => this._down(e));
    this._canvas.addEventListener('pointermove', (e) => this._move(e));
    this._canvas.addEventListener('pointerup', (e) => this._up(e));
    this._canvas.addEventListener('pointercancel', (e) => this._up(e));
    this._textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._commitText();
      if (e.key === 'Escape') this._closeText();
      e.stopPropagation();
    });
    this._textInput.addEventListener('blur', () => this._commitText());
    this._stage.addEventListener('keydown', (e) => this._onKey(e));
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
      this._draft = null;
      this._closeText();
      this._paint();
    }
    if (changed.has('background')) this._paint();
    this._toolbar.hidden = this.readonly || this.noToolbar;
    this._stage.classList.toggle('readonly', this.readonly);
    this._stage.dataset.tool = this.tool;
    this._stage.setAttribute('aria-label', `${msg('whiteboard.label')} — ${msg('whiteboard.page')} ${this.page + 1}`);
    this._syncToolbar();
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
    for (const [btn, key, disabled] of [
      [this._undoBtn, 'undo', !this._undo.length],
      [this._redoBtn, 'redo', !this._redo.length],
      [this._clearBtn, 'clear', !(this._pages[this.page] ?? []).length],
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
  }

  _onToolbar(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.tool) this.tool = btn.dataset.tool;
    else if (btn.dataset.color) this.color = btn.dataset.color;
    else if (btn === this._undoBtn) this.undo();
    else if (btn === this._redoBtn) this.redo();
    else if (btn === this._clearBtn) this.clearPage();
    else if (btn === this._prevBtn) this._goto(this.page - 1);
    else if (btn === this._nextBtn) this._goto(this.page + 1);
    else if (btn === this._addPageBtn) this.addPage();
  }

  _onKey(e) {
    if (this.readonly || !(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      this.redo();
    }
  }

  _resize() {
    const width = this._stage.clientWidth;
    if (!width) return;
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = Math.round(width * dpr);
    this._canvas.height = Math.round(((width * PAGE_HEIGHT) / PAGE_WIDTH) * dpr);
    this._paint();
  }

  _paint() {
    const canvas = this._canvas;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas.width) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.background || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(canvas.width / PAGE_WIDTH, 0, 0, canvas.height / PAGE_HEIGHT, 0, 0);
    for (const el of this._pages[this.page] ?? []) drawElement(ctx, el);
    if (this._draft) drawElement(ctx, this._draft);
  }

  /** Tọa độ trang của sự kiện con trỏ. */
  _point(e) {
    const rect = this._canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / (rect.width || 1)) * PAGE_WIDTH;
    const y = ((e.clientY - rect.top) / (rect.height || 1)) * PAGE_HEIGHT;
    return [Math.round(Math.min(Math.max(x, 0), PAGE_WIDTH) * 10) / 10, Math.round(Math.min(Math.max(y, 0), PAGE_HEIGHT) * 10) / 10];
  }

  _down(e) {
    if (this.readonly || (e.button !== undefined && e.button > 0)) return;
    e.preventDefault();
    this._canvas.setPointerCapture?.(e.pointerId);
    this._stage.focus({ preventScroll: true });
    const p = this._point(e);
    const base = { id: newId(), color: this.color, size: this.size, author: this.author };
    if (this.tool === 'pen') this._draft = { ...base, type: 'pen', points: [p] };
    else if (this.tool === 'highlighter') this._draft = { ...base, type: 'highlighter', size: this.size * 4, points: [p] };
    else if (SHAPES.includes(this.tool)) this._draft = { ...base, type: this.tool, x1: p[0], y1: p[1], x2: p[0], y2: p[1] };
    else if (this.tool === 'eraser') {
      this._erased = [];
      this._eraseAt(p);
    } else if (this.tool === 'text') {
      this._openText(p);
      return;
    }
    this._paint();
  }

  _move(e) {
    if (this._erased) {
      this._eraseAt(this._point(e));
      return;
    }
    if (!this._draft) return;
    const p = this._point(e);
    if (this._draft.points) {
      const last = this._draft.points[this._draft.points.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
      this._draft.points.push(p);
    } else {
      this._draft.x2 = p[0];
      this._draft.y2 = p[1];
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
    const draft = this._draft;
    this._draft = null;
    if (!draft) return;
    if (!draft.points && Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) < 3) {
      this._paint();
      return;
    }
    this._commit({ kind: 'add', page: this.page, elements: [draft] }, { kind: 'remove', page: this.page, ids: [draft.id] });
  }

  _eraseAt(p) {
    const list = this._pages[this.page] ?? [];
    const keep = [];
    for (const el of list) {
      if (hitTest(el, p, 10)) this._erased.push(el);
      else keep.push(el);
    }
    if (keep.length !== list.length) {
      this._pages[this.page] = keep;
      this._paint();
    }
  }

  _openText(p) {
    this._textPoint = p;
    const rect = this._canvas.getBoundingClientRect();
    const scale = rect.width / PAGE_WIDTH || 1;
    Object.assign(this._textInput.style, {
      left: `${p[0] * scale}px`,
      top: `${p[1] * scale}px`,
      color: this.color,
      fontSize: `${Math.max(12, (16 + this.size * 4) * scale)}px`,
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
}

defineElement('hui-whiteboard', HuiWhiteboard);

export default HuiWhiteboard;
