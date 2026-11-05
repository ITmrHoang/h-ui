/**
 * Hợp đồng chung cho mọi overlay (quy ước đặt tên — .agents/rules/naming_rule.md):
 * - property `open` là boolean thật; gán `el.open = true / false` mở / đóng
 * - method show() / hide() / toggle(); không có method open()
 * - sự kiện hui-open → hui-after-open, hui-close → hui-after-close; detail luôn là object
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import '../src/index.js';

/** Dựng tối thiểu để overlay mở được (popover cần nội dung, tour cần bước, navbar cần khổ mobile…) */
const OVERLAYS = {
  'hui-modal': '<hui-modal title="Modal"><p>Nội dung</p></hui-modal>',
  'hui-drawer': '<hui-drawer title="Drawer"><p>Nội dung</p></hui-drawer>',
  'hui-cart-drawer': '<hui-cart-drawer></hui-cart-drawer>',
  'hui-command-palette': '<hui-command-palette></hui-command-palette>',
  'hui-lightbox': '<hui-lightbox></hui-lightbox>',
  'hui-cookie-consent': '<hui-cookie-consent storage-key="test-overlay-contract"></hui-cookie-consent>',
  'hui-popover': '<hui-popover content="Nội dung"><button>Mở</button></hui-popover>',
  'hui-tooltip': '<hui-tooltip content="Gợi ý"><button>Mở</button></hui-tooltip>',
  'hui-dropdown': '<hui-dropdown><button>Mở</button><div slot="menu">Menu</div></hui-dropdown>',
  'hui-dropdown-button': '<hui-dropdown-button>Thao tác<div slot="menu">Menu</div></hui-dropdown-button>',
  'hui-popconfirm': '<hui-popconfirm title="Chắc chưa?"><button>Xóa</button></hui-popconfirm>',
  'hui-hover-card': '<hui-hover-card><a href="#">Tên</a><div slot="content">Thẻ</div></hui-hover-card>',
  'hui-float-group': '<hui-float-group><hui-float-button icon="plus"></hui-float-button></hui-float-group>',
  'hui-color-picker': '<hui-color-picker></hui-color-picker>',
  'hui-date-picker': '<hui-date-picker></hui-date-picker>',
  'hui-range-picker': '<hui-range-picker></hui-range-picker>',
  'hui-time-picker': '<hui-time-picker></hui-time-picker>',
  'hui-search-overlay': '<hui-search-overlay></hui-search-overlay>',
  'hui-navbar': '<hui-navbar style="display: block; width: 400px"><a slot="nav" href="#">Trang</a></hui-navbar>',
  'hui-tour': '<hui-tour></hui-tour>',
};

const EVENTS = ['hui-open', 'hui-after-open', 'hui-close', 'hui-after-close'];

beforeAll(() => {
  // Hiệu ứng gần như tức thì để test nhanh (motion.js đọc --hui-motion-duration)
  const style = document.createElement('style');
  style.textContent = ':root { --hui-motion-duration: 1ms; }';
  document.head.append(style);
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.removeItem('test-overlay-contract');
});

async function mount(tag) {
  document.body.innerHTML = OVERLAYS[tag];
  const el = document.body.querySelector(tag);
  if (tag === 'hui-lightbox') el.items = ['data:image/gif;base64,R0lGODlhAQABAAAAACw='];
  if (tag === 'hui-tour') el.steps = [{ title: 'Bước 1' }];
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (tag === 'hui-cookie-consent') {
    // Chưa có lựa chọn → banner tự hiện; đưa về trạng thái đóng
    el.hide();
    await vi.waitFor(() => expect(el.open).toBe(false));
    await new Promise((r) => setTimeout(r, 50));
  }
  const log = [];
  for (const type of EVENTS) {
    el.addEventListener(type, (e) => {
      if (e.target === el) log.push({ type, detail: e.detail });
    });
  }
  return { el, log };
}

/** Chờ đủ 2 sự kiện (bắt đầu + xong) rồi trả về tên theo thứ tự */
async function transition(log, action, settled) {
  log.length = 0;
  action();
  await vi.waitFor(() => expect(log.map((e) => e.type)).toContain(settled), { timeout: 3000 });
  return log;
}

describe('Overlay lồng nhau', () => {
  it('tooltip / dropdown trong modal đóng → listener hui-close của modal không bị gọi (sự kiện không nổi bọt)', async () => {
    document.body.innerHTML = `
      <hui-modal title="Cha" open>
        <hui-tooltip content="Gợi ý"><button>?</button></hui-tooltip>
        <hui-dropdown><button>Menu</button><div slot="menu">Mục</div></hui-dropdown>
      </hui-modal>`;
    const modal = document.querySelector('hui-modal');
    const tooltip = modal.querySelector('hui-tooltip');
    const dropdown = modal.querySelector('hui-dropdown');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const onModalClose = vi.fn();
    modal.addEventListener('hui-close', onModalClose); // = Vue @hui-close="visible = false"
    const childClosed = vi.fn();
    tooltip.addEventListener('hui-after-close', childClosed);
    dropdown.addEventListener('hui-after-close', childClosed);

    tooltip.show();
    tooltip.hide();
    dropdown.show();
    dropdown.hide();
    await vi.waitFor(() => expect(childClosed).toHaveBeenCalledTimes(2));
    expect(onModalClose).not.toHaveBeenCalled();
    expect(modal.open).toBe(true);
  });
});

describe('Hợp đồng overlay', () => {
  for (const tag of Object.keys(OVERLAYS)) {
    it(`${tag}: open boolean, show() / hide() / toggle(), hui-open → hui-after-open → hui-close → hui-after-close`, async () => {
      const { el, log } = await mount(tag);
      expect(el.open).toBe(false);
      expect(typeof el.show).toBe('function');
      expect(typeof el.hide).toBe('function');
      expect(typeof el.toggle).toBe('function');

      let events = await transition(log, () => el.show(), 'hui-after-open');
      expect(events.map((e) => e.type)).toEqual(['hui-open', 'hui-after-open']);
      expect(el.open).toBe(true);
      for (const e of events) expect(e.detail).toBeTypeOf('object');

      events = await transition(log, () => el.hide(), 'hui-after-close');
      expect(events.map((e) => e.type)).toEqual(['hui-close', 'hui-after-close']);
      expect(el.open).toBe(false);

      await transition(log, () => el.toggle(), 'hui-after-open');
      expect(el.open).toBe(true);
      await transition(log, () => el.toggle(), 'hui-after-close');
      expect(el.open).toBe(false);

      // Gán property (Vue :open, React 19) cũng phát đủ sự kiện
      events = await transition(log, () => { el.open = true; }, 'hui-after-open');
      expect(events.map((e) => e.type)).toEqual(['hui-open', 'hui-after-open']);
      events = await transition(log, () => { el.open = false; }, 'hui-after-close');
      expect(events.map((e) => e.type)).toEqual(['hui-close', 'hui-after-close']);
    });
  }
});
