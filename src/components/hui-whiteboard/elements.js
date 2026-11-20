/**
 * Phần tử của bảng vẽ: chạm (hitTest), khung bao, di chuyển, đổi cỡ, bắt dính điểm, nhãn điểm, nền trang, vẽ.
 * Hàm thuần (trừ phần vẽ dùng Canvas 2D) để test riêng. Tọa độ theo trang 1600 × 900.
 *
 * Loại phần tử:
 *   pen / highlighter { points }      line / arrow / rect / ellipse / plot / image { x1, y1, x2, y2 }
 *   text { x, y, text, size }         math { x, y, w, h, tex, size }
 *   point { x, y, label }             circle { cx, cy, r }            polygon { points }
 * Chung: id, color, size, author; `locked` = không chọn / tẩy được (ảnh nền trang PDF).
 */

import { drawPlot, fitView, parsePlot } from '../hui-plot/plot-core.js';

export const PAGE_WIDTH = 1600;
export const PAGE_HEIGHT = 900;
/** Nền trang. */
export const BACKGROUNDS = ['none', 'grid', 'oly', 'lines', 'dots', 'axes'];
/** Bán kính bắt dính vào điểm có sẵn (đơn vị trang). */
export const SNAP_RADIUS = 18;
/** Đơn vị hệ trục của nền "axes" (px trang / 1 đơn vị). */
export const AXES_UNIT = 50;

export const clone = (v) => JSON.parse(JSON.stringify(v));
const BOX_TYPES = ['line', 'arrow', 'rect', 'ellipse', 'plot', 'image'];

/** Khoảng cách từ điểm p tới đoạn ab. */
export function distToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const k = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
}

/** Khung chữ (ước lượng — canvas không đo được khi chưa vẽ). */
function textBox(el) {
  const lines = String(el.text).split('\n');
  return { w: Math.max(...lines.map((l) => l.length)) * el.size * 0.6, h: lines.length * el.size * 1.25 };
}

