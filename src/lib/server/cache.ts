import { waitUntil } from 'cloudflare:workers';
import { report } from './report.ts';

interface Entry<T> {
  at: number;
  value: T;
}

// how long the edge holds on to anything, well past when it's due a refresh
const KEEP_SECONDS = 24 * 60 * 60;
const memory = new Map<string, Entry<unknown>>();
const loading = new Map<string, Promise<unknown>>();

const edge = () => (globalThis as { caches?: { default?: Cache } }).caches?.default;
const requestFor = (key: string) => new Request(`https://cache.carbonara.internal/${key}`);

async function read<T>(key: string) {
  const local = memory.get(key) as Entry<T> | undefined;
  if (local) return local;
  const hit = await edge()?.match(requestFor(key));
  if (!hit) return undefined;
  const entry: Entry<T> = await hit.json();
  memory.set(key, entry);
  return entry;
}

async function write<T>(key: string, value: T) {
  const entry = { at: Date.now(), value };
  memory.set(key, entry);
  const body = JSON.stringify(entry);
  await edge()?.put(
    requestFor(key),
    new Response(body, { headers: { 'cache-control': `max-age=${KEEP_SECONDS}` } })
  );
}

function refresh<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!loading.has(key)) {
    const pending = load()
      .then(async (value) => {
        await write(key, value);
        return value;
      })
      .finally(() => loading.delete(key));
    loading.set(key, pending);
  }
  return loading.get(key) as Promise<T>;
}

/** Serves what we've got straight away, and fetches a fresh copy behind it once it's old */
export async function cached<T>(key: string, freshFor: number, load: () => Promise<T>) {
  const entry = await read<T>(key);
  if (!entry) return refresh(key, load);
  if (Date.now() - entry.at > freshFor) waitUntil(refresh(key, load).catch((err) => report(err)));
  return entry.value;
}
