/**
 * Storybook Stories — HUI Timetable
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const NOW = '2026-11-10T10:15';

/** Tuần 9 – 15/11/2026 (thứ Hai → Chủ nhật) */
const EVENTS = [
  { id: 1, title: 'Toán 9 — Hệ phương trình', subtitle: 'Lớp 9A', start: '2026-11-10T07:30', end: '2026-11-10T09:00', color: 'primary' },
  { id: 2, title: 'Ôn tập chương 2', subtitle: 'Nhóm ôn thi', start: '2026-11-10T08:30', end: '2026-11-10T10:00', color: 'success' },
  { id: 3, title: 'Vật lý 8', subtitle: 'Lớp 8B', start: '2026-11-11T14:00', end: '2026-11-11T15:30', color: 'warning' },
  { id: 4, title: 'Kiểm tra 15 phút', start: '2026-11-12T19:30', end: '2026-11-12T19:50', color: 'danger' },
  { id: 5, title: 'Toán 9 — Hệ phương trình', subtitle: 'Lớp 9A', start: '2026-11-12T07:30', end: '2026-11-12T09:00', color: 'primary' },
  { id: 6, title: 'Buổi đã hủy', start: '2026-11-13T09:00', end: '2026-11-13T10:30', status: 'cancelled' },
  { id: 7, title: 'Hóa 9', subtitle: 'Lớp 9C', start: '2026-11-14T20:00', end: '2026-11-14T21:30', color: '#7c3aed' },
];

const shadow = (el) => el.shadowRoot;

