import { wrap } from 'comlink';
import { remoteStoreWrapper } from './remote-store';
import workerUrl from './worker.js?worker&url';

export type { RootState } from './worker';

const remoteStore = await wrap(
  new Worker(workerUrl, {
    type: 'module',
  }),
);

export const store = await remoteStoreWrapper(remoteStore);
