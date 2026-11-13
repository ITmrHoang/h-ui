import { describe, it, expect, afterEach } from 'vitest';
import '../src/components/hui-whiteboard/index.js';
import { hitTest } from '../src/components/hui-whiteboard/index.js';

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

/** Kéo con trỏ trên canvas theo tọa độ trang (1600 × 900, canvas rộng 800px → chia 2). */
function drag(el, points) {
  const canvas = el.shadowRoot.querySelector('canvas');
  const rect = canvas.getBoundingClientRect();
  const at = ([x, y]) => ({ clientX: rect.left + x / 2, clientY: rect.top + y / 2, bubbles: true, pointerId: 1, button: 0 });
  canvas.dispatchEvent(new PointerEvent('pointerdown', at(points[0])));
  for (const p of points.slice(1)) canvas.dispatchEvent(new PointerEvent('pointermove', at(p)));
  canvas.dispatchEvent(new PointerEvent('pointerup', at(points[points.length - 1])));
}

describe('hui-whiteboard', () => {
  it('vẽ bút + hình, phát thao tác; máy khác áp lại giống hệt', async () => {
    const a = await mount({ author: 'u:gv' });
    const b = await mount({ readonly: '' });
    const ops = [];
    a.addEventListener('hui-change', (e) => {
      ops.push(e.detail.op);
      b.applyRemote(e.detail.op);
    });
    drag(a, [[100, 100], [200, 150], [300, 120]]);
    a.tool = 'rect';
    drag(a, [[400, 400], [600, 500]]);
    expect(ops.map((o) => o.kind)).toEqual(['add', 'add']);
    const [pen, rect] = a.elements();
    expect(pen.type).toBe('pen');
    expect(pen.author).toBe('u:gv');
    expect(pen.points.length).toBe(3);
    expect(rect).toMatchObject({ type: 'rect', x1: 400, y1: 400, x2: 600, y2: 500 });
    expect(b.elements()).toEqual(a.elements());
    // Bảng chỉ xem: không vẽ được, không có thanh công cụ
    drag(b, [[10, 10], [50, 50]]);
    expect(b.elements().length).toBe(2);
    expect(b.shadowRoot.querySelector('.toolbar').hidden).toBe(true);
  });

  it('tẩy xóa nét chạm vào; hoàn tác / làm lại phát thao tác ngược', async () => {
    const el = await mount();
    const ops = [];
    el.addEventListener('hui-change', (e) => ops.push(e.detail.op));
    drag(el, [[100, 100], [300, 100]]);
    drag(el, [[100, 500], [300, 500]]);
    el.tool = 'eraser';
    drag(el, [[200, 90], [200, 110]]);
    expect(el.elements().length).toBe(1);
    expect(ops[2].kind).toBe('remove');
    el.undo();
    expect(el.elements().length).toBe(2);
    expect(ops[3]).toMatchObject({ kind: 'add' });
    el.redo();
    expect(el.elements().length).toBe(1);
    el.clearPage();
    expect(el.elements()).toEqual([]);
    el.undo();
    expect(el.elements().length).toBe(1);
  });

  it('nhiều trang, ảnh chụp, xuất PNG; đoạn quá ngắn bị bỏ', async () => {
    const el = await mount();
    const pages = [];
    el.addEventListener('hui-page', (e) => pages.push(e.detail.page));
    el.tool = 'line';
    drag(el, [[10, 10], [11, 11]]);
    expect(el.elements()).toEqual([]);
    drag(el, [[10, 10], [500, 300]]);
    el.addPage();
    expect(el.pageCount).toBe(2);
    expect(el.page).toBe(1);
    expect(pages).toEqual([1]);
    const snap = el.getSnapshot();
    const copy = await mount();
    copy.loadSnapshot(snap);
    expect(copy.pageCount).toBe(2);
    expect(copy.elements(0)).toEqual(el.elements(0));
    expect(el.toDataURL(0).startsWith('data:image/png;base64,')).toBe(true);
    // Trang ngoài phạm vi bị kéo về trang cuối
    el.page = 9;
    await tick();
    expect(el.page).toBe(1);
  });

  it('công cụ chữ: Enter ghi đúng một phần tử (ẩn ô chữ không ghi lần hai)', async () => {
    const el = await mount();
    const ops = [];
    el.addEventListener('hui-change', (e) => ops.push(e.detail.op));
    el.tool = 'text';
    await tick();
    drag(el, [[200, 100]]);
    const input = el.shadowRoot.querySelector('.text-input');
    expect(input.hidden).toBe(false);
    input.focus();
    input.value = 'x + y = 5';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur'));
    expect(ops.length).toBe(1);
    expect(el.elements()).toEqual([expect.objectContaining({ type: 'text', text: 'x + y = 5', x: 200, y: 100 })]);
    expect(input.hidden).toBe(true);
  });

  it('kiểm tra chạm của tẩy theo loại phần tử', () => {
    expect(hitTest({ type: 'line', size: 4, x1: 0, y1: 0, x2: 100, y2: 0 }, [50, 8])).toBe(true);
    expect(hitTest({ type: 'line', size: 4, x1: 0, y1: 0, x2: 100, y2: 0 }, [50, 30])).toBe(false);
    expect(hitTest({ type: 'ellipse', size: 2, x1: 0, y1: 0, x2: 200, y2: 100 }, [100, 0])).toBe(true);
    expect(hitTest({ type: 'ellipse', size: 2, x1: 0, y1: 0, x2: 200, y2: 100 }, [100, 50])).toBe(false);
    expect(hitTest({ type: 'text', size: 20, x: 10, y: 10, text: 'abc' }, [20, 20])).toBe(true);
  });
});
