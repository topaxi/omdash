import { configureStore } from '@reduxjs/toolkit';
import { clientsReducer } from './clients.reducer';
import { pingReducer } from './ping.reducer';

export const store = configureStore({
  reducer: {
    // @ts-ignore
    clients: clientsReducer,
    // @ts-ignore
    pings: pingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
