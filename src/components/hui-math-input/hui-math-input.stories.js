/**
 * Storybook Stories — HUI Math Input
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Molecules/HuiMathInput',
  component: 'hui-math-input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Math Input** — Ô gõ công thức LaTeX có **bàn phím ký hiệu Toán** (phân số, căn, mũ, chỉ số, ngoặc co giãn,
giá trị tuyệt đối, hệ phương trình, vectơ; π ∞ Δ α ± ≤ ≥ ≠ ≈ ∈ ⊂ ∪ ∩ ℝ ∅ → ⇒ ⇔ ° ∠ △ ⊥ ∥; sin cos tan log ln lim ∑ ∫)
và **xem trước** bằng MathML (\`hui-math\`). Bấm phím = chèn mẫu tại con trỏ, con trỏ nhảy vào ô trống đầu tiên;
đang chọn chữ thì chữ được bọc vào ô (chọn \`x+1\` rồi bấm √ → \`\\sqrt{x+1}\`). Tham gia \`<form>\` như ô nhập thường.

\`\`\`html
<hui-math-input label="Đáp số" name="answer"></hui-math-input>
\`\`\`

### Attributes / Properties
| Attribute | Property | Type | Default | Mô tả |
|-----------|----------|------|---------|-------|
| \`value\` | \`value\` | string | \`''\` | Công thức LaTeX |
| \`label\` | \`label\` | string | \`''\` | Nhãn |
| \`placeholder\` | \`placeholder\` | string | gợi ý | Chữ gợi ý |
| \`rows\` | \`rows\` | number | \`2\` | Số dòng ô chữ |
| \`keys\` | \`keys\` | string | \`'structures,symbols,functions'\` | Nhóm phím hiện |
| \`no-keyboard\` | \`noKeyboard\` | boolean | \`false\` | Ẩn bàn phím |
| \`no-preview\` | \`noPreview\` | boolean | \`false\` | Ẩn xem trước |
| \`error\` | \`error\` | string | \`''\` | Thông báo lỗi |
| \`name\`, \`disabled\`, \`readonly\`, \`required\` | | | | Như ô nhập form |

### Methods / Events
| | Mô tả |
|-|-------|
| \`insert(keyOrTex)\` | Chèn mẫu tại con trỏ |
| \`input\` / \`change\` \`{ value }\` | Khi gõ / bấm phím |
| \`hui-submit\` \`{ value }\` | Ctrl + Enter |
`,
      },
    },
  },
};

export const Default = {
  render: () => html`<hui-math-input label="Nghiệm của phương trình" value="x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}" style="max-width: 640px"></hui-math-input>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-math-input');
    await waitFor(() => expect(el.shadowRoot.querySelector('.preview math')).not.toBeNull());
    const field = el.shadowRoot.querySelector('textarea');
    field.setSelectionRange(field.value.length, field.value.length);
    [...el.shadowRoot.querySelectorAll('.key')].find((k) => k.textContent === 'π').click();
    await expect(el.value.endsWith('\\pi ')).toBe(true);
  },
};

/** Chỉ ký hiệu, không xem trước — cho ô trả lời ngắn */
export const SymbolsOnly = {
  render: () => html`<hui-math-input keys="structures" no-preview placeholder="Đáp số, ví dụ 2\\sqrt{3}" style="max-width: 420px"></hui-math-input>`,
};

export const WithError = {
  render: () => html`<hui-math-input label="Biểu thức" value="\\frac{1}{" error="Thiếu dấu đóng ngoặc" style="max-width: 420px"></hui-math-input>`,
};
