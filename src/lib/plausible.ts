declare global {
  interface Window {
    plausible: { init(options: { endpoint: string }): void };
  }
}

export function loadPlausible(src: string = import.meta.env.PUBLIC_PLAUSIBLE_SCRIPT) {
  if (!src) return;
  const script = Object.assign(document.createElement('script'), { src, async: true });
  script.onload = () => window.plausible.init({ endpoint: new URL('/api/event', src).href });
  document.head.append(script);
}
