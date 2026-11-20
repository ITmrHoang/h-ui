import { describe, it, expect, afterEach } from 'vitest';
import '../src/components/hui-whiteboard/index.js';
import { bbox, nextLabel, scale, snapAngle, snapPoint, translate } from '../src/components/hui-whiteboard/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const tick = () => new Promise((r) => setTimeout(r, 0));

async function mount(attrs = {}) {
  const el = document.createElement('hui-whiteboard');
  el.style.width = '800px';
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.append(el);
  await tick();
  return el;
}

/** Tọa độ trang (1600 × 900) → sự kiện con trỏ trên canvas rộng 800px. */
function pointer(el, type, [x, y], extra = {}) {
  const canvas = el.shadowRoot.querySelector('canvas');
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent(type, { clientX: rect.left + x / 2, clientY: rect.top + y / 2, bubbles: true, pointerId: 1, button: 0, ...extra }));
}

function drag(el, points, extra = {}) {
  pointer(el, 'pointerdown', points[0], extra);
  for (const p of points.slice(1)) pointer(el, 'pointermove', p, extra);
  pointer(el, 'pointerup', points[points.length - 1], extra);
}

const key = (el, k, extra = {}) =>
  el.shadowRoot.querySelector('.stage').dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...extra }));

/** Bảng a vẽ, bảng b nhận thao tác. */
async function pair() {
  const a = await mount({ author: 'gv' });
  const b = await mount({ readonly: '' });
  const ops = [];
  a.addEventListener('hui-change', (e) => {
    ops.push(e.detail.op);
    b.applyRemote(e.detail.op);
  });
  return { a, b, ops };
}

