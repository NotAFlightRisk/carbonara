import { FUELS, type Factors, type Fuel, type Mix } from './types.ts';

export const FUEL_NAMES: Record<Fuel, string> = {
  wind: 'Wind',
  hydro: 'Hydro',
  solar: 'Solar',
  biomass: 'Biomass',
  imports: 'Imports',
  nuclear: 'Nuclear',
  gas: 'Gas',
  other: 'Other'
};

export const fuelColour = (fuel: Fuel) => `var(--fuel-${fuel})`;

// imports come down cables with wildly different factors, so they're worked out separately
const FACTOR_NAMES: Record<string, Fuel> = {
  Wind: 'wind',
  Hydro: 'hydro',
  Solar: 'solar',
  Biomass: 'biomass',
  Nuclear: 'nuclear',
  'Gas (Combined Cycle)': 'gas',
  Other: 'other'
};

/** The API's factors for the fuels its mix reports */
export function factorsOf(raw: Record<string, number>): Factors {
  const fuels: Factors['fuels'] = {};
  for (const [name, value] of Object.entries(raw)) {
    if (FACTOR_NAMES[name]) fuels[FACTOR_NAMES[name]] = value;
  }
  const cables = Object.entries(raw)
    .filter(([name]) => name.endsWith('Imports'))
    .map(([, value]) => value);
  return { fuels, imports: [Math.min(...cables), Math.max(...cables)] };
}

/** Each fuel's rough share of the carbon, imports filling the gap within the API's cable range */
export function carbonShare(mix: Mix, factors: Factors, intensity: number): Mix {
  const carbon = FUELS.map((fuel) =>
    fuel === 'imports' ? 0 : mix[fuel] * (factors.fuels[fuel] ?? 0)
  );
  const domestic = carbon.reduce((sum, value) => sum + value, 0);
  const [cleanest, dirtiest] = factors.imports.map((factor) => factor * mix.imports);
  const leftover = intensity * 100 - domestic;
  carbon[FUELS.indexOf('imports')] = Math.min(dirtiest, Math.max(cleanest, leftover));
  const total = carbon.reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(
    FUELS.map((fuel, i) => [fuel, total ? (carbon[i] / total) * 100 : 0])
  ) as Mix;
}

/** Whole squares for a 100 square waffle, largest remainders rounding up */
export function squares(mix: Mix, total = 100): Mix {
  const sum = FUELS.reduce((acc, fuel) => acc + mix[fuel], 0) || 1;
  const exact = FUELS.map((fuel) => (mix[fuel] / sum) * total);
  const whole = exact.map(Math.floor);
  const spare = total - whole.reduce((acc, value) => acc + value, 0);
  exact
    .map((value, i) => ({ i, remainder: value - whole[i] }))
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, spare)
    .forEach(({ i }) => whole[i]++);
  return Object.fromEntries(FUELS.map((fuel, i) => [fuel, whole[i]])) as Mix;
}

export const biggest = (mix: Mix) =>
  FUELS.reduce((best, fuel) => (mix[fuel] > mix[best] ? fuel : best), FUELS[0]);
