import { factorsOf } from '#lib/fuels.js';
import { DAY, HALF_HOUR, slotOf } from '#lib/time.js';
import { FUELS, type History, type Mix, type Series, type Snapshot } from '#lib/types.js';
import {
  api,
  isoMinute,
  type MixPeriod,
  type Period,
  type RawMix,
  type RegionalPeriod
} from './api.ts';
import { cached } from './cache.ts';
import { report } from './report.ts';

const AHEAD = 2 * DAY;
const GB_BACK = 14 * DAY;
const REGIONS_BACK = DAY;
const FIRST_YEAR = 2017;

const slotsBetween = (from: number, to: number) => Math.round((to - from) / HALF_HOUR) + 1;

/** Coal's been gone since 2024, so it folds into other rather than taking a colour */
export function toMix(raw: RawMix): Mix {
  const mix = Object.fromEntries(FUELS.map((fuel) => [fuel, 0])) as Mix;
  for (const { fuel, perc } of raw) {
    const key = (FUELS as readonly string[]).includes(fuel) ? (fuel as keyof Mix) : 'other';
    mix[key] += perc;
  }
  return mix;
}

/** Lines periods up by start time, so gaps stay gaps and repeats land on one slot */
function seriesOf<T>(start: number, length: number, items: [number, T][]) {
  const values: (T | null)[] = Array(length).fill(null);
  for (const [time, value] of items) {
    const index = Math.round((time - start) / HALF_HOUR);
    if (index >= 0 && index < length && value !== null) values[index] = value;
  }
  return values;
}

/** Actual readings where there are any, the forecast everywhere else */
export function gbSeries(now: number, periods: Period[]): NonNullable<Snapshot['gb']> {
  const start = now - GB_BACK;
  const ordered = [...periods].sort(
    (a, b) => Number(a.intensity.actual != null) - Number(b.intensity.actual != null)
  );
  const values = seriesOf(
    start,
    slotsBetween(start, now + AHEAD),
    ordered.map((period) => [
      Date.parse(period.from),
      period.intensity.actual ?? period.intensity.forecast
    ])
  ) as Series;
  const actuals = periods
    .filter((period) => period.intensity.actual != null)
    .map((period) => Date.parse(period.from));
  return { start, values, lastActual: Math.max(start, ...actuals) };
}

export function regionSeries(
  now: number,
  periods: RegionalPeriod[]
): NonNullable<Snapshot['regions']> {
  const start = now - REGIONS_BACK;
  const length = slotsBetween(start, now + AHEAD);
  const values: Record<number, Series> = {};
  const mix: Record<number, Mix> = {};
  // 15 to 18 are England, Scotland, Wales and GB, which the map has no shapes for
  for (let id = 1; id <= 14; id++) {
    const readings = periods.map((period) => {
      const region = period.regions.find((candidate) => candidate.regionid === id);
      return [Date.parse(period.from), region?.intensity.forecast ?? null] as [
        number,
        number | null
      ];
    });
    values[id] = seriesOf(start, length, readings);
    const current = periods.find((period) => Date.parse(period.from) === now);
    const region = current?.regions.find((candidate) => candidate.regionid === id);
    if (region) mix[id] = toMix(region.generationmix);
  }
  return { start, values, mix };
}

export function mixSeries(now: number, periods: MixPeriod[]): NonNullable<Snapshot['mix']> {
  const start = now - DAY;
  const items = periods.map((period) => [Date.parse(period.from), toMix(period.generationmix)]);
  return { start, values: seriesOf(start, slotsBetween(start, now), items as [number, Mix][]) };
}

/** A failed section is reported and left empty, so the rest of the page still works */
const settle = <T>(work: Promise<T>) =>
  work.catch((err) => {
    report(err);
    return null;
  });

async function loadSnapshot(): Promise<Snapshot> {
  const now = slotOf(Date.now());
  // the API files each period under the moment it ends, so ask from the end of the first one
  const after = (time: number) => isoMinute(time + HALF_HOUR);
  const [gb, regions, mix] = await Promise.all([
    settle(
      Promise.all([
        api<Period[]>(`/intensity/${after(now - GB_BACK)}/${after(now)}`),
        api<Period[]>(`/intensity/${after(now)}/fw48h`)
      ]).then(([past, ahead]) => gbSeries(now, [...past, ...ahead]))
    ),
    settle(
      api<RegionalPeriod[]>(
        `/regional/intensity/${after(now - REGIONS_BACK)}/${after(now + AHEAD)}`
      ).then((periods) => regionSeries(now, periods))
    ),
    settle(
      api<MixPeriod[]>(`/generation/${after(now)}/pt24h`).then((periods) => mixSeries(now, periods))
    )
  ]);
  if (!gb && !regions && !mix) throw new Error('Carbon Intensity API is unreachable');
  return { fetched: Date.now(), now, gb, regions, mix };
}

/** The same 30 days, every year the API has, one call a year */
async function loadHistory(): Promise<History> {
  const to = Date.parse(isoMinute(Date.now()).slice(0, 10));
  const from = to - 30 * DAY;
  const latest = new Date(to).getUTCFullYear();
  const shift = (time: number, years: number) => {
    const date = new Date(time);
    date.setUTCFullYear(date.getUTCFullYear() - years);
    return date.getTime();
  };
  const years: History['years'] = [];
  for (let year = FIRST_YEAR; year <= latest; year++) {
    const back = latest - year;
    const path = `/intensity/stats/${isoMinute(shift(from, back))}/${isoMinute(shift(to, back))}`;
    const stats = await api<{ intensity: { min: number; average: number; max: number } }[]>(path)
      .then(([first]) => first?.intensity)
      .catch(() => undefined);
    if (stats?.average)
      years.push({ year, min: stats.min, average: stats.average, max: stats.max });
  }
  const [raw] = await api<Record<string, number>[]>('/intensity/factors');
  return { from, to, years, factors: factorsOf(raw) };
}

export const snapshot = () => cached('snapshot', 5 * 60_000, loadSnapshot);
export const history = () => cached('history', 12 * 60 * 60_000, loadHistory);

const OUTWARD = /^[A-Z]{1,2}\d[A-Z\d]?$/;

/** The region for a postcode, from its outward half */
export async function regionFor(postcode: string) {
  const clean = postcode.toUpperCase().replace(/\s+/g, ' ').trim();
  const outward = clean.includes(' ')
    ? clean.split(' ')[0]
    : clean.slice(0, Math.max(2, clean.length - 3));
  const code = OUTWARD.test(clean) ? clean : outward;
  if (!OUTWARD.test(code)) return null;
  return cached(`postcode/${code}`, 30 * DAY, async () => {
    const [match] = await api<{ regionid: number }[]>(`/regional/postcode/${code}`);
    return match?.regionid ?? null;
  });
}
