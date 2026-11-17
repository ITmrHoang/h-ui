/**
 * Storybook Stories — HUI Plot
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Molecules/HuiPlot',
  component: 'hui-plot',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Plot** — Đồ thị hàm số cho bài giảng / bài tập Toán: gõ công thức theo cách viết quen thuộc, nhiều đồ thị
trên một hệ trục, **miền nghiệm** bất phương trình, **điểm**, **tham số tự sinh thanh trượt**; kéo để di chuyển,
cuộn chuột / nút ± để phóng to.

Zero-dependency: tự phân tích biểu thức (**không dùng eval** — an toàn với nội dung học sinh nhập), vẽ Canvas 2D.
Lõi vẽ dùng chung với công cụ **ƒ** của \`hui-whiteboard\`; trong \`hui-markdown\` khối code \`\`\`plot … \`\`\`
hiện thành \`<hui-plot>\` (app import \`hui-plot\`).

\`\`\`html
<hui-plot value="y = 2x + 1
y = a x^2 - 3
y > -x
A(1; 3)
x: -5 .. 5"></hui-plot>
\`\`\`

### Cú pháp (mỗi dòng một đối tượng)
| Dòng | Ý nghĩa |
|------|---------|
| \`y = 2x + 1\`, \`f(x) = sin x\`, \`x^2 - 1\` | Hàm số |
| \`x = 3\` | Đường thẳng đứng |
| \`y > x^2\`, \`y ≤ 2x\` | Miền nghiệm (tô màu; \`<\` \`>\` nét đứt) |
| \`A(1; 2)\`, \`(−1; 0,5)\` | Điểm |
| \`a = 2\` | Giá trị đầu của tham số \`a\` (chữ cái khác x, y) — thanh trượt −10 … 10 |
| \`x: -2 .. 5\`, \`y: [-1; 4]\` | Khung trục |
| \`# ghi chú\` | Bỏ qua |

Biểu thức: nhân ngầm \`2x\`, \`3(x+1)\`; dấu phẩy thập phân \`1,5\`; \`^\` \`²\` \`³\`; \`√x\` \`sqrt(x)\` \`|x|\`;
sin cos tan (tg) cot (cotg) arcsin… ln log exp; \`pi\` / \`π\`, \`e\`.

### Attributes / Properties
| Attribute | Property | Type | Default | Mô tả |
|-----------|----------|------|---------|-------|
| \`value\` | \`value\` | string | \`''\` | Công thức, mỗi dòng một đối tượng |
| \`x-min\` / \`x-max\` | \`xMin\` / \`xMax\` | number | \`-6\` / \`6\` | Khung trục ban đầu (dòng \`x: …\` ưu tiên hơn) |
| \`y-min\` / \`y-max\` | \`yMin\` / \`yMax\` | number | tự tính | Bỏ trống: theo tỉ lệ khung, đơn vị hai trục bằng nhau |
| \`locked\` | \`locked\` | boolean | \`false\` | Đồ thị tĩnh: không kéo / phóng to |
| \`no-sliders\` | \`noSliders\` | boolean | \`false\` | Ẩn thanh trượt tham số |

### Methods / getters
| Tên | Mô tả |
|-----|-------|
| \`resetView()\` | Về khung ban đầu |
| \`setParam(name, value)\` | Đặt giá trị tham số |
| \`params\` / \`view\` | Giá trị tham số / khung trục hiện tại |

### Events
| Event | Detail |
|-------|--------|
| \`hui-view-change\` | \`{ xMin, xMax, yMin, yMax }\` |
| \`hui-param-change\` | \`{ name, value, params }\` |

### CSS
\`--hui-plot-height\` (320px) · parts \`canvas\`, \`controls\`, \`sliders\`
`,
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    locked: { control: 'boolean' },
    noSliders: { control: 'boolean' },
  },
  args: {
    value: 'y = 2x + 1\ny = x^2 - 3\nA(1; 3)',
    locked: false,
    noSliders: false,
  },
  render: (args) => html`<hui-plot
    style="max-width: 640px"
    .value=${args.value}
    ?locked=${args.locked}
    ?no-sliders=${args.noSliders}
  ></hui-plot>`,
};

export const Default = {};

/** Tham số `a`, `b` tự sinh thanh trượt — kéo để thấy họ đường thẳng / parabol thay đổi */
export const Parameters = {
  args: { value: 'y = a x^2 + b x - 1\ny = a x + b\na = 0,5\nb = -1' },
  play: async ({ canvasElement }) => {
    const plot = canvasElement.querySelector('hui-plot');
    await waitFor(() => expect(plot.shadowRoot.querySelectorAll('.sliders input').length).toBe(2));
    plot.setParam('a', 2);
    await expect(plot.params).toEqual({ a: 2, b: -1 });
  },
};

/** Miền nghiệm hệ bất phương trình */
export const Inequalities = {
  args: { value: 'y > x - 2\ny ≤ -x + 3\nx = -1\nx: -4 .. 6\ny: -3 .. 5' },
};

/** Hàm lượng giác, tiệm cận (tan, 1/x) — nét tự ngắt ở chỗ nhảy */
export const Trig = {
  args: { value: 'y = sin x\ny = cos x\ny = tan x\nx: -2pi .. 2pi' },
};

/** Dòng không hiểu được báo ngay dưới đồ thị */
export const Errors = {
  args: { value: 'y = (x + 1\nx^2 + y^2 = 4\ny = |x|' },
  play: async ({ canvasElement }) => {
    const plot = canvasElement.querySelector('hui-plot');
    await waitFor(() => expect(plot.shadowRoot.querySelectorAll('.errors .error').length).toBe(2));
  },
};
