import type { Store } from '@reduxjs/toolkit';
import { Remote, wrap } from 'comlink';
import { remoteStoreWrapper } from './remote-store.js';
import type { RootState } from './worker.js';

export type { RootState };

let store = {} as Remote<Store<RootState>>;

if (import.meta.env.VITE_REDUX_WORKER !== 'false') {
  const workerUrl = new URL('./worker', import.meta.url);
  const workerOptions: WorkerOptions = { type: 'module' };
  let remoteStore: Remote<Store<RootState>>;

  if (import.meta.env.VITE_SHARED_WORKER === 'true') {
    const worker = new SharedWorker(workerUrl, workerOptions);

    remoteStore = wrap(worker.port);
  } else {
    const worker = new Worker(workerUrl, workerOptions);

    remoteStore = wrap(worker);
  }

  store = (await remoteStoreWrapper(remoteStore)) as any;
} else {
  const workerModule = await import('./worker.js');

  store = workerModule.store as any;
}

export { store };
