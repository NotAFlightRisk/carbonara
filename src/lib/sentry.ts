import { captureException, init } from '@sentry/browser';

// hooks.client.ts catches errors itself, and Bugsink has no use for sessions
const skip = ['GlobalHandlers', 'BrowserApiErrors', 'BrowserSession'];

export function start(dsn: string) {
  init({
    dsn,
    release: import.meta.env.SENTRY_RELEASE || undefined,
    // errors thrown by extensions and other sites' scripts aren't ours to fix
    allowUrls: [location.origin],
    sendClientReports: false,
    dataCollection: { userInfo: false },
    integrations: (all) => all.filter(({ name }) => !skip.includes(name))
  });
  return captureException;
}
