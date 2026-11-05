/**
 * LaTeX (tập con dùng trong Toán phổ thông) → MathML Core (trình duyệt tự vẽ, không cần thư viện ngoài).
 *
 * Hỗ trợ: phân số (\frac, \dfrac, \tfrac), căn (\sqrt, \sqrt[n]), mũ / chỉ số, chữ Hy Lạp, toán tử & quan hệ
 * (≤ ≥ ≠ ≈ ± × ÷ ∈ ⊂ ∪ ∩ → ⇒ ⇔ ∞ …), hàm (\sin \cos \log \ln …), \lim \sum \prod \int có cận,
 * \left( … \right), ma trận (matrix / pmatrix / bmatrix / vmatrix / Vmatrix), hệ (\begin{cases}),
 * \begin{array}, \begin{aligned}, vector (\vec, \overrightarrow), \overline, \hat, \widehat, \underline,
 * \text, \mathrm, \mathbf, \mathbb (ℝ ℕ ℤ ℚ ℂ), khoảng trắng (\, \; \quad \qquad), \{ \} \% \circ (độ).
 *
 * Lệnh không hỗ trợ được hiện nguyên văn (màu đỏ) thay vì làm hỏng cả công thức.
 * Chỉ tạo DOM bằng createElementNS + textContent — không dùng innerHTML.
 */

export const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ',
  varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ',
  omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ',
  Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

/** Ký hiệu hiển thị bằng <mo> (toán tử, quan hệ, mũi tên…) */
const OPERATORS = {
  pm: '±', mp: '∓', times: '×', div: '÷', cdot: '⋅', ast: '∗', star: '⋆', circ: '∘', bullet: '∙',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡', sim: '∼', simeq: '≃',
  cong: '≅', propto: '∝', ll: '≪', gg: '≫', leqslant: '⩽', geqslant: '⩾',
  in: '∈', notin: '∉', ni: '∋', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇', not: '¬',
  cup: '∪', cap: '∩', setminus: '∖', emptyset: '∅', varnothing: '∅',
  forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', wedge: '∧', vee: '∨',
  to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔',
  leftrightarrow: '↔', iff: '⇔', implies: '⇒', mapsto: '↦', uparrow: '↑', downarrow: '↓',
  longrightarrow: '⟶', Longrightarrow: '⟹', Longleftrightarrow: '⟺',
  angle: '∠', triangle: '△', perp: '⊥', parallel: '∥', mid: '|', nmid: '∤',
  infty: '∞', partial: '∂', nabla: '∇', prime: '′', degree: '°',
  cdots: '⋯', ldots: '…', dots: '…', vdots: '⋮', ddots: '⋱',
  langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', vert: '|', Vert: '‖',
  therefore: '∴', because: '∵', square: '□', blacksquare: '■', hbar: 'ℏ', ell: 'ℓ', aleph: 'ℵ',
};

/** Hàm viết chữ đứng (sin x, log x…) */
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'coth',
  'log', 'ln', 'lg', 'exp', 'max', 'min', 'sup', 'inf', 'det', 'gcd', 'deg', 'arg', 'dim', 'ker', 'mod', 'tg', 'cotg',
]);

/** Toán tử lớn: cận đặt trên / dưới khi hiển thị dạng khối */
const BIG_OPERATORS = { sum: '∑', prod: '∏', coprod: '∐', bigcup: '⋃', bigcap: '⋂', int: '∫', iint: '∬', iiint: '∭', oint: '∮', lim: 'lim' };
const LIMITS_BELOW = new Set(['sum', 'prod', 'coprod', 'bigcup', 'bigcap', 'lim', 'max', 'min', 'sup', 'inf']);

const ACCENTS = {
  vec: '→', overrightarrow: '→', overleftarrow: '←', bar: '‾', overline: '‾', hat: '^', widehat: '^',
  tilde: '~', widetilde: '~', dot: '˙', ddot: '¨', overarc: '⌒', arc: '⌒',
};

const SPACES = { ',': '0.1667em', ':': '0.2222em', ';': '0.2778em', ' ': '0.25em', quad: '1em', qquad: '2em', '!': '-0.1667em' };

const DOUBLE_STRUCK = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', P: 'ℙ', H: 'ℍ' };

const MATRIX_FENCES = { matrix: ['', ''], pmatrix: ['(', ')'], bmatrix: ['[', ']'], Bmatrix: ['{', '}'], vmatrix: ['|', '|'], Vmatrix: ['‖', '‖'], cases: ['{', ''] };

// =====================================================
// TÁCH TOKEN
// =====================================================

