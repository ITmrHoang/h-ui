/**
 * Storybook Stories — HUI Flashcard
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const root = (el) => el.shadowRoot;

export default {
  title: 'Molecules/HuiFlashcard',
  component: 'hui-flashcard',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Flashcard** — Thẻ ghi nhớ cho ôn tập lặp lại ngắt quãng. Mặt trước / mặt sau là **Markdown + công thức**
(hiển thị bằng \`hui-markdown\`), bấm hoặc nhấn **Space / Enter** để lật; sau khi lật hiện 4 nút tự chấm
**Quên / Khó / Được / Dễ** (phím **1–4**) kèm gợi ý lần ôn tới. Lịch ôn do ứng dụng tính (vd. SM-2).

\`\`\`html
<hui-flashcard front="$a^m \\cdot a^n$" back="$a^{m+n}$"></hui-flashcard>
<script>
  const card = document.querySelector('hui-flashcard');
  card.intervals = ['10 phút', '1 ngày', '3 ngày', '4 ngày'];
  card.addEventListener('hui-rate', (e) => { save(e.detail.rating); card.reset(); /* sang thẻ kế */ });
</script>
\`\`\`

### Attributes / Properties
| Attribute | Property | Type | Default | Mô tả |
|-----------|----------|------|---------|-------|
| \`front\` | \`front\` | string | \`''\` | Mặt trước (Markdown + \`$công thức$\`) |
| \`back\` | \`back\` | string | \`''\` | Mặt sau |
| \`flipped\` | \`flipped\` | boolean | \`false\` | Đang hiện mặt sau |
| — | \`intervals\` | string[] | \`null\` | Gợi ý dưới 4 nút (Quên / Khó / Được / Dễ) |
| \`no-rating\` | \`noRating\` | boolean | \`false\` | Chỉ lật xem, không có nút chấm |
| \`disabled\` | \`disabled\` | boolean | \`false\` | Khóa thao tác (vd. đang lưu) |

### Methods
| Method | Mô tả |
|--------|-------|
| \`flip(force?)\` | Lật thẻ (không tham số = đảo mặt; \`true\` / \`false\` = mặt sau / mặt trước) |
| \`reset()\` | Về mặt trước (không phát sự kiện) |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-flip\` | \`{ flipped }\` | Thẻ được lật |
| \`hui-rate\` | \`{ rating }\` — \`again\` · \`hard\` · \`good\` · \`easy\` | Bấm nút chấm hoặc phím 1–4 (chỉ khi đã lật) |

### CSS Parts / Custom Properties
| Tên | Mô tả |
|-----|-------|
| \`::part(base)\` · \`face\` · \`front\` · \`back\` · \`hint\` · \`ratings\` · \`rating\` · \`rating-again\` … \`rating-easy\` | Các phần của thẻ |
| \`--hui-flashcard-min-height\` | Chiều cao tối thiểu (220px) |
| \`--hui-flashcard-bg\` · \`--hui-flashcard-back-bg\` | Nền mặt trước / mặt sau |
| \`--hui-flashcard-radius\` · \`--hui-flashcard-font-size\` | Bo góc, cỡ chữ |
        `,
      },
    },
  },
  argTypes: {
    front: { control: 'text' },
    back: { control: 'text' },
    noRating: { control: 'boolean' },
  },
};

export const Default = {
  args: {
    front: 'Tích hai lũy thừa cùng cơ số: $a^m \\cdot a^n = ?$',
    back: '$a^m \\cdot a^n = a^{m+n}$\n\nVí dụ: $2^3 \\cdot 2^2 = 2^5 = 32$.',
    noRating: false,
  },
  render: (args) => html`
    <hui-flashcard
      style="max-width: 520px"
      .front=${args.front}
      .back=${args.back}
      .intervals=${['10 phút', '1 ngày', '3 ngày', '4 ngày']}
      ?no-rating=${args.noRating}
    ></hui-flashcard>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-flashcard');
    const md = root(el).querySelector('.face--front hui-markdown');
    await waitFor(() => expect((md.shadowRoot ?? md).querySelector('math')).toBeTruthy());
    await expect(root(el).querySelector('.ratings').hidden).toBe(true);
    const flips = [];
    const rates = [];
    el.addEventListener('hui-flip', (e) => flips.push(e.detail.flipped));
    el.addEventListener('hui-rate', (e) => rates.push(e.detail.rating));
    // Chưa lật: phím số không chấm
    root(el).querySelector('.card').focus();
    await userEvent.keyboard('3');
    await expect(rates).toEqual([]);
    await userEvent.click(root(el).querySelector('.card'));
    await waitFor(() => expect(el.flipped).toBe(true));
    await expect(flips).toEqual([true]);
    await expect(root(el).querySelector('.ratings').hidden).toBe(false);
    await expect(root(el).querySelector('.rate--again .rate-hint').textContent).toBe('10 phút');
    await userEvent.click(root(el).querySelector('.rate--good'));
    await userEvent.keyboard('4');
    await expect(rates).toEqual(['good', 'easy']);
  },
};

export const ViewOnly = {
  name: 'Chỉ lật xem',
  render: () => html`
    <hui-flashcard style="max-width: 420px; --hui-flashcard-min-height: 160px" no-rating
      front="**Định lý Py-ta-go**" back="$a^2 + b^2 = c^2$ với $c$ là cạnh huyền."></hui-flashcard>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-flashcard');
    await userEvent.click(root(el).querySelector('.card'));
    await waitFor(() => expect(el.flipped).toBe(true));
    await expect(root(el).querySelector('.ratings').hidden).toBe(true);
    await expect(root(el).querySelector('.hint').hidden).toBe(false);
  },
};
