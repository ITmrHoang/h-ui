/**
 * HUI Timetable — Lịch biểu theo tuần / ngày có khung giờ (Organism): sự kiện đặt theo giờ bắt đầu – kết thúc,
 * sự kiện chồng giờ chia cột, vạch "bây giờ", thanh điều hướng Trước / Hôm nay / Sau + đổi Tuần ↔ Ngày,
 * kéo chọn khung giờ trống để tạo mới (`selectable`).
 *
 *   <hui-timetable view="week" date="2026-11-10" start-hour="7" end-hour="22" selectable></hui-timetable>
 *   el.events = [{ id: 1, title: 'Toán 9', start: '2026-11-10T19:30', end: '2026-11-10T21:00', color: 'primary' }];
 *
 * Mọi Date là giờ địa phương của trình duyệt; chuỗi ISO có Z / +07:00 được đổi theo múi giờ đó.
 */

import styles from './hui-timetable.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { intlLocale } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import {
  addDays, capitalize, diffDays, localeWeekStart, makeDate, parseISO, startOfDay, startOfWeek, toISO,
  weekdayShortNames,
} from '../hui-calendar/date-utils.js';
import { daySegments, formatMinutes, layoutColumns, normalizeEvents, toDate } from './layout.js';
import '../hui-icon/hui-icon.js';

const FALLBACK = {
  'timetable.label': { vi: 'Lịch biểu', en: 'Timetable' },
  'timetable.today': { vi: 'Hôm nay', en: 'Today' },
  'timetable.prevWeek': { vi: 'Tuần trước', en: 'Previous week' },
  'timetable.nextWeek': { vi: 'Tuần sau', en: 'Next week' },
  'timetable.prevDay': { vi: 'Hôm trước', en: 'Previous day' },
  'timetable.nextDay': { vi: 'Hôm sau', en: 'Next day' },
  'timetable.week': { vi: 'Tuần', en: 'Week' },
  'timetable.day': { vi: 'Ngày', en: 'Day' },
  'timetable.view': { vi: 'Chế độ xem', en: 'View' },
  'timetable.cancelled': { vi: 'đã hủy', en: 'cancelled' },
  'timetable.untitled': { vi: '(Không có tiêu đề)', en: '(No title)' },
  'timetable.openDay': { vi: 'Xem ngày {date}', en: 'View {date}' },
  'timetable.empty': { vi: 'Không có lịch trong khoảng này', en: 'Nothing scheduled in this range' },
};
const msg = (key, vars) => {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
};

const TOKEN_COLORS = new Set(['primary', 'secondary', 'success', 'warning', 'danger', 'info']);
const colorValue = (c) => (!c ? '' : TOKEN_COLORS.has(c) ? `var(--hui-${c})` : String(c));

const VIEWS = ['week', 'day'];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const icon = (name) => createElement('hui-icon', { name, 'aria-hidden': 'true' });

function dateFormat(opts) {
  try {
    return new Intl.DateTimeFormat(intlLocale(), opts);
  } catch {
    return new Intl.DateTimeFormat('en', opts);
  }
}

