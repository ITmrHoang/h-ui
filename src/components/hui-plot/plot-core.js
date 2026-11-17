/**
 * Lõi vẽ đồ thị (dùng chung cho hui-plot và hui-whiteboard): phân tích từng dòng thành đối tượng rồi vẽ lên
 * Canvas 2D trong một khung bất kỳ.
 *
 * Mỗi dòng một đối tượng:
 *   y = 2x + 1          hàm số (cũng nhận `f(x) = …` hoặc chỉ biểu thức có x)
 *   x = 3               đường thẳng đứng
 *   y > x^2 - 1         miền nghiệm (tô màu; < > nét đứt, ≤ ≥ nét liền)
 *   A(1; 2)  /  (1; 2)  điểm (dấu ; ngăn cách tọa độ)
 *   a = 2               giá trị ban đầu của tham số a (thanh trượt)
 *   x: -2 .. 5          khung trục (cũng nhận `y: [-1; 4]`)
 *   # ghi chú           bỏ qua
 */

import { ExprError, compile, parse, variables } from './expr.js';

export const PLOT_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#d97706', '#0891b2'];
const RESERVED = new Set(['x', 'y']);

/** Tách các phần ngăn bởi `;` ở ngoài ngoặc (dùng khi gõ nhiều đồ thị trên một dòng). */
export function splitTop(src, sep = ';') {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(src)) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === sep && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Văn bản → { items, params, errors, view } (view: khung trục ghi trong văn bản, có thể thiếu cạnh).
 * item: { kind: 'fn' | 'vline' | 'ineq' | 'point', label, color, f?, op?, x?, y?, name? }
 */
