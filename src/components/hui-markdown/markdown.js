/**
 * Markdown rút gọn → DOM (không dùng innerHTML, HTML trong nội dung hiện như chữ thường — an toàn XSS).
 *
 * Khối: tiêu đề `#`…`######`, đoạn văn (xuống dòng giữ nguyên), danh sách `-` `*` `+` / `1.` `1)` (lồng nhau
 * theo thụt lề), trích dẫn `>`, khối code ```, đường kẻ `---`, bảng `| a | b |`, công thức khối `$$ … $$`.
 * Trong dòng: **đậm**, *nghiêng*, ~~gạch~~, `code`, [link](url), ![ảnh](url), công thức `$…$`, `\$` = dấu $.
 * Link chỉ nhận http(s), mailto, đường dẫn tương đối; ảnh nhận thêm data:image/*.
 */

import { latexToMathML } from '../hui-math/latex.js';

const SAFE_LINK = /^(https?:|mailto:|\/|#|\.\/|\.\.\/)/i;
const SAFE_IMAGE = /^(https?:|\/|\.\/|\.\.\/|data:image\/(png|jpe?g|gif|webp|svg\+xml);)/i;

function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v !== undefined && v !== null && v !== false) node.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

// =====================================================
// TRONG DÒNG
// =====================================================

