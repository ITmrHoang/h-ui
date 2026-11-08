/**
 * Tính toán thuần cho hui-timetable (không đụng DOM — dễ test):
 *   toDate('2026-11-10T19:30')            → Date giờ địa phương (chuỗi có Z / +07:00 → theo múi giờ đó)
 *   normalizeEvents(events)               → [{ event, start, end }] hợp lệ, sắp theo giờ bắt đầu
 *   daySegments(items, day)               → phần của từng sự kiện nằm trong ngày `day` (phút từ 0h)
 *   layoutColumns(segments)               → gán cột { col, cols } cho các sự kiện chồng giờ nhau
 */

import { addDays, isValidDate, parseISO, startOfDay } from '../hui-calendar/date-utils.js';

export const MINUTE_MS = 60_000;

/** Thời lượng mặc định khi sự kiện thiếu / sai `end` (phút) */
export const DEFAULT_DURATION = 60;

const HAS_ZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/** Date | số ms | chuỗi ISO → Date (null nếu không hợp lệ). Chuỗi không múi giờ = giờ địa phương. */
export function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isValidDate(value) ? new Date(value.getTime()) : null;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isValidDate(d) ? d : null;
  }
  const s = String(value).trim();
  const d = HAS_ZONE.test(s) ? new Date(s) : parseISO(s) || new Date(s);
  return d && isValidDate(d) ? d : null;
}

/**
 * Chuẩn hóa danh sách sự kiện: bỏ mục thiếu / sai `start`; `end` thiếu hoặc ≤ `start` → `start` + 60 phút.
 * @param {Array<object>|null} events
 * @returns {Array<{ event: object, start: Date, end: Date }>}
 */
export function normalizeEvents(events) {
  if (!Array.isArray(events)) return [];
  const out = [];
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const start = toDate(event.start);
    if (!start) continue;
    let end = toDate(event.end);
    if (!end || end <= start) end = new Date(start.getTime() + DEFAULT_DURATION * MINUTE_MS);
    out.push({ event, start, end });
  }
  return out.sort((a, b) => a.start - b.start || b.end - a.end);
}

/**
 * Phần của từng sự kiện rơi vào ngày `day` (sự kiện qua nửa đêm bị cắt làm 2 ngày).
 * @returns {Array<{ item: object, startMin: number, endMin: number, continued: boolean, continues: boolean }>}
 */
export function daySegments(items, day) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const out = [];
  for (const item of items) {
    if (item.end <= dayStart || item.start >= dayEnd) continue;
    const s = item.start < dayStart ? dayStart : item.start;
    const e = item.end > dayEnd ? dayEnd : item.end;
    out.push({
      item,
      startMin: Math.round((s - dayStart) / MINUTE_MS),
      endMin: Math.round((e - dayStart) / MINUTE_MS),
      continued: item.start < dayStart,
      continues: item.end > dayEnd,
    });
  }
  return out;
}

/**
 * Xếp cột cho các sự kiện chồng giờ (kiểu Google Calendar): mỗi cụm sự kiện nối nhau chia đều bề rộng,
 * sự kiện nhận cột trống đầu tiên. Ghi `col` (0…) và `cols` (số cột của cụm) vào từng phần tử.
 * @param {Array<{ startMin: number, endMin: number }>} segments
 */
export function layoutColumns(segments) {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  let cluster = [];
  let colEnds = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const s of cluster) s.cols = colEnds.length;
    cluster = [];
    colEnds = [];
  };
  for (const seg of sorted) {
    if (seg.startMin >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    let col = colEnds.findIndex((end) => end <= seg.startMin);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(seg.endMin);
    } else {
      colEnds[col] = seg.endMin;
    }
    seg.col = col;
    cluster.push(seg);
    clusterEnd = Math.max(clusterEnd, seg.endMin);
  }
  flush();
  return sorted;
}

/** "HH:mm" từ số phút trong ngày (1440 → "24:00") */
export function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
