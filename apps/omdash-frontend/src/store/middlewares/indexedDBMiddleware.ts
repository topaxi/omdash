import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';
import { IndexedDBStorage } from '../../db/IndexedDBStorage';
import { Reducer } from '@reduxjs/toolkit';
import { debounce } from 'lodash-es';

// Replace with the actual type of your Redux state
type RootState = Record<string, any>;

// Action type for initializing the store from IndexedDB
const INIT_STORE_FROM_INDEXEDDB = 'INIT_STORE_FROM_INDEXEDDB';

// Action creator for initializing the store from IndexedDB
export const initStoreFromIndexedDB = () => ({
  type: INIT_STORE_FROM_INDEXEDDB,
});

class IndexedDBStorageForMiddleware extends IndexedDBStorage {
  async saveStateToIndexedDB(state: RootState): Promise<void> {
    await this.init();
    await this.setItem('reduxStore', state);
  }

  async loadStateFromIndexedDB(): Promise<RootState | null> {
    await this.init();
    return this.getItem('reduxStore');
  }
}

const indexedDBStorage = new IndexedDBStorageForMiddleware(
  'omdash-db',
  'omdash-store',
);

const SAVE_INTERVAL = 5000;

export const reduxIndexedDBMiddleware: Middleware = ({
  dispatch,
  getState,
}: MiddlewareAPI) => {
  const saveStateToIndexedDB = () => {
    const state = getState();

    return indexedDBStorage.saveStateToIndexedDB(state);
  };

  const saveDebounced = debounce(saveStateToIndexedDB, SAVE_INTERVAL, {
    maxWait: SAVE_INTERVAL,
  });

  return (next: Dispatch<AnyAction>) => async (action: AnyAction) => {
    if (action.type === INIT_STORE_FROM_INDEXEDDB) {
      // If the action type is INIT_STORE_FROM_INDEXEDDB, load the state from IndexedDB
      const storedState = await indexedDBStorage.loadStateFromIndexedDB();
      if (storedState) {
        // Dispatch an action to initialize the store with the loaded state
        dispatch({ type: 'REPLACE_STATE', payload: storedState });
      }
    } else {
      // Continue with the next middleware or reducer
      const result = next(action);

      if (action.type === 'REPLACE_STATE') {
        await saveStateToIndexedDB();
      } else {
        // Save the state to IndexedDB after every action
        saveDebounced();
      }

      return result;
    }
  };
};

export function createRootReducerWithReplace<S, A extends AnyAction>(
  rootReducer: Reducer<S, A>,
): Reducer<
  S,
  | A
  | ReturnType<typeof initStoreFromIndexedDB>
  | { type: 'REPLACE_STATE'; payload: S }
> {
  return (state: S | undefined, action: any) => {
    if (action.type === 'REPLACE_STATE') {
      // Replace the state with the payload
      return rootReducer(action.payload, action);
    }

    // Delegate to the original rootReducer for other actions
    return rootReducer(state, action);
  };
}