/** Các mẫu trong dòng, thử theo thứ tự; lấy mẫu khớp sớm nhất trong chuỗi */
const INLINE = [
  { kind: 'escape', re: /\\([\\`*_{}[\]()#+\-.!$~|])/ },
  { kind: 'code', re: /`([^`\n]+)`/ },
  { kind: 'math', re: /\$(?!\s)((?:\\.|[^$\\\n])+?)\$/ },
  { kind: 'image', re: /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/ },
  { kind: 'link', re: /\[([^\]]+)\]\(\s*([^)\s]+)\s*\)/ },
  { kind: 'strong', re: /\*\*(?=\S)([\s\S]+?)\*\*|__(?=\S)([\s\S]+?)__/ },
  { kind: 'strike', re: /~~(?=\S)([\s\S]+?)~~/ },
  { kind: 'em', re: /\*(?=\S)([^*]+?)\*|(?<![\p{L}\p{N}])_(?=\S)([^_]+?)_(?![\p{L}\p{N}])/u },
];

/**
 * @param {string} src
 * @param {{ breaks?: boolean }} opts - breaks: xuống dòng đơn → <br>
 * @returns {Node[]}
 */
export function parseInline(src, opts = {}) {
  const out = [];
  let rest = src;
  while (rest) {
    let best = null;
    for (const p of INLINE) {
      const m = p.re.exec(rest);
      if (m && (best === null || m.index < best.m.index)) best = { p, m };
    }
    if (!best) {
      out.push(...textWithBreaks(rest, opts));
      break;
    }
    const { p, m } = best;
    if (m.index > 0) out.push(...textWithBreaks(rest.slice(0, m.index), opts));
    out.push(inlineNode(p.kind, m, opts));
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

function textWithBreaks(text, { breaks = true } = {}) {
  if (!breaks) return [document.createTextNode(text.replace(/\n/g, ' '))];
  const parts = text.split('\n');
  const out = [];
  parts.forEach((part, i) => {
    if (i > 0) out.push(h('br'));
    if (part) out.push(document.createTextNode(part));
  });
  return out;
}

function inlineNode(kind, m, opts) {
  switch (kind) {
    case 'escape':
      return document.createTextNode(m[1]);
    case 'code':
      return h('code', null, m[1]);
    case 'math':
      return latexToMathML(m[1], { display: false });
    case 'image': {
      const url = m[2];
      if (!SAFE_IMAGE.test(url)) return document.createTextNode(m[0]);
      return h('img', { src: url, alt: m[1], title: m[3], loading: 'lazy' });
    }
    case 'link': {
      const url = m[2];
      if (!SAFE_LINK.test(url)) return document.createTextNode(m[1]);
      const external = /^https?:/i.test(url);
      return h('a', { href: url, target: external ? '_blank' : undefined, rel: external ? 'noopener noreferrer' : undefined }, parseInline(m[1], opts));
    }
    case 'strong':
      return h('strong', null, parseInline(m[1] ?? m[2], opts));
    case 'strike':
      return h('del', null, parseInline(m[1], opts));
    case 'em':
      return h('em', null, parseInline(m[1] ?? m[2], opts));
    default:
      return document.createTextNode(m[0]);
  }
}

// =====================================================
// KHỐI
// =====================================================

const RE_HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_HR = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;
const RE_FENCE = /^ {0,3}(```|~~~)\s*([\w+-]*)\s*$/;
const RE_LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const RE_QUOTE = /^ {0,3}>\s?(.*)$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  // Tách theo | không thoát (\|) và không nằm trong $…$
  const cells = [];
  let cur = '';
  let inMath = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') {
      cur += '|';
      i++;
    } else if (c === '$') {
      inMath = !inMath;
      cur += c;
    } else if (c === '|' && !inMath) {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function alignOf(sep) {
  const s = sep.trim();
  if (s.startsWith(':') && s.endsWith(':')) return 'center';
  if (s.endsWith(':')) return 'right';
  if (s.startsWith(':')) return 'left';
  return undefined;
}

const isBlank = (line) => line.trim() === '';

/**
 * @param {string} src
 * @param {{ breaks?: boolean }} [opts]
 * @returns {Node[]}
 */
export function parseBlocks(src, opts = {}) {
  const lines = String(src ?? '').replace(/\r\n?/g, '\n').split('\n');
  return parseLines(lines, opts);
}

function parseLines(lines, opts) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }

    // Khối code
    const fence = RE_FENCE.exec(line);
    if (fence) {
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
      i++;
      out.push(h('pre', null, h('code', { 'data-lang': fence[2] || undefined }, body.join('\n'))));
      continue;
    }

    // Công thức khối $$ … $$
    if (line.trim().startsWith('$$')) {
      const first = line.trim().slice(2);
      let tex = '';
      if (first.endsWith('$$') && first.length >= 2) {
        tex = first.slice(0, -2);
        i++;
      } else {
        const body = [first];
        i++;
        while (i < lines.length && !lines[i].includes('$$')) body.push(lines[i++]);
        if (i < lines.length) body.push(lines[i].slice(0, lines[i].indexOf('$$')));
        i++;
        tex = body.join('\n');
      }
      out.push(h('div', { class: 'md-math' }, latexToMathML(tex.trim(), { display: true })));
      continue;
    }

    const heading = RE_HEADING.exec(line);
    if (heading) {
      out.push(h(`h${heading[1].length}`, null, parseInline(heading[2], opts)));
      i++;
      continue;
    }

    if (RE_HR.test(line)) {
      out.push(h('hr'));
      i++;
      continue;
    }

    // Bảng: dòng có | và dòng sau là dòng kẻ
    if (line.includes('|') && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1])) {
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map(alignOf);
      i += 2;
      const rows = [];
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes('|')) rows.push(splitRow(lines[i++]));
      const cell = (tag, text, idx) => h(tag, { style: aligns[idx] ? `text-align:${aligns[idx]}` : undefined }, parseInline(text, opts));
      out.push(
        h(
          'div',
          { class: 'md-table' },
          h(
            'table',
            null,
            h('thead', null, h('tr', null, header.map((c, idx) => cell('th', c, idx)))),
            h('tbody', null, rows.map((r) => h('tr', null, header.map((_, idx) => cell('td', r[idx] ?? '', idx))))),
          ),
        ),
      );
      continue;
    }

    // Trích dẫn
    if (RE_QUOTE.test(line)) {
      const body = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) body.push(RE_QUOTE.exec(lines[i++])[1]);
      out.push(h('blockquote', null, parseLines(body, opts)));
      continue;
    }

    // Danh sách
    const list = RE_LIST.exec(line);
    if (list) {
      const consumed = parseList(lines, i, opts);
      out.push(consumed.node);
      i = consumed.next;
      continue;
    }

    // Đoạn văn: gom tới dòng trống hoặc khối khác
    const para = [line];
    i++;
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !RE_HEADING.test(lines[i]) &&
      !RE_FENCE.test(lines[i]) &&
      !RE_QUOTE.test(lines[i]) &&
      !RE_LIST.test(lines[i]) &&
      !lines[i].trim().startsWith('$$') &&
      !RE_HR.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    out.push(h('p', null, parseInline(para.map((l) => l.trim()).join('\n'), opts)));
  }
  return out;
}

/** Danh sách (lồng nhau theo thụt lề) bắt đầu ở dòng `start`. */
function parseList(lines, start, opts) {
  const first = RE_LIST.exec(lines[start]);
  const indent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = RE_LIST.exec(lines[i]);
    if (!m || m[1].length !== indent || /\d/.test(m[2]) !== ordered) break;
    const body = [m[3]];
    i++;
    // Dòng tiếp nối / danh sách con (thụt sâu hơn)
    while (i < lines.length && !isBlank(lines[i])) {
      const sub = RE_LIST.exec(lines[i]);
      if (sub && sub[1].length <= indent) break;
      if (!sub && !/^\s+/.test(lines[i])) break;
      body.push(lines[i].slice(Math.min(indent + 2, lines[i].search(/\S/))));
      i++;
    }
    const nested = body.slice(1).some((l) => RE_LIST.test(l));
    const li = nested
      ? h('li', null, parseLines(body, opts).flatMap((n) => (n.tagName === 'P' ? [...n.childNodes] : [n])))
      : h('li', null, parseInline(body.join('\n'), opts));
    items.push(li);
  }
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  const node = h(ordered ? 'ol' : 'ul', { start: ordered && startNum !== 1 ? startNum : undefined }, items);
  return { node, next: i };
}

/**
 * Markdown → danh sách node.
 * @param {string} src
 * @param {{ inline?: boolean, breaks?: boolean }} [opts] - inline: chỉ xử lý trong dòng (không tạo <p>)
 * @returns {Node[]}
 */
export function renderMarkdown(src, { inline = false, breaks = true } = {}) {
  if (inline) return parseInline(String(src ?? ''), { breaks });
  return parseBlocks(src, { breaks });
}
