/**
 * Storybook Stories — HUI Whiteboard
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Organisms/HuiWhiteboard',
  component: 'hui-whiteboard',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Whiteboard** — Bảng vẽ cho dạy trực tuyến: **bút, bút dạ quang, tẩy, đoạn thẳng, mũi tên, hình chữ nhật,
elip, chữ, đồ thị hàm số** (công cụ ƒ: kéo khung → gõ \`y = 2x + 1\`…, Ctrl + Enter; chạm lại để sửa); màu + độ dày;
**hoàn tác / làm lại** (Ctrl + Z / Ctrl + Y); **nhiều trang**; xuất ảnh PNG.

Dạy Toán: **công thức** (∑ — ô gõ LaTeX có bàn phím \`hui-math-input\`, vẽ bằng MathML), **hình học** (điểm tự đặt
tên A, B, C…, đoạn thẳng / đường tròn / đa giác bắt dính vào điểm có sẵn, Shift để thẳng góc 15°), **nền trang**
(ô vuông, ô ly, dòng kẻ, chấm, hệ trục Oxy), **ảnh** (🖼 / dán Ctrl + V — app tải lên rồi gọi \`addImage\`; ảnh nền
trang PDF \`locked\` không chọn / tẩy được), **công cụ chọn** (chạm / Shift / kéo khung, kéo để dời, kéo góc để đổi
cỡ, Delete xóa, Ctrl + D nhân bản, bấm màu để đổi màu).

Zero-dependency: component lo vẽ (Canvas 2D) + công cụ + dữ liệu; mỗi thay đổi phát \`hui-change\` kèm **thao tác**
để app gửi cho máy khác (LiveKit data, WebSocket, Yjs…), máy kia gọi \`applyRemote(op)\`. Tọa độ chuẩn hóa theo
trang **1600 × 900** nên mọi màn hình thấy giống nhau.

\`\`\`html
<hui-whiteboard author="u:123"></hui-whiteboard>
<script>
  const board = document.querySelector('hui-whiteboard');
  board.addEventListener('hui-change', (e) => send(e.detail.op));
  onMessage((op) => board.applyRemote(op));
</script>
\`\`\`

### Attributes / Properties
| Attribute | Property | Type | Default | Mô tả |
|-----------|----------|------|---------|-------|
| \`readonly\` | \`readonly\` | boolean | \`false\` | Chỉ xem (không vẽ, ẩn thanh công cụ) |
| \`tool\` | \`tool\` | string | \`'pen'\` | select · pen · highlighter · eraser · line · arrow · rect · ellipse · circle · polygon · point · text · math · plot |
| \`no-image\` | \`noImage\` | boolean | \`false\` | Ẩn nút chèn ảnh, bỏ qua dán ảnh |
| \`color\` | \`color\` | string | \`'#111827'\` | Màu nét |
| \`size\` | \`size\` | number | \`4\` | Độ dày nét (chữ: cỡ 16 + size × 4) |
| \`author\` | \`author\` | string | \`''\` | Gắn vào phần tử mới vẽ |
| \`page\` | \`page\` | number | \`0\` | Trang đang xem |
| \`no-toolbar\` | \`noToolbar\` | boolean | \`false\` | Ẩn thanh công cụ có sẵn |
| — | \`palette\` | string[] | 6 màu | Bảng màu |
| \`background\` | \`background\` | string | \`'#ffffff'\` | Nền trang |

### Methods
| Method | Mô tả |
|--------|-------|
| \`applyRemote(op)\` | Áp thao tác từ máy khác (không phát sự kiện, không vào lịch sử hoàn tác) |
| \`undo()\` / \`redo()\` | Hoàn tác / làm lại thao tác của chính mình |
| \`clearPage()\` / \`addPage(background?)\` | Xóa nét của trang (giữ ảnh nền khóa) / thêm trang |
| \`setBackground(bg, page?)\` / \`backgroundOf(page?)\` | Nền trang: none · grid · oly · lines · dots · axes |
| \`getSnapshot()\` / \`loadSnapshot(s)\` | Toàn bộ bảng \`{ pages, page, backgrounds }\` (gửi người vào sau, lưu lại) |
| \`addPlot(value, box?)\` | Thêm đồ thị hàm số (cú pháp của \`hui-plot\`), trả về id |
| \`addImage(src, { width, height, box, locked, page })\` | Thêm ảnh (\`locked\`: ảnh nền phủ cả trang), trả về id |
| \`deleteSelected()\` / \`duplicateSelected()\` / \`selection\` | Công cụ chọn |
| \`elements(page?)\` | Phần tử của một trang |
| \`toDataURL(page?, type?)\` / \`toDataURLAsync(…)\` | Ảnh 1600 × 900 của một trang (bản async chờ ảnh / công thức tải xong) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-change\` | \`{ op }\` | \`add { page, elements, under? }\` · \`remove { page, ids }\` · \`update { page, element \\| elements }\` · \`clear { page }\` · \`page-add { background? }\` · \`page-bg { page, background }\` |
| \`hui-page\` | \`{ page }\` | Người dùng chuyển trang |
| \`hui-image-request\` | \`{ page }\` | Bấm nút chèn ảnh |
| \`hui-paste-image\` | \`{ file, page }\` | Dán ảnh vào bảng |
`,
      },
    },
  },
};

/** Bảng của giáo viên: đủ công cụ */
export const Default = {
  render: () => html`<hui-whiteboard author="gv" style="max-width: 900px"></hui-whiteboard>`,
};

