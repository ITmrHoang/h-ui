import { describe, it, expect, afterEach } from 'vitest';
import { latexToMathML, tokenize } from '../src/components/hui-math/latex.js';
import { renderMarkdown } from '../src/components/hui-markdown/markdown.js';
import '../src/components/hui-math/index.js';
import '../src/components/hui-markdown/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const mathml = (tex, display = false) => latexToMathML(tex, { display });
/** Thẻ MathML trong kết quả (bỏ math / semantics / annotation) */
const tags = (node) => [...node.querySelectorAll('*')].map((n) => n.localName).filter((t) => !['semantics', 'annotation'].includes(t));

function render(md, opts) {
  const div = document.createElement('div');
  div.append(...renderMarkdown(md, opts));
  return div;
}

describe('latexToMathML', () => {
  it('tách token: lệnh, số thập phân, nhóm, mũ', () => {
    const types = tokenize('\\frac{1}{2}^3 + 0.5\\,')
      .filter((t) => t.type !== 'space')
      .map((t) => `${t.type}:${t.value}`);
    expect(types).toEqual(['cmd:frac', 'open:{', 'num:1', 'close:}', 'open:{', 'num:2', 'close:}', 'sup:^', 'num:3', 'char:+', 'num:0.5', 'cmd:,']);
  });

  it('phân số, căn, căn bậc n, mũ và chỉ số', () => {
    const m = mathml('\\frac{a}{b} + \\sqrt{x} + \\sqrt[3]{y} + x_1^2');
    expect(m.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
    expect(m.querySelector('mfrac').children.length).toBe(2);
    expect(m.querySelector('msqrt')).toBeTruthy();
    expect(m.querySelector('mroot').lastElementChild.textContent).toBe('3');
    expect(m.querySelector('msubsup').textContent).toBe('x12');
  });

  it('ký hiệu, chữ Hy Lạp, hàm viết đứng, tập số', () => {
    const m = mathml('\\alpha \\le \\pi, \\sin x \\ne 0, x \\in \\mathbb{R}');
    expect(m.textContent).toContain('α');
    expect(m.textContent).toContain('≤');
    expect(m.textContent).toContain('≠');
    expect(m.textContent).toContain('ℝ');
    const sin = [...m.querySelectorAll('mi')].find((n) => n.textContent === 'sin');
    expect(sin.getAttribute('mathvariant')).toBe('normal');
  });

  it('giới hạn / tổng: cận dưới khi hiển thị khối, chỉ số khi trong dòng', () => {
    expect(mathml('\\lim_{x \\to 0} f(x)', true).querySelector('munder')).toBeTruthy();
    expect(mathml('\\sum_{k=1}^{n} k', true).querySelector('munderover')).toBeTruthy();
    expect(mathml('\\sum_{k=1}^{n} k').querySelector('msubsup')).toBeTruthy();
    expect(mathml('\\int_0^1 x\\,dx', true).querySelector('msubsup')).toBeTruthy();
  });

  it('hệ phương trình, ma trận, \\left( \\right)', () => {
    const cases = mathml('\\begin{cases} x + y = 1 \\\\ x - y = 3 \\end{cases}');
    expect(cases.querySelectorAll('mtr').length).toBe(2);
    expect(cases.querySelector('mo').textContent).toBe('{');
    const matrix = mathml('\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}');
    expect(matrix.querySelectorAll('mtd').length).toBe(4);
    const fenced = mathml('\\left( \\frac{1}{2} \\right)');
    const mos = [...fenced.querySelectorAll('mo')].map((n) => n.textContent);
    expect(mos).toEqual(['(', ')']);
  });

  it('vector, góc, độ, chữ thường trong công thức', () => {
    const m = mathml('\\overrightarrow{AB}, \\widehat{ABC} = 60^\\circ, \\text{với } x > 0');
    expect(m.querySelectorAll('mover').length).toBe(2);
    expect(m.querySelector('mtext').textContent).toBe('với ');
    expect(m.textContent).toContain('∘');
  });

  it('lệnh lạ hiện nguyên văn, ngoặc thiếu không làm hỏng', () => {
    const m = mathml('a + \\unknown{b} + \\frac{1}{');
    expect(m.querySelector('mtext[mathcolor]').textContent).toBe('\\unknown');
    expect(m.querySelector('mfrac')).toBeTruthy();
    expect(tags(mathml(''))).toEqual(['mrow']);
  });

  it('giữ mã LaTeX gốc trong annotation và aria-label', () => {
    const m = mathml('x^2');
    expect(m.querySelector('annotation').textContent).toBe('x^2');
    expect(m.getAttribute('aria-label')).toBe('x^2');
  });
});

describe('renderMarkdown', () => {
  it('tiêu đề, đậm, nghiêng, code, gạch', () => {
    const d = render('## Bài 1\n\n**đậm** và *nghiêng*, `code`, ~~gạch~~');
    expect(d.querySelector('h2').textContent).toBe('Bài 1');
    expect(d.querySelector('strong').textContent).toBe('đậm');
    expect(d.querySelector('em').textContent).toBe('nghiêng');
    expect(d.querySelector('code').textContent).toBe('code');
    expect(d.querySelector('del').textContent).toBe('gạch');
  });

  it('công thức trong dòng và khối; \\$ là dấu $', () => {
    const d = render('Giá $x^2$ là \\$5\n\n$$\\frac{1}{2}$$');
    const maths = d.querySelectorAll('math');
    expect(maths.length).toBe(2);
    expect(maths[1].getAttribute('display')).toBe('block');
    expect(d.querySelector('p').textContent).toContain('$5');
  });

  it('xuống dòng đơn thành <br>, dòng trống tách đoạn', () => {
    const d = render('dòng 1\ndòng 2\n\nđoạn 2');
    expect(d.querySelectorAll('p').length).toBe(2);
    expect(d.querySelector('p br')).toBeTruthy();
    expect(render('a\nb', { breaks: false }).querySelector('br')).toBeNull();
  });

  it('danh sách có thứ tự, không thứ tự, lồng nhau', () => {
    const d = render('1. Một\n2. Hai\n   - con a\n   - con b\n3. Ba');
    expect(d.querySelectorAll('ol > li').length).toBe(3);
    expect(d.querySelectorAll('ol ul > li').length).toBe(2);
    expect(render('- a\n- b').querySelectorAll('ul > li').length).toBe(2);
  });

  it('bảng có căn lề, ô chứa công thức có dấu |', () => {
    const d = render('| x | $|x|$ |\n|:-:|--:|\n| -2 | 2 |');
    expect(d.querySelectorAll('th').length).toBe(2);
    expect(d.querySelector('th').style.textAlign).toBe('center');
    expect(d.querySelectorAll('td')[1].textContent).toBe('2');
    expect(d.querySelectorAll('th math').length).toBe(1);
  });

  it('trích dẫn, khối code, đường kẻ', () => {
    const d = render('> chú ý\n\n```js\nlet a = 1 < 2;\n```\n\n---');
    expect(d.querySelector('blockquote p').textContent).toBe('chú ý');
    expect(d.querySelector('pre code').textContent).toBe('let a = 1 < 2;');
    expect(d.querySelector('hr')).toBeTruthy();
  });

  it('an toàn: HTML hiện như chữ, link / ảnh nguy hiểm bị bỏ', () => {
    const d = render('<script>alert(1)</script> [x](javascript:alert(1)) ![a](javascript:x) ![b](https://e.com/a.png) [ok](/bai-hoc)');
    expect(d.querySelector('script')).toBeNull();
    expect(d.textContent).toContain('<script>alert(1)</script>');
    expect([...d.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/bai-hoc']);
    expect([...d.querySelectorAll('img')].map((i) => i.getAttribute('src'))).toEqual(['https://e.com/a.png']);
  });

  it('chế độ inline không tạo đoạn văn', () => {
    const d = render('**A.** $x = 1$', { inline: true });
    expect(d.querySelector('p')).toBeNull();
    expect(d.querySelector('strong')).toBeTruthy();
    expect(d.querySelector('math')).toBeTruthy();
  });
});

describe('<hui-math> / <hui-markdown>', () => {
  it('đổi value thì vẽ lại; lấy chữ trong thẻ khi không có value', async () => {
    const m = document.createElement('hui-math');
    m.textContent = '\\sqrt{2}';
    document.body.append(m);
    await new Promise((r) => setTimeout(r));
    expect(m.shadowRoot.querySelector('msqrt')).toBeTruthy();
    m.value = '\\frac{1}{2}';
    await new Promise((r) => setTimeout(r));
    expect(m.shadowRoot.querySelector('mfrac')).toBeTruthy();
    expect(m.shadowRoot.querySelector('msqrt')).toBeNull();

    const md = document.createElement('hui-markdown');
    md.value = '# Tiêu đề';
    document.body.append(md);
    await new Promise((r) => setTimeout(r));
    expect(md.shadowRoot.querySelector('h1').textContent).toBe('Tiêu đề');
    md.inline = true;
    md.value = '**đậm**';
    await new Promise((r) => setTimeout(r));
    expect(md.shadowRoot.querySelector('.md--inline strong').textContent).toBe('đậm');
  });
});
