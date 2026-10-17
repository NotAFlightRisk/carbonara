/** The API's index bands for 2026, gCO2/kWh. Its own index word wins where it gives one */
export const BANDS = [
  { id: 'very-low', name: 'very low', below: 25, mood: 'Squeaky clean right now' },
  { id: 'low', name: 'low', below: 90, mood: 'Pretty clean right now' },
  { id: 'moderate', name: 'moderate', below: 170, mood: 'Middling right now' },
  { id: 'high', name: 'high', below: 230, mood: 'Fairly dirty right now' },
  { id: 'very-high', name: 'very high', below: Infinity, mood: 'Properly dirty right now' }
] as const;

export type Band = (typeof BANDS)[number];

/** Top of the dial, which only the worst hours ever reach */
export const SCALE_MAX = 300;

// roughly the middle of each band, where its colour is purest
const ANCHORS = [12, 57, 130, 200, 265];

export const bandOf = (value: number) => BANDS.find((band) => value < band.below)!;

export const swatch = (band: Band) => `var(--band-${band.id})`;

/** A CSS colour for any value, blended between the two nearest band colours */
export function colourOf(value: number) {
  const next = ANCHORS.findIndex((anchor) => value < anchor);
  if (next <= 0) return swatch(BANDS.at(next)!);
  const [from, to] = [ANCHORS[next - 1], ANCHORS[next]];
  const share = Math.round(((to - value) / (to - from)) * 100);
  return `color-mix(in oklch, ${swatch(BANDS[next - 1])} ${share}%, ${swatch(BANDS[next])})`;
}
