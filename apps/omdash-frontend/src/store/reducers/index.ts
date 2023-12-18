import { combineReducers } from '@reduxjs/toolkit';
import { clientsReducer } from './clients.reducer.js';
import { pingReducer } from './ping.reducer.js';
import { uiReducer } from './ui/index.js';

export const reducer = combineReducers({
  ui: uiReducer,
  clients: clientsReducer,
  pings: pingReducer,
});
