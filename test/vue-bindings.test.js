/**
 * Vue 3.5 render thật lên component H-UI — các vấn đề gặp khi tích hợp vào app Vue:
 * - `:open` gán property `el.open` (vì 'open' in el) → trước đây ghi đè method open(), modal không mở; nay modal chỉ có show() / hide() / toggle()
 * - Boolean nhiều từ: `:confirm-loading="false"` (kebab-case, không có trong el) thành attribute "false" = true
 *   theo chuẩn HTML (giữ nguyên, xem README) → viết camelCase `:confirmLoading` để Vue gán property
 * - Enter trong <hui-input> (ô nhập nằm trong Shadow DOM) → từng không gửi <form> bên ngoài
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createApp, h, ref, nextTick } from 'vue';
import '../src/components/hui-modal/index.js';
import '../src/components/hui-input/index.js';
import '../src/components/hui-button/index.js';
import '../src/components/hui-command-palette/index.js';

let app = null;

/** Mount render function vào trang (h('hui-x') là thẻ thường với Vue, không cần isCustomElement) */
function mount(render) {
  const host = document.createElement('div');
  document.body.append(host);
  app = createApp({ render });
  app.mount(host);
  return host;
}

afterEach(() => {
  app?.unmount();
  app = null;
  document.body.innerHTML = '';
});

describe('Vue — hui-modal :open', () => {
  it(':open + @hui-close: mở / đóng theo state; người dùng bấm Hủy → state về false, mở lại được', async () => {
    const visible = ref(false);
    const host = mount(() => h('hui-modal', {
      title: 'Vue',
      open: visible.value,
      onHuiClose: () => { visible.value = false; }, // = @hui-close trong template
    }, [h('p', 'Nội dung')]));
    const modal = host.querySelector('hui-modal');
    const dialog = modal.shadowRoot.querySelector('dialog');
    expect(modal.open).toBe(false);

    visible.value = true;
    await nextTick();
    await modal.updateComplete;
    expect(modal.open).toBe(true); // property là boolean thật
    expect(dialog.open).toBe(true);

    // Người dùng bấm Hủy → modal tự đóng, phát hui-close → state đồng bộ về false
    modal.shadowRoot.querySelector('[part="cancel-button"]').shadowRoot.querySelector('button').click();
    await modal.updateComplete;
    await nextTick();
    expect(visible.value).toBe(false);
    expect(modal.open).toBe(false);
    await vi.waitFor(() => expect(dialog.open).toBe(false), { timeout: 2000 });

    visible.value = true; // state đã về false nên mở lại được
    await nextTick();
    await modal.updateComplete;
    expect(dialog.open).toBe(true);
    visible.value = false;
    await nextTick();
    await vi.waitFor(() => expect(dialog.open).toBe(false), { timeout: 2000 });
  });

  it('show() / hide() / toggle() đổi property open; không còn method open()', async () => {
    const host = mount(() => h('hui-modal', { title: 'API' }));
    const modal = host.querySelector('hui-modal');
    modal.show();
    expect(modal.open).toBe(true);
    modal.hide();
    expect(modal.open).toBe(false);
    modal.toggle();
    expect(modal.open).toBe(true);
    modal.close(); // tên khác của hide()
    expect(modal.open).toBe(false);
    expect(modal.isOpen).toBe(false); // getter cũ vẫn đọc được
    expect(typeof modal.open).toBe('boolean');
  });

  it('hui-command-palette :open mở / đóng, property open là boolean', async () => {
    const open = ref(false);
    const host = mount(() => h('hui-command-palette', { open: open.value }));
    const palette = host.querySelector('hui-command-palette');
    open.value = true;
    await nextTick();
    expect(palette.open).toBe(true);
    open.value = false;
    await nextTick();
    expect(palette.open).toBe(false);
    palette.show();
    expect(palette.open).toBe(true);
    palette.hide();
    expect(palette.open).toBe(false);
  });
});

describe('Vue — boolean nhiều từ (hướng dẫn trong README)', () => {
  it('camelCase :confirmLoading gán property → true / false đổi qua lại đúng', async () => {
    const loading = ref(false);
    const host = mount(() => h('hui-modal', { title: 'Lưu', confirmLoading: loading.value }));
    const modal = host.querySelector('hui-modal');
    const ok = modal.shadowRoot.querySelector('[part="ok-button"]');
    await modal.updateComplete;
    expect(modal.confirmLoading).toBe(false);
    expect(ok.loading).toBe(false);

    loading.value = true;
    await nextTick();
    await modal.updateComplete;
    expect(modal.confirmLoading).toBe(true);
    expect(ok.loading).toBe(true);

    loading.value = false;
    await nextTick();
    await modal.updateComplete;
    expect(modal.confirmLoading).toBe(false);
    expect(modal.hasAttribute('confirm-loading')).toBe(false);
    expect(ok.loading).toBe(false);
  });

  it('kebab-case :confirm-loading="false" thành attribute "false" — chuẩn HTML: có mặt là true (README ghi rõ)', async () => {
    const host = mount(() => h('hui-modal', { title: 'Lưu', 'confirm-loading': false }));
    const modal = host.querySelector('hui-modal');
    expect(modal.getAttribute('confirm-loading')).toBe('false');
    expect(modal.confirmLoading).toBe(true);
  });
});

describe('Vue — Enter trong hui-input gửi form', () => {
  it('<form @submit.prevent> + hui-input + hui-button type=submit: Enter gửi đúng 1 lần', async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    const host = mount(() => h('form', { onSubmit }, [
      h('hui-input', { name: 'email', value: 'a@b.c' }),
      h('hui-button', { type: 'submit' }, 'Gửi'),
    ]));
    host.querySelector('hui-input').focus();
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(new FormData(onSubmit.mock.calls[0][0].target).get('email')).toBe('a@b.c');
    await new Promise((r) => setTimeout(r, 30));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('@keydown.enter.prevent trên hui-input chặn được việc gửi form', async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    const host = mount(() => h('form', { onSubmit }, [
      h('hui-input', { name: 'q', onKeydown: (e) => e.key === 'Enter' && e.preventDefault() }),
      h('hui-button', { type: 'submit' }, 'Gửi'),
    ]));
    host.querySelector('hui-input').focus();
    await userEvent.keyboard('{Enter}');
    await new Promise((r) => setTimeout(r, 30));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
