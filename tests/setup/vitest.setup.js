import { afterEach } from 'vitest';

afterEach(() => {
  if (globalThis.localStorage?.clear) globalThis.localStorage.clear();
  if (globalThis.sessionStorage?.clear) globalThis.sessionStorage.clear();
});
