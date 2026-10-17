import { FUELS, type Fuel, type Mix, type Series, type Snapshot } from './types.ts';
import { DAY, HALF_HOUR, dateKey, halfHourOfDay } from './time.ts';

export const REGIONS: Record<number, string> = {
  1: 'North Scotland',
  2: 'South Scotland',
  3: 'North West England',
  4: 'North East England',
  5: 'Yorkshire',
  6: 'North Wales & Merseyside',
  7: 'South Wales',
  8: 'West Midlands',
  9: 'East Midlands',
  10: 'East England',
  11: 'South West England',
  12: 'South England',
  13: 'London',
  14: 'South East England'
};

export const placeName = (region: number) => REGIONS[region] ?? 'Great Britain';

/** Half-hourly values from `start`, and the last slot that's a real reading */
export interface Track {
  start: number;
  values: Series;
  lastActual: number;
}

/** GB gets real readings, a region only ever gets forecasts */
export function trackFor(snapshot: Snapshot, region: number): Track | null {
  if (!region) return snapshot.gb;
  const values = snapshot.regions?.values[region];
  return values ? { start: snapshot.regions!.start, values, lastActual: snapshot.now } : null;
}

export const indexAt = (track: { start: number }, time: number) =>
  Math.round((time - track.start) / HALF_HOUR);

export const valueAt = (track: Track, time: number) => track.values[indexAt(track, time)] ?? null;

/** The latest reading at or before `time`, as actuals lag a half hour or so */
export function latest(track: Track, time: number) {
  for (let i = indexAt(track, time); i >= 0; i--) {
    if (track.values[i] != null)
      return { value: track.values[i]!, time: track.start + i * HALF_HOUR };
  }
  return null;
}

export const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;

/** The cleanest run of `slots` half hours from `from` onwards */
export function bestWindow(values: Series, from: number, slots: number) {
  let best: { index: number; average: number } | null = null;
  for (let index = Math.max(0, from); index + slots <= values.length; index++) {
    const window = values.slice(index, index + slots);
    if (window.some((value) => value == null)) continue;
    const average = mean(window as number[]);
    if (!best || average < best.average - 0.01) best = { index, average };
  }
  return best;
}

/** The last 14 London days by half hour of the day, plus what a usual day looks like */
export function fortnight(track: Track, now: number) {
  // the clocks going back gives one night two 01:00s, which share a cell
  const days = new Map<string, number[][]>();
  track.values.forEach((value, i) => {
    const time = track.start + i * HALF_HOUR;
    if (value == null || time > now || time < now - 14 * DAY) return;
    const key = dateKey(time);
    if (!days.has(key))
      days.set(
        key,
        Array.from({ length: 48 }, () => [])
      );
    days.get(key)![halfHourOfDay(time)].push(value);
  });
  const rows = [...days].slice(-14).map(([date, slots]) => ({
    date,
    cells: slots.map((slot) => (slot.length ? mean(slot) : null))
  }));
  const usual = Array.from({ length: 48 }, (_, slot) =>
    mean(rows.flatMap((row) => (row.cells[slot] == null ? [] : [row.cells[slot]!])))
  );
  const ranked = usual.map((value, slot) => ({ value, slot })).filter(({ value }) => !isNaN(value));
  ranked.sort((a, b) => a.value - b.value);
  return {
    rows,
    usual,
    cleanest: ranked[0]?.slot ?? null,
    dirtiest: ranked.at(-1)?.slot ?? null
  };
}

/** The same London clock time a number of days back, even when the clocks changed in between */
export function daysBack(time: number, days: number) {
  const guess = time - days * DAY;
  const drift = halfHourOfDay(time) - halfHourOfDay(guess);
  return guess + (((drift + 72) % 48) - 24) * HALF_HOUR;
}

/** Which fuel's share moved most between the first and last reading of the day */
export function biggestSwing(values: (Mix | null)[]) {
  const known = values.filter((mix): mix is Mix => mix !== null);
  if (known.length < 2) return null;
  const [first, last] = [known[0], known.at(-1)!];
  return FUELS.map((fuel) => ({ fuel, change: last[fuel] - first[fuel] })).reduce((most, swing) =>
    Math.abs(swing.change) > Math.abs(most.change) ? swing : most
  );
}

export const halfHourLabel = (slot: number) =>
  `${String(Math.floor(slot / 2)).padStart(2, '0')}:${slot % 2 ? '30' : '00'}`;

export const fuelPercent = (mix: Mix, fuel: Fuel) => Math.round(mix[fuel]);
