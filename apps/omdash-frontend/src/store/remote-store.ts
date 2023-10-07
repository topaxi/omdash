// As described in https://dassur.ma/things/react-redux-comlink/
import { Remote, proxy } from 'comlink';
import { Store } from '@reduxjs/toolkit';

export async function remoteStoreWrapper<S extends Store<{}>>(store: Remote<S>) {
  const subscribers = new Set<() => void>();

  let latestState = await store.getState();

  store.subscribe(
    proxy(async () => {
      latestState = await store.getState();
      subscribers.forEach((f) => f());
    }),
  );

  return {
    dispatch: ((action) => store.dispatch(action)) as typeof store.dispatch,
    getState: (() => latestState) as typeof store.getState,
    subscribe: ((listener) => {
      subscribers.add(listener);

      return () => subscribers.delete(listener);
    }) as typeof store.subscribe,
    replaceReducer: () => {
      throw new Error('Can’t transfer a function');
    },
  };
}
