import { history, snapshot } from '#lib/server/grid.js';
import { report } from '#lib/server/report.js';
import type { PageServerLoad } from './$types';

const orNothing = <T>(work: Promise<T>) =>
  work.catch((err) => {
    report(err);
    return null;
  });

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60' });
  const [now, past] = await Promise.all([orNothing(snapshot()), orNothing(history())]);
  return { snapshot: now, history: past, region: Number(url.searchParams.get('region')) || 0 };
};
