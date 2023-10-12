/// <reference lib="webworker" />
import { Reducer, applyMiddleware, legacy_createStore } from '@reduxjs/toolkit';
import { expose } from 'comlink';
import { reducer } from './reducers/index.js';
import {
  createRootReducerWithReplace,
  initStoreFromIndexedDB,
  reduxIndexedDBMiddleware,
} from './middlewares/indexedDBMiddleware';
import { composeWithDevToolsDevelopmentOnly } from '@redux-devtools/extension';

function createRootReducer<T extends Reducer>(reducer: T) {
  return createRootReducerWithReplace(reducer);
}

export const store = legacy_createStore(
  createRootReducer(reducer),
  composeWithDevToolsDevelopmentOnly(applyMiddleware(reduxIndexedDBMiddleware)),
);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

store.dispatch(initStoreFromIndexedDB());

if (import.meta.env.VITE_REDUX_WORKER !== 'false') {
  if (import.meta.env.VITE_SHARED_WORKER === 'true') {
    self.addEventListener('connect', (event: any) => {
      const [port] = event.ports;

      expose(store, port);
    });
  } else {
    expose(store);
  }
} else {
  // We are not in a worker, we can support hmr.
  if (import.meta.hot) {
    import.meta.hot.accept('./reducers/index', ({ reducer }: any) => {
      store.replaceReducer(createRootReducer(reducer));
    });
  }
}

function onWebSocketMessage(event: MessageEvent<any>) {
  const action = JSON.parse(event.data);

  store.dispatch(action);
}

function connectWebSocket() {
  // Probably want to handle this in a more robust way.
  // Currently the WebSocket to server connection is always on the same host,
  // therefore we don't need to worry too much about connection issues.
  // Worst case, we can just reload the page.
  const ws = new WebSocket(
    `ws://${
      import.meta.env.VITE_OMDASH_SERVER ?? self.location.hostname
    }:3200/dashboard`,
  );

  ws.addEventListener('message', onWebSocketMessage);

  ws.addEventListener('close', () => {
    setTimeout(connectWebSocket, 2000);
  });
}

// TODO: This probably does not belong here, but I don't know where to put it yet.
connectWebSocket();
