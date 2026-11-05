/**
 * Storybook Stories — HUI Markdown
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const base = (el) => el.shadowRoot.querySelector('.md');

const LESSON = `# Căn bậc hai

Với $a \\ge 0$, **căn bậc hai số học** của $a$ là số $x \\ge 0$ sao cho $x^2 = a$.

$$\\sqrt{a^2} = |a|$$

1. $\\sqrt{16} = 4$
2. $\\sqrt{0{,}25} = 0{,}5$

> Lưu ý: số âm không có căn bậc hai.

| $x$ | 1 | 4 | 9 |
|:---:|:-:|:-:|:-:|
| $\\sqrt{x}$ | 1 | 2 | 3 |`;

export default {
  title: 'Molecules/HuiMarkdown',
  component: 'hui-markdown',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Markdown** — Hiển thị nội dung bài học / câu hỏi: Markdown rút gọn + công thức \`$…$\` / \`$$…$$\` (vẽ bằng MathML
qua \`hui-math\`) + ảnh + bảng. **An toàn**: dựng DOM bằng \`createElement\` + \`textContent\`, HTML trong nội dung hiện như chữ;
link chỉ nhận http(s) / mailto / đường dẫn tương đối.

Hỗ trợ: tiêu đề \`#\`, đoạn văn (xuống dòng đơn giữ nguyên), **đậm**, *nghiêng*, ~~gạch~~, \`code\`, link, ảnh,
danh sách (lồng nhau), trích dẫn, khối code, đường kẻ, bảng (căn lề \`:---:\`), \`\\$\` = dấu $.

\`\`\`html
<hui-markdown value="**Ví dụ**: $\\sqrt{16} = 4$"></hui-markdown>
<hui-markdown inline value="Phương án $x = \\frac{1}{2}$"></hui-markdown>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | string | — | Nội dung Markdown; bỏ trống → lấy chữ bên trong thẻ |
| \`inline\` | boolean | \`false\` | Chỉ xử lý trong dòng (không tạo đoạn văn) — dùng cho phương án trả lời |
| \`no-breaks\` | boolean | \`false\` | Xuống dòng đơn không thành \`<br>\` |

### CSS Parts / Custom Properties
| Tên | Mô tả |
|-----|-------|
| \`::part(base)\` | Khung nội dung |
| \`--hui-markdown-font-size\`, \`--hui-markdown-line-height\` | Cỡ chữ, giãn dòng |
| \`--hui-markdown-code-bg\`, \`--hui-markdown-border-color\` | Nền code, viền bảng / trích dẫn |
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    inline: { control: 'boolean' },
  },
};

export const Default = {
  args: { value: LESSON, inline: false },
  render: (args) => html`<hui-markdown .value=${args.value} ?inline=${args.inline} style="max-width: 640px;"></hui-markdown>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-markdown');
    await waitFor(() => expect(base(el)?.querySelector('h1')?.textContent).toBe('Căn bậc hai'));
    await expect(base(el).querySelectorAll('math').length).toBeGreaterThan(5);
    await expect(base(el).querySelector('math[display="block"]')).toBeTruthy();
    await expect(base(el).querySelectorAll('ol > li').length).toBe(2);
    await expect(base(el).querySelector('blockquote')).toBeTruthy();
    await expect(base(el).querySelectorAll('tbody td').length).toBe(4);
  },
};

/** Phương án trả lời: inline, không tạo đoạn văn */
export const Inline = {
  render: () => html`<label><input type="radio" /> A. <hui-markdown inline value="$x = \\frac{1}{2}$ hoặc **x = 2**"></hui-markdown></label>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-markdown');
    await waitFor(() => expect(base(el)?.querySelector('mfrac')).toBeTruthy());
    await expect(base(el).querySelector('p')).toBeNull();
    await expect(base(el).querySelector('strong').textContent).toBe('x = 2');
  },
};

/** HTML trong nội dung hiện như chữ; link javascript: bị bỏ */
export const Safe = {
  render: () => html`<hui-markdown value="<img src=x onerror=alert(1)> [bấm](javascript:alert(1)) [web](https://example.com)"></hui-markdown>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-markdown');
    await waitFor(() => expect(base(el)?.textContent).toContain('<img src=x onerror=alert(1)>'));
    await expect(base(el).querySelector('img')).toBeNull();
    const links = base(el).querySelectorAll('a');
    await expect(links.length).toBe(1);
    await expect(links[0].getAttribute('href')).toBe('https://example.com');
  },
};