/** Đồng bộ: vẽ bên trái → bên phải (chỉ xem) cập nhật theo qua `hui-change` → `applyRemote` */
export const Synced = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px';
    const a = document.createElement('hui-whiteboard');
    const b = document.createElement('hui-whiteboard');
    b.setAttribute('readonly', '');
    a.addEventListener('hui-change', (e) => b.applyRemote(e.detail.op));
    a.addEventListener('hui-page', (e) => (b.page = e.detail.page));
    wrap.append(a, b);
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const [a, b] = canvasElement.querySelectorAll('hui-whiteboard');
    await waitFor(() => expect(a.shadowRoot.querySelector('canvas').width).toBeGreaterThan(0));
    a.applyRemote({ kind: 'add', page: 0, elements: [{ id: 'x', type: 'line', color: '#dc2626', size: 6, x1: 100, y1: 100, x2: 900, y2: 600 }] });
    // applyRemote không phát sự kiện → bảng bên phải chưa có
    await expect(b.elements().length).toBe(0);
    a.tool = 'rect';
    const canvas = a.shadowRoot.querySelector('canvas');
    const r = canvas.getBoundingClientRect();
    const at = (x, y) => ({ clientX: r.left + x, clientY: r.top + y, bubbles: true, pointerId: 1, button: 0 });
    canvas.dispatchEvent(new PointerEvent('pointerdown', at(40, 40)));
    canvas.dispatchEvent(new PointerEvent('pointermove', at(160, 120)));
    canvas.dispatchEvent(new PointerEvent('pointerup', at(160, 120)));
    await expect(b.elements()[0].type).toBe('rect');
  },
};

/** Dạy Toán: nền hệ trục, hình học có tên điểm, công thức, đồ thị; thử công cụ chọn để dời / đổi cỡ */
export const MathLesson = {
  render: () => {
    const el = document.createElement('hui-whiteboard');
    el.setAttribute('author', 'gv');
    el.style.maxWidth = '900px';
    queueMicrotask(() =>
      el.loadSnapshot({
        backgrounds: ['axes', 'oly'],
        pages: [
          [
            { id: 'p', type: 'plot', x1: 1000, y1: 60, x2: 1560, y2: 420, value: 'y = x^2 - 2x - 3\nx: -3 .. 5' },
            { id: 'A', type: 'point', color: '#dc2626', size: 4, x: 900, y: 350, label: 'A' },
            { id: 'B', type: 'point', color: '#dc2626', size: 4, x: 1100, y: 550, label: 'B' },
            { id: 'AB', type: 'line', color: '#dc2626', size: 4, x1: 900, y1: 350, x2: 1100, y2: 550 },
            { id: 'c', type: 'circle', color: '#2563eb', size: 4, cx: 800, cy: 450, r: 150 },
            { id: 'tri', type: 'polygon', color: '#16a34a', size: 4, points: [[200, 700], [450, 700], [320, 520]] },
          ],
          [],
        ],
      }),
    );
    return el;
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-whiteboard');
    await waitFor(() => expect(el.elements().length).toBe(6));
    await expect(el.backgroundOf(0)).toBe('axes');
    el.tool = 'select';
    await el.updateComplete;
    await expect(el.shadowRoot.querySelector('.stage').dataset.tool).toBe('select');
  },
};

/** Chỉ xem: học sinh chưa được mời lên bảng */
export const Readonly = {
  render: () => {
    const el = document.createElement('hui-whiteboard');
    el.setAttribute('readonly', '');
    el.style.maxWidth = '900px';
    queueMicrotask(() =>
      el.loadSnapshot({
        pages: [[
          { id: 't', type: 'text', color: '#111827', size: 40, x: 80, y: 60, text: 'Giải hệ: x + y = 5; 2x − y = 1' },
          { id: 'a', type: 'arrow', color: '#2563eb', size: 6, x1: 120, y1: 200, x2: 520, y2: 420 },
          { id: 'e', type: 'ellipse', color: '#16a34a', size: 4, x1: 700, y1: 250, x2: 1100, y2: 520 },
          { id: 'h', type: 'highlighter', color: '#d97706', size: 24, points: [[80, 120], [500, 120]] },
        ]],
      }),
    );
    return el;
  },
};
