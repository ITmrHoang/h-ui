/**
 * Công thức trên bảng: LaTeX → MathML (`hui-math`) → ảnh SVG (`foreignObject`) để vẽ lên canvas như nét vẽ
 * (có trong ảnh xuất / ảnh lưu). Đo kích thước bằng một nút ẩn trong trang (cùng phông chữ với ảnh SVG).
 */

import { latexToMathML } from '../hui-math/latex.js';

const FONT = "'Cambria Math', 'STIX Two Math', 'Latin Modern Math', 'Times New Roman', serif";
const PAD = 4;

/** MathML (chuỗi XML) của công thức. */
function mathMarkup(tex) {
  return new XMLSerializer().serializeToString(latexToMathML(String(tex ?? ''), { display: true }));
}

/**
 * Đo khung công thức ở cỡ chữ `size` (px trang). Trả { w, h } đã gồm lề.
 * @param {string} tex
 * @param {number} size
 */
export function measureMath(tex, size) {
  if (typeof document === 'undefined' || !document.body) return { w: String(tex).length * size * 0.6, h: size * 1.4 };
  const box = document.createElement('div');
  box.style.cssText = `position:fixed;left:-10000px;top:0;visibility:hidden;font-size:${size}px;font-family:${FONT};line-height:1.2;white-space:nowrap;display:inline-block`;
  box.append(latexToMathML(String(tex ?? ''), { display: true }));
  // display block làm khung rộng hết dòng → đo phần tử <math> bên trong ở dạng inline-block
  const math = box.firstChild;
  math.style.display = 'inline-block';
  math.style.margin = '0';
  document.body.append(box);
  const r = math.getBoundingClientRect();
  box.remove();
  return { w: Math.ceil(Math.max(r.width, size * 0.6)) + PAD * 2, h: Math.ceil(Math.max(r.height, size)) + PAD * 2 };
}

/** Chuỗi SVG chứa công thức, kích thước w × h. */
export function mathSvg(tex, size, color, w, h) {
  const style = `font-size:${size}px;font-family:${FONT};color:${color || '#111827'};line-height:1.2;padding:${PAD}px;white-space:nowrap`;
  const markup = mathMarkup(tex).replace('<math ', '<math style="display:inline-block;margin:0" ');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="${style}">${markup}</div>` +
    '</foreignObject></svg>'
  );
}

/**
 * Bộ nhớ ảnh công thức theo (tex, cỡ, màu, khung). `get(el)` trả ảnh đã sẵn hoặc null (đang tải → gọi `onReady`).
 * @param {() => void} onReady
 */
export function createMathCache(onReady) {
  const cache = new Map();
  const get = (el) => {
    const w = Math.max(1, Math.round(el.w || 1));
    const h = Math.max(1, Math.round(el.h || 1));
    const size = Math.round(el.size * 10) / 10;
    const key = `${el.tex}|${size}|${el.color}|${w}x${h}`;
    let entry = cache.get(key);
    if (!entry) {
      if (cache.size > 200) cache.delete(cache.keys().next().value);
      const img = new Image();
      entry = { img, ready: false };
      entry.promise = new Promise((resolve) => {
        img.onload = () => {
          entry.ready = true;
          resolve();
          onReady?.();
        };
        img.onerror = () => resolve();
      });
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mathSvg(el.tex, size, el.color, w, h))}`;
      cache.set(key, entry);
    }
    return entry;
  };
  return {
    /** Ảnh đã tải xong (hoặc null) */
    image: (el) => {
      const e = get(el);
      return e.ready ? { img: e.img } : null;
    },
    /** Chờ ảnh của các phần tử công thức tải xong */
    ready: (els) => Promise.all(els.filter((e) => e.type === 'math').map((e) => get(e).promise)),
  };
}

/** Bộ nhớ ảnh theo link (ảnh chèn / ảnh nền trang PDF). */
export function createImageCache(onReady) {
  const cache = new Map();
  const get = (src) => {
    let entry = cache.get(src);
    if (!entry) {
      const img = new Image();
      entry = { img, ready: false };
      entry.promise = new Promise((resolve) => {
        img.onload = () => {
          entry.ready = true;
          resolve();
          onReady?.();
        };
        img.onerror = () => resolve();
      });
      img.src = src;
      cache.set(src, entry);
    }
    return entry;
  };
  return {
    image: (src) => {
      const e = get(src);
      return e.ready ? e.img : null;
    },
    ready: (els) => Promise.all(els.filter((e) => e.type === 'image' && e.src).map((e) => get(e.src).promise)),
  };
}