export default {
  title: 'Organisms/HuiTimetable',
  component: 'hui-timetable',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Timetable** — Lịch biểu **tuần / ngày** có khung giờ (kiểu Google Calendar): sự kiện đặt theo giờ bắt đầu – kết thúc,
sự kiện **chồng giờ tự chia cột**, vạch giờ hiện tại, thanh điều hướng *Trước / Hôm nay / Sau* + đổi *Tuần ↔ Ngày*
(bấm đầu cột một ngày để xem riêng ngày đó), **kéo chọn khung giờ trống** để tạo mới (\`selectable\`).
Khung giờ tự nới ra để chứa mọi sự kiện; màn hình hẹp thì cuộn ngang (hoặc dùng \`view="day"\`).

\`\`\`html
<hui-timetable date="2026-11-10" start-hour="7" end-hour="22" selectable></hui-timetable>
<script>
  const tt = document.querySelector('hui-timetable');
  tt.events = [{ id: 1, title: 'Toán 9', start: '2026-11-10T19:30', end: '2026-11-10T21:00', color: 'primary' }];
  tt.addEventListener('hui-range-change', (e) => load(e.detail.from, e.detail.to));
  tt.addEventListener('hui-slot-select', (e) => openCreateForm(e.detail.start, e.detail.end));
  tt.addEventListener('hui-event-click', (e) => openDetail(e.detail.event));
</script>
\`\`\`

Vue: \`<hui-timetable :events="items" :date="day" selectable @hui-range-change="load" />\`

### Attributes / Properties
| Attribute | Property | Type | Default | Mô tả |
|-----------|----------|------|---------|-------|
| — | \`events\` | array | \`null\` | \`[{ id, title, start, end, subtitle, color, status }]\` — \`start\` / \`end\`: Date hoặc ISO (có Z / +07:00 thì đổi theo múi giờ đó); \`color\`: primary · success · warning · danger · info · secondary hoặc màu CSS; \`status: 'cancelled'\` → gạch ngang |
| \`view\` | \`view\` | \`week\` \\| \`day\` | \`week\` | Chế độ xem |
| \`date\` | \`date\` | string | hôm nay | Ngày đang xem (YYYY-MM-DD) |
| \`start-hour\` | \`startHour\` | number | \`7\` | Giờ đầu lưới (tự lùi nếu có sự kiện sớm hơn) |
| \`end-hour\` | \`endHour\` | number | \`22\` | Giờ cuối lưới (tự nới nếu có sự kiện muộn hơn) |
| \`slot-minutes\` | \`slotMinutes\` | number | \`30\` | Bước kéo chọn khung giờ |
| \`week-start\` | \`weekStart\` | number | theo ngôn ngữ | 0 = Chủ nhật … 6; vi mặc định thứ Hai |
| \`selectable\` | \`selectable\` | boolean | \`false\` | Cho kéo chọn khung giờ trống |
| \`now\` | \`now\` | string | đồng hồ máy | "Bây giờ" cố định (demo / test) |
| \`no-toolbar\` | \`noToolbar\` | boolean | \`false\` | Ẩn thanh điều hướng |
| \`no-view-switch\` | \`noViewSwitch\` | boolean | \`false\` | Ẩn nút Tuần / Ngày |
| \`label\` | \`label\` | string | "Lịch biểu" | Tên cho trình đọc màn hình |

### Methods / Getter
| Tên | Mô tả |
|-----|-------|
| \`prev()\` / \`next()\` | Lùi / tiến một tuần (hoặc một ngày) |
| \`goToday()\` | Về hôm nay |
| \`scrollToTime(hour)\` | Cuộn tới giờ (19.5 = 19:30) |
| \`range\` | \`{ from, to }\` khoảng đang xem (\`to\` = 0h ngày sau ngày cuối) |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-range-change\` | \`{ view, date, from, to }\` | Người dùng đổi tuần / ngày / chế độ xem (kể cả gọi \`prev()\`, \`next()\`, \`goToday()\`) |
| \`hui-event-click\` | \`{ event, originalEvent }\` | Bấm / Enter vào sự kiện (mũi tên lên / xuống để chuyển sự kiện) |
| \`hui-slot-select\` | \`{ start, end }\` (Date) | Kéo chọn hoặc bấm khung giờ trống (\`selectable\`) |

### CSS Parts / Custom Properties
| Tên | Mô tả |
|-----|-------|
| \`::part(base)\` · \`toolbar\` · \`nav-btn\` · \`today-btn\` · \`title\` · \`view-switch\` · \`view-btn\` · \`empty\` · \`body\` · \`day-head\` · \`column\` · \`event\` · \`now\` · \`selection\` | Các phần của lịch |
| \`--hui-timetable-hour-height\` | Chiều cao một giờ (48px) |
| \`--hui-timetable-max-height\` | Chiều cao tối đa vùng cuộn (640px) |
| \`--hui-timetable-gutter\` / \`--hui-timetable-min-column\` | Bề rộng cột giờ / tối thiểu một ngày |
| \`--hui-timetable-bg\` · \`--hui-timetable-border-color\` · \`--hui-timetable-today-bg\` · \`--hui-timetable-now-color\` · \`--hui-timetable-radius\` | Màu / bo góc |
        `,
      },
    },
  },
  argTypes: {
    view: { control: 'inline-radio', options: ['week', 'day'] },
    startHour: { control: { type: 'number', min: 0, max: 23 } },
    endHour: { control: { type: 'number', min: 1, max: 24 } },
    slotMinutes: { control: { type: 'number', min: 5, max: 120, step: 5 } },
    selectable: { control: 'boolean' },
  },
};