/**
 * @typedef {{ type: 'cmd' | 'char' | 'num' | 'open' | 'close' | 'sup' | 'sub' | 'amp' | 'newline' | 'space', value: string }} Token
 */

/** @returns {Token[]} */
export function tokenize(tex) {
  const src = String(tex ?? '');
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const rest = src.slice(i + 1);
      const word = /^[a-zA-Z]+/.exec(rest);
      if (word) {
        out.push({ type: 'cmd', value: word[0] });
        i += 1 + word[0].length;
      } else if (rest[0] === '\\') {
        out.push({ type: 'newline', value: '\\\\' });
        i += 2;
      } else if (rest.length) {
        out.push({ type: 'cmd', value: rest[0] });
        i += 2;
      } else {
        i += 1;
      }
    } else if (/\s/.test(c)) {
      // Khoảng trắng chỉ có nghĩa trong \text{…}; còn lại Parser.peek() bỏ qua
      if (out.at(-1)?.type !== 'space') out.push({ type: 'space', value: ' ' });
      i += 1;
    } else if (/[0-9]/.test(c)) {
      const num = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i))[0];
      out.push({ type: 'num', value: num });
      i += num.length;
    } else if (c === '{') {
      out.push({ type: 'open', value: c });
      i += 1;
    } else if (c === '}') {
      out.push({ type: 'close', value: c });
      i += 1;
    } else if (c === '^') {
      out.push({ type: 'sup', value: c });
      i += 1;
    } else if (c === '_') {
      out.push({ type: 'sub', value: c });
      i += 1;
    } else if (c === '&') {
      out.push({ type: 'amp', value: c });
      i += 1;
    } else {
      // Ký tự Unicode ngoài BMP (hiếm) vẫn đi nguyên cặp
      const ch = String.fromCodePoint(src.codePointAt(i));
      out.push({ type: 'char', value: ch });
      i += ch.length;
    }
  }
  return out;
}

// =====================================================
// DỰNG MATHML
// =====================================================

