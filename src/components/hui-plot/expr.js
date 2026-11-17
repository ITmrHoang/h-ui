/**
 * Bộ phân tích biểu thức toán (không dùng eval — an toàn khi học sinh nhập).
 *
 * Nhận cách viết tự nhiên của Việt Nam: nhân ngầm `2x`, `3(x+1)`, `ax`; dấu phẩy thập phân `1,5`; `^`, `²`, `³`;
 * `√x`, `sqrt(x)`, `|x|`, `abs(x)`; sin cos tan cot (tg, cotg), arcsin/asin…, ln, log (cơ số 10), exp, floor, ceil;
 * hằng số `pi` / `π`, `e`. Biến: `x` (và `y`); chữ cái khác là **tham số** (ví dụ `a` trong `y = a*x^2`).
 */

const FUNCS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  tg: Math.tan,
  cot: (v) => 1 / Math.tan(v),
  cotg: (v) => 1 / Math.tan(v),
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  sign: Math.sign,
};
const CONSTS = { pi: Math.PI, e: Math.E };
/** Sắp xếp dài trước để `arcsin` khớp trước `sin`, `cotg` trước `cot`. */
const FUNC_NAMES = Object.keys(FUNCS).sort((a, b) => b.length - a.length);

export class ExprError extends Error {}

/** Chuẩn hóa ký tự Unicode thường gặp khi chép từ Word / bàn phím điện thoại. */
function normalize(src) {
  return String(src)
    .replace(/[−–]/g, '-')
    .replace(/[×·∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/π/g, 'pi');
}

function tokenize(src) {
  const s = normalize(src);
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i += 1;
    } else if (/[0-9.]/.test(c) || (c === ',' && /[0-9]/.test(s[i + 1] ?? '') && /[0-9]/.test(s[i - 1] ?? ''))) {
      let j = i;
      while (j < s.length && (/[0-9.]/.test(s[j]) || (s[j] === ',' && /[0-9]/.test(s[j + 1] ?? '')))) j += 1;
      const text = s.slice(i, j).replace(',', '.');
      const value = Number(text);
      if (!Number.isFinite(value)) throw new ExprError(`Số không hợp lệ: ${s.slice(i, j)}`);
      out.push({ t: 'num', v: value });
      i = j;
    } else if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j += 1;
      let word = s.slice(i, j).toLowerCase();
      // Tách từ: hàm / hằng biết trước, còn lại mỗi chữ cái là một biến (`ax` = a·x).
      while (word) {
        const fn = FUNC_NAMES.find((f) => word.startsWith(f));
        if (fn) {
          out.push({ t: 'fn', v: fn });
          word = word.slice(fn.length);
        } else if (word.startsWith('pi')) {
          out.push({ t: 'num', v: Math.PI });
          word = word.slice(2);
        } else {
          out.push(word[0] === 'e' ? { t: 'num', v: Math.E } : { t: 'id', v: word[0] });
          word = word.slice(1);
        }
      }
      i = j;
    } else if ('+-*/^()|√'.includes(c)) {
      out.push({ t: c });
      i += 1;
    } else {
      throw new ExprError(`Ký tự không hiểu: "${c}"`);
    }
  }
  return out;
}

/**
 * Phân tích thành cây biểu thức.
 * Nút: { k: 'num', v } | { k: 'id', v } | { k: 'neg', a } | { k: 'bin', op, a, b } | { k: 'fn', f, a }
 */
