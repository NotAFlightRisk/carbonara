import { MediaQuery } from 'svelte/reactivity';

const SAVED = 'carbonara:theme';

/** Follows the system until someone picks, and static/theme.js puts their pick back early */
export class Theme {
  #system = new MediaQuery('prefers-color-scheme: dark');
  #picked = $state(globalThis.document?.documentElement.dataset.theme);

  get dark() {
    return this.#picked ? this.#picked === 'dark' : this.#system.current;
  }

  flip() {
    this.#picked = document.documentElement.dataset.theme = this.dark ? 'light' : 'dark';
    try {
      localStorage.setItem(SAVED, this.#picked);
    } catch {
      // private browsing, so it's just forgotten next visit
    }
  }
}
