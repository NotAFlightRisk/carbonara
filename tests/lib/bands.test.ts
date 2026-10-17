import { describe, expect, it } from 'vitest';
import { bandOf, colourOf } from '../../src/lib/bands.ts';

describe('bandOf', () => {
  it('matches the API index boundaries', () => {
    expect([0, 24, 25, 89, 90, 169, 170, 229, 230, 900].map((value) => bandOf(value).name)).toEqual(
      [
        'very low',
        'very low',
        'low',
        'low',
        'moderate',
        'moderate',
        'high',
        'high',
        'very high',
        'very high'
      ]
    );
  });
});

describe('colourOf', () => {
  it('uses the pure band colour at either end of the scale', () => {
    expect(colourOf(0)).toBe('var(--band-very-low)');
    expect(colourOf(500)).toBe('var(--band-very-high)');
  });

  it('blends towards the nearer band in between', () => {
    expect(colourOf(70)).toBe('color-mix(in oklch, var(--band-low) 82%, var(--band-moderate))');
  });
});
