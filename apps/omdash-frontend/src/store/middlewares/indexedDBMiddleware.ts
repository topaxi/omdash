import { Dispatch, Middleware, MiddlewareAPI } from 'redux';
import { IndexedDBStorage } from '../../db/IndexedDBStorage';
import { Action, Reducer, UnknownAction } from '@reduxjs/toolkit';
import { debounce } from 'lodash-es';

// Action type for initializing the store from IndexedDB
const INIT_STORE_FROM_INDEXEDDB = 'INIT_STORE_FROM_INDEXEDDB';

// Action creator for initializing the store from IndexedDB
export const initStoreFromIndexedDB = () => ({
  type: INIT_STORE_FROM_INDEXEDDB,
});

class IndexedDBStorageForMiddleware<S = any> extends IndexedDBStorage {
  async saveStateToIndexedDB(state: S): Promise<void> {
    await this.init();
    await this.setItem('reduxStore', state);
  }

  async loadStateFromIndexedDB(): Promise<S | null> {
    await this.init();
    return this.getItem('reduxStore');
  }
}

const SAVE_INTERVAL = 10_000;

export type IndexedDBMiddlewareActions<T = unknown> =
  | ReturnType<typeof initStoreFromIndexedDB>
  | { type: 'REPLACE_STATE'; payload: T };

export function createReduxIndexedDBMiddleware(): Middleware {
  const indexedDBStorage = new IndexedDBStorageForMiddleware(
    'omdash-db',
    'omdash-store',
  );

  return ((api) => {
    const { dispatch, getState } = api;

    const saveStateToIndexedDB = () => {
      const state = getState();

      return indexedDBStorage.saveStateToIndexedDB(state);
    };

    const saveDebounced = debounce(saveStateToIndexedDB, SAVE_INTERVAL, {
      maxWait: SAVE_INTERVAL,
    });

    return (next) =>
      async (action: UnknownAction | IndexedDBMiddlewareActions) => {
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
  }) as Middleware;
}

export function createRootReducerWithReplace<S, A extends Action<string>, I>(
  rootReducer: Reducer<S, A, I>,
): Reducer<
  S,
  | A
  | ReturnType<typeof initStoreFromIndexedDB>
  | { type: 'REPLACE_STATE'; payload: S },
  I
> {
  return (state, action) => {
    if (action.type === 'REPLACE_STATE') {
      // Replace the state with the payload
      return rootReducer((action as any).payload, action as any);
    }

    // Delegate to the original rootReducer for other actions
    return rootReducer(state, action as any);
  };
}
