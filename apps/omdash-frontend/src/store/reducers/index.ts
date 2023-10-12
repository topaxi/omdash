import { combineReducers } from '@reduxjs/toolkit';
import { clientsReducer } from './clients.reducer.js';
import { pingReducer } from './ping.reducer.js';

export const reducer = combineReducers({
  clients: clientsReducer,
  pings: pingReducer,
});
