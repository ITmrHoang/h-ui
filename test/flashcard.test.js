import { describe, it, expect, afterEach } from 'vitest';
import '../src/components/hui-flashcard/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const tick = () => new Promise((r) => setTimeout(r, 0));

async function mount(props = {}, attrs = {}) {
  const el = document.createElement('hui-flashcard');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  Object.assign(el, props);
  document.body.append(el);
  await tick();
  return el;
}

const key = (target, k) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }));

describe('hui-flashcard', () => {
  it('hiển thị Markdown + công thức ở hai mặt, lật bằng click', async () => {
    const el = await mount({ front: 'Tính $2^3$', back: '**8**' });
    const root = el.shadowRoot;
    await tick();
    expect(root.querySelector('.face--front hui-markdown').value).toBe('Tính $2^3$');
    expect(root.querySelector('.face--back hui-markdown').value).toBe('**8**');
    expect(root.querySelector('.face--back').getAttribute('aria-hidden')).toBe('true');
    const flips = [];
    el.addEventListener('hui-flip', (e) => flips.push(e.detail.flipped));
    root.querySelector('.card').click();
    await tick();
    expect(el.flipped).toBe(true);
    expect(el.hasAttribute('flipped')).toBe(true);
    expect(root.querySelector('.face--front').getAttribute('aria-hidden')).toBe('true');
    expect(flips).toEqual([true]);
  });

  it('chỉ chấm được sau khi lật: nút và phím 1–4, kèm gợi ý', async () => {
    const el = await mount({ front: 'A', back: 'B', intervals: ['10 phút', '1 ngày', '3 ngày', '4 ngày'] });
    const root = el.shadowRoot;
    const rates = [];
    el.addEventListener('hui-rate', (e) => rates.push(e.detail.rating));
    expect(root.querySelector('.ratings').hidden).toBe(true);
    key(root.querySelector('.card'), '1');
    expect(rates).toEqual([]);
    key(root.querySelector('.card'), ' ');
    await tick();
    expect(el.flipped).toBe(true);
    expect(root.querySelector('.ratings').hidden).toBe(false);
    expect([...root.querySelectorAll('.rate-hint')].map((h) => h.textContent)).toEqual(['10 phút', '1 ngày', '3 ngày', '4 ngày']);
    root.querySelector('.rate--hard').click();
    key(root.querySelector('.card'), '1');
    key(root.querySelector('.card'), '4');
    expect(rates).toEqual(['hard', 'again', 'easy']);
  });

  it('no-rating và disabled; reset() về mặt trước không phát sự kiện', async () => {
    const el = await mount({ front: 'A', back: 'B' }, { 'no-rating': '' });
    const root = el.shadowRoot;
    const events = [];
    el.addEventListener('hui-flip', () => events.push('flip'));
    el.addEventListener('hui-rate', () => events.push('rate'));
    el.flip();
    await tick();
    expect(root.querySelector('.ratings').hidden).toBe(true);
    key(root.querySelector('.card'), '2');
    el.reset();
    expect(root.querySelector('.inner').classList.contains('inner--instant')).toBe(true);
    expect(root.querySelector('.card').classList.contains('card--flipped')).toBe(false);
    await tick();
    expect(el.flipped).toBe(false);
    el.noRating = false;
    el.disabled = true;
    await tick();
    root.querySelector('.card').click();
    expect(el.flipped).toBe(false);
    expect(events).toEqual(['flip']);
    el.disabled = false;
    el.flip(true);
    el.flip(true);
    await tick();
    expect(events).toEqual(['flip', 'flip']);
  });
});