/**
 * Lịch biểu tuần / ngày.
 *
 * @fires hui-range-change - Người dùng đổi tuần / ngày / chế độ xem. detail: { view, date, from, to } (`to` = 0h ngày sau ngày cuối)
 * @fires hui-event-click - Bấm (hoặc Enter) vào một sự kiện. detail: { event, originalEvent }
 * @fires hui-slot-select - Kéo chọn (hoặc bấm) khung giờ trống khi `selectable`. detail: { start, end } (Date)
 *
 * @csspart base - Khung ngoài
 * @csspart toolbar - Thanh điều hướng
 * @csspart nav-btn - Nút Trước / Sau
 * @csspart today-btn - Nút Hôm nay
 * @csspart title - Khoảng ngày đang xem
 * @csspart view-switch - Nhóm nút Tuần / Ngày
 * @csspart view-btn - Nút đổi chế độ xem
 * @csspart body - Vùng cuộn chứa lưới
 * @csspart day-head - Đầu cột một ngày
 * @csspart column - Cột một ngày
 * @csspart event - Một sự kiện
 * @csspart now - Vạch giờ hiện tại
 * @csspart empty - Dòng "không có lịch" (khi đã có `events` nhưng khoảng đang xem trống)
 * @csspart selection - Khung giờ đang kéo chọn
 * @cssprop --hui-timetable-hour-height - Chiều cao một giờ (mặc định 48px)
 * @cssprop --hui-timetable-max-height - Chiều cao tối đa vùng cuộn (mặc định 640px)
 * @cssprop --hui-timetable-gutter - Bề rộng cột giờ (mặc định 3.5rem)
 * @cssprop --hui-timetable-min-column - Bề rộng tối thiểu một ngày (mặc định 5.5rem; hẹp hơn thì cuộn ngang)
 * @cssprop --hui-timetable-bg - Nền
 * @cssprop --hui-timetable-border-color - Màu đường kẻ
 * @cssprop --hui-timetable-today-bg - Nền cột hôm nay
 * @cssprop --hui-timetable-now-color - Màu vạch giờ hiện tại
 * @cssprop --hui-timetable-radius - Bo góc khung ngoài
 */
class HuiTimetable extends HuiElement {
  static localized = true;

  static properties = {
    /** Sự kiện: [{ id, title, start, end, subtitle, color, status }] — start / end: Date | ISO; color: primary | success | warning | danger | info | secondary hoặc màu CSS; status 'cancelled' → gạch ngang */
    events: { type: Array, default: null },
    /** Chế độ xem: week | day */
    view: { type: String, default: 'week', reflect: true },
    /** Ngày đang xem (YYYY-MM-DD) — tuần chứa ngày này; trống = hôm nay */
    date: { type: String },
    /** Giờ đầu lưới (0–23); tự lùi sớm hơn nếu có sự kiện trước giờ này */
    startHour: { type: Number, default: 7 },
    /** Giờ cuối lưới (1–24); tự kéo dài nếu có sự kiện sau giờ này */
    endHour: { type: Number, default: 22 },
    /** Bước kéo chọn khung giờ (phút) */
    slotMinutes: { type: Number, default: 30 },
    /** Ngày đầu tuần 0 (Chủ nhật) – 6; trống = theo ngôn ngữ (vi: thứ Hai) */
    weekStart: { type: Number, default: null },
    /** Cho kéo chọn khung giờ trống → `hui-slot-select` */
    selectable: { type: Boolean, reflect: true },
    /** Thời điểm "bây giờ" (ISO) — để demo / test; trống = đồng hồ máy */
    now: { type: String },
    /** Ẩn thanh điều hướng */
    noToolbar: { type: Boolean },
    /** Ẩn nút đổi Tuần / Ngày */
    noViewSwitch: { type: Boolean },
    /** Tên lịch cho trình đọc màn hình */
    label: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    /** Cần cuộn tới giờ phù hợp (lần đầu / sau khi đổi tuần) */
    this._needScroll = true;
    /** Vừa đổi tuần / ngày: chờ trang gán `events` mới */
    this._awaitEvents = false;
    this._cols = [];
    this._days = [];
    this._fromMin = 0;
    this._toMin = 24 * 60;
    this._drag = null;
    this._timer = null;
  }

