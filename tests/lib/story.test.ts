import { describe, expect, it } from 'vitest';
import { bestWindow, biggestSwing, daysBack, fortnight, latest } from '../../src/lib/story.ts';
import { DAY, HALF_HOUR, clock } from '../../src/lib/time.ts';
import type { Mix } from '../../src/lib/types.ts';

const mix = (wind: number, gas: number): Mix => ({
  wind,
  hydro: 0,
  solar: 0,
  biomass: 0,
  imports: 0,
  nuclear: 0,
  gas,
  other: 100 - wind - gas
});

describe('bestWindow', () => {
  it('finds the cleanest run of the given length', () => {
    expect(bestWindow([90, 80, 30, 20, 40, 100], 0, 2)).toEqual({ index: 2, average: 25 });
  });

  it('never looks before the starting slot', () => {
    expect(bestWindow([10, 10, 80, 90], 2, 1)?.index).toBe(2);
  });

  it('skips windows with a gap rather than treating it as zero', () => {
    expect(bestWindow([50, null, 60, 70], 0, 2)?.index).toBe(2);
  });

  it('keeps the earliest of two equally clean windows', () => {
    expect(bestWindow([40, 40, 90, 40, 40], 0, 2)?.index).toBe(0);
  });

  it('gives up when nothing long enough is left', () => {
    expect(bestWindow([50, 60], 1, 3)).toBeNull();
  });
});

describe('latest', () => {
  it('falls back to the last reading when the current slot is empty', () => {
    const track = { start: 0, values: [100, 120, null], lastActual: HALF_HOUR };
    expect(latest(track, 2 * HALF_HOUR)).toEqual({ value: 120, time: HALF_HOUR });
  });
});

describe('fortnight', () => {
  it('lays readings out by London day and half hour, and averages a usual day', () => {
    // midnight BST on 2026-10-15, then two days of readings
    const start = Date.parse('2026-10-14T23:00Z');
    const values = Array.from({ length: 96 }, (_, i) => (i % 48 === 6 ? 10 : 100));
    const weeks = fortnight({ start, values, lastActual: start + DAY * 2 }, start + 2 * DAY);
    expect(weeks.rows.map((row) => row.date)).toEqual(['2026-10-15', '2026-10-16']);
    expect(weeks.rows[0].cells[6]).toBe(10);
    expect(weeks.cleanest).toBe(6);
    expect(weeks.usual[0]).toBe(100);
  });
  it('shares the cell when the clocks go back and 01:00 happens twice', () => {
    // 00:00 BST on Sun 25 Oct 2026, the night the clocks go back
    const start = Date.parse('2026-10-24T23:00Z');
    const values = Array.from({ length: 50 }, (_, i) => (i === 2 ? 40 : i === 4 ? 60 : 100));
    const weeks = fortnight({ start, values, lastActual: start }, start + 50 * HALF_HOUR);
    const night = weeks.rows.find((row) => row.date === '2026-10-25')!;
    expect(night.cells[2]).toBe(50);
    expect(weeks.usual[2]).toBe(50);
  });
});

describe('daysBack', () => {
  it('lands on the same London clock time after the clocks go back', () => {
    const sunday = Date.parse('2026-10-25T09:00Z');
    expect(clock(daysBack(sunday, 1))).toBe(clock(sunday));
    expect(sunday - daysBack(sunday, 1)).toBe(DAY + 2 * HALF_HOUR);
  });

  it('is plain 24 hours on an ordinary day', () => {
    const friday = Date.parse('2026-10-16T09:00Z');
    expect(daysBack(friday, 7)).toBe(friday - 7 * DAY);
  });
});

describe('biggestSwing', () => {
  it('names the fuel that moved most over the day, and which way', () => {
    expect(biggestSwing([mix(20, 50), null, mix(60, 10)])).toEqual({ fuel: 'wind', change: 40 });
  });

  it('needs two readings to say anything', () => {
    expect(biggestSwing([null, mix(20, 50)])).toBeNull();
  });
});
