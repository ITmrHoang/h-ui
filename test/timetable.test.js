import { describe, it, expect, afterEach } from 'vitest';
import { daySegments, formatMinutes, layoutColumns, normalizeEvents, toDate } from '../src/components/hui-timetable/layout.js';
import '../src/components/hui-timetable/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const tick = () => new Promise((r) => setTimeout(r, 0));

async function mount(props = {}, attrs = {}) {
  const el = document.createElement('hui-timetable');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  Object.assign(el, props);
  document.body.append(el);
  await tick();
  return el;
}

describe('hui-timetable — tính toán', () => {
  it('toDate: chuỗi không múi giờ là giờ địa phương, có Z thì theo UTC', () => {
    const local = toDate('2026-11-10T19:30');
    expect([local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes()]).toEqual([2026, 10, 10, 19, 30]);
    expect(toDate('2026-11-10T12:30:00Z').getTime()).toBe(Date.UTC(2026, 10, 10, 12, 30));
    expect(toDate('2026-11-10T19:30:00+07:00').getTime()).toBe(Date.UTC(2026, 10, 10, 12, 30));
    expect(toDate('không phải ngày')).toBeNull();
    expect(toDate(null)).toBeNull();
  });

  it('normalizeEvents: bỏ mục sai, end thiếu → +60 phút, sắp theo giờ', () => {
    const items = normalizeEvents([
      { id: 'b', start: '2026-11-10T10:00', end: '2026-11-10T09:00' },
      { id: 'x', start: 'sai' },
      null,
      { id: 'a', start: '2026-11-10T08:00', end: '2026-11-10T08:45' },
    ]);
    expect(items.map((i) => i.event.id)).toEqual(['a', 'b']);
    expect(items[1].end - items[1].start).toBe(60 * 60_000);
  });

  it('daySegments: sự kiện qua nửa đêm bị cắt thành 2 ngày', () => {
    const items = normalizeEvents([{ id: 1, start: '2026-11-10T23:00', end: '2026-11-11T01:30' }]);
    const d1 = daySegments(items, new Date(2026, 10, 10));
    const d2 = daySegments(items, new Date(2026, 10, 11));
    expect(d1).toMatchObject([{ startMin: 23 * 60, endMin: 24 * 60, continued: false, continues: true }]);
    expect(d2).toMatchObject([{ startMin: 0, endMin: 90, continued: true, continues: false }]);
    expect(daySegments(items, new Date(2026, 10, 12))).toEqual([]);
  });

  it('layoutColumns: cụm chồng giờ chia cột, cụm sau không bị ảnh hưởng', () => {
    const segs = layoutColumns([
      { id: 'a', startMin: 480, endMin: 540 },
      { id: 'b', startMin: 510, endMin: 600 },
      { id: 'c', startMin: 545, endMin: 560 }, // a đã xong → dùng lại cột 0
      { id: 'd', startMin: 720, endMin: 780 }, // cụm mới
    ]);
    const by = Object.fromEntries(segs.map((s) => [s.id, [s.col, s.cols]]));
    expect(by).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2], d: [0, 1] });
  });

  it('formatMinutes', () => {
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(19 * 60 + 5)).toBe('19:05');
    expect(formatMinutes(1440)).toBe('24:00');
  });
});

