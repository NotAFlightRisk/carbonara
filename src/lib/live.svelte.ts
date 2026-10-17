import { on } from 'svelte/events';
import type { Snapshot } from './types.ts';

const EVERY = 5 * 60_000;
const RETRY_CEILING = 30 * 60_000;

/** Keeps the snapshot fresh while the tab's visible, backing off when the API's down */
export class Live {
  snapshot = $state<Snapshot | null>(null);
  failing = $state(false);
  #wait = EVERY;
  #timer?: ReturnType<typeof setTimeout>;

  constructor(initial: Snapshot | null) {
    this.snapshot = initial;
  }

  async refresh() {
    clearTimeout(this.#timer);
    try {
      // no-cache revalidates, where the default would sit on a 4h edge copy
      const res = await fetch('/api/now', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`/api/now answered ${res.status}`);
      this.snapshot = await res.json();
      this.failing = false;
      this.#wait = EVERY;
    } catch {
      this.failing = true;
      this.#wait = Math.min(this.#wait * 2, RETRY_CEILING);
    }
    if (!document.hidden) this.#timer = setTimeout(() => this.refresh(), this.#wait);
  }

  start() {
    const stale = () => Date.now() - (this.snapshot?.fetched ?? 0) > EVERY;
    if (!this.snapshot || stale()) this.refresh();
    else this.#timer = setTimeout(() => this.refresh(), EVERY);
    const stop = on(document, 'visibilitychange', () => {
      clearTimeout(this.#timer);
      if (document.hidden) return;
      if (stale()) this.refresh();
      else this.#timer = setTimeout(() => this.refresh(), this.#wait);
    });
    return () => {
      stop();
      clearTimeout(this.#timer);
    };
  }
}
