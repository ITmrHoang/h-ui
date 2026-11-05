/**
 * Quét MỌI component đã đăng ký: không property nào được trùng tên method trên chuỗi prototype
 * (của chính component, lớp cha, hay method có sẵn của HTMLElement như click / remove).
 * Trùng tên → `el.open = true` (Vue :open, React 19) ghi đè mất method, hoặc method che mất property.
 * Quy ước overlay: property `open` (boolean) + method show() / hide() / toggle().
 */
import { describe, it, expect, vi } from 'vitest';
import { HuiElement } from '../src/core/hui-element.js';

/** tag → constructor, ghi lại trước khi nạp component */
const defined = new Map();
const nativeDefine = customElements.define.bind(customElements);
customElements.define = (tag, ctor, options) => {
  defined.set(tag, ctor);
  return nativeDefine(tag, ctor, options);
};

const modules = import.meta.glob(['../src/components/**/*.js', '!../src/components/**/*.stories.js']);

describe('Đặt tên property / method', () => {
  it('không component nào có property trùng tên method', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await Promise.all(Object.values(modules).map((load) => load()));
    warn.mockRestore();

    const hui = [...defined].filter(([, ctor]) => ctor.prototype instanceof HuiElement);
    expect(hui.length).toBeGreaterThan(150);

    const conflicts = hui
      .map(([tag, ctor]) => [tag, ctor._methodConflicts()])
      .filter(([, names]) => names.length)
      .map(([tag, names]) => `${tag}: ${names.join(', ')}`);
    expect(conflicts).toEqual([]);
  });
});
