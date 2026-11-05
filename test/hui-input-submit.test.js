/**
 * hui-input — Enter gửi <form> bên ngoài như <input> native (implicit submission).
 * <input> thật nằm trong Shadow DOM nên trình duyệt không tự làm; hui-input làm hộ theo luật của HTML spec.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../src/components/hui-input/index.js';
import '../src/components/hui-button/index.js';

/** Dựng form từ HTML, ghi lại các lần submit (chặn điều hướng trang) */
function setup(inner) {
  document.body.innerHTML = `<form>${inner}</form>`;
  const form = document.querySelector('form');
  const submits = [];
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submits.push(e);
  });
  return { form, submits };
}

const pressEnter = async (huiInput) => {
  huiInput.focus();
  await userEvent.keyboard('{Enter}');
};
/** Enter được xử lý sau 1 tick (để listener bên ngoài kịp preventDefault) → chờ qua vài tick */
const settle = () => new Promise((r) => setTimeout(r, 30));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('hui-input — Enter gửi form (implicit submission)', () => {
  it('có hui-button type=submit → requestSubmit (chạy validate + phát submit)', async () => {
    const { submits } = setup('<hui-input name="q" value="abc"></hui-input><hui-button type="submit">Gửi</hui-button>');
    await pressEnter(document.querySelector('hui-input'));
    await vi.waitFor(() => expect(submits).toHaveLength(1));
    await settle();
    expect(submits).toHaveLength(1);
  });

  it('nút submit mặc định đang loading / disabled → không gửi', async () => {
    const { submits } = setup('<hui-input name="q"></hui-input><hui-button type="submit" loading>Gửi</hui-button>');
    const input = document.querySelector('hui-input');
    const button = document.querySelector('hui-button');
    await pressEnter(input);
    await settle();
    expect(submits).toHaveLength(0);

    button.loading = false;
    button.disabled = true;
    await pressEnter(input);
    await settle();
    expect(submits).toHaveLength(0);

    button.disabled = false;
    await pressEnter(input);
    await vi.waitFor(() => expect(submits).toHaveLength(1));
  });

  it('nút submit native → click() nút đó (submitter + @click như trình duyệt)', async () => {
    const { submits } = setup('<hui-input name="q"></hui-input><button type="submit" name="act" value="save">Lưu</button>');
    const button = document.querySelector('button');
    const onClick = vi.fn();
    button.addEventListener('click', onClick);
    await pressEnter(document.querySelector('hui-input'));
    await vi.waitFor(() => expect(submits).toHaveLength(1));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(submits[0].submitter).toBe(button);
  });

  it('không có nút submit: 1 ô nhập → gửi; từ 2 ô nhập trở lên → không gửi (giống trình duyệt)', async () => {
    let { submits } = setup('<hui-input name="a"></hui-input>');
    await pressEnter(document.querySelector('hui-input'));
    await vi.waitFor(() => expect(submits).toHaveLength(1));

    ({ submits } = setup('<hui-input name="a"></hui-input><hui-input name="b"></hui-input>'));
    await pressEnter(document.querySelector('hui-input'));
    await settle();
    expect(submits).toHaveLength(0);

    ({ submits } = setup('<hui-input name="a"></hui-input><input name="b">'));
    await pressEnter(document.querySelector('hui-input'));
    await settle();
    expect(submits).toHaveLength(0);
  });

  it('form không hợp lệ → requestSubmit chặn submit (validate như bấm nút)', async () => {
    const { submits } = setup('<hui-input name="q" required></hui-input><hui-button type="submit">Gửi</hui-button>');
    await pressEnter(document.querySelector('hui-input'));
    await settle();
    expect(submits).toHaveLength(0);
  });

  it('bỏ qua: đang gõ IME, kèm phím bổ trợ, keydown bị preventDefault, phím khác Enter', async () => {
    const { submits } = setup('<hui-input name="q"></hui-input><hui-button type="submit">Gửi</hui-button>');
    const host = document.querySelector('hui-input');
    const inner = host.shadowRoot.querySelector('input');
    const fire = (init) => inner.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, composed: true, cancelable: true, ...init,
    }));

    fire({ isComposing: true }); // Enter chốt chữ của bộ gõ
    fire({ keyCode: 229 }); // Safari: keydown sau compositionend
    fire({ shiftKey: true });
    fire({ ctrlKey: true });
    fire({ key: 'a' });
    host.addEventListener('keydown', (e) => e.preventDefault(), { once: true });
    fire({});
    await settle();
    expect(submits).toHaveLength(0);

    fire({});
    await vi.waitFor(() => expect(submits).toHaveLength(1));
  });

  it('không nằm trong form → không làm gì; form="id" vẫn tìm đúng form', async () => {
    document.body.innerHTML = '<hui-input name="q"></hui-input>';
    await pressEnter(document.querySelector('hui-input'));
    await settle();

    document.body.innerHTML = '<form id="f"></form><hui-input name="q" form="f"></hui-input>';
    const submits = [];
    document.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      submits.push(e);
    });
    await pressEnter(document.querySelector('hui-input'));
    await vi.waitFor(() => expect(submits).toHaveLength(1));
  });
});
