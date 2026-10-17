import { waitUntil } from 'cloudflare:workers';
import { site } from '#lib/meta.js';
import { report } from './report.ts';

interface Entry<T> {
  at: number;
  value: T;
}

// how long anything is kept at all, well past when it's due a refresh
const KEEP_SECONDS = 24 * 60 * 60;
// a long-running Node server only remembers so much, postcodes included
const MOST_REMEMBERED = 200;
const memory = new Map<string, Entry<unknown>>();
const loading = new Map<string, Promise<unknown>>();

const edge = () => (globalThis as { caches?: { default?: Cache } }).caches?.default;
const requestFor = (key: string) => new Request(`${site}/__cache/${encodeURIComponent(key)}`);
const expired = (entry: Entry<unknown>) => Date.now() - entry.at > KEEP_SECONDS * 1000;

function remember(key: string, entry: Entry<unknown>) {
  memory.delete(key);
  memory.set(key, entry);
  if (memory.size > MOST_REMEMBERED) memory.delete(memory.keys().next().value!);
}

async function read<T>(key: string) {
  const local = memory.get(key) as Entry<T> | undefined;
  if (local && !expired(local)) return local;
  const hit = await edge()?.match(requestFor(key));
  const entry: Entry<T> | undefined = await hit?.json().catch(() => undefined);
  if (!entry?.at || expired(entry)) return undefined;
  remember(key, entry);
  return entry;
}

async function write<T>(key: string, value: T) {
  const entry = { at: Date.now(), value };
  remember(key, entry);
  const response = new Response(JSON.stringify(entry), {
    headers: { 'cache-control': `max-age=${KEEP_SECONDS}` }
  });
  await edge()
    ?.put(requestFor(key), response)
    .catch((err) => report(err));
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
