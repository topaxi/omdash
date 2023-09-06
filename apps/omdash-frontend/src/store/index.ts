import { configureStore } from '@reduxjs/toolkit';
import { clientsReducer } from './clients.reducer';

export const store = configureStore({
  reducer: {
    // @ts-ignore
    clients: clientsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
