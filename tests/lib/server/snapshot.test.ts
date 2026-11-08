import { afterEach, describe, expect, it, vi } from 'vitest';
import { snapshot } from '../../../src/lib/server/grid.ts';
import { HALF_HOUR, HOUR } from '../../../src/lib/time.ts';

const start = Date.parse('2026-10-17T07:05Z');
const at = (time: number) => new Date(time).toISOString().slice(0, 16) + 'Z';

function grid(now: number, mixDown: boolean) {
  const slot = now - (now % HALF_HOUR);
  const data: [string, unknown][] = [
    ['/fw48h', [{ from: at(slot), intensity: { forecast: 120 } }]],
    ['/regional/', [{ from: at(slot), regions: [] }]],
    ['/generation/', [{ from: at(slot), generationmix: [{ fuel: 'wind', perc: 40 }] }]],
    ['/intensity/', [{ from: at(slot - HALF_HOUR), intensity: { forecast: 9, actual: 110 } }]]
  ];
  return async (url: string) => {
    if (mixDown && url.includes('/generation/')) return new Response('', { status: 500 });
    const [, body] = data.find(([path]) => url.includes(path))!;
    return Response.json({ data: body });
  };
}

async function refreshedAt(now: number, mixDown: boolean) {
  vi.setSystemTime(now);
  vi.stubGlobal('fetch', grid(now, mixDown));
  return vi.waitFor(async () => {
    const latest = await snapshot();
    expect(latest.fetched).toBeGreaterThanOrEqual(now);
    return latest;
  });
}

describe('snapshot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('keeps the last mix through a failed call, until it is an hour behind', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const first = await refreshedAt(start, false);
    const blip = await refreshedAt(start + HALF_HOUR, true);
    expect(blip.mix).toEqual(first.mix);
    expect(blip.gb!.start).toBe(first.gb!.start + HALF_HOUR);
    const outage = await refreshedAt(start + HOUR, true);
    expect(outage.mix).toBeNull();
  });
});
