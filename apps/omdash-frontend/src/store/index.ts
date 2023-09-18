import type { Store } from '@reduxjs/toolkit';
import { wrap } from 'comlink';
import { remoteStoreWrapper } from './remote-store';
import type { RootState } from './worker';
import workerUrl from './worker.js?worker&url';

export type { RootState };

const remoteStore = wrap<Store<RootState>>(
  new Worker(workerUrl, {
    type: 'module',
  }),
);

export const store = await remoteStoreWrapper(remoteStore);
