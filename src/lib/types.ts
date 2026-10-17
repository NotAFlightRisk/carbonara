export const FUELS = [
  'wind',
  'hydro',
  'solar',
  'biomass',
  'imports',
  'nuclear',
  'gas',
  'other'
] as const;

export type Fuel = (typeof FUELS)[number];

/** Percent of generation per fuel, which adds up to roughly 100 */
export type Mix = Record<Fuel, number>;

/** Half-hourly readings from `start`, gCO2/kWh, null where the API had a gap */
export type Series = (number | null)[];

export interface Snapshot {
  fetched: number;
  /** Start of the half hour we're in, ms */
  now: number;
  /** GB from 14 days back to 48h ahead, actual readings where there are any */
  gb: { start: number; values: Series; lastActual: number } | null;
  /** Every region from 24h back to 48h ahead, all forecasts */
  regions: { start: number; values: Record<number, Series>; mix: Record<number, Mix> } | null;
  /** GB generation mix over the last 24h */
  mix: { start: number; values: (Mix | null)[] } | null;
}

export interface Year {
  year: number;
  min: number;
  average: number;
  max: number;
}

export interface History {
  from: number;
  to: number;
  years: Year[];
  /** gCO2/kWh per fuel, the API's own factors */
  factors: Partial<Record<Fuel, number>>;
}
