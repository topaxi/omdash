import type { Store } from '@reduxjs/toolkit';
import { Remote, wrap } from 'comlink';
import { remoteStoreWrapper } from './remote-store.js';
import type { RootState } from './worker.js';

export type { RootState };

let remoteStore: Remote<Store<RootState>>;

if (import.meta.env.VITE_SHARED_WORKER === 'true') {
  const worker = new SharedWorker(new URL('./worker', import.meta.url), {
    type: 'module',
  });

  remoteStore = wrap<Store<RootState>>(worker.port);
} else {
  const worker = new Worker(new URL('./worker', import.meta.url), {
    type: 'module',
  });

  remoteStore = wrap<Store<RootState>>(worker);
}

export const store = await remoteStoreWrapper(remoteStore);
