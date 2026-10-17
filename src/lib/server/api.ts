const API = 'https://api.carbonintensity.org.uk';

/** "2026-10-17T07:30Z", the shape the API wants in its paths */
export const isoMinute = (time: number) => new Date(time).toISOString().slice(0, 16) + 'Z';

/** One call to the Carbon Intensity API, handing back its `data` */
export async function api<T>(path: string): Promise<T> {
  const res = await fetch(API + path, {
    headers: { accept: 'application/json', 'user-agent': 'carbonara (+https://carbonara.peng.ly)' },
    signal: AbortSignal.timeout(20_000)
  });
  if (!res.ok) throw new Error(`Carbon Intensity API answered ${res.status} for ${path}`);
  const body: { data?: T } = await res.json();
  if (!body.data) throw new Error(`Carbon Intensity API sent no data for ${path}`);
  return body.data;
}

export interface Intensity {
  forecast: number | null;
  actual?: number | null;
}

export interface Period {
  from: string;
  intensity: Intensity;
}

export type RawMix = { fuel: string; perc: number }[];

export interface MixPeriod {
  from: string;
  generationmix: RawMix;
}

export interface RegionalPeriod {
  from: string;
  regions: { regionid: number; intensity: Intensity; generationmix: RawMix }[];
}

export interface Stats {
  intensity: { max: number; average: number; min: number };
}
