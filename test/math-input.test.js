import { describe, it, expect, afterEach } from 'vitest';
import '../src/components/hui-math-input/index.js';
import { KEY_GROUPS, caretOffset, insertKey } from '../src/components/hui-math-input/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('hui-math-input', () => {
  it('chèn mẫu: con trỏ vào ô trống đầu tiên; đang chọn chữ thì bọc vào ô', () => {
    const frac = KEY_GROUPS.structures[0];
    expect(caretOffset(frac)).toBe(6);
    expect(insertKey('x = ', 4, 4, frac)).toEqual({ value: 'x = \\frac{}{}', caret: 10 });
    // Chọn "a+b" rồi bấm phân số → \frac{a+b}{} và con trỏ vào mẫu số
    expect(insertKey('a+b', 0, 3, frac)).toEqual({ value: '\\frac{a+b}{}', caret: 11 });
    const sqrt = KEY_GROUPS.structures.find((k) => k.tex === '\\sqrt{}');
    expect(insertKey('x+1', 0, 3, sqrt)).toEqual({ value: '\\sqrt{x+1}', caret: 10 });
    const pi = KEY_GROUPS.symbols.find((k) => k.label === 'π');
    expect(insertKey('2', 1, 1, pi)).toEqual({ value: '2\\pi ', caret: 5 });
    const lim = KEY_GROUPS.functions.find((k) => k.label === 'lim');
    expect(insertKey('', 0, 0, lim).caret).toBe(13);
  });

  it('bấm phím chèn vào ô, phát input / change, xem trước bằng MathML; Ctrl + Enter phát hui-submit', async () => {
    const el = document.createElement('hui-math-input');
    el.setAttribute('label', 'Đáp số');
    document.body.append(el);
    await tick();
    const events = [];
    el.addEventListener('input', (e) => events.push(['input', e.detail.value]));
    el.addEventListener('change', (e) => events.push(['change', e.detail.value]));
    el.addEventListener('hui-submit', (e) => events.push(['submit', e.detail.value]));
    const field = el.shadowRoot.querySelector('textarea');
    field.value = 'x';
    field.setSelectionRange(1, 1);
    const keys = el.shadowRoot.querySelectorAll('.key');
    expect(keys.length).toBe(KEY_GROUPS.structures.length + KEY_GROUPS.symbols.length + KEY_GROUPS.functions.length);
    [...keys].find((k) => k.textContent === 'x²').click();
    expect(el.value).toBe('x^{2}');
    expect(events).toEqual([
      ['input', 'x^{2}'],
      ['change', 'x^{2}'],
    ]);
    expect(el.shadowRoot.querySelector('.preview math')).not.toBeNull();
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    expect(events.at(-1)).toEqual(['submit', 'x^{2}']);
    expect(el.shadowRoot.querySelector('label').textContent).toBe('Đáp số');
  });

  it('chỉ một số nhóm phím, ẩn bàn phím / xem trước, vô hiệu hóa', async () => {
    const el = document.createElement('hui-math-input');
    el.setAttribute('keys', 'symbols');
    el.setAttribute('value', '\\pi');
    document.body.append(el);
    await tick();
    expect(el.shadowRoot.querySelectorAll('.key').length).toBe(KEY_GROUPS.symbols.length);
    expect(el.shadowRoot.querySelector('.preview').hidden).toBe(false);
    el.noPreview = true;
    el.noKeyboard = true;
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.preview').hidden).toBe(true);
    expect(el.shadowRoot.querySelector('.keyboard').hidden).toBe(true);
    el.disabled = true;
    await el.updateComplete;
    el.insert('\\alpha');
    expect(el.value).toBe('\\pi');
    expect(el.shadowRoot.querySelector('textarea').disabled).toBe(true);
  });
});
