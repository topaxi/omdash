import { Action, Store, Unsubscribe } from '@reduxjs/toolkit';
import { debounce } from 'lodash-es';
import { store as defaultStore } from './index.js';

type Constructor<T> = new (...args: any[]) => T;

interface CustomElement extends HTMLElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  readonly isConnected: boolean;
}

export interface ConnectOptions<S extends Store<any, any>> {
  store?: S;
}

export const connect =
  <S extends Store<any, any>, A extends Action>({
    store = defaultStore as any,
  }: ConnectOptions<S> = {}) =>
  <T extends Constructor<CustomElement>>(BaseElement: T) =>
    class extends BaseElement {
      private _storeUnsubscribe: Unsubscribe | null = null;

      connectedCallback() {
        super.connectedCallback?.();

        const triggerStateChanged = debounce(
          () => {
            this.stateChanged(store.getState());
          },
          250,
          { maxWait: 1000 },
        );

        this._storeUnsubscribe = store.subscribe(triggerStateChanged);

        triggerStateChanged();
      }

      disconnectedCallback(): void {
        this._storeUnsubscribe?.();

        super.disconnectedCallback?.();
      }

      stateChanged(_state: S): void {}

      get store() {
        return store;
      }

      dispatch(action: A) {
        this.store.dispatch(action);
      }
    };
