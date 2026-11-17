import { describe, it, expect, afterEach } from 'vitest';
import '../src/components/hui-plot/index.js';
import { ExprError, evaluate, fitView, formatCoord, niceStep, parse, parsePlot, splitTop, variables } from '../src/components/hui-plot/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const tick = () => new Promise((r) => setTimeout(r, 0));
const close = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe('hui-plot / biểu thức', () => {
  it('nhân ngầm, dấu phẩy thập phân, lũy thừa, hàm', () => {
    expect(evaluate('2x + 1', { x: 3 })).toBe(7);
    expect(evaluate('3(x+1)', { x: 2 })).toBe(9);
    expect(evaluate('1,5x', { x: 2 })).toBe(3);
    expect(evaluate('x^2 - 2x', { x: 4 })).toBe(8);
    expect(evaluate('x²', { x: 5 })).toBe(25);
    expect(evaluate('-x^2', { x: 3 })).toBe(-9);
    expect(evaluate('2^3^2')).toBe(512);
    expect(evaluate('ax + b', { a: 2, b: -1, x: 3 })).toBe(5);
    close(evaluate('sin(pi/2)'), 1);
    close(evaluate('2sin x', { x: Math.PI / 6 }), 1);
    close(evaluate('sin^2 x + cos^2 x', { x: 0.7 }), 1);
    close(evaluate('√4 + sqrt(9)'), 5);
    expect(evaluate('|x - 3|', { x: 1 })).toBe(2);
    expect(evaluate('2|x|+1', { x: -2 })).toBe(5);
    close(evaluate('ln e'), 1);
    close(evaluate('log 1000'), 3);
    expect(evaluate('x^(1/3)', { x: -8 })).toBeCloseTo(-2, 9);
    expect(evaluate('3 × 4 − 2')).toBe(10);
  });

  it('báo lỗi rõ ràng, không dùng eval', () => {
    expect(() => parse('')).toThrow(ExprError);
    expect(() => parse('2 + ')).toThrow(ExprError);
    expect(() => parse('(x + 1')).toThrow(/Thiếu/);
    expect(() => parse('x $ 2')).toThrow(/Ký tự/);
    expect(() => parse('alert(1)')).not.toThrow(); // chỉ là a·l·e·r·t·1 — không có gì được thực thi
    expect([...variables(parse('a x^2 + b x + c'))].sort()).toEqual(['a', 'b', 'c', 'x']);
  });
});

describe('hui-plot / phân tích dòng', () => {
  it('nhận hàm, đường thẳng đứng, bất phương trình, điểm, tham số', () => {
    const p = parsePlot(`# ghi chú
y = a*x^2 - 3
f(x) = 2x + 1
x = 2
y >= x - 1
A(1; 3)
(−2; 0,5)
a = 2
x^2 + y^2 = 4`);
    expect(p.items.map((i) => i.kind)).toEqual(['fn', 'fn', 'vline', 'ineq', 'point', 'point']);
    expect(p.params).toEqual({ a: 2 });
    expect(p.items[0].f({ x: 2, a: 2 })).toBe(5);
    expect(p.items[3].op).toBe('≥');
    expect(p.items[4].name).toBe('A');
    expect(p.items[5].y({})).toBe(0.5);
    expect(p.errors).toHaveLength(1);
    expect(p.errors[0].message).toMatch(/chưa hỗ trợ/);
    // Khung trục ghi trong văn bản
    expect(parsePlot('x: -2 .. 5\ny: [4; −1]\ny = x').view).toEqual({ xMin: -2, xMax: 5, yMin: -1, yMax: 4 });
    expect(parsePlot('x: 3 .. 3').errors).toHaveLength(1);
    expect(parsePlot('x: -2pi .. 2π').view.xMax).toBeCloseTo(2 * Math.PI, 9);
    // Tham số không khai báo → mặc định 1
    expect(parsePlot('y = m x + k').params).toEqual({ m: 1, k: 1 });
    // Màu khác nhau cho từng đồ thị
    expect(new Set(p.items.slice(0, 4).map((i) => i.color)).size).toBe(4);
  });

  it('tiện ích trục', () => {
    // Đơn vị hai trục bằng nhau khi không ghi khung y
    expect(fitView({}, 0.5)).toEqual({ xMin: -6, xMax: 6, yMin: -3, yMax: 3 });
    expect(fitView({ xMin: 0, xMax: 10, yMin: -1 }, 0.4)).toEqual({ xMin: 0, xMax: 10, yMin: -1, yMax: 3 });
    expect(fitView({ yMin: -2, yMax: 9 }, 0.5)).toEqual({ xMin: -6, xMax: 6, yMin: -2, yMax: 9 });
    expect([formatCoord(1), formatCoord(0.5), formatCoord(-1 / 3), formatCoord(-0.001)]).toEqual(['1', '0,5', '−0,33', '0']);
    expect(splitTop('y = f(1; 2); x = 3')).toEqual(['y = f(1; 2)', 'x = 3']);
    expect(niceStep(12, 8)).toBe(2);
    expect(niceStep(1, 10)).toBe(0.1);
  });
});