export function parse(src) {
  const toks = tokenize(src);
  let pos = 0;
  let absDepth = 0;
  const peek = () => toks[pos];
  const take = (t) => {
    if (toks[pos]?.t !== t) throw new ExprError(`Thiếu "${t}"`);
    pos += 1;
  };
  const startsPrimary = (tk) =>
    tk && (tk.t === 'num' || tk.t === 'id' || tk.t === 'fn' || tk.t === '(' || tk.t === '√' || (tk.t === '|' && absDepth === 0));

  function expr() {
    let node = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = toks[pos++].t;
      node = { k: 'bin', op, a: node, b: term() };
    }
    return node;
  }

  function term() {
    let node = unary();
    for (;;) {
      const tk = peek();
      if (tk && (tk.t === '*' || tk.t === '/')) {
        pos += 1;
        node = { k: 'bin', op: tk.t, a: node, b: unary() };
      } else if (startsPrimary(tk)) {
        node = { k: 'bin', op: '*', a: node, b: power() };
      } else {
        return node;
      }
    }
  }

  function unary() {
    const tk = peek();
    if (tk?.t === '-') {
      pos += 1;
      return { k: 'neg', a: unary() };
    }
    if (tk?.t === '+') {
      pos += 1;
      return unary();
    }
    return power();
  }

  function power() {
    const base = primary();
    if (peek()?.t === '^') {
      pos += 1;
      return { k: 'bin', op: '^', a: base, b: unary() };
    }
    return base;
  }

  function primary() {
    const tk = toks[pos++];
    if (!tk) throw new ExprError('Biểu thức chưa hết');
    if (tk.t === 'num') return { k: 'num', v: tk.v };
    if (tk.t === 'id') return { k: 'id', v: tk.v };
    if (tk.t === '(') {
      const node = expr();
      take(')');
      return node;
    }
    if (tk.t === '|') {
      absDepth += 1;
      const node = expr();
      absDepth -= 1;
      take('|');
      return { k: 'fn', f: 'abs', a: node };
    }
    if (tk.t === '√') return { k: 'fn', f: 'sqrt', a: power() };
    if (tk.t === 'fn') {
      // sin x, sin(x), sin^2 x (= (sin x)^2)
      if (peek()?.t === '^') {
        pos += 1;
        const exp = primary();
        const arg = peek()?.t === '(' ? primary() : power();
        return { k: 'bin', op: '^', a: { k: 'fn', f: tk.v, a: arg }, b: exp };
      }
      return { k: 'fn', f: tk.v, a: peek()?.t === '(' ? primary() : power() };
    }
    throw new ExprError(`Không hiểu "${tk.t}"`);
  }

  if (!toks.length) throw new ExprError('Biểu thức trống');
  const tree = expr();
  if (pos < toks.length) throw new ExprError(`Thừa "${toks[pos].t === 'num' ? toks[pos].v : toks[pos].v ?? toks[pos].t}"`);
  return tree;
}

/** Các biến / tham số có trong cây. */
export function variables(tree, out = new Set()) {
  if (tree.k === 'id') out.add(tree.v);
  if (tree.a) variables(tree.a, out);
  if (tree.b) variables(tree.b, out);
  return out;
}

/** Cây → hàm tính `(env) => number` (biến chưa có giá trị = NaN). */
export function compile(tree) {
  switch (tree.k) {
    case 'num':
      return () => tree.v;
    case 'id':
      return (env) => (tree.v in env ? env[tree.v] : NaN);
    case 'neg': {
      const a = compile(tree.a);
      return (env) => -a(env);
    }
    case 'fn': {
      const a = compile(tree.a);
      const f = FUNCS[tree.f];
      return (env) => f(a(env));
    }
    default: {
      const a = compile(tree.a);
      const b = compile(tree.b);
      switch (tree.op) {
        case '+':
          return (env) => a(env) + b(env);
        case '-':
          return (env) => a(env) - b(env);
        case '*':
          return (env) => a(env) * b(env);
        case '/':
          return (env) => a(env) / b(env);
        default:
          return (env) => {
            const base = a(env);
            const exp = b(env);
            // Căn bậc lẻ của số âm: x^(1/3) với x < 0 vẫn có nghĩa
            if (base < 0 && !Number.isInteger(exp)) {
              const inv = 1 / exp;
              if (Number.isInteger(Math.round(inv)) && Math.abs(inv - Math.round(inv)) < 1e-9 && Math.round(inv) % 2) {
                return -Math.pow(-base, exp);
              }
            }
            return Math.pow(base, exp);
          };
      }
    }
  }
}

/** Tiện ích: `evaluate('2x + 1', { x: 3 })` → 7. */
export function evaluate(src, env = {}) {
  return compile(parse(src))({ ...CONSTS, ...env });
}
