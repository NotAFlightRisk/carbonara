import { error, json } from '@sveltejs/kit';
import { snapshot } from '#lib/server/grid.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const body = await snapshot().catch(() =>
    error(503, "The grid's data isn't answering right now")
  );
  return json(body, { headers: { 'cache-control': 'public, max-age=0, s-maxage=60' } });
};