describe('hui-plot / component', () => {
  async function mount(value, attrs = {}) {
    const el = document.createElement('hui-plot');
    el.style.width = '600px';
    el.value = value;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.append(el);
    await tick();
    return el;
  }

  it('vẽ lên canvas, sinh thanh trượt cho tham số, báo dòng lỗi', async () => {
    const el = await mount('y = a x + b\nb = -1\ny = x^2 + y');
    const canvas = el.shadowRoot.querySelector('canvas');
    expect(canvas.width).toBeGreaterThan(0);
    // Có nét vẽ (pixel khác trắng)
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) colored += 1;
    expect(colored).toBeGreaterThan(500);
    expect(canvas.getAttribute('aria-label')).toContain('y = a x + b');

    const inputs = el.shadowRoot.querySelectorAll('.sliders input');
    expect([...inputs].map((i) => i.dataset.name)).toEqual(['a', 'b']);
    expect(inputs[1].value).toBe('-1');
    const events = [];
    el.addEventListener('hui-param-change', (e) => events.push(e.detail));
    inputs[0].value = '3';
    inputs[0].dispatchEvent(new Event('input'));
    expect(events[0]).toMatchObject({ name: 'a', value: 3, params: { a: 3, b: -1 } });
    expect(el.shadowRoot.querySelector('output').textContent).toBe('= 3');

    // Đổi công thức: giữ giá trị thanh trượt đã kéo
    el.value = 'y = a x';
    await el.updateComplete;
    expect(el.params).toEqual({ a: 3 });
    expect(el.shadowRoot.querySelector('.errors').hidden).toBe(true);

    el.value = 'y = (x';
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.errors').hidden).toBe(false);
    expect(el.shadowRoot.querySelector('.errors').textContent).toContain('y = (x');

    // Không ghi khung y: trục y tính theo tỉ lệ khung (600 × 320) → 1 đơn vị x = 1 đơn vị y
    const v = el.view;
    expect(v.xMax - v.xMin).toBe(12);
    expect((v.yMax - v.yMin) / (v.xMax - v.xMin)).toBeCloseTo(320 / 600, 2);
  });

  it('phóng to / thu nhỏ / về khung ban đầu; locked thì không kéo được', async () => {
    const el = await mount('y = x', { 'x-min': '-10', 'x-max': '10', 'y-min': '-4', 'y-max': '4' });
    expect(el.view).toEqual({ xMin: -10, xMax: 10, yMin: -4, yMax: 4 });
    const views = [];
    el.addEventListener('hui-view-change', (e) => views.push(e.detail));
    const [zoomIn, , reset] = el.shadowRoot.querySelectorAll('.controls button');
    zoomIn.click();
    expect(el.view.xMax - el.view.xMin).toBeCloseTo(14, 9);
    // Kéo sang phải 60px (= 1/10 bề rộng) → khung dịch trái 1/10
    const canvas = el.shadowRoot.querySelector('canvas');
    const r = canvas.getBoundingClientRect();
    const before = el.view.xMin;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 100, clientY: r.top + 50, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + 100 + r.width / 10, clientY: r.top + 50, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    expect(el.view.xMin).toBeCloseTo(before - 1.4, 6);
    reset.click();
    expect(el.view).toEqual({ xMin: -10, xMax: 10, yMin: -4, yMax: 4 });
    expect(views.length).toBe(3);

    el.locked = true;
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.controls').hidden).toBe(true);
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: r.left + 10, clientY: r.top + 10 }));
    expect(el.view).toEqual({ xMin: -10, xMax: 10, yMin: -4, yMax: 4 });
  });
});
