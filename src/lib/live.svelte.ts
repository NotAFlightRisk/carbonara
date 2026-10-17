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
  #busy = false;
  #stopped = false;

  constructor(initial: Snapshot | null) {
    this.snapshot = initial;
  }

  #schedule(wait: number) {
    clearTimeout(this.#timer);
    if (!this.#stopped && !document.hidden) this.#timer = setTimeout(() => this.refresh(), wait);
  }

  #stale = () => Date.now() - (this.snapshot?.fetched ?? 0) > EVERY;

  async refresh() {
    if (this.#busy) return;
    this.#busy = true;
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
    } finally {
      this.#busy = false;
    }
    this.#schedule(this.#wait);
  }

  start() {
    this.#stopped = false;
    if (this.#stale()) this.refresh();
    else this.#schedule(EVERY);
    const stop = on(document, 'visibilitychange', () => {
      if (document.hidden) clearTimeout(this.#timer);
      else if (this.#stale()) this.refresh();
      else this.#schedule(this.#wait);
    });
    return () => {
      this.#stopped = true;
      stop();
      clearTimeout(this.#timer);
    };
  }
}
