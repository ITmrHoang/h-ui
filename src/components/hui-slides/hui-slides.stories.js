/**
 * Storybook Stories — HUI Slides
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-markdown/index.js';
import '../hui-plot/index.js';

export default {
  title: 'Organisms/HuiSlides',
  component: 'hui-slides',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Slides** — Trình chiếu bài giảng: mỗi phần tử con là một slide, khung **16:9** thiết kế ở **1280 × 720** rồi tự
co giãn theo chỗ đặt (chữ, công thức, đồ thị giữ đúng tỉ lệ ở mọi màn hình). Chuyển slide bằng nút, phím
(← → Space PageUp PageDown Home End), vuốt trên điện thoại; **F** toàn màn hình, **G** xem lưới tất cả slide.
Zero-dependency — nội dung slide do ứng dụng dựng (thường là \`hui-markdown\`).

\`\`\`html
<hui-slides>
  <section><h1>Bài 3. Phương trình bậc hai</h1></section>
  <section><hui-markdown value="Giải $x^2 - 4 = 0$"></hui-markdown></section>
</hui-slides>
\`\`\`

Đồng bộ trình chiếu (phòng học trực tuyến): máy giáo viên nghe \`hui-slide-change\` rồi gửi \`index\`; máy học sinh đặt
\`readonly\` + \`no-controls\` và gán \`index\` theo giáo viên.

### Attributes / Properties
| Attribute | Property | Type | Default | Mô tả |
|-----------|----------|------|---------|-------|
| \`index\` | \`index\` | number | \`0\` | Slide đang xem (từ 0) |
| \`no-controls\` | \`noControls\` | boolean | \`false\` | Ẩn thanh điều khiển |
| \`readonly\` | \`readonly\` | boolean | \`false\` | Không nhận phím / vuốt chuyển slide |
| \`overview\` | \`overview\` | boolean | \`false\` | Xem lưới tất cả slide (bấm một slide để mở) |

### Methods
| Method | Mô tả |
|--------|-------|
| \`next()\` / \`prev()\` / \`goTo(i)\` | Chuyển slide (phát \`hui-slide-change\`) |
| \`toggleFullscreen()\` | Bật / tắt toàn màn hình |
| \`toggleOverview(force?)\` | Bật / tắt xem lưới |
| \`total\` (getter) | Số slide |

### Events
| Event | Detail |
|-------|--------|
| \`hui-slide-change\` | \`{ index, total }\` |

### CSS
\`--hui-slides-bg\`, \`--hui-slides-font-size\` (30px theo khung 1280 × 720), \`--hui-slides-padding\` ·
parts \`viewport\`, \`controls\`, \`progress\`, \`counter\`
`,
      },
    },
  },
};

const lesson = () => html`
  <hui-slides style="max-width: 760px">
    <section style="display:grid;place-content:center;text-align:center">
      <h1 style="margin:0;font-size:64px">Bài 3</h1>
      <p>Phương trình bậc hai một ẩn</p>
    </section>
    <section>
      <hui-markdown
        value="## 1. Định nghĩa&#10;&#10;Phương trình $ax^2 + bx + c = 0$ với $a \\ne 0$.&#10;&#10;$$\\Delta = b^2 - 4ac$$"
      ></hui-markdown>
    </section>
    <section>
      <hui-markdown value="## 2. Đồ thị $y = x^2 - 2x - 3$"></hui-markdown>
      <hui-plot value="y = x^2 - 2x - 3" style="--hui-plot-height: 420px" no-sliders></hui-plot>
    </section>
    <section>
      <hui-markdown value="## 3. Luyện tập&#10;&#10;Giải phương trình $x^2 - 5x + 6 = 0$."></hui-markdown>
    </section>
  </hui-slides>
`;

/** Bài giảng 4 slide: tiêu đề, công thức, đồ thị, luyện tập */
export const Default = {
  render: lesson,
  play: async ({ canvasElement }) => {
    const slides = canvasElement.querySelector('hui-slides');
    await waitFor(() => expect(slides.total).toBe(4));
    slides.next();
    await expect(slides.index).toBe(1);
    slides.goTo(0);
  },
};

/** Xem lưới tất cả slide */
export const Overview = {
  render: () => {
    const el = lesson();
    return el;
  },
  play: async ({ canvasElement }) => {
    const slides = canvasElement.querySelector('hui-slides');
    await waitFor(() => expect(slides.total).toBe(4));
    slides.toggleOverview(true);
    await waitFor(() => expect(slides.hasAttribute('overview')).toBe(true));
  },
};