function el(tag, attrs, ...children) {
  const node = document.createElementNS(MATHML_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

const text = (tag, value, attrs) => el(tag, attrs, value);

/** Gói nhiều node thành một (mrow nếu > 1) */
function row(nodes) {
  if (nodes.length === 1) return nodes[0];
  return el('mrow', null, nodes);
}

class Parser {
  constructor(tokens, display) {
    this.tokens = tokens;
    this.pos = 0;
    this.display = display;
  }

  /** Token kế tiếp; bỏ qua khoảng trắng trừ khi đang đọc chữ thô (	ext) */
  peek() {
    if (!this.raw) while (this.tokens[this.pos]?.type === 'space') this.pos++;
    return this.tokens[this.pos];
  }

  next() {
    const t = this.peek();
    this.pos++;
    return t;
  }

  /** Đọc tới token kết thúc (không tiêu thụ nó). stop(token) → true thì dừng. */
  parseList(stop = () => false) {
    const nodes = [];
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (!t) break;
      if (stop(t)) break;
      if (t.type === 'close') {
        // } thừa → bỏ qua
        this.pos++;
        continue;
      }
      const node = this.parseWithScripts();
      if (node) nodes.push(node);
    }
    return nodes;
  }

  /** Một nhóm {…} hoặc một token đơn (đối số của \frac, ^, _ …) */
  parseArgument() {
    const t = this.peek();
    if (!t) return el('mrow');
    if (t.type === 'open') {
      this.pos++;
      const nodes = this.parseList((tk) => tk.type === 'close');
      if (this.peek()?.type === 'close') this.pos++;
      return row(nodes.length ? nodes : [el('mrow')]);
    }
    return this.parseAtom() || el('mrow');
  }

  /** Đối số dạng chữ thô {…} (cho \text, \begin) */
  parseRawGroup() {
    if (this.peek()?.type !== 'open') return '';
    this.pos++;
    this.raw = true;
    let depth = 1;
    let out = '';
    while (this.pos < this.tokens.length) {
      const t = this.next();
      if (t.type === 'open') depth++;
      if (t.type === 'close' && --depth === 0) break;
      if (t.type === 'cmd') out += t.value.length === 1 && !/[a-zA-Z]/.test(t.value) ? t.value : `\\${t.value} `;
      else out += t.value;
    }
    this.raw = false;
    return out;
  }

  /** Phần trong […] (căn bậc n) */
  parseOptional() {
    if (this.peek()?.type !== 'char' || this.peek().value !== '[') return null;
    this.pos++;
    const nodes = this.parseList((tk) => tk.type === 'char' && tk.value === ']');
    if (this.peek()?.value === ']') this.pos++;
    return row(nodes.length ? nodes : [el('mrow')]);
  }

  parseWithScripts() {
    const startTok = this.peek();
    let base = this.parseAtom();
    if (!base) return null;
    const bigName = startTok?.type === 'cmd' ? startTok.value : '';
    // Dấu phẩy trên: f'(x) → f′
    while (this.peek()?.type === 'char' && this.peek().value === "'") {
      this.pos++;
      base = el('msup', null, base, text('mo', '′'));
    }
    let sub = null;
    let sup = null;
    while (this.peek() && (this.peek().type === 'sub' || this.peek().type === 'sup')) {
      const t = this.next();
      const arg = this.parseArgument();
      if (t.type === 'sub') sub = arg;
      else sup = arg;
    }
    if (!sub && !sup) return base;
    const below = this.display && LIMITS_BELOW.has(bigName);
    if (below) {
      if (sub && sup) return el('munderover', null, base, sub, sup);
      return sub ? el('munder', null, base, sub) : el('mover', null, base, sup);
    }
    if (sub && sup) return el('msubsup', null, base, sub, sup);
    return sub ? el('msub', null, base, sub) : el('msup', null, base, sup);
  }

  parseAtom() {
    const t = this.next();
    if (!t) return null;
    switch (t.type) {
      case 'num':
        return text('mn', t.value);
      case 'open': {
        const nodes = this.parseList((tk) => tk.type === 'close');
        if (this.peek()?.type === 'close') this.pos++;
        return row(nodes.length ? nodes : [el('mrow')]);
      }
      case 'sup':
      case 'sub':
        // ^ đứng đầu: gắn vào khung rỗng
        this.pos--;
        return el('mrow');
      case 'amp':
      case 'newline':
        return null;
      case 'char':
        return this.parseChar(t.value);
      case 'cmd':
        return this.parseCommand(t.value);
      default:
        return null;
    }
  }

  parseChar(c) {
    if (/\p{L}/u.test(c)) return text('mi', c);
    if (c === '-') return text('mo', '−');
    if (c === '*') return text('mo', '∗');
    if (c === "'") return text('mo', '′');
    if ('()[]|'.includes(c)) return text('mo', c, { stretchy: 'false' });
    return text('mo', c);
  }

  parseCommand(name) {
    if (GREEK[name]) return text('mi', GREEK[name], /^[A-Z]/.test(name) ? { mathvariant: 'normal' } : null);
    if (OPERATORS[name]) return text('mo', OPERATORS[name]);
    if (FUNCTIONS.has(name)) return text('mi', name, { mathvariant: 'normal' });
    if (BIG_OPERATORS[name]) {
      const sym = BIG_OPERATORS[name];
      if (name === 'lim') return text('mi', 'lim', { mathvariant: 'normal' });
      return text('mo', sym, { largeop: this.display ? 'true' : undefined, movablelimits: 'true' });
    }
    if (name in SPACES) return el('mspace', { width: SPACES[name] });
    if (ACCENTS[name]) {
      const arg = this.parseArgument();
      const stretchy = ['overrightarrow', 'overleftarrow', 'overline', 'widehat', 'widetilde', 'overarc', 'arc'].includes(name);
      return el('mover', { accent: 'true' }, arg, text('mo', ACCENTS[name], { stretchy: stretchy ? 'true' : 'false' }));
    }
    switch (name) {
      case 'frac':
      case 'dfrac':
      case 'tfrac':
      case 'cfrac': {
        const num = this.parseArgument();
        const den = this.parseArgument();
        const frac = el('mfrac', null, num, den);
        if (name === 'dfrac') return el('mstyle', { displaystyle: 'true' }, frac);
        if (name === 'tfrac') return el('mstyle', { displaystyle: 'false' }, frac);
        return frac;
      }
      case 'binom': {
        const top = this.parseArgument();
        const bottom = this.parseArgument();
        return el('mrow', null, text('mo', '('), el('mfrac', { linethickness: '0' }, top, bottom), text('mo', ')'));
      }
      case 'sqrt': {
        const index = this.parseOptional();
        const body = this.parseArgument();
        return index ? el('mroot', null, body, index) : el('msqrt', null, body);
      }
      case 'underline':
        return el('munder', { accentunder: 'true' }, this.parseArgument(), text('mo', '_', { stretchy: 'true' }));
      case 'text':
      case 'textrm':
      case 'textit':
      case 'mbox':
        return text('mtext', this.parseRawGroup());
      case 'mathrm':
      case 'operatorname':
        return text('mi', this.parseRawGroup().trim(), { mathvariant: 'normal' });
      case 'mathbf':
      case 'textbf':
        return text('mi', this.parseRawGroup().trim(), { mathvariant: 'bold' });
      case 'mathbb': {
        const raw = this.parseRawGroup().trim();
        return text('mi', [...raw].map((c) => DOUBLE_STRUCK[c] ?? c).join(''));
      }
      case 'left':
      case 'right':
      case 'big':
      case 'Big':
      case 'bigg':
      case 'Bigg':
        return this.parseFence(name);
      case 'begin':
        return this.parseEnvironment(this.parseRawGroup().trim());
      case 'end':
        this.parseRawGroup();
        return null;
      case '{':
        return text('mo', '{', { stretchy: 'false' });
      case '}':
        return text('mo', '}', { stretchy: 'false' });
      case '%':
      case '$':
      case '#':
      case '&':
      case '_':
        return text('mo', name);
      case '|':
        return text('mo', '‖');
      case 'displaystyle':
        return null;
      default:
        // Lệnh chưa hỗ trợ: hiện nguyên văn, tô đỏ để dễ sửa
        return text('mtext', `\\${name}`, { mathcolor: '#d4380d' });
    }
  }

  /** \left( … \right) và \big( */
  parseFence(name) {
    const delimTok = this.next();
    const delim = (tok) => {
      if (!tok) return '';
      if (tok.type === 'char') return tok.value === '.' ? '' : tok.value;
      if (tok.type === 'cmd') {
        if (tok.value === '{') return '{';
        if (tok.value === '}') return '}';
        if (tok.value === '|') return '‖';
        return OPERATORS[tok.value] ?? '';
      }
      return '';
    };
    const open = delim(delimTok);
    if (name !== 'left') {
      return text('mo', open, { stretchy: name === 'right' ? 'true' : 'false', fence: 'true' });
    }
    const body = this.parseList((tk) => tk.type === 'cmd' && tk.value === 'right');
    let close = '';
    if (this.peek()?.type === 'cmd' && this.peek().value === 'right') {
      this.pos++;
      close = delim(this.next());
    }
    return el(
      'mrow',
      null,
      open ? text('mo', open, { fence: 'true', stretchy: 'true' }) : null,
      body,
      close ? text('mo', close, { fence: 'true', stretchy: 'true' }) : null,
    );
  }

  /** matrix / pmatrix / cases / array / aligned … → <mtable> */
  parseEnvironment(env) {
    if (env === 'array') this.parseRawGroup(); // bỏ qua cột căn lề {cc|c}
    const rows = [];
    let cells = [];
    let current = [];
    const endCell = () => {
      cells.push(row(current.length ? current : [el('mrow')]));
      current = [];
    };
    const endRow = () => {
      endCell();
      rows.push(cells);
      cells = [];
    };
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (!t) break;
      if (t.type === 'cmd' && t.value === 'end') {
        this.pos++;
        this.parseRawGroup();
        break;
      }
      if (t.type === 'amp') {
        this.pos++;
        endCell();
        continue;
      }
      if (t.type === 'newline') {
        this.pos++;
        endRow();
        continue;
      }
      if (t.type === 'close') {
        this.pos++;
        continue;
      }
      const node = this.parseWithScripts();
      if (node) current.push(node);
    }
    if (current.length || cells.length) endRow();
    const aligned = env === 'aligned' || env === 'align' || env === 'align*' || env === 'cases';
    const table = el(
      'mtable',
      { columnalign: aligned ? 'left' : 'center', rowspacing: env === 'cases' ? '0.3em' : undefined },
      rows.map((cs) => el('mtr', null, cs.map((c) => el('mtd', null, c)))),
    );
    const [l, r] = MATRIX_FENCES[env] ?? ['', ''];
    if (!l && !r) return table;
    return el('mrow', null, l ? text('mo', l, { stretchy: 'true', fence: 'true' }) : null, table, r ? text('mo', r, { stretchy: 'true', fence: 'true' }) : null);
  }
}

/**
 * Dựng phần tử <math> từ chuỗi LaTeX.
 * @param {string} tex - công thức, không gồm dấu $ bao ngoài
 * @param {{ display?: boolean }} [opts] - display: dạng khối (căn giữa, phân số / cận to)
 * @returns {MathMLElement}
 */
export function latexToMathML(tex, { display = false } = {}) {
  const parser = new Parser(tokenize(tex), display);
  const nodes = parser.parseList();
  const math = el('math', { display: display ? 'block' : 'inline' }, el('mrow', null, nodes));
  // Giữ mã gốc để chép / trình đọc màn hình đọc được
  const annotation = el('annotation', { encoding: 'application/x-tex' }, String(tex ?? ''));
  const semantics = el('semantics', null, math.firstChild, annotation);
  math.append(semantics);
  math.setAttribute('aria-label', String(tex ?? ''));
  return math;
}
