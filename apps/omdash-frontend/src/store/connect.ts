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
  <S, A extends Action>({
    store = defaultStore as any,
  }: ConnectOptions<Store<S, A>> = {}) =>
  <T extends Constructor<CustomElement>>(BaseElement: T) =>
    class extends BaseElement {
      private _storeUnsubscribe: Unsubscribe | null = null;

      private _triggerStateChanged() {
        this.stateChanged(store.getState());
      }

      connectedCallback() {
        super.connectedCallback?.();

        this._storeUnsubscribe = store.subscribe(
          debounce(this._triggerStateChanged.bind(this), 250, {
            maxWait: 1000,
          }),
        );

        this._triggerStateChanged();
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
