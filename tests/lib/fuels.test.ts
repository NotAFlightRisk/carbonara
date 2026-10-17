import { describe, expect, it } from 'vitest';
import { carbonShare, factorsOf, squares } from '../../src/lib/fuels.ts';
import { FUELS, type Mix } from '../../src/lib/types.ts';

const mixOf = (parts: Partial<Mix>): Mix => ({
  ...(Object.fromEntries(FUELS.map((fuel) => [fuel, 0])) as Mix),
  ...parts
});

describe('squares', () => {
  it('always hands out exactly 100, giving the spares to the biggest remainders', () => {
    const counts = squares(mixOf({ wind: 33.4, gas: 33.3, nuclear: 33.3 }));
    expect(FUELS.reduce((sum, fuel) => sum + counts[fuel], 0)).toBe(100);
    expect(counts.wind).toBe(34);
  });

  it('scales a mix that the API rounded to more than 100', () => {
    const counts = squares(mixOf({ wind: 60.4, gas: 40.4 }));
    expect(counts.wind + counts.gas).toBe(100);
  });
});

describe('carbonShare', () => {
  const factors = { fuels: { wind: 0, gas: 400 }, imports: [50, 500] as [number, number] };

  it('puts the carbon on the fuels that make it, not the ones making the power', () => {
    const share = carbonShare(mixOf({ wind: 75, gas: 25 }), factors, 100);
    expect(share.gas).toBeCloseTo(100);
    expect(share.wind).toBe(0);
  });

  it('gives imports whatever the intensity leaves unexplained', () => {
    const share = carbonShare(mixOf({ wind: 70, gas: 10, imports: 20 }), factors, 60);
    expect(share.imports).toBeCloseTo((2000 / 6000) * 100);
    expect(share.gas).toBeCloseTo((4000 / 6000) * 100);
  });

  it("keeps imports within the API's cleanest and dirtiest cable", () => {
    const tooClean = carbonShare(mixOf({ gas: 50, imports: 50 }), factors, 150);
    expect(tooClean.imports).toBeCloseTo((2500 / 22500) * 100);
    const tooDirty = carbonShare(mixOf({ wind: 90, imports: 10 }), factors, 200);
    expect(tooDirty.imports).toBe(100);
  });
});

describe('factorsOf', () => {
  it('maps the API names onto our fuels and keeps the range of import cables', () => {
    const factors = factorsOf({
      Wind: 0,
      'Gas (Combined Cycle)': 394,
      'Gas (Open Cycle)': 651,
      'Dutch Imports': 474,
      'French Imports': 53,
      'Irish Imports': 458
    });
    expect(factors).toEqual({ fuels: { wind: 0, gas: 394 }, imports: [53, 474] });
  });
});
