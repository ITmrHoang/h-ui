import { describe, it, expect, afterEach } from 'vitest';
import '../src/components/hui-slides/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const tick = () => new Promise((r) => setTimeout(r, 0));

async function mount(count = 3, attrs = {}) {
  const el = document.createElement('hui-slides');
  el.style.width = '640px';
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (let i = 0; i < count; i += 1) {
    const s = document.createElement('section');
    s.textContent = `Slide ${i + 1}`;
    s.style.display = 'flex'; // CSS của trang không làm hiện slide đang ẩn
    el.append(s);
  }
  document.body.append(el);
  await tick();
  return el;
}

const visible = (el) => [...el.children].filter((c) => getComputedStyle(c).display !== 'none').map((c) => c.textContent);
const counter = (el) => el.shadowRoot.querySelector('.counter').textContent;
const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('hui-slides', () => {
  it('chỉ hiện slide đang xem; nút / phím chuyển slide, phát sự kiện', async () => {
    const el = await mount(3);
    expect(visible(el)).toEqual(['Slide 1']);
    expect(counter(el)).toBe('1 / 3');
    expect(el.total).toBe(3);
    const events = [];
    el.addEventListener('hui-slide-change', (e) => events.push(e.detail));
    el.shadowRoot.querySelectorAll('.controls .btn')[1].click();
    expect(el.index).toBe(1);
    expect(visible(el)).toEqual(['Slide 2']);
    key(el, 'ArrowRight');
    expect(el.index).toBe(2);
    expect(el.shadowRoot.querySelectorAll('.controls .btn')[1].disabled).toBe(true);
    key(el, ' '); // đang ở slide cuối: không đổi
    key(el, 'Home');
    expect(el.index).toBe(0);
    key(el, 'End');
    expect(events).toEqual([
      { index: 1, total: 3 },
      { index: 2, total: 3 },
      { index: 0, total: 3 },
      { index: 2, total: 3 },
    ]);
    // Gán index từ ngoài (học sinh xem theo giáo viên): không phát sự kiện, vượt quá thì kẹp lại
    el.index = 9;
    await el.updateComplete;
    await el.updateComplete;
    expect(el.index).toBe(2);
    expect(counter(el)).toBe('3 / 3');
  });

  it('vuốt trái / phải; readonly bỏ qua phím và vuốt', async () => {
    const el = await mount(3);
    const vp = el.shadowRoot.querySelector('.viewport');
    const r = vp.getBoundingClientRect();
    const swipe = (dx) => {
      vp.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 300, clientY: r.top + 50, bubbles: true }));
      vp.dispatchEvent(new PointerEvent('pointerup', { clientX: r.left + 300 + dx, clientY: r.top + 55, bubbles: true }));
    };
    swipe(-120);
    expect(el.index).toBe(1);
    swipe(120);
    expect(el.index).toBe(0);
    swipe(-20); // quá ngắn
    expect(el.index).toBe(0);
    el.readonly = true;
    await el.updateComplete;
    key(el, 'ArrowRight');
    swipe(-120);
    expect(el.index).toBe(0);
  });

  it('khung 1280 × 720 co theo bề rộng; xem lưới rồi bấm chọn slide', async () => {
    const el = await mount(4);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const stage = el.shadowRoot.querySelector('.stage');
    const vp = el.shadowRoot.querySelector('.viewport');
    expect(Number(stage.style.transform.match(/scale\((.+)\)/)[1])).toBeCloseTo(vp.clientWidth / 1280, 5);
    key(el, 'g');
    await el.updateComplete;
    expect(el.overview).toBe(true);
    expect(visible(el)).toHaveLength(4);
    el.children[2].click();
    await el.updateComplete;
    expect(el.overview).toBe(false);
    expect(el.index).toBe(2);
    expect(visible(el)).toEqual(['Slide 3']);
  });

  it('thêm / bớt slide thì số trang cập nhật; không có slide thì báo trống', async () => {
    const el = await mount(0, { 'no-controls': '' });
    expect(el.shadowRoot.querySelector('.controls').hidden).toBe(true);
    expect(el.shadowRoot.querySelector('.empty').hidden).toBe(false);
    const s = document.createElement('section');
    s.textContent = 'Mới';
    el.append(s);
    await tick();
    expect(counter(el)).toBe('1 / 1');
    expect(el.shadowRoot.querySelector('.empty').hidden).toBe(true);
  });

  it('nằm trong grid hẹp: khung 1280px không làm tràn trang', async () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:grid;place-items:center;width:400px';
    const el = document.createElement('hui-slides');
    el.style.width = 'min(100%, 2000px)';
    el.append(Object.assign(document.createElement('section'), { textContent: 'A' }));
    wrap.append(el);
    document.body.append(wrap);
    await tick();
    expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(400);
    expect(wrap.scrollWidth).toBeLessThanOrEqual(400);
  });
});