describe('hui-whiteboard — công cụ WB2', () => {
  it('chọn: chạm để chọn, kéo di chuyển, kéo góc đổi cỡ, Delete xóa, Ctrl+D nhân bản — đồng bộ + hoàn tác', async () => {
    const { a, b, ops } = await pair();
    a.tool = 'rect';
    drag(a, [[100, 100], [300, 200]]);
    a.tool = 'select';
    await tick();
    // Chạm cạnh hình chữ nhật → chọn, kéo dời (+100, +50)
    drag(a, [[100, 150], [150, 175], [200, 200]]);
    expect(a.selection.length).toBe(1);
    expect(ops.at(-1).kind).toBe('update');
    expect(a.elements()[0]).toMatchObject({ x1: 200, y1: 150, x2: 400, y2: 250 });
    expect(b.elements()).toEqual(a.elements());
    // Kéo ô góc dưới phải → to gấp đôi
    drag(a, [[402, 252], [600, 350]]);
    // Khung bao gồm nửa độ dày nét → góc trên trái lệch vài đơn vị
    expect(Math.abs(a.elements()[0].x1 - 200)).toBeLessThan(5);
    expect(Math.abs(a.elements()[0].y1 - 150)).toBeLessThan(5);
    expect(a.elements()[0].x2).toBeGreaterThan(590);
    a.undo();
    expect(a.elements()[0]).toMatchObject({ x2: 400, y2: 250 });
    expect(b.elements()[0]).toMatchObject({ x2: 400, y2: 250 });
    // Nhân bản rồi xóa bản gốc
    key(a, 'd', { ctrlKey: true });
    expect(a.elements().length).toBe(2);
    expect(a.elements()[1]).toMatchObject({ x1: 224, y1: 174 });
    expect(a.selection).toEqual([a.elements()[1].id]);
    key(a, 'Delete');
    expect(a.elements().length).toBe(1);
    expect(b.elements().length).toBe(1);
    // Kéo khung chọn nhiều: chỗ trống → không chọn gì
    a.tool = 'pen';
    drag(a, [[900, 600], [950, 650]]);
    a.tool = 'select';
    await tick();
    drag(a, [[50, 50], [1000, 700]]);
    expect(a.selection.length).toBe(2);
    drag(a, [[1500, 850], [1510, 860]]);
    expect(a.selection.length).toBe(0);
  });

  it('nền trang: đổi nền phát thao tác, ảnh chụp giữ nền, trang mới cùng nền; hoàn tác', async () => {
    const { a, b, ops } = await pair();
    a.setBackground('oly');
    expect(ops.at(-1)).toEqual({ kind: 'page-bg', page: 0, background: 'oly' });
    expect(b.backgroundOf(0)).toBe('oly');
    a.addPage('axes');
    expect(b.backgroundOf(1)).toBe('axes');
    const snap = a.getSnapshot();
    expect(snap.backgrounds).toEqual(['oly', 'axes']);
    const c = await mount();
    c.loadSnapshot(snap);
    expect(c.backgroundOf(1)).toBe('axes');
    c.loadSnapshot({ pages: [[]] });
    expect(c.backgroundOf(0)).toBe('none');
    a.setBackground('lol');
    expect(a.backgroundOf(1)).toBe('none');
    a.undo();
    expect(a.backgroundOf(1)).toBe('axes');
    expect(a.toDataURL(1).length).toBeGreaterThan(2000);
  });

  it('hình học: điểm tự đặt tên, đoạn thẳng bắt dính điểm, Shift góc 15°, đường tròn, đa giác', async () => {
    const { a, b } = await pair();
    a.tool = 'point';
    await tick();
    drag(a, [[200, 600]]);
    drag(a, [[600, 600]]);
    expect(a.elements().map((e) => e.label)).toEqual(['A', 'B']);
    a.tool = 'line';
    drag(a, [[205, 605], [590, 595]]);
    expect(a.elements()[2]).toMatchObject({ type: 'line', x1: 200, y1: 600, x2: 600, y2: 600 });
    drag(a, [[800, 300], [1000, 310]], { shiftKey: true });
    expect(a.elements()[3].y2).toBeCloseTo(300, 0);
    a.tool = 'circle';
    drag(a, [[203, 598], [300, 600]]);
    expect(a.elements()[4]).toMatchObject({ type: 'circle', cx: 200, cy: 600 });
    expect(a.elements()[4].r).toBeCloseTo(100, 0);
    a.tool = 'polygon';
    await tick();
    for (const p of [[1000, 500], [1200, 500], [1100, 350]]) {
      pointer(a, 'pointerdown', p);
      pointer(a, 'pointerup', p);
    }
    expect(a.elements().length).toBe(5);
    // Bấm lại đỉnh đầu → khép đa giác
    pointer(a, 'pointerdown', [1004, 503]);
    expect(a.elements()[5]).toMatchObject({ type: 'polygon', points: [[1000, 500], [1200, 500], [1100, 350]] });
    expect(b.elements()).toEqual(a.elements());
  });

  it('công thức: gõ LaTeX bằng ô có bàn phím → phần tử math có khung đo được; chạm lại để sửa', async () => {
    const { a, b, ops } = await pair();
    a.tool = 'math';
    await tick();
    drag(a, [[300, 200]]);
    const box = a.shadowRoot.querySelector('.math-box');
    expect(box.hidden).toBe(false);
    const input = a.shadowRoot.querySelector('hui-math-input');
    await input.updateComplete;
    input.value = '\\frac{-b \\pm \\sqrt{\\Delta}}{2a}';
    input.dispatchEvent(new CustomEvent('hui-submit', { detail: { value: input.value } }));
    expect(box.hidden).toBe(true);
    const [m] = a.elements();
    expect(m).toMatchObject({ type: 'math', x: 300, y: 200, tex: '\\frac{-b \\pm \\sqrt{\\Delta}}{2a}', author: 'gv' });
    expect(m.w).toBeGreaterThan(40);
    expect(m.h).toBeGreaterThan(40);
    expect(b.elements()).toEqual(a.elements());
    // Ảnh công thức tải xong → có trong ảnh xuất
    const url = await a.toDataURLAsync(0);
    expect(url.startsWith('data:image/png')).toBe(true);
    // Chạm vào công thức → sửa (op update)
    drag(a, [[310, 210]]);
    expect(input.value).toBe(m.tex);
    input.value = 'x^2';
    a.shadowRoot.querySelector('.math-actions .primary').click();
    expect(ops.at(-1)).toMatchObject({ kind: 'update', element: { id: m.id, tex: 'x^2' } });
  });

  it('ảnh: chèn ảnh thường / ảnh nền khóa nằm dưới; tẩy, chọn, xóa trang không đụng ảnh khóa', async () => {
    const { a, b, ops } = await pair();
    const req = [];
    a.addEventListener('hui-image-request', () => req.push(1));
    a.shadowRoot.querySelector('.toolbar').querySelectorAll('button')[14].click();
    expect(req.length).toBe(1);
    a.tool = 'pen';
    drag(a, [[100, 100], [400, 400]]);
    const bg = a.addImage('data:image/gif;base64,R0lGODlhAQABAAAAACw=', { width: 1600, height: 900, locked: true });
    expect(ops.at(-1)).toMatchObject({ kind: 'add', under: true });
    expect(a.elements()[0]).toMatchObject({ id: bg, type: 'image', locked: true, x1: 0, y1: 0, x2: 1600, y2: 900 });
    expect(b.elements()[0].id).toBe(bg);
    const pic = a.addImage('data:image/gif;base64,R0lGODlhAQABAAAAACw=', { width: 400, height: 200 });
    expect(a.elements()[2]).toMatchObject({ id: pic, x1: 600, y1: 350, x2: 1000, y2: 550 });
    // Tẩy chỗ chỉ có ảnh nền → không xóa
    a.tool = 'eraser';
    drag(a, [[1400, 800], [1450, 820]]);
    expect(a.elements().length).toBe(3);
    // Xóa trang: còn đúng ảnh nền khóa
    a.clearPage();
    expect(a.elements().map((e) => e.id)).toEqual([bg]);
    expect(b.elements().map((e) => e.id)).toEqual([bg]);
    a.undo();
    expect(a.elements().length).toBe(3);
  });

  it('hàm hình học', () => {
    expect(snapPoint([103, 98], [[100, 100], [500, 500]])).toEqual([100, 100]);
    expect(snapPoint([150, 150], [[100, 100]])).toEqual([150, 150]);
    const [x, y] = snapAngle([0, 0], [100, 8]);
    expect(Math.round(y)).toBe(0);
    expect(Math.round(x)).toBe(100);
    expect(nextLabel([{ type: 'point', label: 'A' }, { type: 'point', label: 'C' }])).toBe('B');
    expect(nextLabel(Array.from({ length: 26 }, (_, i) => ({ type: 'point', label: String.fromCharCode(65 + i) })))).toBe('A1');
    expect(translate({ type: 'circle', cx: 1, cy: 2, r: 5 }, 10, 10)).toMatchObject({ cx: 11, cy: 12, r: 5 });
    const from = { x1: 0, y1: 0, x2: 100, y2: 100 };
    expect(scale({ type: 'rect', x1: 0, y1: 0, x2: 100, y2: 100 }, from, { x1: 0, y1: 0, x2: 200, y2: 200 })).toMatchObject({ x2: 200, y2: 200 });
    expect(bbox({ type: 'math', x: 10, y: 20, w: 30, h: 40 })).toEqual({ x1: 10, y1: 20, x2: 40, y2: 60 });
  });
});
