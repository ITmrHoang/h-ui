/**
 * Storybook Stories — HUI Math
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const mathOf = (el) => el.shadowRoot.querySelector('math');

export default {
  title: 'Atoms/HuiMath',
  component: 'hui-math',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Math** — Hiển thị công thức LaTeX bằng **MathML gốc của trình duyệt** (không cần KaTeX / MathJax).
Phủ ký hiệu Toán THCS / THPT: phân số, căn, mũ / chỉ số, hệ phương trình (\`cases\`), ma trận, vector, tích phân,
giới hạn, tổng, chữ Hy Lạp, tập số (\`\\mathbb{R}\`). Lệnh chưa hỗ trợ hiện nguyên văn màu đỏ.

\`\`\`html
<hui-math value="x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}"></hui-math>
<hui-math display>\\int_0^1 x^2 \\, dx = \\frac{1}{3}</hui-math>
\`\`\`

Hàm thuần: \`latexToMathML(tex, { display })\` trả về phần tử \`<math>\` (dùng trong \`hui-markdown\`).

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | string | — | Công thức LaTeX (không gồm \`$\`); bỏ trống → lấy chữ bên trong thẻ |
| \`display\` | boolean | \`false\` | Dạng khối: căn giữa, phân số / cận to |

### CSS Parts / Custom Properties
| Tên | Mô tả |
|-----|-------|
| \`::part(base)\` | Khung chứa \`<math>\` |
| \`--hui-math-font-size\` | Cỡ chữ (mặc định 1.05em) |
| \`--hui-math-color\` | Màu công thức |
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    display: { control: 'boolean' },
  },
};

export const Default = {
  args: { value: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', display: false },
  render: (args) => html`<p>Nghiệm: <hui-math .value=${args.value} ?display=${args.display}></hui-math></p>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-math');
    await waitFor(() => expect(mathOf(el)).toBeTruthy());
    await expect(mathOf(el).querySelector('mfrac')).toBeTruthy();
    await expect(mathOf(el).querySelector('msqrt')).toBeTruthy();
    await expect(mathOf(el).getAttribute('display')).toBe('inline');
  },
};

/** Công thức dạng khối: tích phân, giới hạn, tổng */
export const Display = {
  render: () => html`
    <hui-math display>\\int_0^1 x^2 \\, dx = \\frac{1}{3}</hui-math>
    <hui-math display>\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1</hui-math>
    <hui-math display>\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}</hui-math>
  `,
  play: async ({ canvasElement }) => {
    const [, lim, sum] = canvasElement.querySelectorAll('hui-math');
    await waitFor(() => expect(mathOf(lim)?.querySelector('munder')).toBeTruthy());
    await expect(mathOf(sum).querySelector('munderover')).toBeTruthy();
  },
};

/** Hệ phương trình, ma trận, vector, tập số */
export const Structures = {
  render: () => html`
    <div style="display: grid; gap: 12px;">
      <hui-math display>\\begin{cases} x + y = 3 \\\\ 2x - y = 0 \\end{cases}</hui-math>
      <hui-math display>A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}</hui-math>
      <hui-math>\\overrightarrow{AB} + \\overrightarrow{BC} = \\overrightarrow{AC}</hui-math>
      <hui-math>x \\in \\mathbb{R}, \\; \\widehat{ABC} = 90^\\circ, \\; \\alpha + \\beta = \\pi</hui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [cases, matrix, vec, sets] = canvasElement.querySelectorAll('hui-math');
    await waitFor(() => expect(mathOf(cases)?.querySelectorAll('mtr').length).toBe(2));
    await expect(mathOf(matrix).querySelectorAll('mtd').length).toBe(4);
    await expect(mathOf(vec).querySelectorAll('mover').length).toBe(3);
    await expect(mathOf(sets).textContent).toContain('ℝ');
  },
};

/** Lệnh chưa hỗ trợ hiện nguyên văn màu đỏ, phần còn lại vẫn hiển thị */
export const Unsupported = {
  render: () => html`<hui-math value="a + \\foo{b} = c"></hui-math>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-math');
    await waitFor(() => expect(mathOf(el)?.querySelector('mtext[mathcolor]')?.textContent).toBe('\\foo'));
  },
};