  render() {
    const navBtn = (kind, iconName) => createElement('button', {
      type: 'button', className: 'tt__btn tt__btn--icon', part: 'nav-btn', dataset: { nav: kind },
    }, icon(iconName));
    this._prevBtn = navBtn('prev', 'chevron-left');
    this._nextBtn = navBtn('next', 'chevron-right');
    this._todayBtn = createElement('button', { type: 'button', className: 'tt__btn', part: 'today-btn', dataset: { nav: 'today' } });
    this._title = createElement('div', { className: 'tt__title', part: 'title', 'aria-live': 'polite' });
    this._viewBtns = VIEWS.map((v) => createElement('button', {
      type: 'button', className: 'tt__view', part: 'view-btn', dataset: { view: v },
    }));
    this._viewSwitch = createElement('div', { className: 'tt__views', part: 'view-switch', role: 'group' }, ...this._viewBtns);
    this._toolbar = createElement('div', { className: 'tt__toolbar', part: 'toolbar' },
      createElement('div', { className: 'tt__nav' }, this._prevBtn, this._todayBtn, this._nextBtn),
      this._title,
      this._viewSwitch);
    this._toolbar.addEventListener('click', (e) => this._onToolbarClick(e));

    this._grid = createElement('div', { className: 'tt__grid' });
    this._grid.addEventListener('click', (e) => this._onGridClick(e));
    this._grid.addEventListener('keydown', (e) => this._onGridKey(e));
    this._grid.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this._grid.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this._grid.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this._grid.addEventListener('pointercancel', () => this._clearDrag());
    this._empty = createElement('div', { className: 'tt__empty', part: 'empty', hidden: true });
    this._scroll = createElement('div', { className: 'tt__scroll', part: 'body' }, this._grid);

    this._base = createElement('div', { className: 'tt', part: 'base', role: 'region' }, this._toolbar, this._empty, this._scroll);
    return [this._base];
  }

