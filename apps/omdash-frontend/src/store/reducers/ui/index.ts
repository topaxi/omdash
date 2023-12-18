import { combineReducers } from '@reduxjs/toolkit';
import { uiHostsReducer } from './hosts.reducer';

export const uiReducer = combineReducers({
  hosts: uiHostsReducer,
});
