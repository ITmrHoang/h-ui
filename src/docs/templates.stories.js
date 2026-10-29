/**
 * Templates — nhúng các trang mẫu trong examples/ (dashboard, admin, landing…) vào Storybook.
 *
 * Trang mẫu là HTML riêng (không phải story) nên được nhúng bằng <iframe>:
 * - Bản deploy (GitHub Pages): Storybook ở /h-ui/, trang mẫu build vào /h-ui/examples/ → đường dẫn tương đối `examples/…`.
 * - `npm run storybook` (dev): trang mẫu không nằm trong Storybook → mở bản trên GitHub Pages
 *   (muốn xem code đang sửa: `npm run dev` rồi vào http://localhost:5173/examples/…).
 */

import { html } from 'lit';
import { expect } from 'storybook/test';

const PAGES_BASE = 'https://itmrhoang.github.io/h-ui/examples/';

const TEMPLATES = [
  ['Dashboard', 'dashboard', 'Tổng quan KPI, biểu đồ, bảng — dashboard quản trị'],
  ['Admin', 'admin', 'Layout quản trị: sider thu gọn, menu, data-view, form'],
  ['Table', 'table', 'Quản lý nhân sự: hui-table chế độ server, lọc, chọn dòng, transfer trong modal'],
  ['Kanban', 'kanban', 'Bảng Kanban: kéo thả, sửa tại chỗ, command palette (Ctrl+K)'],
  ['Landing', 'landing', 'Landing page: hero, tính năng, bảng giá, nhận xét, FAQ, CTA'],
  ['Ecommerce', 'ecommerce', 'Trang sản phẩm: gallery, zoom, chọn biến thể, giỏ hàng, đánh giá'],
  ['Catalog', 'catalog', 'Danh mục sản phẩm: lưới card, lọc, sắp xếp, phân trang'],
  ['Blog', 'blog', 'Bài viết: prose, mục lục, code block, chia sẻ, bình luận'],
  ['Story', 'story', 'Trang giới thiệu cuộn từng bước (scrollytelling)'],
  ['Auth', 'auth', 'Đăng nhập / đăng ký'],
];

/** Dev server Storybook không phục vụ examples/ → dùng bản deploy; bản build thì dùng đường dẫn tương đối */
const isStorybookDev = () => location.port === '6006';
const pageUrl = (file) => (isStorybookDev() ? `${PAGES_BASE}${file}.html` : `examples/${file}.html`);

export default {
  title: 'Templates',
  id: 'templates',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `Các **trang mẫu hoàn chỉnh** dựng bằng H-UI (mã nguồn trong thư mục \`examples/\`).
Mỗi story nhúng một trang qua iframe; bấm **Mở toàn trang** để xem riêng (dùng được nút đổi theme sáng/tối trên trang).

| Trang | Nội dung |
|---|---|
${TEMPLATES.map(([name, file, desc]) => `| [${name}](${PAGES_BASE}${file}.html) | ${desc} |`).join('\n')}

Chạy cục bộ: \`npm run dev\` → http://localhost:5173/examples/index.html`,
      },
    },
  },
};

const frame = (name, file, desc) => html`
  <div style="display:flex;flex-direction:column;height:100vh;background:var(--hui-bg, #fff)">
    <div style="display:flex;align-items:center;gap:12px;padding:8px 16px;border-bottom:1px solid var(--hui-border, #ddd);font:14px var(--hui-font-family, sans-serif);color:var(--hui-text, #111)">
      <strong>${name}</strong>
      <span style="color:var(--hui-text-secondary, #555);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${desc}</span>
      <a data-open href=${pageUrl(file)} target="_blank" rel="noopener" style="color:var(--hui-primary, #0864ad);white-space:nowrap">Mở toàn trang ↗</a>
    </div>
    <iframe title=${`Trang mẫu ${name}`} src=${pageUrl(file)} loading="lazy" style="flex:1;width:100%;border:0"></iframe>
  </div>
`;

const make = ([name, file, desc]) => ({
  name,
  render: () => frame(name, file, desc),
  play: async ({ canvasElement }) => {
    const iframe = canvasElement.querySelector('iframe');
    await expect(iframe).toBeTruthy();
    await expect(iframe.getAttribute('src')).toContain(`${file}.html`);
    await expect(canvasElement.querySelector('[data-open]').getAttribute('href')).toBe(iframe.getAttribute('src'));
  },
});

export const Dashboard = make(TEMPLATES[0]);
export const Admin = make(TEMPLATES[1]);
export const Table = make(TEMPLATES[2]);
export const Kanban = make(TEMPLATES[3]);
export const Landing = make(TEMPLATES[4]);
export const Ecommerce = make(TEMPLATES[5]);
export const Catalog = make(TEMPLATES[6]);
export const Blog = make(TEMPLATES[7]);
export const Story = make(TEMPLATES[8]);
export const Auth = make(TEMPLATES[9]);
