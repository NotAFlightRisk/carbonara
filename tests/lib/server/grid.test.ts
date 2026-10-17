import { describe, expect, it } from 'vitest';
import { gbSeries, mixSeries, regionSeries, toMix } from '../../../src/lib/server/grid.ts';
import { DAY, HALF_HOUR } from '../../../src/lib/time.ts';

const now = Date.parse('2026-10-17T07:00Z');
const at = (time: number) => new Date(time).toISOString().slice(0, 16) + 'Z';

describe('toMix', () => {
  it('folds coal and anything unknown into other', () => {
    const mix = toMix([
      { fuel: 'wind', perc: 50 },
      { fuel: 'coal', perc: 2 },
      { fuel: 'other', perc: 3 }
    ]);
    expect(mix.other).toBe(5);
    expect(mix.wind).toBe(50);
  });
});

describe('gbSeries', () => {
  it('keeps the actual reading when a period turns up twice', () => {
    const series = gbSeries(now, [
      { from: at(now - HALF_HOUR), intensity: { forecast: 7, actual: 110 } },
      { from: at(now - HALF_HOUR), intensity: { forecast: 7, actual: null } },
      { from: at(now), intensity: { forecast: 60 } }
    ]);
    const index = (time: number) => (time - series.start) / HALF_HOUR;
    expect(series.values[index(now - HALF_HOUR)]).toBe(110);
    expect(series.values[index(now)]).toBe(60);
    expect(series.lastActual).toBe(now - HALF_HOUR);
  });

  it('leaves missing periods as gaps, covering 14 days back to 48h ahead', () => {
    const series = gbSeries(now, [{ from: at(now), intensity: { forecast: 60 } }]);
    expect(series.values).toHaveLength(14 * 48 + 96 + 1);
    expect(series.values.filter((value) => value === null)).toHaveLength(14 * 48 + 96);
  });
});

describe('regionSeries', () => {
  it('lines each region up by time and keeps the current mix', () => {
    const region = (regionid: number, forecast: number) => ({
      regionid,
      intensity: { forecast },
      generationmix: [{ fuel: 'wind', perc: 100 }]
    });
    const series = regionSeries(now, [
      { from: at(now), regions: [region(1, 0), region(13, 82), region(18, 50)] }
    ]);
    expect(series.values[13][(now - series.start) / HALF_HOUR]).toBe(82);
    expect(series.mix[1].wind).toBe(100);
    expect(series.values[18]).toBeUndefined();
  });
});

describe('mixSeries', () => {
  it('covers the last 24 hours up to now', () => {
    const series = mixSeries(now, [
      { from: at(now - DAY), generationmix: [{ fuel: 'gas', perc: 30 }] }
    ]);
    expect(series.values).toHaveLength(49);
    expect(series.values[0]?.gas).toBe(30);
  });
});
