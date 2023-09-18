import { Action, Store, Unsubscribe } from '@reduxjs/toolkit';
import { debounce } from 'lodash-es';
import { store as defaultStore } from './index.js';
import { LitElement, ReactiveController, ReactiveControllerHost } from 'lit';

type Constructor<T> = new (...args: any[]) => T;

class StoreControler implements ReactiveController {
  host: ReactiveControllerHost & {
    stateChanged(state: any): void;
  };

  store: Store<any, any>;

  private _storeUnsubscribe: Unsubscribe | null = null;

  constructor(
    host: ReactiveControllerHost & {
      stateChanged(state: any): void;
    },
    store: Store<any, any>,
  ) {
    (this.host = host).addController(this);
    this.store = store;
  }

  private _triggerStateChanged() {
    this.host.stateChanged(this.store.getState());
  }

  hostConnected() {
    this._storeUnsubscribe = this.store.subscribe(
      debounce(this._triggerStateChanged.bind(this), 250, {
        maxWait: 1000,
      }),
    );

    this._triggerStateChanged();
  }

  hostDisconnected(): void {
    this._storeUnsubscribe?.();
  }
}

export interface ConnectOptions<S extends Store<any, any>> {
  store?: S;
}

export const connect =
  <S, A extends Action>({
    store = defaultStore as any,
  }: ConnectOptions<Store<S, A>> = {}) =>
  <T extends Constructor<LitElement>>(BaseElement: T) =>
    class extends BaseElement {
      private _storeController = new StoreControler(this, store);

      stateChanged(_state: S): void {}

      get store() {
        return store;
      }

      dispatch(action: A) {
        this.store.dispatch(action);
      }
    };
