import { site } from '#lib/meta.js';

export const prerender = true;

export const GET = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}/</loc></url></urlset>\n`,
    { headers: { 'content-type': 'application/xml' } }
  );
