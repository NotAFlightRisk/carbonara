import { describe, expect, it } from 'vitest';
import { halfHourOfDay, when } from '../../src/lib/time.ts';

// 20:00 BST on Fri 16 Oct 2026
const evening = Date.parse('2026-10-16T19:00Z');

describe('when', () => {
  it('calls the small hours after an evening "tonight"', () => {
    expect(when(Date.parse('2026-10-17T01:30Z'), evening)).toBe('02:30 tonight');
  });

  it('says tomorrow for the daytime after', () => {
    expect(when(Date.parse('2026-10-17T12:00Z'), evening)).toBe('13:00 tomorrow');
  });

  it('names the weekday further out', () => {
    expect(when(Date.parse('2026-10-18T12:00Z'), evening)).toBe('13:00 on Sun');
  });

  it('just gives the time for later today', () => {
    expect(when(Date.parse('2026-10-16T08:00Z'), Date.parse('2026-10-16T06:00Z'))).toBe('09:00');
  });
});

describe('halfHourOfDay', () => {
  it('counts in London time, not UTC', () => {
    expect(halfHourOfDay(Date.parse('2026-10-16T23:30Z'))).toBe(1);
    expect(halfHourOfDay(Date.parse('2026-12-16T23:30Z'))).toBe(47);
  });
});
