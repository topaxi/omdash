import { AnyAction, Store, Unsubscribe } from '@reduxjs/toolkit';
import { debounce } from 'lodash-es';
import { RootState, store as defaultStore } from './index.js';
import { LitElement, ReactiveController, ReactiveControllerHost } from 'lit';
import { bind } from '../decorators/bind.js';
import { AppAction } from './worker.js';

type Constructor<T> = new (...args: any[]) => T;

class StoreController implements ReactiveController {
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

  @bind()
  private _triggerStateChanged() {
    this.host.stateChanged(this.store.getState());
  }

  hostConnected() {
    this._storeUnsubscribe = this.store.subscribe(
      debounce(this._triggerStateChanged, 250, {
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
  <S = RootState, A extends AnyAction = AppAction>({
    store = defaultStore as any,
  }: ConnectOptions<Store<S, A>> = {}) =>
  <T extends Constructor<LitElement>>(BaseElement: T) =>
    class extends BaseElement {
      private _storeController = new StoreController(this, store);

      stateChanged(_state: S): void {}

      get store() {
        return this._storeController.store;
      }

      dispatch(action: A) {
        this.store.dispatch(action);
      }
    };