  connectedCallback() {
    super.connectedCallback();
    this._timer = setInterval(() => this._paintNow(), 60_000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
    this._timer = null;
    this._drag = null;
  }

  updated(changed) {
    this._paint(changed);
  }

  // =====================================================
  // API
  // =====================================================

  /** Khoảng đang xem: { from, to } — `to` là 0h của ngày sau ngày cuối (không gồm) */
  get range() {
    const { from, days } = this._rangeInfo();
    return { from, to: addDays(from, days) };
  }

  /** Lùi một tuần / một ngày */
  prev() {
    this._shift(-1);
  }

  /** Tiến một tuần / một ngày */
  next() {
    this._shift(1);
  }

  /** Về tuần / ngày hôm nay */
  goToday() {
    this._navigate({ date: toISO(this._today()) });
  }

  /** Cuộn tới giờ `hour` (số thập phân được: 19.5 = 19:30) */
  scrollToTime(hour) {
    const px = this._hourPx();
    if (!px) return;
    this._scroll.scrollTop = Math.max(0, ((hour * 60 - this._fromMin) / 60) * px - 8);
  }

  // =====================================================
  // TÍNH TOÁN
  // =====================================================

  _today() {
    return toDate(this.now) || new Date();
  }

  _weekStart() {
    const ws = this.weekStart;
    return Number.isInteger(ws) && ws >= 0 && ws <= 6 ? ws : localeWeekStart();
  }

  _viewName() {
    return VIEWS.includes(this.view) ? this.view : 'week';
  }

  _anchor() {
    const d = this.date ? parseISO(String(this.date).slice(0, 10)) : null;
    return startOfDay(d || this._today());
  }

  _rangeInfo() {
    const anchor = this._anchor();
    return this._viewName() === 'day'
      ? { from: anchor, days: 1 }
      : { from: startOfWeek(anchor, this._weekStart()), days: 7 };
  }

  _shift(dir) {
    const { days } = this._rangeInfo();
    this._navigate({ date: toISO(addDays(this._anchor(), dir * days)) });
  }

  /** Đổi ngày / chế độ xem do người dùng → phát `hui-range-change` */
  _navigate({ date, view }) {
    const beforeFrom = this.range.from.getTime();
    const beforeView = this._viewName();
    if (view && VIEWS.includes(view)) this.view = view;
    if (date) this.date = date;
    const { from, to } = this.range;
    if (from.getTime() === beforeFrom && this._viewName() === beforeView) return;
    this._needScroll = true;
    // Trang thường tải sự kiện của khoảng mới sau sự kiện này → chờ `events` đổi rồi mới chốt vị trí cuộn
    this._awaitEvents = true;
    this.emit('hui-range-change', { view: this._viewName(), date: toISO(this._anchor()), from, to });
  }

  _hourPx() {
    const col = this._cols[0];
    const hours = (this._toMin - this._fromMin) / 60;
    return col && hours ? col.getBoundingClientRect().height / hours : 0;
  }

  // =====================================================
  // VẼ
  // =====================================================

  _paint(changed = new Map()) {
    const view = this._viewName();
    const { from, days } = this._rangeInfo();
    const today = startOfDay(this._today());
    const items = normalizeEvents(this.events);
    this._days = Array.from({ length: days }, (_, i) => addDays(from, i));
    const segsByDay = this._days.map((d) => layoutColumns(daySegments(items, d)));

    // Khung giờ hiển thị: [startHour, endHour], nới ra để chứa mọi sự kiện trong khoảng
    let fromMin = clamp(Math.floor(Number(this.startHour) || 0), 0, 23) * 60;
    let toMin = clamp(Math.ceil(Number(this.endHour) || 24), 1, 24) * 60;
    if (toMin <= fromMin) toMin = Math.min(24 * 60, fromMin + 60);
    let segCount = 0;
    for (const segs of segsByDay) {
      for (const s of segs) {
        segCount++;
        fromMin = Math.min(fromMin, Math.floor(s.startMin / 60) * 60);
        toMin = Math.max(toMin, Math.ceil(s.endMin / 60) * 60);
      }
    }
    this._fromMin = fromMin;
    this._toMin = toMin;
    const hours = (toMin - fromMin) / 60;

    this._grid.style.setProperty('--_days', String(days));
    this._grid.style.setProperty('--_hours', String(hours));
    this._grid.classList.toggle('tt__grid--day', view === 'day');

    // Hàng đầu: góc trống + đầu cột từng ngày
    const names = weekdayShortNames();
    const longDate = dateFormat({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const heads = this._days.map((d) => {
      const isToday = diffDays(d, today) === 0;
      const content = [
        createElement('span', { className: 'tt__dow' }, names[d.getDay()]),
        createElement('span', { className: 'tt__dnum' }, String(d.getDate())),
      ];
      const label = capitalize(longDate.format(d));
      const head = view === 'week'
        ? createElement('button', {
          type: 'button', className: 'tt__head-btn', dataset: { day: toISO(d) },
          'aria-label': msg('timetable.openDay', { date: label }),
        }, ...content)
        : createElement('div', { className: 'tt__head-btn' }, ...content);
      return createElement('div', {
        className: `tt__head${isToday ? ' tt__head--today' : ''}`, part: 'day-head',
      }, head);
    });

    // Cột giờ
    const gutter = createElement('div', { className: 'tt__gutter', 'aria-hidden': 'true' });
    for (let h = fromMin / 60; h < toMin / 60; h++) {
      const lbl = createElement('span', { className: 'tt__hour' }, formatMinutes(h * 60));
      lbl.style.setProperty('--s', String(h - fromMin / 60));
      gutter.append(lbl);
    }

    // Cột ngày + sự kiện
    this._cols = this._days.map((d, i) => {
      const isToday = diffDays(d, today) === 0;
      const col = createElement('div', {
        className: `tt__col${isToday ? ' tt__col--today' : ''}`, part: 'column', role: 'group',
        dataset: { index: String(i) }, 'aria-label': capitalize(longDate.format(d)),
      });
      for (const seg of segsByDay[i]) col.append(this._eventNode(seg));
      return col;
    });

    this._grid.replaceChildren(
      createElement('div', { className: 'tt__corner', 'aria-hidden': 'true' }),
      ...heads,
      gutter,
      ...this._cols,
    );
    this._drag = null;
    this._paintNow();
    this._paintToolbar(from, days);

    const ready = this.events != null;
    this._empty.hidden = !ready || segCount > 0;
    this._empty.textContent = msg('timetable.empty');

    if (this._needScroll) {
      const firstEventMin = Math.min(...segsByDay.flat().map((s) => s.startMin), Infinity);
      const todayIdx = diffDays(today, from);
      const now = this._today();
      const nowMin = todayIdx >= 0 && todayIdx < days ? now.getHours() * 60 + now.getMinutes() - 60 : Infinity;
      let target = Math.min(firstEventMin, nowMin);
      if (!Number.isFinite(target)) target = fromMin;
      requestAnimationFrame(() => this.scrollToTime(Math.max(target, fromMin) / 60));
      const settled = segCount > 0 || (this._awaitEvents ? changed.has('events') : ready);
      if (settled) {
        this._needScroll = false;
        this._awaitEvents = false;
      }
    }
  }

  _eventNode(seg) {
    const { item, startMin, endMin } = seg;
    const ev = item.event;
    const top = (Math.max(startMin, this._fromMin) - this._fromMin) / 60;
    const dur = Math.max(15, endMin - Math.max(startMin, this._fromMin)) / 60;
    const title = ev.title ? String(ev.title) : msg('timetable.untitled');
    const time = `${formatMinutes(item.start.getHours() * 60 + item.start.getMinutes())} – ${formatMinutes(item.end.getHours() * 60 + item.end.getMinutes())}`;
    const cancelled = ev.status === 'cancelled';
    const short = dur < 0.75;
    const node = createElement('button', {
      type: 'button',
      className: `tt__event${cancelled ? ' tt__event--cancelled' : ''}${short ? ' tt__event--short' : ''}`,
      part: 'event',
      'aria-label': [title, time, ev.subtitle, cancelled ? msg('timetable.cancelled') : null].filter(Boolean).join(', '),
      dataset: { id: ev.id != null ? String(ev.id) : '' },
    },
    createElement('span', { className: 'tt__event-title' }, title),
    createElement('span', { className: 'tt__event-time' }, time),
    ev.subtitle ? createElement('span', { className: 'tt__event-sub' }, String(ev.subtitle)) : null);
    node._huiEvent = ev;
    node.style.setProperty('--s', String(top));
    node.style.setProperty('--d', String(dur));
    node.style.setProperty('--c', String(seg.col || 0));
    node.style.setProperty('--n', String(seg.cols || 1));
    const color = colorValue(ev.color);
    if (color) node.style.setProperty('--_c', color);
    return node;
  }

  _paintNow() {
    this._nowEl?.remove();
    this._nowEl = null;
    if (!this._days.length) return;
    const now = this._today();
    const idx = diffDays(now, this._days[0]);
    const min = now.getHours() * 60 + now.getMinutes();
    if (idx < 0 || idx >= this._days.length || min < this._fromMin || min > this._toMin) return;
    this._nowEl = createElement('div', { className: 'tt__now', part: 'now', 'aria-hidden': 'true' });
    this._nowEl.style.setProperty('--s', String((min - this._fromMin) / 60));
    this._cols[idx]?.append(this._nowEl);
  }

  _paintToolbar(from, days) {
    const view = this._viewName();
    this._toolbar.hidden = this.noToolbar;
    this._viewSwitch.hidden = this.noViewSwitch;
    this._base.setAttribute('aria-label', this.label || msg('timetable.label'));
    this._todayBtn.textContent = msg('timetable.today');
    this._prevBtn.setAttribute('aria-label', msg(view === 'day' ? 'timetable.prevDay' : 'timetable.prevWeek'));
    this._nextBtn.setAttribute('aria-label', msg(view === 'day' ? 'timetable.nextDay' : 'timetable.nextWeek'));
    this._viewSwitch.setAttribute('aria-label', msg('timetable.view'));
    for (const btn of this._viewBtns) {
      btn.textContent = msg(`timetable.${btn.dataset.view}`);
      btn.setAttribute('aria-pressed', String(btn.dataset.view === view));
    }
    const last = addDays(from, days - 1);
    let title;
    if (days === 1) {
      title = dateFormat({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(from);
    } else {
      const f = dateFormat({ day: 'numeric', month: 'long', year: 'numeric' });
      title = typeof f.formatRange === 'function' ? f.formatRange(from, last) : `${f.format(from)} – ${f.format(last)}`;
    }
    this._title.textContent = capitalize(title);
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  _onToolbarClick(e) {
    const nav = e.target.closest('[data-nav]')?.dataset.nav;
    if (nav === 'prev') this.prev();
    else if (nav === 'next') this.next();
    else if (nav === 'today') this.goToday();
    const view = e.target.closest('[data-view]')?.dataset.view;
    if (view) this._navigate({ view });
  }

  _onGridClick(e) {
    const evNode = e.target.closest('.tt__event');
    if (evNode) {
      this.emit('hui-event-click', { event: evNode._huiEvent, originalEvent: e });
      return;
    }
    const day = e.target.closest('[data-day]')?.dataset.day;
    if (day) this._navigate({ view: 'day', date: day });
  }

  _onGridKey(e) {
    // Mũi tên lên / xuống: sang sự kiện trước / sau trong lưới (Tab vẫn đi tuần tự)
    if (!e.target.classList?.contains('tt__event') || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    const all = [...this._grid.querySelectorAll('.tt__event')];
    const i = all.indexOf(e.target);
    const next = all[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  _slotOf(col, clientY) {
    const rect = col.getBoundingClientRect();
    const step = clamp(Math.round(Number(this.slotMinutes) || 30), 5, 240);
    const total = this._toMin - this._fromMin;
    const raw = ((clientY - rect.top) / rect.height) * total;
    return this._fromMin + clamp(Math.floor(raw / step) * step, 0, Math.max(0, total - step));
  }

  _onPointerDown(e) {
    if (!this.selectable || e.button !== 0) return;
    const col = e.target.closest('.tt__col');
    if (!col || e.target.closest('.tt__event')) return;
    const at = this._slotOf(col, e.clientY);
    this._drag = { col, index: Number(col.dataset.index), anchor: at, current: at, pointerId: e.pointerId };
    try {
      col.setPointerCapture(e.pointerId);
    } catch { /* trình duyệt cũ */ }
    e.preventDefault();
    this._paintSelection();
  }

  _onPointerMove(e) {
    const d = this._drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const at = this._slotOf(d.col, e.clientY);
    if (at !== d.current) {
      d.current = at;
      this._paintSelection();
    }
  }

  _onPointerUp(e) {
    const d = this._drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const { start, end } = this._dragRange(d);
    this._clearDrag();
    const day = this._days[d.index];
    const at = (min) => makeDate(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(min / 60), min % 60);
    this.emit('hui-slot-select', { start: at(start), end: at(end) });
  }

  _dragRange(d) {
    const step = clamp(Math.round(Number(this.slotMinutes) || 30), 5, 240);
    return { start: Math.min(d.anchor, d.current), end: Math.min(this._toMin, Math.max(d.anchor, d.current) + step) };
  }

  _paintSelection() {
    const d = this._drag;
    if (!d) return;
    if (!d.el) {
      d.el = createElement('div', { className: 'tt__selection', part: 'selection', 'aria-hidden': 'true' });
      d.col.append(d.el);
    }
    const { start, end } = this._dragRange(d);
    d.el.style.setProperty('--s', String((start - this._fromMin) / 60));
    d.el.style.setProperty('--d', String((end - start) / 60));
    d.el.textContent = `${formatMinutes(start)} – ${formatMinutes(end)}`;
  }

  _clearDrag() {
    this._drag?.el?.remove();
    this._drag = null;
  }
}

defineElement('hui-timetable', HuiTimetable);

export default HuiTimetable;
