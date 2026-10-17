export const HALF_HOUR = 30 * 60_000;
export const HOUR = 2 * HALF_HOUR;
export const DAY = 24 * HOUR;

export const slotOf = (time: number) => Math.floor(time / HALF_HOUR) * HALF_HOUR;

const zone = { timeZone: 'Europe/London' } as const;
const partsFormat = new Intl.DateTimeFormat('en-GB', {
  ...zone,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric'
});
const offsets = new Map<number, number>();

// how far London's wall clock sits from UTC at this moment
const askOffset = (time: number) => {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(time).map(({ type, value }) => [type, Number(value)])
  );
  const { year, month, day, hour, minute } = parts;
  return Date.UTC(year, month - 1, day, hour, minute) - Math.floor(time / 60_000) * 60_000;
};

/** London's lead on UTC in ms, asked once a day, or per call on the two days the clocks change */
function offsetOf(time: number) {
  const midnight = Math.floor(time / DAY) * DAY;
  if (!offsets.has(midnight)) {
    if (offsets.size > 1000) offsets.clear();
    const [start, end] = [askOffset(midnight), askOffset(midnight + DAY - 1)];
    offsets.set(midnight, start === end ? start : NaN);
  }
  const offset = offsets.get(midnight)!;
  return Number.isNaN(offset) ? askOffset(time) : offset;
}

const london = (time: number) => new Date(time + offsetOf(time));
const pad = (value: number) => String(value).padStart(2, '0');

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  ...zone,
  weekday: 'short',
  day: 'numeric',
  month: 'short'
});
const weekdayFormat = new Intl.DateTimeFormat('en-GB', { ...zone, weekday: 'short' });

/** "07:30", always on the grid's own clock */
export function clock(time: number) {
  const local = london(time);
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}
/** "Fri 17 Oct", whatever punctuation the browser's locale data adds */
export const day = (time: number) =>
  dayFormat
    .formatToParts(time)
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value)
    .join(' ');
/** "17 Oct" */
export const dayMonth = (time: number) => day(time).split(' ').slice(1).join(' ');
export const weekday = (time: number) => weekdayFormat.format(time);
/** "2026-10-17", good for grouping by London date */
export const dateKey = (time: number) => london(time).toISOString().slice(0, 10);

/** Which half hour of the London day this is, 0 to 47 */
export function halfHourOfDay(time: number) {
  const local = london(time);
  return local.getUTCHours() * 2 + (local.getUTCMinutes() >= 30 ? 1 : 0);
}

/** "today", "tomorrow" or the weekday, relative to `now` */
export function whenDay(time: number, now: number) {
  const days = Math.round((Date.parse(dateKey(time)) - Date.parse(dateKey(now))) / DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return weekday(time);
}

/** "09:30", "02:30 tonight", "13:00 tomorrow" or "13:00 on Mon", relative to `now` */
export function when(time: number, now: number) {
  const hour = Number(clock(time).slice(0, 2));
  const relative = whenDay(time, now);
  // 2am after a late evening is still "tonight" to anyone awake for it
  const tonight =
    (relative === 'today' && hour >= 19) ||
    (relative === 'tomorrow' && hour < 5 && time - now < 12 * HOUR);
  if (tonight) return `${clock(time)} tonight`;
  if (relative === 'today') return clock(time);
  return relative === 'tomorrow' ? `${clock(time)} tomorrow` : `${clock(time)} on ${relative}`;
}