export const Default = {
  args: { view: 'week', startHour: 7, endHour: 22, slotMinutes: 30, selectable: false },
  render: (args) => html`
    <hui-timetable
      .events=${EVENTS}
      date="2026-11-10"
      now=${NOW}
      view=${args.view}
      start-hour=${args.startHour}
      end-hour=${args.endHour}
      slot-minutes=${args.slotMinutes}
      ?selectable=${args.selectable}
    ></hui-timetable>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-timetable');
    await waitFor(() => expect(shadow(el).querySelectorAll('.tt__event').length).toBe(7));
    const heads = shadow(el).querySelectorAll('.tt__head');
    await expect(heads.length).toBe(7);
    // Thứ Hai đầu tuần, hôm nay (thứ Ba 10/11) được tô
    await expect(heads[0].textContent).toContain('9');
    await expect(shadow(el).querySelector('.tt__head--today').textContent).toContain('10');
    // 2 sự kiện chồng giờ thứ Ba → chia đôi cột
    const tue = shadow(el).querySelectorAll('.tt__col')[1].querySelectorAll('.tt__event');
    await expect([...tue].map((n) => n.style.getPropertyValue('--n'))).toEqual(['2', '2']);
    // Vạch giờ hiện tại nằm ở cột thứ Ba
    await expect(shadow(el).querySelectorAll('.tt__col')[1].querySelector('.tt__now')).toBeTruthy();
    // Bấm sự kiện → hui-event-click
    let clicked = null;
    el.addEventListener('hui-event-click', (e) => { clicked = e.detail.event; }, { once: true });
    await userEvent.click(shadow(el).querySelector('.tt__event'));
    await expect(clicked?.id).toBe(1);
  },
};

export const DayView = {
  name: 'Xem theo ngày',
  render: () => html`<hui-timetable .events=${EVENTS} view="day" date="2026-11-10" now=${NOW}></hui-timetable>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-timetable');
    await waitFor(() => expect(shadow(el).querySelectorAll('.tt__col').length).toBe(1));
    await expect(shadow(el).querySelectorAll('.tt__event').length).toBe(2);
    await expect(shadow(el).querySelector('[data-view="day"]').getAttribute('aria-pressed')).toBe('true');
  },
};

export const Navigation = {
  name: 'Điều hướng tuần',
  render: () => html`<hui-timetable .events=${EVENTS} date="2026-11-10" now=${NOW}></hui-timetable>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-timetable');
    await waitFor(() => expect(shadow(el).querySelectorAll('.tt__event').length).toBe(7));
    const ranges = [];
    el.addEventListener('hui-range-change', (e) => ranges.push(e.detail));
    await userEvent.click(shadow(el).querySelector('[data-nav="next"]'));
    await waitFor(() => expect(shadow(el).querySelectorAll('.tt__event').length).toBe(0));
    await expect(ranges[0].date).toBe('2026-11-17');
    await expect(shadow(el).querySelector('.tt__empty').hidden).toBe(false);
    await userEvent.click(shadow(el).querySelector('[data-nav="today"]'));
    await waitFor(() => expect(shadow(el).querySelectorAll('.tt__event').length).toBe(7));
    // Bấm đầu cột thứ Năm → xem riêng ngày đó
    await userEvent.click(shadow(el).querySelectorAll('.tt__head-btn')[3]);
    await waitFor(() => expect(el.view).toBe('day'));
    await expect(ranges.at(-1)).toMatchObject({ view: 'day', date: '2026-11-12' });
  },
};

export const Selectable = {
  name: 'Kéo chọn khung giờ',
  render: () => html`
    <hui-timetable .events=${EVENTS} date="2026-11-10" now=${NOW} selectable
      @hui-slot-select=${(e) => {
        const out = e.target.nextElementSibling;
        out.textContent = `Đã chọn: ${e.detail.start.toLocaleString('vi-VN')} → ${e.detail.end.toLocaleTimeString('vi-VN')}`;
      }}></hui-timetable>
    <p class="out" style="margin-top: 8px; font-family: var(--hui-font-family);">Kéo trên vùng trống để chọn giờ.</p>`,
};

export const Compact = {
  name: 'Gọn: không thanh công cụ, giờ thấp',
  render: () => html`
    <hui-timetable .events=${EVENTS} date="2026-11-10" now=${NOW} no-toolbar start-hour="7" end-hour="12"
      style="--hui-timetable-hour-height: 36px; --hui-timetable-max-height: 360px;"></hui-timetable>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-timetable');
    await waitFor(() => expect(shadow(el).querySelector('.tt__toolbar').hidden).toBe(true));
    // Có sự kiện tới 21:30 → lưới tự nới tới 22h
    await expect(shadow(el).querySelectorAll('.tt__hour').length).toBe(15);
  },
};