/** Các đoạn thẳng gần đúng của phần tử nét (dùng cho tẩy / chạm). */
export function segmentsOf(el) {
  if (el.type === 'polygon') {
    const pts = el.points;
    return pts.map((p, i) => [p, pts[(i + 1) % pts.length]]);
  }
  if (el.points) {
    const pts = el.points.length === 1 ? [el.points[0], el.points[0]] : el.points;
    return pts.slice(1).map((p, i) => [pts[i], p]);
  }
  const { x1, y1, x2, y2 } = el;
  if (el.type === 'line' || el.type === 'arrow') return [[[x1, y1], [x2, y2]]];
  if (el.type === 'rect') {
    const c = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    return c.map((p, i) => [p, c[(i + 1) % 4]]);
  }
  if (el.type === 'ellipse' || el.type === 'circle') {
    const cx = el.type === 'circle' ? el.cx : (x1 + x2) / 2;
    const cy = el.type === 'circle' ? el.cy : (y1 + y2) / 2;
    const rx = el.type === 'circle' ? el.r : Math.abs(x2 - x1) / 2;
    const ry = el.type === 'circle' ? el.r : Math.abs(y2 - y1) / 2;
    const pts = Array.from({ length: 49 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
    return pts.slice(1).map((p, i) => [pts[i], p]);
  }
  return [];
}

/** Khung bao { x1, y1, x2, y2 } của phần tử. */
export function bbox(el) {
  const pad = (el.size || 0) / 2;
  if (el.points) {
    const xs = el.points.map((p) => p[0]);
    const ys = el.points.map((p) => p[1]);
    return { x1: Math.min(...xs) - pad, y1: Math.min(...ys) - pad, x2: Math.max(...xs) + pad, y2: Math.max(...ys) + pad };
  }
  if (el.type === 'text') {
    const { w, h } = textBox(el);
    return { x1: el.x, y1: el.y, x2: el.x + w, y2: el.y + h };
  }
  if (el.type === 'math') return { x1: el.x, y1: el.y, x2: el.x + (el.w || 0), y2: el.y + (el.h || 0) };
  if (el.type === 'point') return { x1: el.x - 8, y1: el.y - 8, x2: el.x + 8, y2: el.y + 8 };
  if (el.type === 'circle') return { x1: el.cx - el.r - pad, y1: el.cy - el.r - pad, x2: el.cx + el.r + pad, y2: el.cy + el.r + pad };
  return {
    x1: Math.min(el.x1, el.x2) - pad,
    y1: Math.min(el.y1, el.y2) - pad,
    x2: Math.max(el.x1, el.x2) + pad,
    y2: Math.max(el.y1, el.y2) + pad,
  };
}

/** Khung bao chung của nhiều phần tử (null khi rỗng). */
export function unionBox(els) {
  if (!els.length) return null;
  return els.map(bbox).reduce((a, b) => ({
    x1: Math.min(a.x1, b.x1),
    y1: Math.min(a.y1, b.y1),
    x2: Math.max(a.x2, b.x2),
    y2: Math.max(a.y2, b.y2),
  }));
}

/** Điểm p có chạm phần tử không (bán kính `r` theo đơn vị trang). */
export function hitTest(el, p, r = 10) {
  if (el.type === 'plot' || el.type === 'image' || el.type === 'text' || el.type === 'math') {
    const b = bbox(el);
    return p[0] >= b.x1 - r && p[0] <= b.x2 + r && p[1] >= b.y1 - r && p[1] <= b.y2 + r;
  }
  if (el.type === 'point') return Math.hypot(p[0] - el.x, p[1] - el.y) <= r + 8;
  const reach = r + (el.size || 0) / 2;
  return segmentsOf(el).some(([a, b]) => distToSegment(p, a, b) <= reach);
}

/** Bản sao phần tử dời đi (dx, dy). */
export function translate(el, dx, dy) {
  const e = clone(el);
  if (e.points) e.points = e.points.map(([x, y]) => [x + dx, y + dy]);
  if ('x1' in e) Object.assign(e, { x1: e.x1 + dx, y1: e.y1 + dy, x2: e.x2 + dx, y2: e.y2 + dy });
  if ('x' in e) Object.assign(e, { x: e.x + dx, y: e.y + dy });
  if ('cx' in e) Object.assign(e, { cx: e.cx + dx, cy: e.cy + dy });
  return e;
}

/**
 * Bản sao phần tử co giãn từ khung `from` sang khung `to` (kéo góc khi chọn). Chữ / công thức đổi cỡ chữ theo,
 * đường tròn giữ tròn.
 */
export function scale(el, from, to) {
  const fw = from.x2 - from.x1 || 1;
  const fh = from.y2 - from.y1 || 1;
  const sx = (to.x2 - to.x1) / fw;
  const sy = (to.y2 - to.y1) / fh;
  const mx = (x) => to.x1 + (x - from.x1) * sx;
  const my = (y) => to.y1 + (y - from.y1) * sy;
  const e = clone(el);
  if (e.points) e.points = e.points.map(([x, y]) => [mx(x), my(y)]);
  if ('x1' in e) Object.assign(e, { x1: mx(e.x1), y1: my(e.y1), x2: mx(e.x2), y2: my(e.y2) });
  if (e.type === 'text' || e.type === 'math') {
    const k = Math.min(sx, sy);
    Object.assign(e, { x: mx(e.x), y: my(e.y), size: Math.max(8, e.size * k) });
    if (e.type === 'math') Object.assign(e, { w: e.w * k, h: e.h * k });
  } else if ('x' in e) {
    Object.assign(e, { x: mx(e.x), y: my(e.y) });
  }
  if (e.type === 'circle') Object.assign(e, { cx: mx(e.cx), cy: my(e.cy), r: Math.max(2, e.r * Math.min(sx, sy)) });
  return e;
}

/** Có đổi cỡ được không (kéo góc). */
export const resizable = (el) => !el.locked && el.type !== 'point';

/** Các điểm bắt dính của trang: điểm, đỉnh đa giác, đầu đoạn thẳng, tâm đường tròn. */
export function snapTargets(els) {
  const out = [];
  for (const e of els) {
    if (e.type === 'point') out.push([e.x, e.y]);
    else if (e.type === 'polygon') out.push(...e.points);
    else if (e.type === 'line' || e.type === 'arrow') out.push([e.x1, e.y1], [e.x2, e.y2]);
    else if (e.type === 'circle') out.push([e.cx, e.cy]);
  }
  return out;
}

/** Điểm gần p nhất trong bán kính `r` (không có thì giữ p). */
export function snapPoint(p, targets, r = SNAP_RADIUS) {
  let best = null;
  let bestD = r;
  for (const t of targets) {
    const d = Math.hypot(t[0] - p[0], t[1] - p[1]);
    if (d <= bestD) {
      best = t;
      bestD = d;
    }
  }
  return best ? [best[0], best[1]] : p;
}

/** Giữ Shift: hướng đoạn thẳng tròn về bội 15°. */
export function snapAngle(from, to, step = Math.PI / 12) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const a = Math.round(Math.atan2(dy, dx) / step) * step;
  return [Math.round((from[0] + len * Math.cos(a)) * 10) / 10, Math.round((from[1] + len * Math.sin(a)) * 10) / 10];
}

/** Nhãn điểm kế tiếp chưa dùng trên trang: A … Z, rồi A1 … Z1, A2… */
export function nextLabel(els) {
  const used = new Set(els.filter((e) => e.type === 'point').map((e) => e.label));
  for (let n = 0; ; n += 1) {
    for (let i = 0; i < 26; i += 1) {
      const label = String.fromCharCode(65 + i) + (n ? String(n) : '');
      if (!used.has(label)) return label;
    }
  }
}

/** Vẽ nền trang (sau màu nền, trước nét vẽ). */
export function drawBackground(ctx, pattern) {
  if (!pattern || pattern === 'none') return;
  ctx.save();
  const line = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  if (pattern === 'grid' || pattern === 'axes') {
    ctx.strokeStyle = pattern === 'axes' ? '#e5e7eb' : '#dbe3ee';
    ctx.lineWidth = 1;
    for (let x = AXES_UNIT; x < PAGE_WIDTH; x += AXES_UNIT) line(x, 0, x, PAGE_HEIGHT);
    for (let y = AXES_UNIT; y < PAGE_HEIGHT; y += AXES_UNIT) line(0, y, PAGE_WIDTH, y);
  } else if (pattern === 'oly') {
    // Giấy ô ly: ô nhỏ 15, cứ 4 ô một đường đậm hơn
    for (let i = 1, x = 15; x < PAGE_WIDTH; i += 1, x += 15) {
      ctx.strokeStyle = i % 4 === 0 ? '#a5b4fc' : '#e0e7ff';
      ctx.lineWidth = i % 4 === 0 ? 1.4 : 0.8;
      line(x, 0, x, PAGE_HEIGHT);
    }
    for (let i = 1, y = 15; y < PAGE_HEIGHT; i += 1, y += 15) {
      ctx.strokeStyle = i % 4 === 0 ? '#a5b4fc' : '#e0e7ff';
      ctx.lineWidth = i % 4 === 0 ? 1.4 : 0.8;
      line(0, y, PAGE_WIDTH, y);
    }
  } else if (pattern === 'lines') {
    ctx.strokeStyle = '#c7d2fe';
    ctx.lineWidth = 1.2;
    for (let y = 60; y < PAGE_HEIGHT; y += 60) line(0, y, PAGE_WIDTH, y);
    ctx.strokeStyle = '#fca5a5';
    line(120, 0, 120, PAGE_HEIGHT);
  } else if (pattern === 'dots') {
    ctx.fillStyle = '#9ca3af';
    for (let x = 40; x < PAGE_WIDTH; x += 40) {
      for (let y = 40; y < PAGE_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (pattern === 'axes') {
    const ox = PAGE_WIDTH / 2;
    const oy = PAGE_HEIGHT / 2;
    ctx.strokeStyle = '#374151';
    ctx.fillStyle = '#374151';
    ctx.lineWidth = 2;
    line(0, oy, PAGE_WIDTH - 4, oy);
    line(ox, PAGE_HEIGHT, ox, 4);
    // Mũi tên
    for (const [x, y, dx, dy] of [[PAGE_WIDTH - 4, oy, -1, 0], [ox, 4, 0, 1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * 14 - dy * 6, y + dy * 14 - dx * 6);
      ctx.lineTo(x + dx * 14 + dy * 6, y + dy * 14 + dx * 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 1.5;
    for (let k = -15; k <= 15; k += 1) {
      const x = ox + k * AXES_UNIT;
      if (!k || x <= 0 || x >= PAGE_WIDTH - 20) continue;
      line(x, oy - 5, x, oy + 5);
      ctx.fillText(String(k).replace('-', '−'), x, oy + 8);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let k = -8; k <= 8; k += 1) {
      const y = oy - k * AXES_UNIT;
      if (!k || y <= 20 || y >= PAGE_HEIGHT) continue;
      line(ox - 5, y, ox + 5, y);
      ctx.fillText(String(k).replace('-', '−'), ox - 9, y);
    }
    ctx.font = 'italic 20px serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('O', ox - 6, oy + 6);
    ctx.fillText('x', PAGE_WIDTH - 10, oy + 10);
    ctx.textAlign = 'left';
    ctx.fillText('y', ox + 10, 8);
  }
  ctx.restore();
}

/** Kết quả phân tích công thức theo nội dung (bảng vẽ lại liên tục khi đang kéo nét khác). */
const plotCache = new Map();
function parsedPlot(value) {
  let plot = plotCache.get(value);
  if (!plot) {
    plot = parsePlot(value);
    if (plotCache.size > 50) plotCache.delete(plotCache.keys().next().value);
    plotCache.set(value, plot);
  }
  return plot;
}

/** Đồ thị trên bảng: khung trục theo dòng `x: … / y: …`; thiếu y thì đơn vị hai trục bằng nhau, gốc ở giữa. */
function drawPlotElement(ctx, el) {
  const x = Math.min(el.x1, el.x2);
  const y = Math.min(el.y1, el.y2);
  const w = Math.abs(el.x2 - el.x1);
  const h = Math.abs(el.y2 - el.y1);
  if (w < 2 || h < 2) return;
  const plot = parsedPlot(el.value ?? '');
  drawPlot(ctx, plot, fitView(plot.view, h / w), { x, y, w, h, font: 18, background: '#ffffff' });
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
}

/**
 * Vẽ một phần tử. `res.image(src)` → ảnh đã tải xong (hoặc null), `res.math(el)` → { img } đã sẵn (hoặc null).
 * Ảnh / công thức chưa tải xong: vẽ khung chờ.
 */
export function drawElement(ctx, el, res = {}) {
  ctx.save();
  if (el.type === 'plot') {
    if (el.value) {
      drawPlotElement(ctx, el);
    } else {
      // Khung đang kéo / đang gõ công thức
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.min(el.x1, el.x2), Math.min(el.y1, el.y2), Math.abs(el.x2 - el.x1), Math.abs(el.y2 - el.y1));
    }
    ctx.restore();
    return;
  }
  if (el.type === 'image' || el.type === 'math') {
    const b = bbox(el);
    const img = el.type === 'image' ? res.image?.(el.src) : res.math?.(el)?.img;
    if (img) {
      ctx.drawImage(img, b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
    } else if (el.type === 'math') {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${Math.max(12, el.size * 0.6)}px monospace`;
      ctx.textBaseline = 'top';
      ctx.fillText(el.tex, b.x1, b.y1);
    } else {
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
    }
    ctx.restore();
    return;
  }
  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = el.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (el.type === 'pen' || el.type === 'highlighter') {
    if (el.type === 'highlighter') ctx.globalAlpha = 0.35;
    const pts = el.points;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) {
      ctx.lineTo(pts[0][0] + 0.01, pts[0][1]);
    } else {
      // Làm mượt bằng đường cong qua trung điểm các đoạn
      for (let i = 1; i < pts.length - 1; i += 1) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last[0], last[1]);
    }
    ctx.stroke();
  } else if (el.type === 'line' || el.type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(el.x1, el.y1);
    ctx.lineTo(el.x2, el.y2);
    if (el.type === 'arrow') {
      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const head = Math.max(14, el.size * 3.5);
      for (const s of [-1, 1]) {
        ctx.moveTo(el.x2, el.y2);
        ctx.lineTo(el.x2 - head * Math.cos(angle + (s * Math.PI) / 7), el.y2 - head * Math.sin(angle + (s * Math.PI) / 7));
      }
    }
    ctx.stroke();
  } else if (el.type === 'rect') {
    ctx.strokeRect(Math.min(el.x1, el.x2), Math.min(el.y1, el.y2), Math.abs(el.x2 - el.x1), Math.abs(el.y2 - el.y1));
  } else if (el.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse((el.x1 + el.x2) / 2, (el.y1 + el.y2) / 2, Math.abs(el.x2 - el.x1) / 2, Math.abs(el.y2 - el.y1) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (el.type === 'circle') {
    ctx.beginPath();
    ctx.arc(el.cx, el.cy, Math.max(0.5, el.r), 0, Math.PI * 2);
    ctx.stroke();
    // Tâm
    ctx.beginPath();
    ctx.arc(el.cx, el.cy, Math.max(2.5, el.size * 0.7), 0, Math.PI * 2);
    ctx.fill();
  } else if (el.type === 'polygon') {
    const pts = el.points;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    if (el.closed !== false) ctx.closePath();
    ctx.stroke();
  } else if (el.type === 'point') {
    ctx.beginPath();
    ctx.arc(el.x, el.y, Math.max(4, el.size * 1.2), 0, Math.PI * 2);
    ctx.fill();
    if (el.label) {
      ctx.font = `italic ${Math.max(20, 16 + el.size * 2)}px 'Times New Roman', serif`;
      ctx.textBaseline = 'bottom';
      ctx.fillText(el.label, el.x + 8, el.y - 6);
    }
  } else if (el.type === 'text') {
    ctx.font = `${el.size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    ctx.textBaseline = 'top';
    String(el.text)
      .split('\n')
      .forEach((line, i) => ctx.fillText(line, el.x, el.y + i * el.size * 1.25));
  }
  ctx.restore();
}

/** Khung chọn (nét đứt) + ô kéo đổi cỡ ở góc dưới phải. */
export function drawSelection(ctx, box, { handle = true } = {}) {
  if (!box) return;
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x1 - 6, box.y1 - 6, box.x2 - box.x1 + 12, box.y2 - box.y1 + 12);
  if (handle) {
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(box.x2 - 2, box.y2 - 2, 16, 16);
    ctx.strokeRect(box.x2 - 2, box.y2 - 2, 16, 16);
  }
  ctx.restore();
}

/** Điểm p có trúng ô kéo đổi cỡ của khung chọn không. */
export const onHandle = (box, p) => Boolean(box) && p[0] >= box.x2 - 8 && p[0] <= box.x2 + 22 && p[1] >= box.y2 - 8 && p[1] <= box.y2 + 22;

/** BOX_TYPES: phần tử khung chữ nhật (x1..y2). */
export const isBox = (el) => BOX_TYPES.includes(el.type);
