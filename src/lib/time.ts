export const HALF_HOUR = 30 * 60_000;
export const HOUR = 2 * HALF_HOUR;
export const DAY = 24 * HOUR;

export const slotOf = (time: number) => Math.floor(time / HALF_HOUR) * HALF_HOUR;

const zone = { timeZone: 'Europe/London' } as const;
const clockFormat = new Intl.DateTimeFormat('en-GB', {
  ...zone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  ...zone,
  weekday: 'short',
  day: 'numeric',
  month: 'short'
});
const weekdayFormat = new Intl.DateTimeFormat('en-GB', { ...zone, weekday: 'short' });
const dateFormat = new Intl.DateTimeFormat('en-CA', zone);

/** "07:30", always on the grid's own clock */
export const clock = (time: number) => clockFormat.format(time);
/** "Fri 17 Oct" */
export const day = (time: number) => dayFormat.format(time);
export const weekday = (time: number) => weekdayFormat.format(time);
/** "2026-10-17", good for grouping by London date */
export const dateKey = (time: number) => dateFormat.format(time);

/** Which half hour of the London day this is, 0 to 47 */
export function halfHourOfDay(time: number) {
  const [hours, minutes] = clock(time).split(':').map(Number);
  return hours * 2 + (minutes >= 30 ? 1 : 0);
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
