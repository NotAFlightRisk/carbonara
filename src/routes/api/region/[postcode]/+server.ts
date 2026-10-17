import { error, json } from '@sveltejs/kit';
import { regionFor } from '#lib/server/grid.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const region = await regionFor(params.postcode).catch(() => null);
  if (!region) error(404, "Couldn't find that postcode");
  return json({ region }, { headers: { 'cache-control': 'public, max-age=86400' } });
};
