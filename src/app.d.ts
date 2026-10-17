declare module 'cloudflare:workers' {
  export function waitUntil(work: Promise<unknown>): void;
}