describe('hui-timetable — component', () => {
  const EVENTS = [
    { id: 1, title: 'Toán', start: '2026-11-10T07:30', end: '2026-11-10T09:00' },
    { id: 2, title: 'Lý', start: '2026-11-12T20:00', end: '2026-11-12T22:30', status: 'cancelled' },
  ];

  it('tuần bắt đầu thứ Hai, range, đặt sự kiện theo giờ và nới khung giờ', async () => {
    const el = await mount({ events: EVENTS }, { date: '2026-11-11', now: '2026-11-10T10:00' });
    const { from, to } = el.range;
    expect([from.getDate(), from.getDay()]).toEqual([9, 1]);
    expect(to.getDate()).toBe(16);
    const root = el.shadowRoot;
    expect(root.querySelectorAll('.tt__col').length).toBe(7);
    const toan = root.querySelectorAll('.tt__col')[1].querySelector('.tt__event');
    expect(toan.style.getPropertyValue('--s')).toBe('0.5'); // 7:30 với lưới bắt đầu 7h
    expect(toan.style.getPropertyValue('--d')).toBe('1.5');
    expect(toan.getAttribute('aria-label')).toBe('Toán, 07:30 – 09:00');
    // Sự kiện tới 22:30 → lưới nới tới 23h (7…22 = 16 nhãn giờ)
    expect(root.querySelectorAll('.tt__hour').length).toBe(16);
    expect(root.querySelector('.tt__event--cancelled').getAttribute('aria-label')).toContain('đã hủy');
    expect(root.querySelectorAll('.tt__col')[1].querySelector('.tt__now')).toBeTruthy();
  });

  it('week-start = 0 → tuần bắt đầu Chủ nhật; view day chỉ 1 cột', async () => {
    const el = await mount({ events: EVENTS }, { date: '2026-11-11', 'week-start': '0' });
    expect(el.range.from.getDay()).toBe(0);
    el.view = 'day';
    await tick();
    expect(el.shadowRoot.querySelectorAll('.tt__col').length).toBe(1);
    expect(el.range.from.getDate()).toBe(11);
  });

  it('điều hướng phát hui-range-change; gán date bằng code thì không phát', async () => {
    const el = await mount({ events: EVENTS }, { date: '2026-11-10' });
    const got = [];
    el.addEventListener('hui-range-change', (e) => got.push(e.detail));
    el.next();
    await tick();
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ view: 'week', date: '2026-11-17' });
    expect(got[0].from.getDate()).toBe(16);
    el.date = '2026-12-01';
    await tick();
    expect(got).toHaveLength(1);
    el.shadowRoot.querySelector('[data-view="day"]').click();
    await tick();
    expect(got.at(-1)).toMatchObject({ view: 'day', date: '2026-12-01' });
    el.prev();
    expect(got.at(-1).date).toBe('2026-11-30');
  });

  it('đổi tuần rồi trang mới gán events → cuộn tới sự kiện đầu tiên của tuần mới', async () => {
    const el = await mount({ events: EVENTS }, { date: '2026-11-10', now: '2026-12-25T09:00' });
    const scroller = el.shadowRoot.querySelector('.tt__scroll');
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    el.next();
    await tick();
    await frame();
    expect(scroller.scrollTop).toBe(0); // tuần mới chưa có dữ liệu
    el.events = [{ id: 9, title: 'Hóa', start: '2026-11-18T20:00', end: '2026-11-18T21:00' }];
    await tick();
    await frame();
    expect(scroller.scrollTop).toBeGreaterThan(100);
  });

  it('bấm sự kiện → hui-event-click với object gốc', async () => {
    const el = await mount({ events: EVENTS }, { date: '2026-11-10' });
    let got = null;
    el.addEventListener('hui-event-click', (e) => { got = e.detail.event; });
    el.shadowRoot.querySelector('.tt__event').click();
    expect(got).toBe(EVENTS[0]);
  });

  it('selectable: kéo chọn khung giờ → hui-slot-select làm tròn theo slot-minutes', async () => {
    const el = await mount({ events: [] }, { date: '2026-11-10', selectable: '', 'slot-minutes': '30' });
    const col = el.shadowRoot.querySelectorAll('.tt__col')[2]; // thứ Tư 11/11
    const rect = col.getBoundingClientRect();
    const hours = 15; // 7h → 22h
    const y = (h) => rect.top + ((h - 7) / hours) * rect.height + 1;
    let got = null;
    el.addEventListener('hui-slot-select', (e) => { got = e.detail; });
    const opts = { bubbles: true, composed: true, pointerId: 7, button: 0, clientX: rect.left + 10 };
    col.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientY: y(9) }));
    col.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientY: y(10.6) }));
    expect(el.shadowRoot.querySelector('.tt__selection').textContent).toBe('09:00 – 11:00');
    col.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientY: y(10.6) }));
    expect(got.start.getDate()).toBe(11);
    expect([got.start.getHours(), got.start.getMinutes()]).toEqual([9, 0]);
    expect([got.end.getHours(), got.end.getMinutes()]).toEqual([11, 0]);
    expect(el.shadowRoot.querySelector('.tt__selection')).toBeNull();
  });

  it('không selectable thì không chọn; đã có events nhưng khoảng trống → hiện dòng trống', async () => {
    const el = await mount({ events: [] }, { date: '2026-11-10' });
    let fired = false;
    el.addEventListener('hui-slot-select', () => { fired = true; });
    const col = el.shadowRoot.querySelector('.tt__col');
    col.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0, clientY: 100 }));
    col.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, button: 0, clientY: 100 }));
    expect(fired).toBe(false);
    expect(el.shadowRoot.querySelector('.tt__empty').hidden).toBe(false);
  });
});
