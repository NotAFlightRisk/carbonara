export const site = 'https://carbonara.peng.ly';
export const source = 'https://github.com/NotAFlightRisk/carbonara';
export const name = 'carbonara';
export const title = `${name} | How clean is Britain's electricity right now?`;
export const description =
  "Live carbon intensity of Britain's electricity grid: what's making it, where it's cleanest, and the best time to plug in over the next 48 hours.";
export const imageAlt =
  'A barometer dial reading the carbon intensity of the GB grid, next to a map of Britain shaded by region';

/** Tells search engines what the site's called and what it is */
export const structuredData = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name,
  url: site,
  applicationCategory: 'UtilitiesApplication',
  description,
  isAccessibleForFree: true,
  operatingSystem: 'Any'
});