export function parsePlot(text) {
  const items = [];
  const errors = [];
  const params = {};
  const view = {};
  const names = new Set();
  const lines = String(text ?? '')
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  let colorIndex = 0;
  const nextColor = () => PLOT_COLORS[colorIndex++ % PLOT_COLORS.length];
  const use = (tree) => {
    for (const v of variables(tree)) if (!RESERVED.has(v)) names.add(v);
    return compile(tree);
  };

  for (const line of lines) {
    try {
      // Khung trục: `x: -2 .. 5`, `y: [-1; 4]`, `x: -2pi .. 2pi`
      const range = /^([xy])\s*:\s*\[?\s*(.+?)\s*(?:\.\.|…|;)\s*(.+?)\s*\]?$/.exec(line);
      if (range) {
        const num = (s) => {
          const tree = parse(s);
          if (variables(tree).size) throw new ExprError('Khung trục chỉ nhận số');
          return compile(tree)({});
        };
        const [lo, hi] = [num(range[2]), num(range[3])].sort((a, b) => a - b);
        if (!(hi - lo > 0) || !Number.isFinite(hi - lo)) throw new ExprError('Khung trục phải có hai đầu khác nhau');
        view[`${range[1]}Min`] = lo;
        view[`${range[1]}Max`] = hi;
        continue;
      }
      // Điểm: A(1; 2) hoặc (1; 2)
      const point = /^([A-Za-z][A-Za-z0-9']*)?\s*\((.+);(.+)\)$/.exec(line);
      if (point) {
        items.push({ kind: 'point', label: line, name: point[1] || '', x: use(parse(point[2])), y: use(parse(point[3])), color: nextColor() });
        continue;
      }
      // Tham số: a = 2
      const param = /^([a-wzA-WZ])\s*=\s*(-?[0-9]+(?:[.,][0-9]+)?)$/.exec(line);
      if (param && !RESERVED.has(param[1].toLowerCase())) {
        params[param[1].toLowerCase()] = Number(param[2].replace(',', '.'));
        continue;
      }
      const ineq = /^y\s*(<=|>=|≤|≥|<|>)\s*(.+)$/.exec(line);
      if (ineq) {
        const op = { '<=': '≤', '>=': '≥' }[ineq[1]] ?? ineq[1];
        items.push({ kind: 'ineq', op, label: line, f: use(parse(ineq[2])), color: nextColor() });
        continue;
      }
      const vline = /^x\s*=\s*(.+)$/.exec(line);
      if (vline) {
        const tree = parse(vline[1]);
        if (variables(tree).has('x') || variables(tree).has('y')) throw new ExprError('Phương trình ẩn chưa hỗ trợ');
        items.push({ kind: 'vline', label: line, x: use(tree), color: nextColor() });
        continue;
      }
      const fn = /^(?:y|[a-zA-Z]\s*\(\s*x\s*\))\s*=\s*(.+)$/.exec(line);
      const body = fn ? fn[1] : line;
      if (/[=<>≤≥]/.test(body)) throw new ExprError('Phương trình ẩn (dạng F(x; y) = 0) chưa hỗ trợ');
      const tree = parse(body);
      if (variables(tree).has('y')) throw new ExprError('Phương trình ẩn (có cả x và y) chưa hỗ trợ');
      items.push({ kind: 'fn', label: line, f: use(tree), color: nextColor() });
    } catch (e) {
      errors.push({ line, message: e instanceof ExprError ? e.message : 'Không hiểu dòng này' });
    }
  }
  for (const n of names) if (!(n in params)) params[n] = 1;
  return { items, params, errors, view };
}

/** Bước chia trục đẹp (1, 2, 5 × 10^k) cho khoảng `range`, khoảng `target` vạch. */
export function niceStep(range, target = 8) {
  const raw = Math.abs(range) / target;
  if (!raw || !Number.isFinite(raw)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
}

/** Số kiểu Việt Nam ngắn gọn: 0.5 → "0,5", 1e-16 → "0". */
export function formatTick(v, step) {
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const r = Math.abs(v) < step / 1e6 ? 0 : v;
  return r.toFixed(Math.min(digits, 6)).replace('-', '−').replace('.', ',');
}

/** Tọa độ điểm: tối đa 2 chữ số thập phân, bỏ số 0 thừa (1 → "1", 0.5 → "0,5", −1/3 → "−0,33"). */
export function formatCoord(v) {
  const r = Math.round(v * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r).replace('-', '−').replace('.', ',');
}

export const DEFAULT_VIEW = { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };

/**
 * Khung trục đầy đủ: cạnh y thiếu thì tính theo tỉ lệ khung (đơn vị hai trục bằng nhau, giữa là y = 0)
 * để góc, độ dốc, hình tròn không bị méo.
 * @param {{ xMin?, xMax?, yMin?, yMax? }} view
 * @param {number} ratio - cao / rộng của khung vẽ
 */
export function fitView(view, ratio) {
  const xMin = view.xMin ?? DEFAULT_VIEW.xMin;
  const xMax = view.xMax ?? DEFAULT_VIEW.xMax;
  if (view.yMin != null && view.yMax != null) return { xMin, xMax, yMin: view.yMin, yMax: view.yMax };
  const span = (xMax - xMin) * (ratio > 0 && Number.isFinite(ratio) ? ratio : 2 / 3);
  if (view.yMin != null) return { xMin, xMax, yMin: view.yMin, yMax: view.yMin + span };
  if (view.yMax != null) return { xMin, xMax, yMin: view.yMax - span, yMax: view.yMax };
  return { xMin, xMax, yMin: -span / 2, yMax: span / 2 };
}

/**
 * Vẽ đồ thị vào khung (x, y, w, h) của ctx (đơn vị của ctx hiện tại).
 * @param {{ items, params }} plot - kết quả parsePlot
 * @param {{ xMin, xMax, yMin, yMax }} view
 * @param {{ x?, y?, w, h, font?, background?, legend? }} box
 */
export function drawPlot(ctx, plot, view, box) {
  const { x: bx = 0, y: by = 0, w, h } = box;
  const fontSize = box.font ?? 12;
  const env = { ...plot.params, pi: Math.PI, e: Math.E };
  const sx = (x) => bx + ((x - view.xMin) / (view.xMax - view.xMin)) * w;
  const sy = (y) => by + h - ((y - view.yMin) / (view.yMax - view.yMin)) * h;

  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, by, w, h);
  ctx.clip();
  if (box.background) {
    ctx.fillStyle = box.background;
    ctx.fillRect(bx, by, w, h);
  }

  // Lưới + trục
  const stepX = niceStep(view.xMax - view.xMin, Math.max(4, w / 70));
  const stepY = niceStep(view.yMax - view.yMin, Math.max(4, h / 60));
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e5e7eb';
  ctx.beginPath();
  for (let gx = Math.ceil(view.xMin / stepX) * stepX; gx <= view.xMax; gx += stepX) {
    ctx.moveTo(Math.round(sx(gx)) + 0.5, by);
    ctx.lineTo(Math.round(sx(gx)) + 0.5, by + h);
  }
  for (let gy = Math.ceil(view.yMin / stepY) * stepY; gy <= view.yMax; gy += stepY) {
    ctx.moveTo(bx, Math.round(sy(gy)) + 0.5);
    ctx.lineTo(bx + w, Math.round(sy(gy)) + 0.5);
  }
  ctx.stroke();

  const ox = Math.min(Math.max(sx(0), bx), bx + w);
  const oy = Math.min(Math.max(sy(0), by), by + h);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx, oy);
  ctx.lineTo(bx + w, oy);
  ctx.moveTo(ox, by + h);
  ctx.lineTo(ox, by);
  // mũi tên
  ctx.moveTo(bx + w - 8, oy - 4);
  ctx.lineTo(bx + w, oy);
  ctx.lineTo(bx + w - 8, oy + 4);
  ctx.moveTo(ox - 4, by + 8);
  ctx.lineTo(ox, by);
  ctx.lineTo(ox + 4, by + 8);
  ctx.stroke();

  ctx.fillStyle = '#4b5563';
  ctx.font = `${fontSize}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let gx = Math.ceil(view.xMin / stepX) * stepX; gx <= view.xMax; gx += stepX) {
    if (Math.abs(gx) < stepX / 2) continue;
    ctx.fillText(formatTick(gx, stepX), sx(gx), Math.min(oy + 3, by + h - fontSize - 2));
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let gy = Math.ceil(view.yMin / stepY) * stepY; gy <= view.yMax; gy += stepY) {
    if (Math.abs(gy) < stepY / 2) continue;
    ctx.fillText(formatTick(gy, stepY), Math.max(ox - 4, bx + fontSize * 2), sy(gy));
  }
  ctx.font = `italic ${fontSize + 1}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.fillText('x', bx + w - fontSize, oy - fontSize);
  ctx.fillText('y', ox + 6, by + fontSize);
  ctx.textAlign = 'right';
  ctx.fillText('O', ox - 3, oy + fontSize * 0.8);

  // Đối tượng
  const samples = Math.max(200, Math.round(w * 2));
  for (const item of plot.items) {
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    if (item.kind === 'fn' || item.kind === 'ineq') {
      const pts = [];
      for (let i = 0; i <= samples; i += 1) {
        const x = view.xMin + ((view.xMax - view.xMin) * i) / samples;
        pts.push([x, item.f({ ...env, x })]);
      }
      if (item.kind === 'ineq') {
        // Tô miền nghiệm
        const above = item.op === '>' || item.op === '≥';
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        let open = false;
        for (const [x, y] of pts) {
          if (!Number.isFinite(y)) continue;
          const py = Math.min(Math.max(sy(y), by - 10), by + h + 10);
          if (!open) {
            ctx.moveTo(sx(x), above ? by - 10 : by + h + 10);
            open = true;
          }
          ctx.lineTo(sx(x), py);
        }
        if (open) {
          ctx.lineTo(sx(view.xMax), above ? by - 10 : by + h + 10);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        if (item.op === '<' || item.op === '>') ctx.setLineDash([8, 6]);
      }
      // Nét: ngắt ở điểm không xác định hoặc nhảy vọt (tiệm cận đứng như tan x, 1/x)
      ctx.beginPath();
      let prev = null;
      const jump = (view.yMax - view.yMin) * 3;
      for (const [x, y] of pts) {
        if (!Number.isFinite(y)) {
          prev = null;
          continue;
        }
        if (prev && Math.abs(y - prev[1]) > jump) prev = null;
        const px = sx(x);
        const py = Math.min(Math.max(sy(y), by - h), by + 2 * h);
        if (prev) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
        prev = [x, y];
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (item.kind === 'vline') {
      const x = item.x(env);
      if (Number.isFinite(x)) {
        ctx.beginPath();
        ctx.moveTo(sx(x), by);
        ctx.lineTo(sx(x), by + h);
        ctx.stroke();
      }
    } else if (item.kind === 'point') {
      const x = item.x(env);
      const y = item.y(env);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        ctx.beginPath();
        ctx.arc(sx(x), sy(y), 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        const coords = `(${formatCoord(x)}; ${formatCoord(y)})`;
        ctx.fillText(item.name ? `${item.name}${coords}` : coords, sx(x) + 6, sy(y) - 4);
      }
    }
  }

  // Chú thích
  if (box.legend !== false && plot.items.some((i) => i.kind !== 'point')) {
    ctx.font = `${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const rows = plot.items.filter((i) => i.kind !== 'point');
    const lw = Math.min(w - 16, Math.max(...rows.map((r) => ctx.measureText(r.label).width)) + 34);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(bx + 8, by + 8, lw, rows.length * (fontSize + 8) + 6);
    rows.forEach((r, i) => {
      const yy = by + 14 + i * (fontSize + 8) + fontSize / 2;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx + 14, yy);
      ctx.lineTo(bx + 30, yy);
      ctx.stroke();
      ctx.fillStyle = '#111827';
      ctx.fillText(r.label, bx + 36, yy, lw - 30);
    });
  }
  ctx.restore();
}
