import {
  applyMiddleware,
  combineReducers,
  legacy_createStore,
} from '@reduxjs/toolkit';
import { expose } from 'comlink';
import { clientsReducer } from './clients.reducer';
import { pingReducer } from './ping.reducer';
import {
  createRootReducerWithReplace,
  initStoreFromIndexedDB,
  reduxIndexedDBMiddleware,
} from './middlewares/indexedDBMiddleware';

const reducer = combineReducers({
  clients: clientsReducer,
  pings: pingReducer,
});

const rootReducer = createRootReducerWithReplace(reducer);

export const store = legacy_createStore(
  rootReducer,
  applyMiddleware(reduxIndexedDBMiddleware),
);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

store.dispatch(initStoreFromIndexedDB());

if (import.meta.env.VITE_SHARED_WORKER === 'true') {
  self.addEventListener('connect', (event: any) => {
    const [port] = event.ports;

    expose(store, port);
  });
} else {
  expose(store);
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
