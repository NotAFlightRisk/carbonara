// NESO's DNO areas, simplified with mapshaper (see the README), into SVG paths for the map
import { readFileSync, writeFileSync } from 'node:fs';

// NESO's area codes -> the API's region ids
const ids = {
  _P: 1,
  _N: 2,
  _G: 3,
  _F: 4,
  _M: 5,
  _D: 6,
  _K: 7,
  _E: 8,
  _B: 9,
  _A: 10,
  _L: 11,
  _H: 12,
  _C: 13,
  _J: 14
};
// British National Grid metres -> km, and Shetland tucked into the sea off Aberdeen
const KM = 1000;
const SHETLAND = { north: 1100 * KM, dx: 175, dy: 150 };

const geo = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const polygonsOf = ({ geometry }) =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

const place = ([x, y], shetland) => [
  x / KM + (shetland ? SHETLAND.dx : 0),
  -y / KM + (shetland ? SHETLAND.dy : 0)
];

const inset = [];
const shapes = geo.features.map((feature) => ({
  id: ids[feature.properties.Name],
  rings: polygonsOf(feature).flatMap((polygon) => {
    const shetland = polygon[0].every(([, y]) => y > SHETLAND.north);
    const rings = polygon.map((ring) => ring.map((point) => place(point, shetland)));
    if (shetland) inset.push(...rings.flat());
    return rings;
  })
}));

const points = shapes.flatMap((shape) => shape.rings.flat());
const [left, top] = [0, 1].map((axis) => Math.min(...points.map((point) => point[axis])));
const [right, bottom] = [0, 1].map((axis) => Math.max(...points.map((point) => point[axis])));
const pad = 4;
const box = (all) => {
  const [x0, y0] = [0, 1].map((axis) => Math.min(...all.map((point) => point[axis])));
  const [x1, y1] = [0, 1].map((axis) => Math.max(...all.map((point) => point[axis])));
  return [x0 - left + pad, y0 - top + pad, x1 - x0, y1 - y0].map(Math.round);
};
const at = ([x, y]) => `${Math.round(x - left + pad)},${Math.round(y - top + pad)}`;
const path = (ring) =>
  'M' +
  ring
    .map(at)
    .filter((point, i, all) => point !== all[i - 1])
    .join('L') +
  'Z';

const regions = shapes
  .map(({ id, rings }) => ({ id, d: rings.map(path).join('') }))
  .sort((a, b) => a.id - b.id);

const out = {
  width: Math.round(right - left + pad * 2),
  height: Math.round(bottom - top + pad * 2),
  shetland: box(inset),
  regions
};
writeFileSync('src/lib/data/regions.json', JSON.stringify(out) + '\n');
console.log(`${regions.length} regions, ${out.width}x${out.height}`);
