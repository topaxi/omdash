import { combineReducers, legacy_createStore } from '@reduxjs/toolkit';
import { expose } from 'comlink';
import { clientsReducer } from './clients.reducer';
import { pingReducer } from './ping.reducer';

export const store = legacy_createStore(
  combineReducers({
    clients: clientsReducer,
    pings: pingReducer,
  }),
);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

expose(store);

function onWebSocketMessage(event: MessageEvent<any>) {
  const action = JSON.parse(event.data);

  store.dispatch(action);
}

function connectWebSocket() {
  // Probably want to handle this in a more robust way.
  // Currently the WebSocket to server connection is always on the same host,
  // therefore we don't need to worry too much about connection issues.
  // Worst case, we can just reload the page.
  const ws = new WebSocket(`ws://${self.location.hostname}:3200/dashboard`);

  ws.addEventListener('message', onWebSocketMessage);

  ws.addEventListener('close', () => {
    setTimeout(connectWebSocket, 2000);
  });
}

// TODO: This probably does not belong here, but I don't know where to put it yet.
connectWebSocket();
